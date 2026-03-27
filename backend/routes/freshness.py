from fastapi import APIRouter, Depends, HTTPException
from database import db
from auth import get_current_user
from helpers import get_sitemap_links, generate_with_rotation
import json
import re
import os
import logging

logger = logging.getLogger("server")
router = APIRouter()

@router.get("/freshness/{client_id}")
async def get_freshness_candidates(client_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
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
    config = client.get("configuration", {})
    sitemap_url = config.get("seo", {}).get("sitemap_url") 
    if not sitemap_url:
        site_url = config.get("gsc", {}).get("site_url") or config.get("wordpress", {}).get("url_api", "").split("/wp-json")[0]
        if site_url:
            sitemap_url = site_url.rstrip("/") + "/sitemap.xml"
            
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


@router.post("/freshness-audit/{client_id}")
async def freshness_audit(client_id: str, request: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
        
    client = await db.clients.find_one({"id": client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
        
    config = client.get("configuration", {})
    llm_config = config.get("llm", {}) or config.get("openai", {})
    
    # Use client config or fallback to defaults
    if not llm_config or not (llm_config.get("api_key") or llm_config.get("openai_api_key")):
        llm_config = {
            "provider": os.environ.get("LLM_PROVIDER", "openai"),
            "api_key": os.environ.get("OPENAI_API_KEY") or os.environ.get("DEEPSEEK_API_KEY"),
            "modello": os.environ.get("LLM_MODEL", "gpt-4o-mini")
        }

    articles = request.get("articles", [])[:10]
    
    prompt = (
        "Sei un SEO Technical Expert. Esamina questi articoli (titolo e keyword attili) che necessitano "
        "di un aggiornamento 'Freshness' perché sono datati o underperforming.\n\n"
        "Per ognuno fornisci 1 singola indicazione strategica focalizzata su:\n"
        "- Miglioramento Semantico e LSI\n"
        "- Ottimizzazione dell'intento di ricerca\n"
        "- Link interni (obbligo di inserire 3 link esatti)\n\n"
        "RISPONDI SOLO IN FORMATO JSON:\n"
        "[\n"
        "  {\n"
        "    \"url\": \"url analizzato o titolo\",\n"
        "    \"advice\": \"Testo max 200 caratteri del tuo consiglio SEO tecnico e pratico.\"\n"
        "  }\n"
        "]\n\nArticoli da analizzare:\n"
    )
    
    for a in articles:
        prompt += f"- Titolo: {a.get('titolo', '')} (URL: {a.get('url', '')})\n"
        
    try:
        response_text = await generate_with_rotation(llm_config, prompt, "Genera Audit Freshness JSON:")
        json_match = re.search(r'\[\s*\{.*?\}\s*\]', response_text, re.DOTALL)
        if json_match:
            audit = json.loads(json_match.group(0))
        else:
            # Try parsing raw if no match
            audit = json.loads(response_text)
            
        return {"audit": audit}
    except Exception as e:
        logger.error(f"Audit generation failed for client {client_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Errore elaborazione audit Freshness: {str(e)}")
