from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user
from services.article_service import ArticleService
from helpers import publish_to_wordpress, update_wordpress_post
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
            new_content = payload.get("new_content")
            
            if not post_id or not new_content:
                raise HTTPException(status_code=400, detail="post_id e new_content richiesti")

            success = await update_wordpress_post(
                url=wp_config.get("url_api"),
                username=wp_config.get("utente"),
                password=wp_config.get("password_applicazione"),
                post_id=post_id,
                content=new_content
            )
            
            if success:
                return {"status": "success", "message": "Contenuto aggiornato su WordPress"}
            else:
                raise HTTPException(status_code=500, detail="Errore nell'aggiornamento WordPress")
            
        else:
            raise HTTPException(status_code=400, detail="Tipo azione non supportato")
            
    except Exception as e:
        logger.error(f"Action execution error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
