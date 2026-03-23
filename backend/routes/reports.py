from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime
import uuid
from database import db
from models import ReportCreate, ReportUpdate, ReportResponse
from routes.auth_users import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])

@router.post("/{client_id}", response_model=ReportResponse)
async def create_report(client_id: str, report: ReportCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo gli admin possono creare report")
    
    # Check if client exists
    client = await db.clients.find_one({"id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    now = datetime.utcnow().isoformat()
    report_dict = report.dict()
    report_dict.update({
        "id": str(uuid.uuid4()),
        "client_id": client_id,
        "created_at": now,
        "updated_at": now,
        "is_archived": False,
        "modules": report_dict.get("modules") or {}
    })
    
    await db.reports.insert_one(report_dict)
    return report_dict

@router.get("/client/{client_id}", response_model=List[ReportResponse])
async def get_client_reports(client_id: str, current_user: dict = Depends(get_current_user)):
    # Standard security check: admin can see all, client only their own
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    cursor = db.reports.find({"client_id": client_id})
    reports = await cursor.to_list(length=100)
    # Sort by date descending (assuming MM-YYYY format, needs better sort or date obj)
    # For now simple sort on created_at or title
    reports.sort(key=lambda x: x["date"], reverse=True)
    return reports

@router.get("/{report_id}", response_model=ReportResponse)
async def get_report_detail(report_id: str, current_user: dict = Depends(get_current_user)):
    report = await db.reports.find_one({"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report non trovato")
    
    if current_user["role"] != "admin" and report["client_id"] not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    return report

@router.put("/{report_id}", response_model=ReportResponse)
async def update_report(report_id: str, report_update: ReportUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo gli admin possono modificare report")
    
    existing = await db.reports.find_one({"id": report_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Report non trovato")
    
    update_data = {k: v for k, v in report_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.utcnow().isoformat()
    
    await db.reports.update_one({"id": report_id}, {"$set": update_data})
    
    updated = await db.reports.find_one({"id": report_id})
    return updated

@router.delete("/{report_id}")
async def delete_report(report_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo gli admin possono eliminare report")
    
    res = await db.reports.delete_one({"id": report_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Report non trovato")
    
    return {"message": "Report eliminato"}
