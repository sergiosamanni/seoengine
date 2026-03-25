import logging
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException
from database import db
from auth import get_current_user
from models import ChatSessionCreate, ChatSessionResponse, ChatMessage
from services.chat_service import ChatService

logger = logging.getLogger("server")
router = APIRouter()

@router.get("/clients/{client_id}/chat/sessions", response_model=List[ChatSessionResponse])
async def list_chat_sessions(client_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    sessions = await ChatService.get_sessions(client_id, user_id=None if current_user["role"] == "admin" else current_user["user_id"])
    return [ChatSessionResponse(**s) for s in sessions]

@router.post("/clients/{client_id}/chat/sessions", response_model=ChatSessionResponse)
async def create_chat_session(client_id: str, request: ChatSessionCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    session_id = await ChatService.create_session(client_id, current_user["user_id"], request.title)
    session = await db.chat_sessions.find_one({"id": session_id}, {"_id": 0})
    return ChatSessionResponse(**session)

@router.get("/clients/{client_id}/chat/sessions/{session_id}/messages", response_model=List[ChatMessage])
async def get_chat_messages(client_id: str, session_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    messages = await ChatService.get_session_messages(session_id)
    return [ChatMessage(**m) for m in messages]

@router.post("/clients/{client_id}/chat/sessions/{session_id}/message", response_model=ChatMessage)
async def send_chat_message(client_id: str, session_id: str, request: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    content = request.get("content")
    if not content:
        raise HTTPException(status_code=400, detail="Contenuto messaggio richiesto")
    
    try:
        response = await ChatService.process_user_message(client_id, session_id, current_user["user_id"], content)
        return ChatMessage(**response)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Errore Chat: {e}")
        raise HTTPException(status_code=500, detail="Errore durante l'elaborazione del messaggio")
