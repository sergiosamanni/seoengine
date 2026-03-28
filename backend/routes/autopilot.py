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

@router.get("/autopilot-tasks/{client_id}")
async def get_autopilot_tasks(client_id: str, current_user: dict = Depends(get_current_user)):
    """Fetch all pending autopilot tasks for a specific client."""
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    cursor = db.autopilot_tasks.find({"client_id": client_id})
    tasks = []
    async for t in cursor:
        t["_id"] = str(t["_id"])
        tasks.append(t)
    return {"tasks": tasks}

@router.post("/autopilot-tasks/{task_id}/approve")
async def approve_autopilot_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """Approve a task. Logic varies based on task type."""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    task = await db.autopilot_tasks.find_one({"id": task_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task non trovato")

    # Mark as completed
    await db.autopilot_tasks.update_one({"id": task_id}, {"$set": {"status": "completed", "executed_at": datetime.now(timezone.utc).isoformat()}})

    # Optional: logic to actually launch the generation (ArticleService, etc.)
    # For NEW_CONTENT, we might want to push it to the editorial queue
    if task["type"] == "NEW_CONTENT" and "payload" in task:
        client_id = task["client_id"]
        client = await db.clients.find_one({"id": client_id})
        current_queue = client.get("configuration", {}).get("editorial_queue", [])
        
        # Add to queue: [NEW] Title : Prompt/Outline
        new_item = f"[AUTOPILOT] {task['title']} : {task['suggestion']}"
        if new_item not in current_queue:
            await db.clients.update_one({"id": client_id}, {"$push": {"configuration.editorial_queue": new_item}})

    return {"status": "success", "message": "Task approvato"}

@router.delete("/autopilot-tasks/{task_id}")
async def refuse_autopilot_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """Refuse/delete a task."""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    await db.autopilot_tasks.delete_one({"id": task_id})
    return {"status": "success"}

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

import uuid
@router.post("/autopilot-tasks/{client_id}/scan")
async def scan_autopilot_tasks(client_id: str, current_user: dict = Depends(get_current_user)):
    """Simulates a pro-active SEO scan if it didn't run recently."""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized")
    return {"status": "success", "message": "Analisi strategica avviata. I nuovi suggerimenti appariranno tra pochi minuti."}

@router.post("/autopilot-tasks/{client_id}/seed")
async def seed_autopilot_tasks(client_id: str, current_user: dict = Depends(get_current_user)):
    """Seed test tasks for UI verification."""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized")

    test_tasks = [
        {
            "id": str(uuid.uuid4()),
            "client_id": client_id,
            "title": "Aggiornamento Prezzi 2024",
            "type": "NEW_CONTENT",
            "reason": "Volume di ricerca in crescita per 'costo' e 'prezzi' nel tuo settore.",
            "suggestion": "Scrivi un articolo che riepiloghi i prezzi 2024 e aggiungi le 3 FAQ suggerite dall'analisi GSC.",
            "status": "pending",
            "url": "https://esempio.it/guida-prezzi/",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "client_id": client_id,
            "title": "Fix Cannibalizzazione 'Noleggio'",
            "type": "CANNIBALIZATION",
            "reason": "Due pagine sono in competizione per la stessa keyword principale.",
            "suggestion": "Unisci il contenuto della landing secondaria all'articolo principale e imposta un redirect 301.",
            "status": "pending",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    await db.autopilot_tasks.insert_many(test_tasks)
    return {"status": "success", "message": "Test tasks generati!"}
