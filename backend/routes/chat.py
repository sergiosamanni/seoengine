import logging
import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from database import db
from auth import get_current_user
from models import ChatSessionCreate, ChatSessionResponse, ChatMessage
from services.chat_service import ChatService

logger = logging.getLogger("server")
router = APIRouter()

@router.get("/sessions", response_model=List[ChatSessionResponse])
async def get_sessions(client_id: str, current_user: dict = Depends(get_current_user)):
    # Standardize: check if user is admin or belongs to the client
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
        
    query = {"client_id": client_id}
    if current_user["role"] != "admin":
        query["user_id"] = current_user["id"] or current_user.get("sub") or "user"
        
    sessions = await db.chat_sessions.find(query, {"_id": 0, "messages": 0}).sort("updated_at", -1).to_list(100)
    return [ChatSessionResponse(**s) for s in sessions]


@router.post("/sessions", response_model=ChatSessionResponse)
async def create_session(request: dict, current_user: dict = Depends(get_current_user)):
    client_id = request.get("client_id")
    if not client_id:
        raise HTTPException(status_code=400, detail="client_id richiesto")
        
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
        
    session_id = str(uuid.uuid4())
    user_id = current_user.get("id") or current_user.get("sub") or "user"
    now = datetime.now(timezone.utc).isoformat()
    
    doc = {
        "id": session_id,
        "client_id": client_id,
        "user_id": user_id,
        "title": f"Chat {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')}",
        "messages": [],
        "created_at": now,
        "updated_at": now
    }
    await db.chat_sessions.insert_one(doc)
    return ChatSessionResponse(**doc)


@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessage])
async def get_messages(session_id: str, current_user: dict = Depends(get_current_user)):
    # Simple message fetch
    messages = await ChatService.get_session_messages(session_id)
    return [ChatMessage(**m) for m in messages]

@router.post("/message", response_model=ChatMessage)
async def send_message(request: dict, current_user: dict = Depends(get_current_user)):
    client_id = request.get("client_id")
    session_id = request.get("session_id")
    content = request.get("content")
    
    print(f"DEBUG: FLAT ROUTE POST message. cid={client_id}, sid={session_id}")
    
    if not client_id or not session_id or not content:
        raise HTTPException(status_code=400, detail="Mancano parametri (client_id, session_id, content)")

    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    try:
        user_id = current_user.get("id") or current_user.get("sub") or "user"
        msg = await ChatService.process_user_message(client_id, session_id, user_id, content)
        return msg
    except ValueError as e:
        print(f"DEBUG: Chat ValueError: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        import traceback
        logger.error(f"Chat Error: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=str(e))
