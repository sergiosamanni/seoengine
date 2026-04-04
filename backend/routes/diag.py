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
    
    # Check all users
    users = await db.users.find({}, {"email": 1, "id": 1}).to_list(10)
    res["sample_users"] = [{k: str(v) if k == "_id" else v for k, v in u.items()} for u in users]
        
    # Check if repair log exists
    import os
    res["repair_log_exists"] = os.path.exists("/tmp/repair_db.log")
    if res["repair_log_exists"]:
        try:
            with open("/tmp/repair_db.log", "r") as f:
                res["repair_log_tail"] = f.readlines()[-30:]
        except Exception as e:
            res["repair_log_error"] = str(e)
            
    return res

@router.get("/unrent-cleanup")
async def unrent_cleanup(current_user: dict = Depends(require_admin)):
    """
    Deletes all articles for the 'Unrent' client published before April 1st, 2026.
    """
    # 1. Find the client ID for Unrent (regex case-insensitive)
    unrent = await db.clients.find_one({"nome": {"$regex": "UNRENT", "$options": "i"}}, {"id": 1, "nome": 1})
    if not unrent:
        return {"error": "Client Unrent not found"}
    
    cid = unrent["id"]
    cutoff = "2026-04-01T00:00:00"
    
    # 2. Count articles to be deleted
    before_count = await db.articles.count_documents({
        "client_id": cid,
        "published_at": {"$lt": cutoff}
    })
    
    # 3. Perform Deletion
    res = await db.articles.delete_many({
        "client_id": cid,
        "published_at": {"$lt": cutoff}
    })
    
    return {
        "client_name": unrent.get("nome"),
        "client_id": cid,
        "cutoff_date": cutoff,
        "found_before_deletion": before_count,
        "actually_deleted": res.deleted_count,
        "status": "success",
        "message": f"Successfully deleted {res.deleted_count} articles published before April 2026."
    }
