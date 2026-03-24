import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
import pandas as pd
import io
import logging

from database import db
from auth import get_current_user, require_admin
from models import PortalCreate, PortalResponse, CitationToggle, CitationResponse

logger = logging.getLogger("server")
router = APIRouter()

# --- PORTALS ---

@router.get("/portals", response_model=List[PortalResponse])
async def get_portals(current_user: dict = Depends(get_current_user)):
    portals = await db.portals.find({}, {"_id": 0}).sort("name", 1).to_list(1000)
    return portals

@router.post("/portals", response_model=PortalResponse)
async def create_portal(portal: PortalCreate, current_user: dict = Depends(require_admin)):
    portal_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "id": portal_id,
        "name": portal.name,
        "url": portal.url,
        "category": portal.category or "directory",
        "created_at": now
    }
    await db.portals.insert_one(doc)
    return PortalResponse(**doc)

@router.post("/portals/import")
async def import_portals(file: UploadFile = File(...), current_user: dict = Depends(require_admin)):
    if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
        raise HTTPException(status_code=400, detail="File non supportato")
    
    try:
        contents = await file.read()
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            df = pd.read_excel(io.BytesIO(contents))
        
        # Expected columns: name, url, category
        if "name" not in df.columns:
            # Try to find a column that looks like 'name'
            name_col = next((c for c in df.columns if 'name' in c.lower() or 'nome' in c.lower() or 'portale' in c.lower()), None)
            if name_col:
                df.rename(columns={name_col: "name"}, inplace=True)
            else:
                raise HTTPException(status_code=400, detail="Colonna 'name' o 'portale' mancante")
        
        portals_to_add = []
        now = datetime.now(timezone.utc).isoformat()
        for _, row in df.iterrows():
            if pd.isna(row["name"]): continue
            portals_to_add.append({
                "id": str(uuid.uuid4()),
                "name": str(row["name"]),
                "url": str(row.get("url", "")) if "url" in row and pd.notnull(row["url"]) else None,
                "category": str(row.get("category", "directory")) if "category" in row and pd.notnull(row["category"]) else "directory",
                "created_at": now
            })
        
        if portals_to_add:
            await db.portals.insert_many(portals_to_add)
        
        return {"message": f"{len(portals_to_add)} portali importati"}
    except Exception as e:
        logger.error(f"Portal import error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/portals/{portal_id}")
async def delete_portal(portal_id: str, current_user: dict = Depends(require_admin)):
    result = await db.portals.delete_one({"id": portal_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Portale non trovato")
    await db.citations.delete_many({"portal_id": portal_id})
    return {"message": "Portale e citazioni correlate eliminate"}

# --- CITATIONS ---

@router.get("/citations", response_model=List[CitationResponse])
async def get_all_citations(current_user: dict = Depends(get_current_user)):
    # If not admin, filter by allowed clients
    query = {}
    if current_user["role"] != "admin":
        client_ids = current_user.get("client_ids", [])
        query["client_id"] = {"$in": client_ids}
    
    citations = await db.citations.find(query, {"_id": 0}).to_list(10000)
    return citations

@router.post("/citations/toggle")
async def toggle_citation(toggle: CitationToggle, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and toggle.client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Non autorizzato per questo cliente")
    
    existing = await db.citations.find_one({
        "portal_id": toggle.portal_id,
        "client_id": toggle.client_id
    })
    
    if existing:
        if not toggle.status:
            await db.citations.delete_one({"id": existing["id"]})
            return {"message": "Citazione rimossa", "status": False}
        
        # Update
        now = datetime.now(timezone.utc).isoformat()
        update_data = {
            "date": toggle.date or datetime.now().strftime("%d-%m-%Y"),
            "notes": toggle.notes,
            "updated_at": now
        }
        await db.citations.update_one({"id": existing["id"]}, {"$set": update_data})
        updated = await db.citations.find_one({"id": existing["id"]}, {"_id": 0})
        return CitationResponse(**updated)
    else:
        if not toggle.status:
            return {"message": "Nessuna citazione da rimuovere", "status": False}
            
        # Create
        citation_id = str(uuid.uuid4())
        now = datetime.now(timezone.utc).isoformat()
        doc = {
            "id": citation_id,
            "portal_id": toggle.portal_id,
            "client_id": toggle.client_id,
            "date": toggle.date or datetime.now().strftime("%d-%m-%Y"),
            "status": True,
            "notes": toggle.notes,
            "created_at": now
        }
        await db.citations.insert_one(doc)
        return CitationResponse(**doc)
