from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from datetime import datetime
import uuid
from database import db
from models import ReportCreate, ReportUpdate, ReportResponse
from routes.auth_users import get_current_user

router = APIRouter(prefix="/reports", tags=["reports"])

async def get_citations_for_report(client_id: str, report_date: str):
    """Retrieve citations for a specific client and month from ISO date string."""
    # report_date is YYYY-MM-DDTHH:MM:SSZ or similar
    # We want to match citations in the same year and month
    month_prefix = report_date[:7] # YYYY-MM
    
    citations = await db.citations.find({
        "client_id": client_id,
        "date": {"$regex": f"^{month_prefix}"}
    }, {"_id": 0}).to_list(100)
    
    # Enrich with portal names
    portal_ids = list(set([c["portal_id"] for c in citations]))
    portals = await db.portals.find({"id": {"$in": portal_ids}}, {"_id": 0}).to_list(100)
    portal_map = {p["id"]: p["name"] for p in portals}
    
    for c in citations:
        c["portal_name"] = portal_map.get(c["portal_id"], "N/A")
        
    return citations

async def get_reddit_activity_for_report(client_id: str, report_date: str):
    """Retrieve Reddit outreach activity for a specific client and month."""
    month_prefix = report_date[:7] # YYYY-MM
    
    # We look for reddit_outreach activities in activity_log
    activities = await db.activity_log.find({
        "client_id": client_id,
        "type": "reddit_outreach",
        "timestamp": {"$regex": f"^{month_prefix}"}
    }, {"_id": 0}).to_list(100)
    
    return activities

@router.post("/{client_id}", response_model=ReportResponse)
async def create_report(client_id: str, report: ReportCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo gli admin possono creare report")
    
    # Check if client exists
    client = await db.clients.find_one({"id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    now = datetime.now(timezone.utc).isoformat()
    report_dict = report.dict()
    
    # Ensure date is valid ISO or at least has the prefix we need
    # Auto-inject citations and reddit outreach for the selected month
    citations = await get_citations_for_report(client_id, report_dict["date"])
    reddit_activity = await get_reddit_activity_for_report(client_id, report_dict["date"])
    
    if "modules" not in report_dict or report_dict["modules"] is None:
        report_dict["modules"] = {}
        
    report_dict["modules"]["citations_local"] = citations
    report_dict["modules"]["reddit_outreach"] = reddit_activity

    report_dict.update({
        "id": str(uuid.uuid4()),
        "client_id": client_id,
        "created_at": now,
        "updated_at": now,
        "is_archived": False
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
    # ISO strings are naturally sortable
    reports.sort(key=lambda x: x["date"], reverse=True)
    return reports

@router.get("/{report_id}", response_model=ReportResponse)
async def get_report_detail(report_id: str, current_user: dict = Depends(get_current_user)):
    report = await db.reports.find_one({"id": report_id})
    if not report:
        raise HTTPException(status_code=404, detail="Report non trovato")
    
    if current_user["role"] != "admin" and report["client_id"] not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso negato")
    
    # Refresh citations module on fetch to ensure it's up to date
    current_citations = await get_citations_for_report(report["client_id"], report["date"])
    if "modules" not in report: report["modules"] = {}
    report["modules"]["citations_local"] = current_citations
    
    return report

@router.put("/{report_id}", response_model=ReportResponse)
async def update_report(report_id: str, report_update: ReportUpdate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo gli admin possono modificare report")
    
    existing = await db.reports.find_one({"id": report_id})
    if not existing:
        raise HTTPException(status_code=404, detail="Report non trovato")
    
    update_data = {k: v for k, v in report_update.dict().items() if v is not None}
    update_data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.reports.update_one({"id": report_id}, {"$set": update_data})
    
    updated = await db.reports.find_one({"id": report_id})
    # Also refresh citations and reddit
    refreshed_citations = await get_citations_for_report(updated["client_id"], updated["date"])
    refreshed_reddit = await get_reddit_activity_for_report(updated["client_id"], updated["date"])
    
    if "modules" not in updated or updated["modules"] is None:
        updated["modules"] = {}
        
    updated["modules"]["citations_local"] = refreshed_citations
    updated["modules"]["reddit_outreach"] = refreshed_reddit
    
    return updated

@router.delete("/{report_id}")
async def delete_report(report_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo gli admin possono eliminare report")
    
    res = await db.reports.delete_one({"id": report_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Report non trovato")
    
    return {"message": "Report eliminato"}
