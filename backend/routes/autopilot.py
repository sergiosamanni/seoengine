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

    # Build specific detail response based on task type
    task_type = task.get("type", "UNKNOWN")
    client_id = task["client_id"]
    client = await db.clients.find_one({"id": client_id})
    client_name = client.get("nome", "Cliente") if client else "Cliente Sconosciuto"
    
    # Execute task
    execution_detail = ""

    if task_type == "NEW_CONTENT":
        current_queue = client.get("configuration", {}).get("editorial_queue", [])
        
        # If payload is present, we could potentially extract more info, 
        # but the current queue logic uses title and suggestion.
        new_item = f"[AUTOPILOT] {task['title']} : {task['suggestion']}"
        
        if new_item not in current_queue:
            await db.clients.update_one({"id": client_id}, {"$push": {"configuration.editorial_queue": new_item}})
        
        execution_detail = "Iniezione Avvenuta: L'argomento e la sua direttiva AI sono stati inseriti in Cima al Piano Editoriale del cliente e verranno generati automaticamente alla prima pubblicazione disponibile."
        
        # Mark as completed
        await db.autopilot_tasks.update_one(
            {"id": task_id}, 
            {"$set": {
                "status": "completed", 
                "executed_at": datetime.now(timezone.utc).isoformat(),
                "execution_detail": execution_detail,
                "execution_success": True
            }}
        )

        from helpers import log_activity
        await log_activity(client_id, "autopilot_approve", f"Approvato task: {task['title']}", {"task_id": task_id, "type": task_type})

        # Fire email exclusively for NEW_CONTENT
        from services.email_service import send_notification_email
        import asyncio
        
        html_body = f"""
        <div style="font-family:sans-serif;color:#333;">
            <h2 style="color:#059669;margin-bottom:10px;">✅ Azione Autopilot Eseguita</h2>
            <p>Hai appena approvato ed elaborato un'operazione strategica AI per il cliente <b>{client_name}</b>.</p>
            
            <div style="background:#f8fafc;padding:15px;border-left:4px solid #3b82f6;margin:15px 0;">
                <p style="margin:0 0 5px 0;"><b>Sezione Analizzata:</b> {task_type}</p>
                <p style="margin:0 0 5px 0;"><b>Titolo Ticket:</b> {task.get('title', 'N/D')}</p>
                <p style="margin:0;"><b>Prompt AI:</b> {task.get('suggestion', 'N/D')}</p>
            </div>

            <h3 style="color:#1e293b;font-size:16px;">Esito ed Esecuzione Macchina:</h3>
            <p style="background:#ecfdf5;padding:15px;border:1px solid #d1fae5;color:#065f46;border-radius:8px;font-size:14px;line-height:1.6;">
                {execution_detail}
            </p>
        </div>
        """
        
        asyncio.create_task(send_notification_email(
            subject=f"✅ Esecuzione Autopilot [{client_name}]",
            body_html=html_body,
            event_type="autopilot_exec"
        ))

    else:
        # All other tasks involve interacting with CMS or complex fallback
        execution_detail = "In esecuzione fisica sul CMS in background. L'esito finale ti verrà recapitato tramite email e comparirà qui a breve..."
        
        await db.autopilot_tasks.update_one(
            {"id": task_id}, 
            {"$set": {
                "status": "completed", 
                "executed_at": datetime.now(timezone.utc).isoformat(),
                "execution_detail": execution_detail,
                "execution_success": None
            }}
        )

        from helpers import log_activity
        await log_activity(client_id, "autopilot_approve", f"Approvato task (Avvio background WP): {task['title']}", {"task_id": task_id, "type": task_type})

        # Fire background execution task
        from services.autopilot_service import AutopilotService
        import asyncio
        asyncio.create_task(AutopilotService.execute_autopilot_task_on_cms(task, client))

    return {"status": "success", "message": "Task approvato", "execution_detail": execution_detail}

@router.delete("/autopilot-tasks/{task_id}")
async def refuse_autopilot_task(task_id: str, current_user: dict = Depends(get_current_user)):
    """Refuse/delete a task."""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized")
    
    await db.autopilot_tasks.update_one(
        {"id": task_id}, 
        {"$set": {
            "status": "rejected",
            "rejected_at": datetime.now(timezone.utc).isoformat()
        }}
    )
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
        
    client = await db.clients.find_one({"id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Client not found")

    from services.autopilot_service import AutopilotService
    import asyncio
    asyncio.create_task(AutopilotService.process_client(client))
    
    return {"status": "success", "message": "Analisi strategica avviata. I nuovi suggerimenti appariranno tra pochi minuti."}

@router.post("/autopilot-tasks/{client_id}/seed")
async def seed_autopilot_tasks(client_id: str, current_user: dict = Depends(get_current_user)):
    """Seed test tasks for UI verification."""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Unauthorized")

    cy = datetime.now().year
    test_tasks = [
        {
            "id": str(uuid.uuid4()),
            "client_id": client_id,
            "title": f"Aggiornamento Prezzi {cy}",
            "type": "NEW_CONTENT",
            "reason": f"Volume di ricerca in crescita per 'costo' e 'prezzi' nel tuo settore per il nuovo anno {cy}.",
            "suggestion": f"Scrivi un articolo che riepiloghi i prezzi {cy} e aggiungi le 3 FAQ suggerite dall'analisi GSC aggiornata.",
            "status": "pending",
            "url": f"https://esempio.it/guida-prezzi-{cy}/",
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
