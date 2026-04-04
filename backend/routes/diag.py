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
async def unrent_cleanup(drafts_only: bool = False, current_user: dict = Depends(require_admin)):
    """
    Cleans up Unrent data. 
    Target collections: 'articles' and 'autopilot_tasks'
    """
    unrent = await db.clients.find_one({"nome": {"$regex": "UNRENT", "$options": "i"}}, {"id": 1, "nome": 1})
    if not unrent:
        return {"error": "Client Unrent not found"}
    
    cid = unrent["id"]
    summary = {"client_name": unrent["nome"], "client_id": cid}
    
    if drafts_only:
        # 1. Articles Collection (stato: draft)
        art_del = await db.articles.delete_many({
            "client_id": cid,
            "stato": "draft"
        })
        # 2. Autopilot Tasks Collection (status: failed or draft)
        task_del = await db.autopilot_tasks.delete_many({
            "client_id": cid,
            "$or": [
                {"status": "failed"},
                {"status": "draft"},
                {"publish_status": "failed"}
            ]
        })
        
        summary["deleted_articles"] = art_del.deleted_count
        summary["deleted_tasks"] = task_del.deleted_count
        summary["message"] = f"Deleted {art_del.deleted_count} articles and {task_del.deleted_count} tasks."
    else:
        # Wave 1 logic: Published before April 2026
        cutoff = "2026-04-01T00:00:00"
        res = await db.articles.delete_many({
            "client_id": cid,
            "published_at": {"$lt": cutoff}
        })
        summary["deleted_articles"] = res.deleted_count
        summary["message"] = f"Deleted {res.deleted_count} old articles."
    
    summary["status"] = "success"
    return summary
