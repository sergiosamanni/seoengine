from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
from pydantic import BaseModel
from datetime import datetime
from database import db
from routes.auth_users import get_current_user
from bson import ObjectId

router = APIRouter(tags=["Reddit Outreach"])

class RedditAccount(BaseModel):
    id: Optional[str] = None
    username: str
    client_id: str
    client_secret: str
    refresh_token: str
    active: bool = True

class RedditTask(BaseModel):
    client_id: str
    subreddit: str
    thread_url: str
    comment_body: str
    status: str = "pending" # pending, posted, rejected
    created_at: datetime = datetime.now()

@router.get("/reddit/status")
async def get_reddit_status(current_user: dict = Depends(get_current_user)):
    account = await db.reddit_accounts.find_one({"active": True})
    return {"configured": account is not None, "username": account["username"] if account else None}

@router.post("/reddit/config")
async def save_reddit_config(config: RedditAccount, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo gli admin possono configurare Reddit")
    
    # Disattiva account precedenti e salva il nuovo
    await db.reddit_accounts.update_many({}, {"$set": {"active": False}})
    doc = config.dict()
    doc["active"] = True
    await db.reddit_accounts.insert_one(doc)
    return {"status": "success"}

@router.post("/reddit/propose")
async def propose_reddit_comment(thread_data: dict, client_id: str, current_user: dict = Depends(get_current_user)):
    from services.reddit_service import RedditAgent
    
    client = await db.clients.find_one({"id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
        
    agent = await RedditAgent.get_instance()
    if not agent:
        raise HTTPException(status_code=400, detail="Reddit non configurato")
        
    proposal = await agent.propose_comment(thread_data, client)
    return proposal

@router.post("/reddit/post")
async def post_to_reddit(task: RedditTask, current_user: dict = Depends(get_current_user)):
    from services.reddit_service import RedditAgent
    
    agent = await RedditAgent.get_instance()
    if not agent:
        raise HTTPException(status_code=400, detail="Reddit non configurato")
        
    try:
        # Posting reale via PRAW
        submission = agent.reddit.submission(url=task.thread_url)
        comment = submission.reply(task.comment_body)
        
        # Log dell'azione completata
        await db.reddit_tasks.insert_one({
            **task.dict(),
            "status": "posted",
            "reddit_comment_id": comment.id,
            "posted_at": datetime.now()
        })
        
        # Activity log per il report
        await db.activity_log.insert_one({
            "client_id": task.client_id,
            "type": "reddit_outreach",
            "action": f"Commento pubblicato su r/{task.subreddit}",
            "details": task.thread_url,
            "timestamp": datetime.now().isoformat(), # Usiamo ISO string per i report
            "status": "completed"
        })
        return {"status": "success", "id": comment.id}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Errore durante il posting: {str(e)}")

@router.get("/reddit/scout")
async def scout_reddit(query: str, current_user: dict = Depends(get_current_user)):
    from services.reddit_service import RedditAgent
    
    agent = await RedditAgent.get_instance()
    if not agent:
        raise HTTPException(status_code=400, detail="Reddit non configurato")
        
    # Cerchiamo opportunità reali basate sulle keyword
    # Per semplicità usiamo un client_data fittizio o generico se non specificato
    # In una versione più avanzata, scansioneremmo per ogni cliente attivo.
    opportunities = await agent.scout_opportunities({"id": "internal", "keywords": [query]}, limit=10)
    return opportunities
