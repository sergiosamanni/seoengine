from fastapi import APIRouter, Depends, HTTPException
from database import db
from auth import require_admin
import uuid
import re
from datetime import datetime, timezone
from helpers import scrape_links_content
import logging

logger = logging.getLogger("server")
router = APIRouter()

@router.get("/seo-guidelines")
async def get_seo_guidelines(current_user: dict = Depends(require_admin)):
    settings = await db.global_settings.find_one({"id": "global"}, {"_id": 0})
    if not settings:
        return {"seo_geo_guidelines": []}
    return settings

@router.post("/seo-guidelines")
async def update_seo_guidelines(request: dict, current_user: dict = Depends(require_admin)):
    # request = { title: str, content: str, id?: str }
    g_id = request.get("id") or str(uuid.uuid4())
    title = request.get("title")
    content = request.get("content")
    
    if not title or not content:
        raise HTTPException(status_code=400, detail="Titolo e contenuto richiesti")

    now = datetime.now(timezone.utc).isoformat()
    
    # Check if entry exists or append
    settings = await db.global_settings.find_one({"id": "global"})
    if not settings:
        new_doc = {
            "id": "global",
            "seo_geo_guidelines": [{
                "id": g_id, "title": title, "content": content,
                "created_at": now, "updated_at": now
            }],
            "updated_at": now
        }
        await db.global_settings.insert_one(new_doc)
    else:
        # Check if existing ID
        found = False
        guidelines = settings.get("seo_geo_guidelines", [])
        for g in guidelines:
            if g["id"] == g_id:
                g.update({"title": title, "content": content, "updated_at": now})
                found = True
                break
        
        if not found:
            guidelines.append({
                "id": g_id, "title": title, "content": content,
                "created_at": now, "updated_at": now
            })
        
        await db.global_settings.update_one(
            {"id": "global"}, 
            {"$set": {"seo_geo_guidelines": guidelines, "updated_at": now}}
        )

    return {"status": "success", "id": g_id}

@router.delete("/seo-guidelines/{g_id}")
async def delete_seo_guideline(g_id: str, current_user: dict = Depends(require_admin)):
    await db.global_settings.update_one(
        {"id": "global"},
        {"$pull": {"seo_geo_guidelines": {"id": g_id}}}
    )
    return {"status": "success"}

@router.post("/seo-guidelines/{g_id}/sync")
async def sync_guideline_links(g_id: str, current_user: dict = Depends(require_admin)):
    settings = await db.global_settings.find_one({"id": "global"})
    if not settings:
        raise HTTPException(status_code=404, detail="Impostazioni non trovate")
        
    guidelines = settings.get("seo_geo_guidelines", [])
    target = next((g for g in guidelines if g["id"] == g_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Guideline non introfoundvato")

    # Extract all URLs using regex
    urls = re.findall(r'http[s]?://(?:[a-zA-Z]|[0-9]|[$-_@.&+]|[!*\(\),]|(?:%[0-9a-fA-F][0-9a-fA-F]))+', target["content"])
    
    if not urls:
        return {"status": "skipped", "message": "Nessun link trovato nel contenuto"}

    # Scrape
    scraped_data = await scrape_links_content(urls)
    
    # Update DB
    target["links_data"] = scraped_data
    target["last_synced"] = datetime.now(timezone.utc).isoformat()
    
    await db.global_settings.update_one(
        {"id": "global"},
        {"$set": {"seo_geo_guidelines": guidelines}}
    )

    return {"status": "success", "links_found": len(urls), "data": scraped_data}
