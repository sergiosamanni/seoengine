from fastapi import APIRouter, Depends, HTTPException
from auth import get_current_user
from services.article_service import ArticleService
from database import db
import logging

logger = logging.getLogger("server")
router = APIRouter()

@router.post("/clients/{client_id}/chat/execute-action")
async def execute_chat_action(client_id: str, request: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    action_type = request.get("type")
    payload = request.get("payload", {})
    
    if not action_type or not payload:
        raise HTTPException(status_code=400, detail="Azione o dati mancanti")
    
    try:
        if action_type == "CREATE_ARTICLE":
            title = payload.get("title")
            keywords = payload.get("keywords", [])
            if not title:
                raise HTTPException(status_code=400, detail="Titolo articolo mancante")
            
            # Use ArticleService to add to queue/create
            article_id = await ArticleService.create_article(client_id, {
                "titolo": title,
                "focus_keywords": keywords,
                "status": "pending"
            })
            return {"status": "success", "message": "Articolo aggiunto alla coda", "id": article_id}
            
        elif action_type == "FIX_CONTENT":
            # Placeholder for actual content fix logic
            return {"status": "success", "message": "Suggerimento di modifica registrato"}
            
        else:
            raise HTTPException(status_code=400, detail="Tipo azione non supportato")
            
    except Exception as e:
        logger.error(f"Action execution error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
