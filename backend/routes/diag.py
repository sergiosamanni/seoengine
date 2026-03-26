from fastapi import APIRouter, Depends
from auth import require_admin
from database import db

router = APIRouter(prefix="/diag", tags=["diagnostics"])

@router.get("/db-check")
async def db_check():
    # Targeted check for UNRENT or specific IDs
    unrent = await db.clients.find_one({"nome": {"$regex": "UNRENT", "$options": "i"}}, {"nome": 1, "id": 1, "_id": 1})
    
    # Just a few samples
    clients = await db.clients.find({}, {"nome": 1, "id": 1}).limit(5).to_list(5)
    
    res = {
        "unrent_client": {k: str(v) if k == "_id" else v for k, v in unrent.items()} if unrent else None,
        "sample_clients": [{k: str(v) if k == "_id" else v for k, v in c.items()} for c in clients]
    }
    
    if unrent:
        cid = unrent.get("id")
        sessions = await db.chat_sessions.find({"client_id": cid}, {"title": 1, "id": 1, "_id": 1}).to_list(10)
        res["unrent_sessions"] = [{k: str(v) if k == "_id" else v for k, v in s.items()} for s in sessions]
        
    # Check if repair log exists
    import os
    res["repair_log_exists"] = os.path.exists("/tmp/repair_db.log")
    if res["repair_log_exists"]:
        with open("/tmp/repair_db.log", "r") as f:
            res["repair_log_tail"] = f.readlines()[-20:]
            
    return res
