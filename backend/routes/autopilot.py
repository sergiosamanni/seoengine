from fastapi import APIRouter, Depends, HTTPException
from database import db
from auth import get_current_user
from datetime import datetime, timezone
import uuid
import logging

logger = logging.getLogger("server")
router = APIRouter()

@router.get("/autopilot-tasks/{client_id}")
async def get_autopilot_tasks(client_id: str, status: str = "pending", limit: int = 10, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
        
    query = {"client_id": client_id}
    if status != "all":
        query["status"] = status
        
    cursor = db.autopilot_tasks.find(query).sort("created_at", -1).limit(limit)
    tasks = []
    async for t in cursor:
        t["_id"] = str(t["_id"])
        tasks.append(t)
        
    return {"tasks": tasks}

@router.post("/autopilot-tasks/{client_id}/{task_id}/resolve")
async def resolve_autopilot_task(client_id: str, task_id: str, request: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
        
    action = request.get("action") # "approve" or "reject"
    if action not in ["approve", "reject"]:
        raise HTTPException(status_code=400, detail="Azione non valida. Usa 'approve' o 'reject'.")
        
    task = await db.autopilot_tasks.find_one({"id": task_id, "client_id": client_id})
    if not task:
        raise HTTPException(status_code=404, detail="Task non trovato")
        
    if action == "reject":
        await db.autopilot_tasks.update_one({"id": task_id}, {"$set": {"status": "rejected", "resolved_at": datetime.now(timezone.utc).isoformat()}})
        return {"message": "Task rifiutato"}
        
    # Approve - Logic to actually trigger the action
    # For now, we update status and return success. 
    # Actual execution will be connected in a later micro-step.
    await db.autopilot_tasks.update_one({"id": task_id}, {"$set": {"status": "approved", "approved_at": datetime.now(timezone.utc).isoformat()}})
    
    return {"message": "Task approvato", "status": "approved"}


@router.post("/autopilot-tasks/{client_id}/seed")
async def seed_autopilot_tasks(client_id: str, current_user: dict = Depends(get_current_user)):
    """Seed dummy tasks for testing HITL UI."""
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo admin può seedare")
        
    dummy_tasks = [
        {
            "id": str(uuid.uuid4()),
            "client_id": client_id,
            "type": "REVAMP",
            "status": "pending",
            "title": "Revamp Articolo: Noleggio Piattaforme Ragno",
            "reason": "Calo clic 2023 vs 2024. Contenuto datato.",
            "url": "https://unrent.it/noleggio-piattaforme-ragno-guida-prezzi/",
            "suggestion": "Aggiorna con listino prezzi 2024 e aggiungi le 3 FAQ suggerite dall'analisi GSC.",
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": str(uuid.uuid4()),
            "client_id": client_id,
            "type": "INTERNAL_LINKING",
            "status": "pending",
            "title": "Inserimento Link: Differenze PLE/PLAC",
            "reason": "Pagina orfana individuata. Nuova risorsa con 0 link incoming.",
            "target_url": "https://unrent.it/differenza-tra-piattaforme-ple-e-plac/",
            "source_url": "https://unrent.it/noleggio-piattaforme-aeree/",
            "suggestion": "Inserisci un link contestuale verso la nuova guida nel paragrafo 'Tipologie'.",
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    await db.autopilot_tasks.insert_many(dummy_tasks)
    return {"message": "Seeded 2 tasks", "count": 2}
