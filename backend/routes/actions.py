from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user
from services.article_service import ArticleService
from helpers import publish_to_wordpress, update_wordpress_post, search_wordpress_post, get_wordpress_post, fetch_sitemap, get_wp_id_by_url, log_activity
from services.email_service import send_notification_email
from database import db
import logging
import uuid
import asyncio
from datetime import datetime, timezone

logger = logging.getLogger("server")
router = APIRouter()

@router.post("/execute")
async def execute_chat_action(request: dict, current_user: dict = Depends(get_current_user)):
    client_id = request.get("client_id")
    action_type = request.get("type")
    payload = request.get("payload", {})
    
    if not client_id or not action_type or not payload:
        raise HTTPException(status_code=400, detail="Parametri mancanti (client_id, type, payload)")

    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    try:
        # Get client config for WP
        client_doc = await db.clients.find_one({"id": client_id})
        if not client_doc:
            raise HTTPException(status_code=404, detail="Cliente non trovato")
        
        config = client_doc.get("configuration", {})
        wp_config = config.get("wordpress", {})

        if action_type == "CREATE_ARTICLE":
            # Traditional queue-based creation
            title = payload.get("title")
            keywords = payload.get("keywords", [])
            article_id = str(uuid.uuid4())
            await db.articles.insert_one({
                "id": article_id,
                "client_id": client_id,
                "titolo": title,
                "focus_keywords": keywords,
                "stato": "pending",
                "created_at": datetime.now(timezone.utc).isoformat()
            })
            return {"status": "success", "message": "Articolo aggiunto alla coda", "id": article_id}
            
        elif action_type == "PUBLISH_ARTICLE":
            # Immediate Generation and Publication
            title = payload.get("title")
            keywords = payload.get("keywords", [])
            topic = payload.get("topic", "")
            
            if not wp_config.get("url_api") or not wp_config.get("utente"):
                raise HTTPException(status_code=400, detail="Configurazione WordPress mancante per questo cliente")

            # Create a background job for this single article
            job_id = await ArticleService.create_job(client_id, 1)
            
            # Start generation in background (asyncio.create_task)
            # We use a simplified wrapper or the ArticleService method
            asyncio.create_task(ArticleService.run_simple_article_generation(
                job_id=job_id,
                client_id=client_id,
                keyword=keywords[0] if keywords else title,
                topic=topic,
                publish_to_wp=True,
                system_prompt="", # Will be built inside or passed
                llm_config=config.get("llm", {}) or config.get("openai", {}),
                wp_config=wp_config,
                kb=config.get("knowledge_base", {}),
                combo={"servizio": title},
                titolo_suggerito=title,
                content_type="articolo"
            ))
            
            return {"status": "success", "message": "Generazione e pubblicazione avviata", "job_id": job_id}

        elif action_type == "FIX_CONTENT":
            # Direct update of a WordPress post
            post_id = payload.get("wordpress_post_id") or payload.get("post_id")
            url_target = payload.get("url")
            # Support both new_content and content (alias)
            new_content = payload.get("new_content") or payload.get("content")
            new_title = payload.get("title")
            wp_type = payload.get("wp_type", "post")
            suggestion = payload.get("suggestion", "")
            
            logger.info(f"FIX_CONTENT: url={url_target}, post_id={post_id}, has_content={bool(new_content)}, has_title={bool(new_title)}, suggestion={suggestion[:80]}")

            if not post_id and url_target:
                # 1. Local DB search to bypass SiteGround completely
                from urllib.parse import urlparse
                parsed = urlparse(url_target)
                slug = parsed.path.strip("/").split("/")[-1]
                if slug:
                    local_art = await db.articles.find_one({"client_id": client_id, "wordpress_link": {"$regex": slug}}, {"wordpress_post_id": 1})
                    if local_art and local_art.get("wordpress_post_id"):
                        post_id = local_art["wordpress_post_id"]
                        logger.info(f"FIX_CONTENT: Found WP ID {post_id} in local MongoDB for slug {slug}")
                
                # 2. Try to discover the ID and TYPE from the URL if local search fails
                if not post_id:
                    discovery = await get_wp_id_by_url(
                        url=wp_config.get("url_api"),
                        username=wp_config.get("utente"),
                        password=wp_config.get("password_applicazione"),
                        target_url=url_target
                    )
                    if discovery:
                        post_id = discovery["id"]
                        wp_type = discovery["type"]
                        logger.info(f"FIX_CONTENT: Discovered WP ID {post_id} ({wp_type}) for URL {url_target}")
                    else:
                        logger.error(f"FIX_CONTENT: Could not discover WP ID for URL {url_target}")

            if not post_id:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Impossibile trovare l'ID WordPress per {url_target or 'URL mancante'}. SiteGround potrebbe bloccare le richieste API. Riprova tra qualche secondo."
                )
            
            if not new_content and not new_title:
                raise HTTPException(
                    status_code=400, 
                    detail="L'AI non ha fornito il contenuto aggiornato (new_content) né un nuovo titolo. Chiedi all'esperto di generare l'azione FIX_CONTENT completa."
                )

            logger.info(f"FIX_CONTENT: Updating WP {wp_type} {post_id} (content_len={len(new_content) if new_content else 0})")
            
            success = await update_wordpress_post(
                url=wp_config.get("url_api"),
                username=wp_config.get("utente"),
                password=wp_config.get("password_applicazione"),
                post_id=str(post_id),
                content=new_content,
                wp_type=wp_type,
                title=new_title
            )
            
            if success:
                # 1. Log activity for history
                client_label = ""
                client = await db.clients.find_one({"id": client_id}, {"_id": 0, "nome": 1})
                if client:
                    client_label = client.get("nome", "")
                    
                await log_activity(
                    client_id, 
                    "chat_fix_content", 
                    "success", 
                    {"url": url_target, "post_id": post_id, "suggestion": suggestion}
                )
                
                # 2. Send email notification
                email_body = f"""
                <h2 style="color:#1a2332;font-size:18px;margin:0 0 16px;">✨ Modifica applicata via Chat SEO</h2>
                <p style="color:#4a5568;font-size:14px;line-height:1.6;margin:0 0 20px;">
                  È stata appena applicata una modifica su un contenuto del cliente <strong style="color:#1a2332;">{client_label or client_id}</strong> tramite la chat interattiva.
                </p>
                <table style="width:100%;border-collapse:collapse;margin-top:16px;">
                  <tr>
                    <td style="padding:8px 12px;border-bottom:1px solid #e8ecf0;color:#8a94a6;font-size:12px;text-transform:uppercase;">URL</td>
                    <td style="padding:8px 12px;border-bottom:1px solid #e8ecf0;color:#1a2332;font-size:14px;"><a href="{url_target}" style="color:#3d9970;">Link Articolo</a></td>
                  </tr>
                  <tr>
                    <td style="padding:8px 12px;color:#8a94a6;font-size:12px;text-transform:uppercase;">Dettagli</td>
                    <td style="padding:8px 12px;color:#1a2332;font-size:14px;">{suggestion or 'Correzione di contenuto applicata'}</td>
                  </tr>
                </table>
                """
                
                asyncio.create_task(send_notification_email(
                    subject=f"✨ {client_label or 'Cliente'}: Modifica applicata via SEO Chat",
                    body_html=email_body,
                    event_type="client_article"
                ))

                # Trigger automatic indexing if we have a URL
                if url_target:
                    asyncio.create_task(ArticleService._request_gsc_indexing(client_id, url_target))
                return {
                    "status": "success", 
                    "message": f"Contenuto aggiornato su WordPress ({wp_type} ID: {post_id})", 
                    "post_id": post_id,
                    "suggestion": suggestion
                }
            else:
                logger.error(f"FIX_CONTENT FAILED: WP {wp_type} {post_id} - SiteGround may be blocking")
                raise HTTPException(
                    status_code=500, 
                    detail=f"Errore nell'aggiornamento WordPress ({wp_type} ID: {post_id}). Verifica che l'ID sia corretto o se ci sono restrizioni di sicurezza (API/WAF) sul server."
                )
            
        elif action_type == "SEARCH_WP":
            query = payload.get("query")
            wp_type = payload.get("wp_type", "post")
            if not query:
                raise HTTPException(status_code=400, detail="query richiesto")
            
            results = await search_wordpress_post(
                url=wp_config.get("url_api"),
                username=wp_config.get("utente"),
                password=wp_config.get("password_applicazione"),
                query=query,
                wp_type=wp_type
            )
            return {"status": "success", "results": results}

        elif action_type == "GET_WP_POST":
            post_id = payload.get("post_id")
            url_target = payload.get("url")
            wp_type = payload.get("wp_type", "post")
            
            # ALWAYS check local database first to bypass SiteGround limitations
            if url_target or post_id:
                query = {"client_id": client_id}
                if url_target:
                    from urllib.parse import urlparse
                    parsed = urlparse(url_target)
                    slug = parsed.path.strip("/").split("/")[-1]
                    if slug:
                        query["wordpress_link"] = {"$regex": slug}
                if post_id and "wordpress_link" not in query:
                    query["wordpress_post_id"] = str(post_id)
                
                if "wordpress_link" in query or "wordpress_post_id" in query:
                    local_art = await db.articles.find_one(query)
                    if local_art:
                        if not post_id and local_art.get("wordpress_post_id"):
                            post_id = local_art["wordpress_post_id"]
                        
                        # Return local database copy immediately, bypassing SiteGround completely
                        if local_art.get("contenuto_html") or local_art.get("contenuto"):
                            logger.info(f"GET_WP_POST: Bypassing SG API. Returned local DB article for target {url_target or post_id}")
                            post_data = {
                                "id": str(post_id) if post_id else "0",
                                "title": local_art.get("titolo", "Titolo Sconosciuto"),
                                "content": local_art.get("contenuto_html") or local_art.get("contenuto", ""),
                                "link": local_art.get("wordpress_link", url_target)
                            }
                            return {"status": "success", "post": post_data, "wp_type": wp_type, "method": "local_db"}
            
            if not post_id and url_target:
                # Try discovery if local search fails
                discovery = await get_wp_id_by_url(
                    url=wp_config.get("url_api"),
                    username=wp_config.get("utente"),
                    password=wp_config.get("password_applicazione"),
                    target_url=url_target
                )
                if discovery:
                    post_id = discovery["id"]
                    wp_type = discovery["type"]

            if not post_id:
                # If we can't discover the ID but have the URL, try HTML scrape directly
                if url_target:
                    post = await get_wordpress_post(
                        url=wp_config.get("url_api"),
                        username=wp_config.get("utente"),
                        password=wp_config.get("password_applicazione"),
                        post_id="0",  # dummy ID, will use HTML fallback
                        wp_type=wp_type,
                        target_url=url_target
                    )
                    if post:
                        return {"status": "success", "post": post, "wp_type": wp_type, "method": "html_fallback"}
                raise HTTPException(status_code=400, detail="Impossibile trovare l'ID WordPress per questo URL. Verifica che l'articolo esista e sia indicizzato.")
            
            post = await get_wordpress_post(
                url=wp_config.get("url_api"),
                username=wp_config.get("utente"),
                password=wp_config.get("password_applicazione"),
                post_id=post_id,
                wp_type=wp_type,
                target_url=url_target
            )
            if post:
                # Normalize response: HTML fallback returns nested dicts, API returns strings
                normalized_post = {
                    "id": post.get("id"),
                    "title": post["title"]["rendered"] if isinstance(post.get("title"), dict) else post.get("title", ""),
                    "content": post["content"]["rendered"] if isinstance(post.get("content"), dict) else post.get("content", ""),
                    "link": post.get("link", url_target or "")
                }
                return {"status": "success", "post": normalized_post, "wp_type": wp_type}
            else:
                raise HTTPException(status_code=404, detail=f"{wp_type} non trovato")

        elif action_type == "GET_SITEMAP":
            sitemap_url = payload.get("url") or config.get("seo", {}).get("sitemap_url")
            if not sitemap_url:
                # Guess from WP API URL
                base = wp_config.get("url_api").split("/wp-json")[0]
                sitemap_url = f"{base}/sitemap.xml"
                
            urls = await fetch_sitemap(sitemap_url)
            return {"status": "success", "urls": urls, "sitemap_url": sitemap_url}

        elif action_type == "TRIGGER_FRESHNESS":
            url = payload.get("url")
            if not url:
                raise HTTPException(status_code=400, detail="url richiesto")
            
            # Here we would call the freshness service
            # For now, we'll mark the article for freshness if it exists in our DB
            updated = await db.articles.find_one_and_update(
                {"link": url, "client_id": client_id},
                {"$set": {"last_freshness_check": datetime.now(timezone.utc).isoformat()}}
            )
            return {"status": "success", "message": f"Freshness triggerata per {url}", "updated": bool(updated)}

        else:
            raise HTTPException(status_code=400, detail="Tipo azione non supportato")
            
    except HTTPException as he:
        # Don't wrap HTTPExceptions into 500s
        raise he
    except Exception as e:
        logger.error(f"Action execution error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore esecuzione: {str(e)}")
