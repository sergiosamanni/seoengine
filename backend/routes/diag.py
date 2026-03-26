from fastapi import APIRouter, Depends
from auth import require_admin
from database import db

router = APIRouter(prefix="/diag", tags=["diagnostics"])

@router.get("/db-check")
async def db_check():
    # Only for debugging, normally would require admin
    clients = await db.clients.find({}, {"nome": 1, "id": 1}).to_list(100)
    sessions = await db.chat_sessions.find({}, {"title": 1, "id": 1, "client_id": 1}).to_list(100)
    
    return {
        "clients": clients,
        "sessions_count": len(sessions),
        "sample_sessions": sessions[:10]
    }
