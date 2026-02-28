"""Article generation, publishing, and job management routes."""
import uuid
import asyncio
import itertools
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks

from database import db
from auth import get_current_user, require_admin, ADMIN_MASTER_PASSWORD
from models import (ArticleGenerate, ArticlePublish, ArticleResponse, SimpleGenerateRequest,
                    VerifyPasswordRequest, UpdateAdvancedPromptRequest, SerpScrapingRequest)
from helpers import (build_system_prompt, generate_seo_metadata, generate_with_llm,
                     publish_to_wordpress, log_activity, LLM_PROVIDERS)

logger = logging.getLogger("server")
router = APIRouter()


# ============== ARTICLES CRUD ==============

@router.get("/articles", response_model=List[ArticleResponse])
async def get_articles(client_id: Optional[str] = None, stato: Optional[str] = None,
                       current_user: dict = Depends(get_current_user)):
    query = {}
    if current_user["role"] != "admin":
        query["client_id"] = current_user.get("client_id")
    elif client_id:
        query["client_id"] = client_id
    if stato:
        query["stato"] = stato
    articles = await db.articles.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    return [ArticleResponse(**a) for a in articles]


@router.get("/articles/{article_id}", response_model=ArticleResponse)
async def get_article(article_id: str, current_user: dict = Depends(get_current_user)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    if current_user["role"] != "admin" and current_user.get("client_id") != article["client_id"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    return ArticleResponse(**article)


@router.get("/articles/{article_id}/full")
async def get_article_full(article_id: str, current_user: dict = Depends(get_current_user)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    if current_user["role"] != "admin" and current_user.get("client_id") != article["client_id"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    return article


@router.delete("/articles/{article_id}")
async def delete_article(article_id: str, current_user: dict = Depends(get_current_user)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    if current_user["role"] != "admin" and current_user.get("client_id") != article["client_id"]:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    await db.articles.delete_one({"id": article_id})
    return {"message": "Articolo eliminato"}


# ============== GENERATION ==============

@router.post("/articles/generate")
async def generate_articles(request: ArticleGenerate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and current_user.get("client_id") != request.client_id:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    client = await db.clients.find_one({"id": request.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    config = client.get("configuration", {})
    llm_config = config.get("llm", {}) or config.get("openai", {})
    if not llm_config.get("api_key"):
        raise HTTPException(status_code=400, detail="API Key LLM non configurata.")
    provider = llm_config.get("provider", "openai")
    kb = config.get("knowledge_base", {})
    tone = config.get("tono_e_stile", {})
    seo = config.get("seo", {})
    advanced_prompt = config.get("advanced_prompt", {})
    strategy = config.get("content_strategy", {})
    system_prompt = build_system_prompt(kb, tone, seo, client["nome"], advanced_prompt, strategy)
    generated_articles = []
    for combo in request.combinations:
        titolo_formatted = f"{combo['servizio']} {combo['tipo']} a {combo['citta']}".title()
        content = None
        last_error = None
        for attempt in range(3):
            try:
                content = await generate_with_llm(provider, llm_config["api_key"],
                    llm_config.get("modello", "gpt-4-turbo-preview"), llm_config.get("temperatura", 0.7),
                    system_prompt, titolo_formatted)
                break
            except Exception as e:
                last_error = e
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt)
        article_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        if content:
            seo_metadata = generate_seo_metadata(titolo_formatted, content, kb, combo)
            article_doc = {"id": article_id, "client_id": request.client_id, "titolo": titolo_formatted,
                           "contenuto": content, "stato": "generated", "wordpress_post_id": None,
                           "created_at": now, "published_at": None, "combination": combo, "seo_metadata": seo_metadata}
            await db.articles.insert_one(article_doc)
            generated_articles.append(ArticleResponse(**{k: v for k, v in article_doc.items() if k != 'seo_metadata'}))
        else:
            article_doc = {"id": article_id, "client_id": request.client_id, "titolo": titolo_formatted,
                           "contenuto": f"Errore dopo 3 tentativi: {str(last_error)}", "stato": "failed",
                           "wordpress_post_id": None, "created_at": now, "published_at": None}
            await db.articles.insert_one(article_doc)
            generated_articles.append(ArticleResponse(**article_doc))
    await db.clients.update_one({"id": request.client_id}, {"$set": {"ultimo_run": datetime.now(timezone.utc).isoformat()}})
    return {"articles": generated_articles, "generated": len([a for a in generated_articles if a.stato == "generated"])}


# ============== PUBLISH ==============

@router.post("/articles/publish")
async def publish_articles(request: ArticlePublish, current_user: dict = Depends(get_current_user)):
    published, failed = [], []
    for article_id in request.article_ids:
        article = await db.articles.find_one({"id": article_id}, {"_id": 0})
        if not article:
            failed.append({"id": article_id, "error": "Articolo non trovato"}); continue
        if current_user["role"] != "admin" and current_user.get("client_id") != article["client_id"]:
            failed.append({"id": article_id, "error": "Accesso non autorizzato"}); continue
        client = await db.clients.find_one({"id": article["client_id"]}, {"_id": 0})
        if not client:
            failed.append({"id": article_id, "error": "Cliente non trovato"}); continue
        config = client.get("configuration", {})
        wp_config = config.get("wordpress", {})
        if not wp_config.get("url_api"):
            failed.append({"id": article_id, "error": "URL API WordPress non configurato"}); continue
        if not wp_config.get("utente") or not wp_config.get("password_applicazione"):
            failed.append({"id": article_id, "error": "Credenziali WordPress non configurate"}); continue
        try:
            seo_metadata = article.get("seo_metadata", {})
            result = await publish_to_wordpress(
                url=wp_config["url_api"], username=wp_config["utente"],
                password=wp_config["password_applicazione"], title=article["titolo"],
                content=article["contenuto"], wp_status=wp_config.get("stato_pubblicazione", "draft"),
                seo_metadata=seo_metadata, tags=seo_metadata.get("tags", []))
            await db.articles.update_one({"id": article_id}, {"$set": {
                "stato": "published", "wordpress_post_id": str(result["post_id"]),
                "wordpress_link": result.get("link"), "wordpress_slug": result.get("slug"),
                "published_at": datetime.now(timezone.utc).isoformat()}})
            published.append({"id": article_id, "wordpress_post_id": result["post_id"], "link": result.get("link")})
        except Exception as e:
            failed.append({"id": article_id, "error": str(e)})
            await db.articles.update_one({"id": article_id}, {"$set": {"stato": "publish_failed", "publish_error": str(e)}})
    return {"published": published, "failed": failed, "summary": {
        "total_requested": len(request.article_ids), "published_count": len(published), "failed_count": len(failed)}}


# ============== ASYNC GENERATE AND PUBLISH ==============

@router.post("/articles/generate-and-publish")
async def generate_and_publish(request: dict, current_user: dict = Depends(get_current_user)):
    client_id = request.get("client_id")
    if not client_id:
        raise HTTPException(status_code=400, detail="client_id richiesto")
    if current_user["role"] != "admin" and current_user.get("client_id") != client_id:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    client_doc = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    config = client_doc.get("configuration", {})
    llm_config = config.get("llm", {}) or config.get("openai", {})
    if not llm_config.get("api_key"):
        raise HTTPException(status_code=400, detail="API Key LLM non configurata.")
    combinations = request.get("combinations", [])
    publish_to_wp = request.get("publish_to_wordpress", False)
    content_type = request.get("content_type", "articolo")
    brief = request.get("brief")
    if not combinations:
        raise HTTPException(status_code=400, detail="Nessuna combinazione da generare")
    job_id = str(uuid.uuid4())
    job_doc = {"id": job_id, "client_id": client_id, "status": "running",
               "total": len(combinations), "completed": 0, "results": [],
               "created_at": datetime.now(timezone.utc).isoformat()}
    await db.jobs.insert_one(job_doc)
    await log_activity(client_id, "batch_start", "running", {"total": len(combinations), "job_id": job_id, "publish": publish_to_wp})
    asyncio.create_task(_generate_and_publish_batch(job_id, client_id, combinations, publish_to_wp, content_type, brief, config, client_doc))
    return {"job_id": job_id, "status": "running", "total": len(combinations)}


async def _generate_and_publish_batch(job_id, client_id, combinations, publish_to_wp, content_type, brief, config, client_doc):
    llm_config = config.get("llm", {}) or config.get("openai", {})
    provider = llm_config.get("provider", "openai")
    kb = config.get("knowledge_base", {})
    tone = config.get("tono_e_stile", {})
    seo = config.get("seo", {})
    advanced_prompt = config.get("advanced_prompt", {})
    strategy = config.get("content_strategy", {})
    wp_config = config.get("wordpress", {})
    ct_map = {"articolo": "articolo_blog", "landing_page": "landing_page", "pillar_page": "pillar_page"}
    content_type_prompt = ct_map.get(content_type, "articolo_blog")
    system_prompt = build_system_prompt(kb, tone, seo, client_doc["nome"], advanced_prompt, strategy, content_type_prompt, brief)
    results = []
    for idx, combo in enumerate(combinations):
        titolo_formatted = f"{combo['servizio']} {combo['tipo']} a {combo['citta']}".title()
        await log_activity(client_id, "article_generate", "running", {"titolo": titolo_formatted, "step": f"{idx+1}/{len(combinations)}"})
        content = None
        gen_error = None
        for attempt in range(3):
            try:
                content = await generate_with_llm(provider, llm_config["api_key"],
                    llm_config.get("modello", "gpt-4-turbo-preview"), llm_config.get("temperatura", 0.7),
                    system_prompt, titolo_formatted)
                break
            except Exception as e:
                gen_error = str(e)
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt)
        article_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        article_result = {"titolo": titolo_formatted, "id": article_id, "generation_status": "pending", "publish_status": "pending"}
        if not content:
            await db.articles.insert_one({"id": article_id, "client_id": client_id, "titolo": titolo_formatted,
                "contenuto": f"Errore: {gen_error}", "stato": "failed", "wordpress_post_id": None,
                "created_at": now, "published_at": None, "combination": combo})
            article_result["generation_status"] = "failed"
            article_result["generation_error"] = gen_error
            await log_activity(client_id, "article_generate", "failed", {"titolo": titolo_formatted, "error": gen_error})
        else:
            import re as re_mod
            meta_match = re_mod.search(r'<!--\s*META_DESCRIPTION:\s*(.+?)\s*-->', content)
            llm_meta_desc = meta_match.group(1).strip() if meta_match else None
            if meta_match:
                content = content[:meta_match.start()].rstrip() + content[meta_match.end():]
            seo_metadata = generate_seo_metadata(titolo_formatted, content, kb, combo)
            if llm_meta_desc and len(llm_meta_desc) >= 80:
                seo_metadata["meta_description"] = llm_meta_desc[:160]
            await db.articles.insert_one({"id": article_id, "client_id": client_id, "titolo": titolo_formatted,
                "contenuto": content, "stato": "generated", "wordpress_post_id": None, "created_at": now,
                "published_at": None, "combination": combo, "seo_metadata": seo_metadata})
            article_result["generation_status"] = "success"
            article_result["seo_metadata"] = seo_metadata
            await log_activity(client_id, "article_generate", "success", {"titolo": titolo_formatted, "article_id": article_id})
            if publish_to_wp and wp_config.get("url_api") and wp_config.get("utente"):
                try:
                    wp_type = "page" if content_type in ("landing_page", "pillar_page") else "post"
                    wp_result = await publish_to_wordpress(
                        url=wp_config["url_api"], username=wp_config["utente"],
                        password=wp_config["password_applicazione"], title=titolo_formatted,
                        content=content, wp_status=wp_config.get("stato_pubblicazione", "draft"),
                        seo_metadata=seo_metadata, tags=seo_metadata.get("tags", []), wp_type=wp_type)
                    await db.articles.update_one({"id": article_id}, {"$set": {
                        "stato": "published", "wordpress_post_id": str(wp_result["post_id"]),
                        "wordpress_link": wp_result.get("link"), "wordpress_slug": wp_result.get("slug"),
                        "published_at": datetime.now(timezone.utc).isoformat()}})
                    article_result["publish_status"] = "success"
                    article_result["wordpress_post_id"] = wp_result["post_id"]
                    article_result["wordpress_link"] = wp_result.get("link")
                    await log_activity(client_id, "wordpress_publish", "success", {"titolo": titolo_formatted, "post_id": wp_result["post_id"]})
                except Exception as e:
                    await db.articles.update_one({"id": article_id}, {"$set": {"stato": "publish_failed", "publish_error": str(e)}})
                    article_result["publish_status"] = "failed"
                    article_result["publish_error"] = str(e)
                    await log_activity(client_id, "wordpress_publish", "failed", {"titolo": titolo_formatted, "error": str(e)})
            else:
                article_result["publish_status"] = "skipped"
        results.append(article_result)
        await db.jobs.update_one({"id": job_id}, {"$set": {"completed": idx + 1, "results": results}})
    gen_ok = len([r for r in results if r["generation_status"] == "success"])
    pub_ok = len([r for r in results if r["publish_status"] == "success"])
    await log_activity(client_id, "batch_complete", "success", {"total": len(results), "generated": gen_ok, "published": pub_ok})
    await db.clients.update_one({"id": client_id}, {"$set": {"ultimo_run": datetime.now(timezone.utc).isoformat()}})
    await db.jobs.update_one({"id": job_id}, {"$set": {
        "status": "completed", "completed": len(results), "results": results,
        "summary": {"total": len(results), "generated_ok": gen_ok, "generated_failed": len(results) - gen_ok,
                     "published_ok": pub_ok}, "finished_at": datetime.now(timezone.utc).isoformat()}})


# ============== SIMPLIFIED GENERATION ==============

@router.post("/articles/simple-generate")
async def simple_generate_article(request: SimpleGenerateRequest, current_user: dict = Depends(get_current_user)):
    # Admin can specify client_id, client uses their own
    if current_user["role"] == "admin":
        client_id = request.client_id
        if not client_id:
            raise HTTPException(status_code=400, detail="client_id richiesto per admin")
    else:
        client_id = current_user.get("client_id")
    if not client_id:
        raise HTTPException(status_code=400, detail="Nessun cliente associato")
    client_doc = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    config = client_doc.get("configuration", {})
    llm_config = config.get("llm", {}) or config.get("openai", {})
    if not llm_config.get("api_key"):
        raise HTTPException(status_code=400, detail="API Key LLM non configurata. Contatta l'amministratore.")
    wp_config = config.get("wordpress", {})
    if request.publish_to_wordpress and (not wp_config.get("url_api") or not wp_config.get("utente")):
        raise HTTPException(status_code=400, detail="Credenziali WordPress non configurate.")
    brief_override = {"note_speciali": request.topic or f"Scrivi un articolo sulla keyword: {request.keyword}",
                      "search_intent": {"informazionale": "informazionale", "commerciale": "commerciale", "conversione": "transazionale"}.get(request.objective, "informazionale")}
    kb = config.get("knowledge_base", {})
    ct_map = {"articolo": "articolo_blog", "landing_page": "landing_page", "pillar_page": "pillar_page"}
    content_type_prompt = ct_map.get(request.content_type, "articolo_blog")
    system_prompt = build_system_prompt(kb, config.get("tono_e_stile", {}), config.get("seo", {}),
        client_doc["nome"], config.get("advanced_prompt", {}), config.get("content_strategy", {}), content_type_prompt, brief_override)

    # Append GSC and SERP context to the system prompt
    extra_context = []
    if request.gsc_context:
        gsc_kws = request.gsc_context.get("top_keywords", [])
        if gsc_kws:
            extra_context.append("\n\n## DATI GOOGLE SEARCH CONSOLE (usa come contesto SEO):")
            for kw in gsc_kws[:10]:
                extra_context.append(f"- \"{kw.get('keyword','')}\" (posizione: {kw.get('position','N/A')}, click: {kw.get('clicks',0)}, impressioni: {kw.get('impressions',0)})")
            extra_context.append("Integra queste keyword naturalmente nel testo per rafforzare il posizionamento.")
    if request.serp_context:
        competitors = request.serp_context.get("competitors", [])
        extracted = request.serp_context.get("extracted", {})
        if competitors:
            extra_context.append("\n\n## ANALISI COMPETITOR SERP:")
            for c in competitors[:4]:
                extra_context.append(f"- #{c.get('position','')} {c.get('title','')} ({c.get('url','')[:60]})")
                if c.get("headings"):
                    extra_context.append(f"  Headings: {', '.join(c['headings'][:4])}")
            extra_context.append("Crea un articolo che copra gli stessi argomenti ma con valore aggiunto e angolo unico.")
        if extracted and extracted.get("headings"):
            extra_context.append(f"\nStruttura H2 suggerita dai competitor: {', '.join(extracted['headings'][:8])}")
    if extra_context:
        system_prompt += "\n".join(extra_context)

    job_id = str(uuid.uuid4())
    combo = {"servizio": request.keyword, "citta": kb.get("citta_principale", ""), "tipo": request.objective}
    titolo_suggerito = request.titolo_suggerito or ""
    await db.jobs.insert_one({"id": job_id, "client_id": client_id, "status": "running",
        "total": 1, "completed": 0, "results": [], "created_at": datetime.now(timezone.utc).isoformat()})
    asyncio.create_task(_run_simple_generate(job_id, client_id, request.keyword, request.topic,
        request.publish_to_wordpress, system_prompt, llm_config, wp_config, kb, combo, titolo_suggerito,
        request.content_type, request.image_ids or []))
    return {"job_id": job_id, "status": "running", "keyword": request.keyword}


async def _run_simple_generate(job_id, client_id, keyword, topic, publish_to_wp, system_prompt, llm_config, wp_config, kb, combo, titolo_suggerito="", content_type="articolo", image_ids=None):
    provider = llm_config.get("provider", "openai")
    titolo = titolo_suggerito or keyword.strip()
    await log_activity(client_id, "article_generate", "running", {"titolo": titolo, "step": "generazione"})
    try:
        content = None
        gen_error = None
        for attempt in range(3):
            try:
                user_prompt = f"{titolo}\n\nArgomento specifico: {topic}" if topic else titolo
                content = await generate_with_llm(provider, llm_config["api_key"],
                    llm_config.get("modello", "gpt-4-turbo-preview"), llm_config.get("temperatura", 0.7),
                    system_prompt, user_prompt)
                break
            except Exception as e:
                gen_error = str(e)
                if attempt < 2:
                    await asyncio.sleep(2 ** attempt)
        article_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        result = {"titolo": titolo, "generation_status": "pending", "publish_status": "pending"}
        if not content:
            await db.articles.insert_one({"id": article_id, "client_id": client_id, "titolo": titolo,
                "contenuto": f"Errore: {gen_error}", "contenuto_html": f"<p>Errore: {gen_error}</p>",
                "keyword_principale": keyword, "meta_description": "",
                "stato": "failed", "wordpress_post_id": None,
                "created_at": now, "published_at": None, "combination": combo})
            result["id"] = article_id
            result["generation_status"] = "failed"
            result["generation_error"] = gen_error
            await log_activity(client_id, "article_generate", "failed", {"titolo": titolo, "error": gen_error})
        else:
            # Extract LLM-generated meta description if present
            import re as re_mod
            meta_match = re_mod.search(r'<!--\s*META_DESCRIPTION:\s*(.+?)\s*-->', content)
            llm_meta_desc = meta_match.group(1).strip() if meta_match else None
            if meta_match:
                content = content[:meta_match.start()].rstrip() + content[meta_match.end():]
            seo_metadata = generate_seo_metadata(titolo, content, kb, combo)
            if llm_meta_desc and len(llm_meta_desc) >= 80:
                seo_metadata["meta_description"] = llm_meta_desc[:160]
            await db.articles.insert_one({"id": article_id, "client_id": client_id, "titolo": titolo,
                "contenuto": content, "contenuto_html": content,
                "keyword_principale": keyword,
                "meta_description": seo_metadata.get("meta_description", ""),
                "stato": "generated", "wordpress_post_id": None, "created_at": now,
                "published_at": None, "combination": combo, "seo_metadata": seo_metadata})
            result["id"] = article_id
            result["generation_status"] = "success"
            await log_activity(client_id, "article_generate", "success", {"titolo": titolo, "article_id": article_id})
            if publish_to_wp and wp_config.get("url_api") and wp_config.get("utente") and wp_config.get("password_applicazione"):
                try:
                    wp_type = "page" if content_type in ("landing_page", "pillar_page") else "post"
                    await log_activity(client_id, "wordpress_publish", "running", {"titolo": titolo})
                    wp_result = await publish_to_wordpress(url=wp_config["url_api"], username=wp_config["utente"],
                        password=wp_config["password_applicazione"], title=titolo, content=content,
                        wp_status=wp_config.get("stato_pubblicazione", "draft"), seo_metadata=seo_metadata,
                        tags=seo_metadata.get("tags", []), wp_type=wp_type, image_ids=image_ids or [])
                    await db.articles.update_one({"id": article_id}, {"$set": {"stato": "published",
                        "wordpress_post_id": str(wp_result["post_id"]), "wordpress_link": wp_result.get("link"),
                        "published_at": datetime.now(timezone.utc).isoformat()}})
                    result["publish_status"] = "success"
                    result["wordpress_link"] = wp_result.get("link")
                    await log_activity(client_id, "wordpress_publish", "success", {"titolo": titolo, "post_id": wp_result["post_id"], "link": wp_result.get("link")})
                except Exception as e:
                    await db.articles.update_one({"id": article_id}, {"$set": {"stato": "publish_failed", "publish_error": str(e)}})
                    result["publish_status"] = "failed"
                    result["publish_error"] = str(e)
                    await log_activity(client_id, "wordpress_publish", "failed", {"titolo": titolo, "error": str(e)})
            else:
                result["publish_status"] = "skipped"
        await db.jobs.update_one({"id": job_id}, {"$set": {"status": "completed", "completed": 1, "results": [result],
            "summary": {"total": 1, "generated_ok": 1 if result["generation_status"] == "success" else 0,
                         "published_ok": 1 if result["publish_status"] == "success" else 0},
            "finished_at": datetime.now(timezone.utc).isoformat()}})
    except Exception as e:
        logger.error(f"Fatal error in _run_simple_generate: {e}")
        await db.jobs.update_one({"id": job_id}, {"$set": {"status": "failed",
            "finished_at": datetime.now(timezone.utc).isoformat(), "error": str(e)}})
        await log_activity(client_id, "article_generate", "failed", {"titolo": titolo, "error": f"Errore fatale: {str(e)}"})


# ============== JOBS ==============

@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str, current_user: dict = Depends(get_current_user)):
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job non trovato")
    if current_user["role"] != "admin" and current_user.get("client_id") != job.get("client_id"):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    return job


# ============== STATS ==============

@router.get("/stats/overview")
async def get_overview_stats(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "admin":
        total_clients = await db.clients.count_documents({})
        active_clients = await db.clients.count_documents({"attivo": True})
        total_articles = await db.articles.count_documents({})
        published_articles = await db.articles.count_documents({"stato": "published"})
        generated_articles = await db.articles.count_documents({"stato": "generated"})
        recent_clients = await db.clients.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
        return {"total_clients": total_clients, "active_clients": active_clients, "total_articles": total_articles,
                "published_articles": published_articles, "generated_articles": generated_articles, "recent_clients": recent_clients}
    else:
        client_id = current_user.get("client_id")
        total_articles = await db.articles.count_documents({"client_id": client_id})
        published_articles = await db.articles.count_documents({"client_id": client_id, "stato": "published"})
        generated_articles = await db.articles.count_documents({"client_id": client_id, "stato": "generated"})
        return {"total_articles": total_articles, "published_articles": published_articles, "generated_articles": generated_articles}


# ============== ACTIVITY LOG ==============

@router.get("/activity-logs/{client_id}")
async def get_activity_logs(client_id: str, limit: int = 50, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and current_user.get("client_id") != client_id:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    logs = await db.activity_logs.find({"client_id": client_id}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return logs


@router.get("/activity-logs")
async def get_all_activity_logs(limit: int = 100, current_user: dict = Depends(require_admin)):
    logs = await db.activity_logs.find({}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return logs


# ============== LLM PROVIDERS ==============

@router.get("/llm-providers")
async def get_llm_providers():
    return {"providers": [
        {"id": "openai", "name": "OpenAI", "models": [
            {"id": "gpt-4-turbo-preview", "name": "GPT-4 Turbo (Raccomandato)"},
            {"id": "gpt-4o", "name": "GPT-4o"}, {"id": "gpt-4", "name": "GPT-4"},
            {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo (Economico)"}]},
        {"id": "anthropic", "name": "Claude (Anthropic)", "models": [
            {"id": "claude-sonnet-4-5-20250929", "name": "Claude Sonnet 4.5"},
            {"id": "claude-3-5-haiku-20241022", "name": "Claude Haiku 3.5"},
            {"id": "claude-3-opus-20240229", "name": "Claude Opus 3"}]},
        {"id": "deepseek", "name": "DeepSeek", "models": [
            {"id": "deepseek-chat", "name": "DeepSeek Chat"},
            {"id": "deepseek-coder", "name": "DeepSeek Coder"},
            {"id": "deepseek-reasoner", "name": "DeepSeek Reasoner (R1)"}]},
        {"id": "perplexity", "name": "Perplexity", "models": [
            {"id": "sonar-pro", "name": "Sonar Pro"},
            {"id": "sonar", "name": "Sonar"},
            {"id": "llama-3.1-sonar-large-128k-online", "name": "Llama 3.1 Sonar Large"}]}]}


# ============== PASSWORDS ==============

@router.post("/verify-admin-password")
async def verify_admin_password(request: VerifyPasswordRequest, current_user: dict = Depends(get_current_user)):
    if request.password == ADMIN_MASTER_PASSWORD:
        return {"valid": True, "access_level": "admin"}
    return {"valid": False}


@router.post("/verify-prompt-password")
async def verify_prompt_password(request: VerifyPasswordRequest, current_user: dict = Depends(get_current_user)):
    if not request.client_id:
        raise HTTPException(status_code=400, detail="client_id richiesto")
    if request.password == ADMIN_MASTER_PASSWORD:
        return {"valid": True, "access_level": "admin"}
    client = await db.clients.find_one({"id": request.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    client_password = client.get("configuration", {}).get("advanced_prompt", {}).get("prompt_password", "")
    if client_password and request.password == client_password:
        return {"valid": True, "access_level": "client"}
    return {"valid": False}


@router.put("/clients/{client_id}/advanced-prompt")
async def update_advanced_prompt(client_id: str, request: UpdateAdvancedPromptRequest, current_user: dict = Depends(get_current_user)):
    is_admin = request.password == ADMIN_MASTER_PASSWORD
    if not is_admin:
        client = await db.clients.find_one({"id": client_id}, {"_id": 0})
        if not client:
            raise HTTPException(status_code=404, detail="Cliente non trovato")
        client_password = client.get("configuration", {}).get("advanced_prompt", {}).get("prompt_password", "")
        if not client_password or request.password != client_password:
            raise HTTPException(status_code=403, detail="Password non valida")
    update_data = {}
    if request.secondo_livello_prompt is not None:
        update_data["configuration.advanced_prompt.secondo_livello_prompt"] = request.secondo_livello_prompt
    if request.keyword_injection_template is not None:
        update_data["configuration.advanced_prompt.keyword_injection_template"] = request.keyword_injection_template
    if is_admin and request.prompt_password is not None:
        update_data["configuration.advanced_prompt.prompt_password"] = request.prompt_password
    if not update_data:
        raise HTTPException(status_code=400, detail="Nessun dato da aggiornare")
    result = await db.clients.update_one({"id": client_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    return {"message": "Prompt avanzato aggiornato", "is_admin": is_admin}


# ============== SERP ==============

@router.post("/serp/search")
async def serp_search(request: dict, current_user: dict = Depends(get_current_user)):
    from helpers import scrape_google_serp
    keyword = request.get("keyword", "").strip()
    if not keyword:
        raise HTTPException(status_code=400, detail="Keyword obbligatoria")
    country = request.get("country", "it")
    num_results = min(request.get("num_results", 5), 10)
    results = await scrape_google_serp(keyword, country, num_results)
    return {"keyword": keyword, "country": country, "results": results, "count": len(results)}


@router.post("/serp/analyze-full")
async def serp_full_analysis(request: dict, current_user: dict = Depends(get_current_user)):
    """Full SERP analysis: search + extract titles/headings from top results."""
    from helpers import scrape_google_serp
    keyword = request.get("keyword", "").strip()
    if not keyword:
        raise HTTPException(status_code=400, detail="Keyword obbligatoria")
    country = request.get("country", "it")
    num_results = min(request.get("num_results", 4), 10)
    results = await scrape_google_serp(keyword, country, num_results)
    # Build structured competitor analysis
    competitors = []
    for r in results:
        competitors.append({
            "position": r["position"],
            "url": r["url"],
            "title": r["title"],
            "headings": r.get("headings", []),
            "description": r.get("description", ""),
            "text_preview": r.get("text_preview", "")
        })
    # Build suggested prompt context from SERP data
    serp_titles = [c["title"] for c in competitors if c["title"]]
    serp_headings = []
    for c in competitors:
        for h in c.get("headings", []):
            if h and h not in serp_headings:
                serp_headings.append(h)
    return {
        "keyword": keyword,
        "competitors": competitors,
        "count": len(competitors),
        "extracted": {
            "titles": serp_titles,
            "headings": serp_headings[:20]
        }
    }



@router.post("/clients/{client_id}/serp-analysis")
async def analyze_serp(client_id: str, request: SerpScrapingRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and current_user.get("client_id") != client_id:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    config = client.get("configuration", {})
    apify_config = config.get("apify", {})
    api_key = apify_config.get("api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="API Key Apify non configurata")
    # Legacy Apify endpoint - kept for backward compatibility
    raise HTTPException(status_code=400, detail="Usa il nuovo endpoint /api/serp/search")


@router.get("/clients/{client_id}/serp-history")
async def get_serp_history(client_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and current_user.get("client_id") != client_id:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    analyses = await db.serp_analyses.find({"client_id": client_id}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    return {"analyses": analyses}


# ============== SAVE AND GENERATE ==============

@router.post("/clients/{client_id}/save-and-generate")
async def save_and_generate(client_id: str, session_name: str = "", notes: str = "",
                             generate_articles: bool = True, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and current_user.get("client_id") != client_id:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    config = client.get("configuration", {})
    keywords = config.get("keyword_combinations", {})
    advanced_prompt = config.get("advanced_prompt", {})
    yesterday = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    serp_docs = await db.serp_analyses.find({"client_id": client_id, "created_at": {"$gte": yesterday}}, {"_id": 0}).to_list(20)
    if not session_name:
        session_name = f"Sessione {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')}"
    session_id = str(uuid.uuid4())
    session_doc = {"id": session_id, "client_id": client_id, "session_name": session_name,
        "keywords": keywords, "serp_analyses": serp_docs,
        "advanced_prompt": {"secondo_livello_prompt": advanced_prompt.get("secondo_livello_prompt", ""),
                            "keyword_injection_template": advanced_prompt.get("keyword_injection_template", "")},
        "notes": notes, "articles_generated": 0, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.seo_sessions.insert_one(session_doc)
    generated_count = 0
    if generate_articles:
        servizi = keywords.get("servizi", [])
        citta = keywords.get("citta_e_zone", [])
        tipi = keywords.get("tipi_o_qualificatori", [])
        combinations = [{"servizio": c[0], "citta": c[1], "tipo": c[2]} for c in itertools.product(servizi, citta, tipi)]
        generated_count = len(combinations)
        await db.seo_sessions.update_one({"id": session_id}, {"$set": {"articles_generated": generated_count, "combinations": combinations}})
    return {"session_id": session_id, "session_name": session_name, "message": "Sessione salvata",
            "keywords_saved": {"servizi": len(keywords.get("servizi", [])), "citta": len(keywords.get("citta_e_zone", [])),
                               "tipi": len(keywords.get("tipi_o_qualificatori", []))},
            "combinations_ready": generated_count}
