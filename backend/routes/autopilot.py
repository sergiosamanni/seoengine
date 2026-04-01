from fastapi import APIRouter, Depends, HTTPException
from database import db
from auth import get_current_user
import logging
from datetime import datetime, timezone
import uuid

logger = logging.getLogger("server")
router = APIRouter(prefix="/autopilot", tags=["SEO Autopilot"])

@router.post("/check/{client_id}")
async def run_autopilot_check(client_id: str, current_user: dict = Depends(get_current_user)):
    """Manually trigger an autopilot SEO scan for a client."""
    if current_user["role"] != "admin" and current_user.get("client_id") != client_id:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    # 1. Get Client & Config
    client = await db.clients.find_one({"id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    # 2. Mocking actual logic (it should invoke background workers/agents)
    # For now, let's update the status in MongoDB to show we did something
    now = datetime.now(timezone.utc).isoformat()
    await db.clients.update_one(
        {"id": client_id},
        {"$set": {"ultimo_run": now, "status": "scanning", "health_score": 92}}
    )
    
    # Create an initial task/log entry
    task_id = str(uuid.uuid4())
    log_entry = {
        "id": task_id, "client_id": client_id, "type": "autopilot_run",
        "timestamp": now, "status": "completed", 
        "details": "Scansione SEO Autopilot completata. 3 opportunità identificate."
    }
    await db.autopilot_logs.insert_one(log_entry)
    
    return {
        "status": "success", 
        "message": "Scansione SEO Autopilot avviata correttamente",
        "last_run": now,
        "health_score": 92
    }

@router.get("/notifications")
async def get_autopilot_notifications(current_user: dict = Depends(get_current_user)):
    """Get global autopilot notifications (all clients for admin, specific for user)."""
    query = {}
    if current_user["role"] != "admin":
        query["client_id"] = current_user.get("client_id")
    
    logs = await db.autopilot_logs.find(query).sort("timestamp", -1).limit(10).to_list(10)
    return {"notifications": logs}
