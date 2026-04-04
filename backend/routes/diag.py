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

@router.get("/test-email")
async def test_email(current_user: dict = Depends(require_admin)):
    """Sends a mockup autopilot article notification for testing."""
    from services.email_service import notify_autopilot_articles_generated
    mock_articles = [
        {
            "title": "Guida al Noleggio Sollevatori Telescopici Rotativi",
            "url": "https://unrent.it/sollevatori-telescopici-rotativi-quando-sceglierli-e-come-noleggiarli/",
            "keyword": "noleggio sollevatori telescopici"
        },
        {
            "title": "Manutenzione Gru Elettriche: Cosa Sapere",
            "url": "https://unrent.it/manutenzione-gru-elettriche/",
            "keyword": "manutenzione gru"
        }
    ]
    try:
        await notify_autopilot_articles_generated("Unrent (Test)", mock_articles)
        return {"status": "success", "message": "Test email sent to recipients."}
    except Exception as e:
        return {"status": "error", "message": str(e)}
