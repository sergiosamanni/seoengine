import uuid
import asyncio
import logging
import re
from datetime import datetime, timezone
from database import db
from helpers import (
    build_system_prompt, generate_seo_metadata, generate_with_rotation,
    publish_to_wordpress, log_activity, get_internal_linking_context,
    generate_internal_link_update, update_wordpress_post
)
import google.oauth2.credentials
from googleapiclient.discovery import build
from google.auth.transport.requests import Request

logger = logging.getLogger("server")

class ArticleService:
    @staticmethod
    def _truncate_meta_desc(md: str) -> str:
        """Ensure meta description ends with a complete word/sentence, max 155 chars."""
        if len(md) <= 155:
            return md
        cut = md[:152]
        for end_char in ['.', '!', '?']:
            last_end = cut.rfind(end_char)
            if last_end > 80:
                return cut[:last_end + 1]
        last_space = cut.rfind(' ')
        return (cut[:last_space].rstrip(',;- ') + ".") if last_space > 80 else (cut.rstrip(',;- ') + ".")

    @classmethod
    async def _refine_with_openai(cls, content: str, openai_config: dict, kb: dict, tone: dict, client_name: str, titolo: str) -> str:
        """Second step of the pipeline: use OpenAI to refine the DeepSeek output."""
        if not openai_config or not openai_config.get("api_key"):
            api_key = (openai_config or {}).get("api_key")
            if not api_key: return content
            
        api_key = openai_config["api_key"]
        model = openai_config.get("modello") or "gpt-4-turbo-preview"
        temp = openai_config.get("temperatura", 0.6)
        
        from helpers import generate_with_llm, clean_llm_output
        
        sys_prompt = f"""Sei un Senior Editor SEO per {client_name}. 
Raffina questo articolo (Step 2) rendendolo più umano e naturale.
- Assicurati che i tag H3 siano distribuiti fluidamente.
- Verifica che gli anchor text dei link siano di ALMENO 3 PAROLE e SEO-oriented.
- Rinforza i riferimenti alla Knowledge Base (Città: {kb.get('citta_principale')}).
- MANTENI e OTTIMIZZA la posizione dei placeholder [IMAGE_1], [IMAGE_2] se presenti, assicurandoti che siano vicini a testo descrittivo pertinente.
Restituisci solo l'articolo raffinato in HTML (frammento)."""
        
        user_prompt = f"TITOLO ARTICOLO: {titolo}\n\nCONTENUTO:\n{content}"
        
        try:
            logger.info(f"OpenAI Step 2 Refinement for '{titolo}'...")
            refined = await generate_with_llm("openai", api_key, model, temp, sys_prompt, user_prompt)
            return clean_llm_output(refined)
        except Exception as e:
            logger.error(f"Refinement error: {e}")
            return content

    @classmethod
    async def create_job(cls, client_id: str, total_count: int) -> str:
        job_id = str(uuid.uuid4())
        job_doc = {
            "id": job_id,
            "client_id": client_id,
            "status": "running",
            "total": total_count,
            "completed": 0,
            "results": [],
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.jobs.insert_one(job_doc)
        return job_id

    @classmethod
    async def generate_and_publish_batch(
        cls, job_id: str, client_id: str, items: list, 
        publish_to_wp: bool, content_type: str, brief: dict, 
        config: dict, client_doc: dict, is_topic_based: bool = False,
        generate_cover: bool = False
    ):
        """
        Unified batch processor for both combinations (Programmatic SEO) 
        and topic-based (Editorial Plan) articles.
        """
        llm_config = config.get("llm", {}) or config.get("openai", {})
        provider = llm_config.get("provider", "openai")
        kb = config.get("knowledge_base", {})
        tone = config.get("tono_e_stile", {})
        seo = config.get("seo", {})
        advanced_prompt = config.get("advanced_prompt", {})
        strategy = config.get("content_strategy", {})
        wp_config = config.get("wordpress", {})
        
        # Fetch Global SEO/GEO Guidelines
        global_settings = await db.global_settings.find_one({"id": "global"}, {"_id": 0})
        global_g = global_settings.get("seo_geo_guidelines", []) if global_settings else []
        
        ct_map = {"articolo": "articolo_blog", "landing_page": "landing_page", "pillar_page": "pillar_page"}
        content_type_prompt = ct_map.get(content_type, "articolo_blog")
        
        # Initial hint for internal linking
        hint = items[0].get("servizio") or items[0].get("titolo", "") if items else ""
        existing_published = await get_internal_linking_context(client_id, config, hint)
        
        results = []
        gen_ok = 0
        pub_ok = 0

        for idx, item in enumerate(items):
            if is_topic_based:
                titolo = item.get("titolo", "Articolo")
                keyword = item.get("keyword", "")
                objective = item.get("funnel", "TOFU")
                outline = item.get("outline", [])
                combo = {"servizio": keyword, "tipo": objective, "citta": kb.get("citta_principale", "")}
                user_prompt_extra = f"\n\nObiettivo: {objective}\nMotivo: {item.get('motivo', '')}"
                if outline:
                    user_prompt_extra += "\n\nSEGUI QUESTO OUTLINE:\n" + "\n".join([f"- {o.get('type','h2').upper()}: {o.get('text','')}" for o in outline])
                user_prompt = f"{titolo}{user_prompt_extra}"
            else:
                titolo = f"{item['servizio']} {item['tipo']} a {item['citta']}".title()
                keyword = item['servizio']
                combo = item
                user_prompt = titolo

            await log_activity(client_id, "article_generate", "running", {"titolo": titolo, "step": f"{idx+1}/{len(items)}"})
            
            # Re-build system prompt for each article to pick up potentially new links if we were doing live updates
            # For now, we use the initial context to keep it fast
            system_prompt = build_system_prompt(kb, tone, seo, client_doc["nome"], advanced_prompt, strategy, content_type_prompt, brief, existing_published, global_g)

            content = None
            gen_error = None
            for attempt in range(3):
                try:
                    content = await generate_with_rotation(llm_config, system_prompt, user_prompt)
                    
                    # --- TWO-STEP PIPELINE: REFINEMENT WITH OPENAI ---
                    openai_config = config.get("openai")
                    if content and openai_config and openai_config.get("api_key"):
                        content = await cls._refine_with_openai(content, openai_config, kb, tone, client_name=client_doc["nome"], titolo=titolo)
                    # -------------------------------------------------
                    
                    break
                except Exception as e:
                    gen_error = str(e)
                    if attempt < 2: await asyncio.sleep(2 ** attempt)

            article_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            res_item = {"id": article_id, "titolo": titolo, "generation_status": "pending", "publish_status": "pending"}

            if not content:
                await db.articles.insert_one({
                    "id": article_id, "client_id": client_id, "titolo": titolo,
                    "contenuto": f"Errore: {gen_error}", "stato": "failed",
                    "created_at": now, "published_at": None, "combination": combo
                })
                res_item["generation_status"] = "failed"
                res_item["generation_error"] = gen_error
                await log_activity(client_id, "article_generate", "failed", {"titolo": titolo, "error": gen_error})
            else:
                gen_ok += 1
                # Extract meta desc from comments if present
                meta_match = re.search(r'<!--\s*META_DESCRIPTION:\s*(.+?)\s*-->', content)
                llm_meta_desc = meta_match.group(1).strip() if meta_match else None
                if meta_match:
                    content = content[:meta_match.start()].rstrip() + content[meta_match.end():]
                
                seo_metadata = generate_seo_metadata(titolo, content, kb, combo)
                if llm_meta_desc and len(llm_meta_desc) >= 80:
                    seo_metadata["meta_description"] = cls._truncate_meta_desc(llm_meta_desc)
                
                # Image handling for topics
                image_ids = []
                if is_topic_based:
                    image_ids = item.get("image_ids", [])
                    if generate_cover and not image_ids:
                        try:
                            from helpers import generate_image_from_web
                            search_query = item.get("image_search_query") or titolo
                            logger.info(f"Using Direct Web Stock Search for batch article: {search_query}")
                            image_res = await generate_image_from_web(search_query, client_id, article_title=titolo)
                            
                            if image_res and image_res.get("id"):
                                image_ids = [image_res["id"]]
                                await log_activity(client_id, "image_search", "success", {"titolo": titolo, "image_id": image_res["id"]})
                        except Exception as e:
                            logger.error(f"Web image search failed during batch-generate: {e}")
                            await log_activity(client_id, "image_search", "failed", {"titolo": titolo, "error": str(e)})

                scheduled_date = item.get("scheduled_date")
                
                await db.articles.insert_one({
                    "id": article_id, "client_id": client_id, "titolo": titolo,
                    "contenuto": content, "stato": "generated", "created_at": now,
                    "published_at": None, "combination": combo, "seo_metadata": seo_metadata,
                    "image_ids": image_ids, "scheduled_date": scheduled_date
                })
                res_item["generation_status"] = "success"
                await log_activity(client_id, "article_generate", "success", {"titolo": titolo, "article_id": article_id})

                if publish_to_wp and wp_config.get("url_api") and wp_config.get("utente"):
                    try:
                        wp_type = "page" if content_type in ("landing_page", "pillar_page") else "post"
                        wp_res = await publish_to_wordpress(
                            url=wp_config["url_api"], username=wp_config["utente"],
                            password=wp_config["password_applicazione"], title=titolo,
                            content=content, wp_status=wp_config.get("stato_pubblicazione", "draft"),
                            seo_metadata=seo_metadata, tags=seo_metadata.get("tags", []), 
                            wp_type=wp_type, image_ids=image_ids, schedule_date=scheduled_date
                        )
                        await db.articles.update_one({"id": article_id}, {"$set": {
                            "stato": "published", "wordpress_post_id": str(wp_res["post_id"]),
                            "wordpress_link": wp_res.get("link"), "wordpress_slug": wp_res.get("slug"),
                            "published_at": datetime.now(timezone.utc).isoformat()
                        }})
                        pub_ok += 1
                        res_item["publish_status"] = "success"
                        res_item["wordpress_link"] = wp_res.get("link")
                        await log_activity(client_id, "wordpress_publish", "success", {"titolo": titolo, "post_id": wp_res["post_id"]})
                        
                        # Trigger back-linking
                        asyncio.create_task(cls._process_back_linking(
                            client_id, provider, llm_config, article_id, titolo, 
                            seo_metadata.get("focus_keyword", ""), wp_res.get("link", ""), 
                            wp_config, wp_type
                        ))

                        # Trigger automatic indexing
                        asyncio.create_task(cls._request_gsc_indexing(client_id, wp_res.get("link", "")))
                    except Exception as e:
                        await db.articles.update_one({"id": article_id}, {"$set": {"stato": "publish_failed", "publish_error": str(e)}})
                        res_item["publish_status"] = "failed"
                        res_item["publish_error"] = str(e)
                        await log_activity(client_id, "wordpress_publish", "failed", {"titolo": titolo, "error": str(e)})
                else:
                    res_item["publish_status"] = "skipped"

            results.append(res_item)
            await db.jobs.update_one({"id": job_id}, {"$set": {"completed": idx + 1, "results": results}})

        # Finalize job
        await db.jobs.update_one({"id": job_id}, {"$set": {
            "status": "completed", 
            "summary": {"total": len(items), "generated_ok": gen_ok, "published_ok": pub_ok},
            "finished_at": datetime.now(timezone.utc).isoformat()
        }})
        await log_activity(client_id, "batch_complete", "success", {"total": len(items), "generated": gen_ok, "published": pub_ok})
        
        # Cleanup editorial plan if needed
        if is_topic_based and gen_ok > 0:
            success_titles = [r["titolo"] for r in results if r["generation_status"] == "success"]
            await db.editorial_plans.update_one({"client_id": client_id}, {"$pull": {"topics": {"titolo": {"$in": success_titles}}}})

    @classmethod
    async def run_simple_article_generation(
        cls, job_id: str, client_id: str, keyword: str, topic: str, 
        publish_to_wp: bool, system_prompt: str, llm_config: dict, 
        wp_config: dict, kb: dict, combo: dict, titolo_suggerito: str = "", 
        content_type: str = "articolo", image_ids: list = None, 
        existing_published: list = None, generate_cover: bool = False,
        scheduled_date: str = None
    ):
        """Standardized single article generation and task finalization."""
        provider = llm_config.get("provider", "openai")
        titolo = titolo_suggerito or keyword.strip()
        # Fetch full client data for step-2 pipeline
        client_doc = await db.clients.find_one({"id": client_id})
        if not client_doc:
            raise Exception("Client non trovato")
        config = client_doc.get("configuration", {})
        
        await log_activity(client_id, "article_generate", "running", {"titolo": titolo, "step": "generazione"})
        
        # Determine image_ids - if generate_cover and no ids provided, generate one
        if generate_cover and not image_ids:
            try:
                from helpers import generate_image_from_web
                logger.info(f"Using Direct Web Stock Search for article: {titolo}")
                # generate_image_from_web handles search, download, optimization and DB storage
                image_res = await generate_image_from_web(titolo, client_id, article_title=titolo)
                
                if image_res and image_res.get("id"):
                    image_ids = [image_res["id"]]
                    await log_activity(client_id, "image_search", "success", {"titolo": titolo, "image_id": image_res["id"]})
            except Exception as e:
                logger.error(f"Web image search failed during simple-generate: {e}")
                await log_activity(client_id, "image_search", "failed", {"titolo": titolo, "error": str(e)})

        try:
            content = None
            gen_error = None
            
            # SAFEGUARD: Limit prompt size to avoid LLM context issues if sitemaps/KB are too big
            safe_system_prompt = system_prompt[:30000] if len(system_prompt) > 30000 else system_prompt
            
            for attempt in range(3):
                try:
                    user_prompt = f"{titolo}\n\nArgomento specifico: {topic}" if topic else titolo
                    
                    if image_ids and len(image_ids) > 1:
                        num_extra = len(image_ids) - 1
                        user_prompt += f"\n\nIMPORTANTE - IMMAGINI DEL CLIENTE: Sono disponibili {num_extra} immagini reali caricate dal cliente (oltre a quella in evidenza)."
                        user_prompt += f"\nInserisci nel testo HTML i placeholder {', '.join([f'[IMAGE_{i+1}]' for i in range(min(num_extra, 2))])} in punti strategici, naturali e contestuali dove una foto starebbe bene."
                    
                    content = await generate_with_rotation(llm_config, safe_system_prompt, user_prompt)
                    
                    # -------------------------------------------------
                    # TWO-STEP PIPELINE: REFINEMENT WITH OPENAI (NON-BLOCKING)
                    openai_config = config.get("openai")
                    if content and openai_config and openai_config.get("api_key"):
                        try:
                            logger.info(f"Starting Step 2 Refinement with OpenAI for article: {titolo}")
                            refined_content = await cls._refine_with_openai(
                                content, openai_config, kb, 
                                config.get("tono_e_stile", {}), 
                                client_name=client_doc.get("nome", client_doc.get("name", "Cliente")), 
                                titolo=titolo
                            )
                            if refined_content and len(refined_content.strip()) > 100:
                                content = refined_content
                                logger.info("Step 2 Refinement completed successfully.")
                        except Exception as ref_err:
                            logger.warning(f"Step 2 Refinement failed, proceeding with original content: {ref_err}")
                    # -------------------------------------------------
                    
                    if content and len(content.strip()) > 100:
                        break
                    else:
                        gen_error = "L'IA ha restituito un contenuto troppo corto o vuoto."
                except Exception as e:
                    gen_error = str(e)
                    if attempt < 2: await asyncio.sleep(2 ** attempt)

            article_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc).isoformat()
            res_item = {"titolo": titolo, "generation_status": "pending", "publish_status": "pending"}

            if not content or len(content.strip()) < 100:
                await db.articles.insert_one({
                    "id": article_id, "client_id": client_id, "titolo": titolo,
                    "contenuto": f"Errore: {gen_error}", "stato": "failed",
                    "created_at": now, "published_at": None, "combination": combo
                })
                res_item["id"] = article_id
                res_item["generation_status"] = "failed"
                res_item["generation_error"] = gen_error
                await log_activity(client_id, "article_generate", "failed", {"titolo": titolo, "error": gen_error})
            else:
                # Meta description is extracted but we don't truncate 'content' here
                # because it's already pre-cleaned by the generator helper.
                meta_match = re.search(r'<!--\s*META_DESCRIPTION:\s*(.+?)\s*-->', content)
                llm_meta_desc = meta_match.group(1).strip() if meta_match else None
                
                seo_metadata = generate_seo_metadata(titolo, content, kb, combo)
                if llm_meta_desc and len(llm_meta_desc) >= 80:
                    seo_metadata["meta_description"] = cls._truncate_meta_desc(llm_meta_desc)
                
                await db.articles.insert_one({
                    "id": article_id, "client_id": client_id, "titolo": titolo,
                    "contenuto": content, "stato": "generated", "created_at": now,
                    "published_at": None, "combination": combo, "seo_metadata": seo_metadata,
                    "image_ids": image_ids or []
                })
                
                res_item["id"] = article_id
                res_item["generation_status"] = "success"
                await log_activity(client_id, "article_generate", "success", {"titolo": titolo, "article_id": article_id})

                # Ensure we have a valid status, prioritizing client configuration
                raw_status = str(wp_config.get("stato_pubblicazione", "")).lower().strip()
                if raw_status in ("pubblicato", "publish", "pubblica"):
                    target_status = "publish"
                elif raw_status in ("bozza", "draft"):
                    target_status = "draft"
                else:
                    target_status = "draft" # Default to draft for safety
                
                if publish_to_wp and wp_config.get("url_api") and wp_config.get("utente"):
                    try:
                        # --- ANTI-DUPLICATION SAFETY ---
                        from datetime import timedelta
                        three_mins_ago = (datetime.now(timezone.utc) - timedelta(minutes=3)).isoformat()
                        recent_check = await db.articles.find_one({
                            "client_id": client_id,
                            "titolo": titolo,
                            "stato": "published",
                            "published_at": {"$gte": three_mins_ago}
                        })
                        if recent_check:
                            logger.warning(f"ABORT: Article '{titolo}' was already published {three_mins_ago} - {recent_check.get('wordpress_link')}")
                            # Update current placeholder to reflect it's a skipped duplicate
                            await db.articles.update_one({"id": article_id}, {"$set": {
                                "stato": "skipped_duplicate", 
                                "wordpress_link": recent_check.get("wordpress_link"),
                                "published_at": recent_check.get("published_at")
                            }})
                            res_item["publish_status"] = "skipped_duplicate"
                            # End job successfully since it already exists
                            await db.jobs.update_one({"id": job_id}, {"$set": {"status": "completed", "results": [res_item], "finished_at": datetime.now(timezone.utc).isoformat()}})
                            return

                        wp_type = "page" if content_type in ("landing_page", "pillar_page") else "post"
                        wp_res = await publish_to_wordpress(
                            url=wp_config["url_api"], username=wp_config["utente"],
                            password=wp_config["password_applicazione"], title=titolo,
                            content=content, wp_status=target_status,
                            seo_metadata=seo_metadata, tags=seo_metadata.get("tags", []), 
                            wp_type=wp_type, image_ids=image_ids or [],
                            schedule_date=scheduled_date
                        )
                        await db.articles.update_one({"id": article_id}, {"$set": {
                            "stato": "published", "wordpress_post_id": str(wp_res["post_id"]),
                            "wordpress_link": wp_res.get("link"), "published_at": datetime.now(timezone.utc).isoformat()
                        }})
                        res_item["publish_status"] = "success"
                        res_item["wordpress_link"] = wp_res.get("link")
                        await log_activity(client_id, "wordpress_publish", "success", {"titolo": titolo, "post_id": wp_res["post_id"]})
                        
                        # Back-linking
                        asyncio.create_task(cls._process_back_linking(
                            client_id, provider, llm_config, article_id, titolo, 
                            seo_metadata.get("focus_keyword", ""), wp_res.get("link", ""), 
                            wp_config, wp_type
                        ))

                        # Trigger automatic indexing
                        asyncio.create_task(cls._request_gsc_indexing(client_id, wp_res.get("link", "")))

                        # Email notification to admin(s)
                        try:
                            from services.email_service import notify_client_article_generated
                            client_name = client_doc.get("nome", client_doc.get("name", "Cliente"))
                            asyncio.create_task(notify_client_article_generated(
                                client_name=client_name,
                                article_title=titolo,
                                wordpress_link=wp_res.get("link", ""),
                                keyword=keyword
                            ))
                        except Exception as email_err:
                            logger.debug(f"Email notification skipped: {email_err}")

                    except Exception as e:
                        await db.articles.update_one({"id": article_id}, {"$set": {"stato": "publish_failed", "publish_error": str(e)}})
                        res_item["publish_status"] = "failed"
                        res_item["publish_error"] = str(e)
                        await log_activity(client_id, "wordpress_publish", "failed", {"titolo": titolo, "error": str(e)})
                else:
                    res_item["publish_status"] = "skipped"

            # Complete job
            job_status = "completed"
            if res_item["generation_status"] == "failed":
                job_status = "failed"
            elif publish_to_wp and res_item["publish_status"] == "failed":
                job_status = "failed" # Error during mandatory publication
                
            await db.jobs.update_one({"id": job_id}, {"$set": {
                "status": job_status, "completed": 1, "results": [res_item],
                "summary": {"total": 1, "generated_ok": 1 if res_item["generation_status"] == "success" else 0, "published_ok": 1 if res_item["publish_status"] == "success" else 0},
                "finished_at": datetime.now(timezone.utc).isoformat()
            }})
        except Exception as e:
            logger.error(f"Fatal error in run_simple_article_generation: {e}")
            await db.jobs.update_one({"id": job_id}, {"$set": {"status": "failed", "finished_at": datetime.now(timezone.utc).isoformat(), "error": str(e)}})
            await log_activity(client_id, "article_generate", "failed", {"titolo": titolo, "error": f"Errore fatale: {str(e)}"})

    @classmethod
    async def _process_back_linking(
        cls, client_id: str, provider: str, llm_config: dict, 
        new_id: str, new_title: str, new_kw: str, new_url: str, 
        wp_config: dict, wp_type: str
    ):
        """Update 1-2 old articles to link to the new one."""
        try:
            # Find published articles for the same client, excluding the new one by ID AND title
            # This prevents linking to a "ghost" or previous version with the same title
            cursor = db.articles.find({
                "client_id": client_id, 
                "stato": "published", 
                "id": {"$ne": new_id},
                "titolo": {"$ne": new_title}, # Robust exclusion
                "wordpress_post_id": {"$ne": None}
            }).sort("published_at", -1).limit(2)
            
            async for old in cursor:
                old_content = old.get("contenuto_html") or old.get("contenuto", "")
                new_para = await generate_internal_link_update(
                    provider, llm_config["api_key"], llm_config.get("modello", "gpt-4o"), 
                    llm_config.get("temperatura", 0.7), old["titolo"], old_content, 
                    new_title, new_kw, new_url
                )
                if new_para and "<a href=" in new_para:
                    updated = old_content + "\n\n" + new_para
                    success = await update_wordpress_post(
                        url=wp_config.get("url_api"), username=wp_config.get("utente"),
                        password=wp_config.get("password_applicazione"), 
                        post_id=old["wordpress_post_id"], content=updated, wp_type=wp_type
                    )
                    if success:
                        await db.articles.update_one({"id": old["id"]}, {"$set": {"contenuto_html": updated, "contenuto": updated}})
                        logger.info(f"Back-linked '{old['titolo']}' to '{new_title}'")
        except Exception as e:
            logger.warning(f"Back-linking failed: {e}")
    @classmethod
    async def _request_gsc_indexing(cls, client_id: str, url: str):
        """Silently request indexing for a new URL if GSC is connected."""
        if not url: return
        try:
            client_doc = await db.clients.find_one({"id": client_id}, {"configuration.gsc": 1})
            gsc_config = (client_doc.get("configuration", {}) or {}).get("gsc", {})
            tokens = gsc_config.get("tokens")
            
            if not tokens or not gsc_config.get("connected"):
                return

            creds = google.oauth2.credentials.Credentials(
                token=tokens["token"],
                refresh_token=tokens.get("refresh_token"),
                token_uri=tokens.get("token_uri", "https://oauth2.googleapis.com/token"),
                client_id=tokens.get("client_id"),
                client_secret=tokens.get("client_secret")
            )
            
            if creds.expired and creds.refresh_token:
                creds.refresh(Request())
                new_tokens = {
                    "token": creds.token, "refresh_token": creds.refresh_token,
                    "token_uri": creds.token_uri, "client_id": creds.client_id,
                    "client_secret": creds.client_secret,
                    "expiry": creds.expiry.isoformat() if creds.expiry else None
                }
                await db.clients.update_one({"id": client_id}, {"$set": {"configuration.gsc.tokens": new_tokens}})

            indexing_service = build("indexing", "v3", credentials=creds)
            body = {"url": url, "type": "URL_UPDATED"}
            indexing_service.urlNotifications().publish(body=body).execute()
            
            await log_activity(client_id, "gsc_index_request", "success", {"url": url})
            logger.info(f"Auto-GSC indexing requested for {url}")
        except Exception as e:
            logger.warning(f"Auto-GSC indexing failed for {url}: {e}")
