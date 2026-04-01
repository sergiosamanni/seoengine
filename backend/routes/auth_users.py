"""Authentication and user management routes."""
import os
import uuid
from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException

from database import db
from auth import hash_password, verify_password, create_token, get_current_user, require_admin
from models import UserCreate, UserResponse, AssignClientRequest

router = APIRouter()


@router.post("/auth/register", response_model=UserResponse)
async def register(user: UserCreate):
    existing = await db.users.find_one({"email": user.email})
    if existing:
        raise HTTPException(status_code=400, detail="Email gia registrata")
    user_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    # Initialize both for compatibility
    client_ids = user.client_ids if user.client_ids else [user.client_id] if user.client_id else []
    user_doc = {
        "id": user_id, "email": user.email, "password": hash_password(user.password),
        "name": user.name, "role": user.role, 
        "client_id": user.client_id, "client_ids": client_ids, "created_at": now
    }
    await db.users.insert_one(user_doc)
    return UserResponse(id=user_id, email=user.email, name=user.name, role=user.role,
                        client_id=user.client_id, client_ids=client_ids, created_at=now)


@router.post("/auth/login")
async def login(request: dict):
    email = request.get("email", "")
    password = request.get("password", "")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(password, user["password"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    
    # Pass first client_id for legacy token needs, but handle list in payload if possible
    token = create_token(user["id"], user["email"], user["role"], user.get("client_id"))
    
    # We can add client_ids to the JWT too if needed, but for now we'll just return it in the user object
    return {
        "token": token,
        "user": {
            "id": user["id"], "email": user["email"], "name": user["name"],
            "role": user["role"], "client_id": user.get("client_id"),
            "client_ids": user.get("client_ids", [])
        }
    }


@router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    user = await db.users.find_one({"id": current_user["user_id"]}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    return user


@router.get("/users", response_model=List[UserResponse])
async def get_users(current_user: dict = Depends(require_admin)):
    users = await db.users.find({}, {"_id": 0, "password": 0}).to_list(500)
    return [UserResponse(**u) for u in users]


@router.post("/users/assign-clients")
async def assign_user_to_clients(request: dict, current_user: dict = Depends(require_admin)):
    user_id = request.get("user_id")
    client_ids = request.get("client_ids", [])
    
    # Find user first
    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
        
    # Update both for compatibility: client_id becomes the first one in list
    primary_id = client_ids[0] if client_ids else None
    
    result = await db.users.update_one(
        {"id": user_id}, 
        {"$set": {"client_ids": client_ids, "client_id": primary_id}}
    )
    
    return {"message": "Associazioni aggiornate", "user_id": user_id, "count": len(client_ids)}


@router.post("/users/unassign-clients")
async def unassign_all_clients(request: dict, current_user: dict = Depends(require_admin)):
    user_id = request.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id richiesto")
        
    result = await db.users.update_one(
        {"id": user_id}, 
        {"$set": {"client_ids": [], "client_id": None}}
    )
    
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    return {"message": "Tutte le associazioni rimosse"}


@router.delete("/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(require_admin)):
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    if user.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Non puoi eliminare un admin")
    await db.users.delete_one({"id": user_id})
    return {"message": "Utente eliminato"}


@router.post("/seed")
async def seed_data():
    admin = await db.users.find_one({"email": os.environ.get("ADMIN_SEED_EMAIL", "admin@seoengine.it")})
    if not admin:
        admin_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        await db.users.insert_one({
            "id": admin_id, "email": os.environ.get("ADMIN_SEED_EMAIL", "admin@seoengine.it"),
            "password": hash_password(os.environ.get("ADMIN_SEED_PASSWORD", "changeme")),
            "name": "Admin SEO", "role": "admin", "client_id": None, "created_at": now
        })
    return {"message": "Seed completato"}
