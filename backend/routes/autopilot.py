from fastapi import APIRouter, Depends, HTTPException
from database import db
from auth import get_current_user
from datetime import datetime, timezone, timedelta
import logging

logger = logging.getLogger("server")
router = APIRouter()

@router.get("/autopilot/notifications")
async def get_autopilot_notifications(current_user: dict = Depends(get_current_user)):
    """Fetch pending autopilot tasks for the admin notification badge."""
    if current_user["role"] != "admin":
        return {"notifications": []}

    # Fetch tasks from the last 7 days that are pending
    seven_days_ago = (datetime.now(timezone.utc) - timedelta(days=7)).isoformat()
    
    cursor = db.autopilot_tasks.find({
        "status": "pending",
        "created_at": {"$gte": seven_days_ago},
        "seen_by_admin": {"$ne": True}
    }).sort("created_at", -1)

    tasks = []
    client_ids = set()
    async for task in cursor:
        task["_id"] = str(task["_id"])
        tasks.append(task)
        client_ids.add(task["client_id"])

    # Fetch client names for mapping
    clients = {}
    if client_ids:
        client_cursor = db.clients.find({"id": {"$in": list(client_ids)}}, {"id": 1, "nome": 1})
        async for c in client_cursor:
            clients[c["id"]] = c["nome"]

    # Enrich tasks with client names
    for t in tasks:
        t["client_name"] = clients.get(t["client_id"], "Cliente Sconosciuto")

    return {
        "notifications": tasks,
        "count": len(tasks),
        "unread_clients_count": len(client_ids)
    }

@router.post("/autopilot/notifications/mark-seen")
async def mark_notifications_seen(body: dict, current_user: dict = Depends(get_current_user)):
    """Mark all current notifications as seen."""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    await db.autopilot_tasks.update_many(
        {"status": "pending", "seen_by_admin": {"$ne": True}},
        {"$set": {"seen_by_admin": True}}
    )
    return {"status": "success"}
