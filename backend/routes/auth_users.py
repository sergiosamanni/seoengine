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
    user_doc = {
        "id": user_id, "email": user.email, "password": hash_password(user.password),
        "name": user.name, "role": user.role, "client_ids": user.client_ids, "created_at": now
    }
    await db.users.insert_one(user_doc)
    return UserResponse(id=user_id, email=user.email, name=user.name, role=user.role,
                        client_ids=user.client_ids, created_at=now)


@router.post("/auth/login")
async def login(request: dict):
    email = request.get("email", "")
    password = request.get("password", "")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(password, user["password"]):
        raise HTTPException(status_code=401, detail="Credenziali non valide")
    token = create_token(user["id"], user["email"], user["role"], user.get("client_ids", []))
    return {
        "token": token,
        "user": {"id": user["id"], "email": user["email"], "name": user["name"],
                 "role": user["role"], "client_ids": user.get("client_ids", [])}
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


@router.post("/users/assign-client")
async def assign_user_to_client(request: AssignClientRequest, current_user: dict = Depends(require_admin)):
    result = await db.users.update_one({"id": request.user_id}, {"$set": {"client_ids": request.client_ids}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    return {"message": "Utente assegnato ai clienti", "user_id": request.user_id, "client_ids": request.client_ids}


@router.post("/users/unassign-client")
async def unassign_user_from_client(request: dict, current_user: dict = Depends(require_admin)):
    user_id = request.get("user_id")
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id richiesto")
    result = await db.users.update_one({"id": user_id}, {"$set": {"client_ids": []}})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Utente non trovato")
    return {"message": "Utente rimosso dai clienti"}


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
            "password": hash_password(os.environ.get("ADMIN_SEED_PASSWORD", "admin123")),
            "name": "Admin SEO", "role": "admin", "client_ids": [], "created_at": now
        })
    return {"message": "Seed completato"}
