from fastapi import APIRouter, Depends, HTTPException
from database import db
from auth import get_current_user
from helpers import get_sitemap_links

router = APIRouter()

@router.get("/freshness/{client_id}")
async def get_freshness_candidates(client_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and current_user.get("client_id") != client_id:
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
        
    client = await db.clients.find_one({"id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
        
    # Get all published articles from platform
    platform_cursor = db.articles.find({"client_id": client_id, "stato": "published"}).sort("published_at", 1).limit(50)
    platform_articles = []
    async for art in platform_cursor:
        platform_articles.append({
            "id": art["id"],
            "titolo": art["titolo"],
            "url": art.get("wordpress_link", ""),
            "published_at": art.get("published_at"),
            "focus_keyword": art.get("seo_metadata", {}).get("focus_keyword", "")
        })
        
    # Get pages from Sitemap 
    # Usually Sitemap is used to find external pages not in db that need update/internal linking
    sitemap_url = client.get("configuration", {}).get("seo", {}).get("sitemap_url") 
    sitemap_links = []
    if sitemap_url:
        try:
            sitemap_links = await get_sitemap_links(sitemap_url)
        except Exception as e:
            pass # Handle silently
            
    # Remove duplicates from sitemap that are already in platform_articles
    platform_urls = {a["url"] for a in platform_articles if a["url"]}
    sitemap_unique = []
    for sl in sitemap_links:
        if sl["url"] not in platform_urls:
            sitemap_unique.append(sl)

    return {"platform_articles": platform_articles, "sitemap_links": sitemap_unique[:50]}
