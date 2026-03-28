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
    # Verifica se l'admin ha configurato Reddit
    account = await db.reddit_accounts.find_one({"active": True})
    return {"configured": account is not None, "username": account["username"] if account else None}

@router.post("/reddit/tasks")
async def create_reddit_task(task: RedditTask, current_user: dict = Depends(get_current_user)):
    # Crea una proposta di commento/post
    doc = task.dict()
    res = await db.reddit_tasks.insert_one(doc)
    
    # Registra nell'activity log per il report
    await db.activity_log.insert_one({
        "client_id": task.client_id,
        "type": "reddit_outreach",
        "action": f"Proposta commento su r/{task.subreddit}",
        "details": task.thread_url,
        "timestamp": datetime.now(),
        "status": "pending"
    })
    
    return {"id": str(res.inserted_id)}

@router.get("/reddit/scout")
async def scout_reddit(query: str, current_user: dict = Depends(get_current_user)):
    # Mock endpoint per la ricerca - lo implementeremo con PRAW
    return [
        {"id": "1", "title": f"Discussione su {query} a Roma", "subreddit": "roma", "url": "https://reddit.com/..."},
        {"id": "2", "title": f"Consigli su {query}", "subreddit": "italia", "url": "https://reddit.com/..."}
    ]
