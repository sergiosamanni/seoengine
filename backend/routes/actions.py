from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user
from services.article_service import ArticleService
from helpers import publish_to_wordpress, update_wordpress_post, search_wordpress_post, get_wordpress_post, fetch_sitemap, get_wp_id_by_url
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
            
            logger.info(f"FIX_CONTENT payload keys: {list(payload.keys())}")

            if not post_id and url_target:
                # Try to discover the ID and TYPE from the URL
                discovery = await get_wp_id_by_url(
                    url=wp_config.get("url_api"),
                    username=wp_config.get("utente"),
                    password=wp_config.get("password_applicazione"),
                    target_url=url_target
                )
                if discovery:
                    post_id = discovery["id"]
                    wp_type = discovery["type"]
                    logger.info(f"Discovered WP ID {post_id} ({wp_type}) for URL {url_target}")

            if not post_id or (not new_content and not new_title):
                missing = []
                if not post_id: missing.append("post_id/url")
                if not new_content and not new_title: missing.append("new_content o title")
                raise HTTPException(status_code=400, detail=f"Parametri richiesti mancanti: {', '.join(missing)}")

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
                # Trigger automatic indexing if we have a URL
                if url_target:
                    asyncio.create_task(ArticleService._request_gsc_indexing(client_id, url_target))
                return {"status": "success", "message": f"Contenuto aggiornato su WordPress ({wp_type})", "post_id": post_id}
            else:
                logger.error(f"Failed to update WP {wp_type} {post_id}")
                raise HTTPException(status_code=500, detail="Errore nell'aggiornamento WordPress")
            
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
            
            if not post_id and url_target:
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
                raise HTTPException(status_code=400, detail="post_id o url richiesto")
            
            post = await get_wordpress_post(
                url=wp_config.get("url_api"),
                username=wp_config.get("utente"),
                password=wp_config.get("password_applicazione"),
                post_id=post_id,
                wp_type=wp_type
            )
            if post:
                return {"status": "success", "post": post, "wp_type": wp_type}
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
