import os
"""Article generation, publishing, and job management routes."""
import uuid
import asyncio
import itertools
import logging
from datetime import datetime, timezone, timedelta
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks

from database import db
from auth import get_current_user, require_admin, ADMIN_MASTER_PASSWORD
from models import (ArticleGenerate, ArticlePublish, ArticleResponse, SimpleGenerateRequest,
                    VerifyPasswordRequest, UpdateAdvancedPromptRequest, SerpScrapingRequest,
                    SiloSuggestRequest, ProgrammaticArchitectRequest, ProgrammaticPreviewRequest)
from helpers import (build_system_prompt, generate_seo_metadata, generate_with_llm,
                     generate_with_rotation,
                     publish_to_wordpress, log_activity, LLM_PROVIDERS, 
                     update_wordpress_post, generate_internal_link_update,
                     get_internal_linking_context,
                     get_web_intents, generate_ai_master_spintax, 
                     distribute_global_images, wrap_in_two_columns_premium)

from services.article_service import ArticleService

logger = logging.getLogger("server")
router = APIRouter()


# ============== ARTICLES CRUD ==============

@router.get("/articles", response_model=List[ArticleResponse])
async def get_articles(client_id: Optional[str] = None, stato: Optional[str] = None,
                       current_user: dict = Depends(get_current_user)):
    query = {}
    if current_user["role"] != "admin":
        client_ids = current_user.get("client_ids", [])
        if not client_ids:
            return []
        query["client_id"] = {"$in": client_ids}
    elif client_id:
        query["client_id"] = client_id
    if stato:
        query["stato"] = stato
    articles = await db.articles.find(query, {"_id": 0}).sort("created_at", -1).to_list(500)
    # Ensure contenuto_html compatibility for the frontend
    for a in articles:
        if a.get("contenuto") and not a.get("contenuto_html"):
            a["contenuto_html"] = a["contenuto"]
    return [ArticleResponse(**a) for a in articles]


@router.get("/articles/{article_id}", response_model=ArticleResponse)
async def get_article(article_id: str, current_user: dict = Depends(get_current_user)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    if current_user["role"] != "admin" and article["client_id"] not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    if article.get("contenuto") and not article.get("contenuto_html"):
        article["contenuto_html"] = article["contenuto"]
    return ArticleResponse(**article)


@router.get("/articles/{article_id}/full")
async def get_article_full(article_id: str, current_user: dict = Depends(get_current_user)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    if current_user["role"] != "admin" and article["client_id"] not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    if article.get("contenuto") and not article.get("contenuto_html"):
        article["contenuto_html"] = article["contenuto"]
    return article


@router.delete("/articles/{article_id}")
async def delete_article(article_id: str, current_user: dict = Depends(get_current_user)):
    article = await db.articles.find_one({"id": article_id}, {"_id": 0})
    if not article:
        raise HTTPException(status_code=404, detail="Articolo non trovato")
    if current_user["role"] != "admin" and article["client_id"] not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    await db.articles.delete_one({"id": article_id})
    return {"message": "Articolo eliminato"}


# ============== GENERATION ==============

    # Note: Traditional programmatic generation is mostly replaced by generate-and-publish 
    # but we keep this for legacy / simple cases for now.
    # TODO: Refactor this to use ArticleService if still needed.


# ============== PUBLISH ==============

@router.post("/articles/publish")
async def publish_articles(request: ArticlePublish, current_user: dict = Depends(get_current_user)):
    published, failed = [], []
    for article_id in request.article_ids:
        article = await db.articles.find_one({"id": article_id}, {"_id": 0})
        if not article:
            failed.append({"id": article_id, "error": "Articolo non trovato"}); continue
        if current_user["role"] != "admin" and article["client_id"] not in current_user.get("client_ids", []):
            failed.append({"id": article_id, "error": "Accesso non autorizzato"}); continue
        client = await db.clients.find_one({"id": article["client_id"]}, {"_id": 0})
        if not client:
            failed.append({"id": article_id, "error": "Cliente non trovato"}); continue
        config = client.get("configuration", {})
        wp_config = config.get("wordpress", {})
        # Robust credential extraction (support aliases)
        wp_user = wp_config.get("utente") or wp_config.get("username")
        wp_pass = wp_config.get("password_applicazione") or wp_config.get("password")
        wp_url = wp_config.get("url_api")
        
        if not wp_url:
            failed.append({"id": article_id, "error": "URL API WordPress non configurato (url_api mancante)"}); continue
        if not wp_user or not wp_pass:
            failed.append({"id": article_id, "error": f"Credenziali WordPress non trovate per Arredo Horeca (mancano utente/pass)"}); continue
            
        try:
            seo_metadata = article.get("seo_metadata", {})
            result = await publish_to_wordpress(
                url=wp_url, username=wp_user,
                password=wp_pass, title=article["titolo"],
                content=article["contenuto"], wp_status=wp_config.get("stato_pubblicazione", "draft"),
                seo_metadata=seo_metadata, tags=seo_metadata.get("tags", []))
            await db.articles.update_one({"id": article_id}, {"$set": {
                "stato": "published", "wordpress_post_id": str(result["post_id"]),
                "wordpress_link": result.get("link"), "wordpress_slug": result.get("slug"),
                "published_at": datetime.now(timezone.utc).isoformat()}})
            published.append({"id": article_id, "wordpress_post_id": result["post_id"], "link": result.get("link")})
        except Exception as e:
            failed.append({"id": article_id, "error": str(e)})
            await db.articles.update_one({"id": article_id}, {"$set": {"stato": "publish_failed", "publish_error": str(e)}})
    return {"published": published, "failed": failed, "summary": {
        "total_requested": len(request.article_ids), "published_count": len(published), "failed_count": len(failed)}}


# ============== ASYNC GENERATE AND PUBLISH ==============

@router.post("/articles/generate-and-publish")
async def generate_and_publish(request: dict, current_user: dict = Depends(get_current_user)):
    client_id = request.get("client_id")
    if not client_id: raise HTTPException(status_code=400, detail="client_id richiesto")
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    client_doc = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client_doc: raise HTTPException(status_code=404, detail="Cliente non trovato")
    config = client_doc.get("configuration") or {}
    combinations = request.get("combinations", [])
    if not combinations: raise HTTPException(status_code=400, detail="Nessuna combinazione da generare")
    
    job_id = await ArticleService.create_job(client_id, len(combinations))
    publish_to_wp = request.get("publish_to_wordpress", False)
    content_type = request.get("content_type", "articolo")
    brief = request.get("brief")
    
    await log_activity(client_id, "batch_start", "running", {"total": len(combinations), "job_id": job_id, "publish": publish_to_wp})
    asyncio.create_task(ArticleService.generate_and_publish_batch(
        job_id, client_id, combinations, publish_to_wp, content_type, brief, config, client_doc
    ))
    return {"job_id": job_id, "status": "running", "total": len(combinations)}


async def _generate_and_publish_batch(job_id, client_id, combinations, publish_to_wp, content_type, brief, config, client_doc):
    llm_config = config.get("llm", {}) or config.get("openai", {})
    provider = llm_config.get("provider", "openai")
    kb = config.get("knowledge_base", {})


# ============== IMAGE IMPORT ==============

@router.post("/articles/generate-topic-image")
async def generate_topic_image(body: dict, current_user: dict = Depends(get_current_user)):
    client_id = body.get("client_id")
    title = body.get("title")
    branding = body.get("branding", {})
    
    logger.info(f"Generating topic image for client {client_id}, title: {title}")
    
    if not client_id or not title:
        raise HTTPException(status_code=400, detail="client_id e title richiesti")
        
    client_doc = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
        
    config = client_doc.get("configuration") or {}
    llm_key = (config.get("llm", {}) or config.get("openai", {})).get("api_key")
    
    from agents.image import ImageAgent
    from helpers import generate_image_with_fallback
    
    agent = ImageAgent(client_id=client_id, llm_config=config.get("llm", {}) or config.get("openai", {}))
    crafted_prompt = await agent.craft_prompt(title, branding)
    logger.info(f"Crafted AI prompt: {crafted_prompt[:100]}...")
    
    try:
        user_id = current_user.get("user_id", "admin")
        together_key = config.get("together_api_key") or os.environ.get("TOGETHER_API_KEY")
        result = await generate_image_with_fallback(crafted_prompt, user_id, openai_key=llm_key, together_key=together_key, article_title=title)
        
        # Use an absolute URL for the image
        token = body.get("token") or ""
        base_url = os.environ.get('BACKEND_URL', 'http://localhost:8000')
        img_url = f"{base_url}/api/uploads/files/{result['id']}?auth={token}"
        
        logger.info(f"Image generated successfully: {img_url}")
        return {
            "id": result["id"],
            "url": img_url,
            "crafted_prompt": crafted_prompt
        }
    except Exception as e:
        logger.error(f"Image generation error details: {str(e)}")
        # If it's an OpenAI error, it might be about the prompt or key
        detail = str(e)
        if "policy" in detail.lower():
            detail = "L'IA ha rifiutato questo prompt per motivi di policy. Prova a modificarlo."
        raise HTTPException(status_code=500, detail=detail)


@router.post("/articles/refine-objective")
async def refine_objective(request: dict, current_user: dict = Depends(get_current_user)):
    client_id = request.get("client_id")
    objective = request.get("objective", "")
    strategy = request.get("strategy", {})
    prompt_context = request.get("prompt_context", "")

    if not client_id:
        raise HTTPException(status_code=400, detail="client_id richiesto")

    client_doc = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Cliente non trovato")

    config = client_doc.get("configuration") or {}
    llm_config = config.get("llm", {}) or config.get("openai", {})
    kb = config.get("knowledge_base", {})

    # Fetch Global SEO/GEO Guidelines
    global_settings = await db.global_settings.find_one({"id": "global"}, {"_id": 0})
    global_g = global_settings.get("seo_geo_guidelines", []) if global_settings else []
    guidelines_text = "\n".join([f"- {g}" for g in global_g])

    from helpers import generate_with_rotation

    sys_prompt = f"""Sei un esperto SEO Strategist. 
Il tuo compito è migliorare e raffinare l' 'Obiettivo Strategico' per la generazione di un articolo.

### REGOLE PADRE SEO/GEO (DA SEGUIRE RIGOROSAMENTE):
{guidelines_text}

Usa le informazioni della Knowledge Base del cliente ({client_doc.get('nome')}) e la strategia definita per creare un obiettivo chiaro, professionale e orientato ai risultati.

KB CLIENTE:
- Business: {kb.get('descrizione_attivita')}
- Target: {kb.get('pubblico_target_primario')}
- Punti di forza: {', '.join(kb.get('punti_di_forza', []))}

STRATEGIA DEFINITA:
- Funnel: {strategy.get('funnel_stage')}
- Modello: {strategy.get('modello_copywriting')}
- Intent: {strategy.get('search_intent')}

Il tuo obiettivo deve istruire l'agente che scriverà l'articolo su:
1. Angolo di attacco (angle)
2. Tono e stile (basandosi sulla KB)
3. Azione desiderata (CTA)
4. Specifiche tecniche SEO (es. internal linking o stile dei titoli)

Restituisci SOLO il testo dell'obiettivo raffinato, senza commenti o introduzioni. Sii conciso ma molto denso di valore (max 120 parole)."""

    user_prompt = f"Obiettivo Attuale: {objective}\nContesto Prompt Precedente: {prompt_context}"

    try:
        refined = await generate_with_rotation(llm_config, sys_prompt, user_prompt)
        return {"refined_objective": refined.strip()}
    except Exception as e:
        logger.error(f"Error refining objective: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/articles/import-external-image")
async def import_external_image(request: dict, current_user: dict = Depends(get_current_user)):
    url = request.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="URL mancante")
    
    import httpx
    import uuid
    from datetime import datetime, timezone
    from storage import put_object, APP_NAME
    
    try:
        async with httpx.AsyncClient(timeout=15) as client_http:
            resp = await client_http.get(url)
            if resp.status_code != 200:
                raise Exception(f"Errore HTTP {resp.status_code} dal server remoto")
            data = resp.content
            
        ext = url.split("?")[0].split(".")[-1].lower()
        if ext not in ["png", "jpg", "jpeg", "webp", "gif"]:
            ext = "jpg"
            
        file_id = str(uuid.uuid4())
        user_id = current_user.get("user_id", "admin")
        path = f"{APP_NAME}/uploads/{user_id}/{file_id}.{ext}"
        content_type = f"image/{ext}"
        
        result = put_object(path, data, content_type)
        
        doc = {
            "id": file_id,
            "storage_path": result["path"],
            "original_filename": f"external_{file_id}.{ext}",
            "content_type": content_type,
            "size": len(data),
            "user_id": user_id,
            "is_deleted": False,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.files.insert_one(doc)
        
        return {"id": file_id, "url": f"/api/uploads/files/{file_id}"}
        
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"Error importing external image: {e}\n{error_trace}")
        raise HTTPException(status_code=500, detail=str(e))

# ============== SIMPLIFIED GENERATION ==============

@router.post("/articles/simple-generate")
async def simple_generate_article(request: SimpleGenerateRequest, current_user: dict = Depends(get_current_user)):
    # Prioritize client_id from request if user is admin, 
    # otherwise validate requested client_id against user permissions
    if current_user["role"] == "admin":
        client_id = request.client_id
    else:
        # For non-admins, ensure the requested client_id is one of their allowed IDs
        # or fallback to the primary one in their token if none requested
        client_id = request.client_id or current_user.get("client_id")
        allowed_ids = current_user.get("client_ids", [])
        if client_id not in allowed_ids:
            raise HTTPException(status_code=403, detail="Non hai i permessi per questo cliente")
            
    if not client_id: raise HTTPException(status_code=400, detail="client_id richiesto")
    
    # --- IDEMPOTENCY CHECK (Safety for double-taps on mobile) ---
    # Check if a job/article for this client and keyword was started in the last 60 seconds
    from datetime import datetime, timedelta, timezone
    one_minute_ago = (datetime.now(timezone.utc) - timedelta(seconds=60)).isoformat()
    existing_job = await db.jobs.find_one({
        "client_id": client_id,
        "keyword": request.keyword,
        "created_at": {"$gte": one_minute_ago},
        "status": "running"
    })
    
    if existing_job:
        logger.warning(f"Idempotency triggered: Duplicate generation request for client {client_id} and keyword {request.keyword}")
        return {"job_id": existing_job["id"], "status": "running", "keyword": request.keyword, "idempotency": True}
    # ------------------------------------------------------------

    client_doc = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client_doc: raise HTTPException(status_code=404, detail="Cliente non trovato")
    config = client_doc.get("configuration") or {}
    
    # Context building
    kb = config.get("knowledge_base", {})
    existing_published = await get_internal_linking_context(client_id, config, request.keyword)
    brief_override = {"note_speciali": request.topic or f"Scrivi un articolo sulla keyword: {request.keyword}",
                      "search_intent": {"informazionale": "informazionale", "commerciale": "commerciale", "conversione": "transazionale"}.get(request.objective, "informazionale")}
    
    # Fetch Global SEO/GEO Guidelines
    global_settings = await db.global_settings.find_one({"id": "global"}, {"_id": 0})
    global_g = global_settings.get("seo_geo_guidelines", []) if global_settings else []
    
    ct_map = {"articolo": "articolo_blog", "landing_page": "landing_page", "pillar_page": "pillar_page"}
    system_prompt = build_system_prompt(kb, config.get("tono_e_stile", {}), config.get("seo", {}),
        client_doc["nome"], config.get("advanced_prompt", {}), config.get("content_strategy", {}), 
        ct_map.get(request.content_type, "articolo_blog"), brief_override, existing_published, global_g)

    # Append GSC and SERP context
    if request.gsc_context or request.serp_context:
        # (Legacy context injection logic kept here for simplicity in route)
        extra = []
        if request.gsc_context:
            for kw in request.gsc_context.get("top_keywords", [])[:10]:
                extra.append(f"- {kw.get('keyword')} (Pos: {kw.get('position')})")
        if request.serp_context:
            for c in request.serp_context.get("competitors", [])[:4]:
                extra.append(f"- Competitor: {c.get('title')} ({c.get('url')})")
        if extra: system_prompt += "\n\n## CONTESTO AGGIUNTIVO:\n" + "\n".join(extra)

    job_id = await ArticleService.create_job(client_id, 1)
    asyncio.create_task(ArticleService.run_simple_article_generation(
        job_id=job_id,
        client_id=client_id,
        keyword=request.keyword,
        topic=request.topic,
        publish_to_wp=request.publish_to_wordpress, # Fix: Map correct parameter
        system_prompt=system_prompt,
        llm_config=config.get("llm", {}),
        wp_config=config.get("wordpress", {}),
        kb=kb,
        combo={"servizio": request.keyword, "citta": kb.get("citta_principale", ""), "tipo": request.objective},
        titolo_suggerito=request.titolo_suggerito or "",
        content_type=request.content_type,
        image_ids=request.image_ids or [],
        existing_published=existing_published,
        generate_cover=request.generate_cover
    ))
    return {"job_id": job_id, "status": "running", "keyword": request.keyword}




async def _process_internal_links_post_publish(client_id: str, provider: str, api_key: str, model: str, temperature: float,
                                               new_article_id: str, new_title: str, new_keyword: str, new_url: str,
                                               wp_config: dict, wp_type: str):
    """Fetches old articles and appends an internal link to the newly published article."""
    try:
        # Find up to 4 recent articles to update (exclude the new one)
        cursor = db.articles.find({
            "client_id": client_id, 
            "stato": "published", 
            "wordpress_post_id": {"$ne": None}, 
            "id": {"$ne": new_article_id}
        }).sort("published_at", -1).limit(4)
        
        async for old_article in cursor:
            old_id = old_article["id"]
            old_title = old_article["titolo"]
            old_content = old_article.get("contenuto_html") or old_article.get("contenuto", "")
            wp_post_id = old_article["wordpress_post_id"]
            
            # Genera il paragrafo
            new_paragraph = await generate_internal_link_update(
                provider, api_key, model, temperature,
                old_title, old_content, new_title, new_keyword, new_url
            )
            
            if new_paragraph and "<a href=" in new_paragraph:
                updated_content = old_content + "\n\n" + new_paragraph
                
                # Pubblica su wp
                success = await update_wordpress_post(
                    url=wp_config.get("url_api"),
                    username=wp_config.get("utente"),
                    password=wp_config.get("password_applicazione"),
                    post_id=wp_post_id,
                    content=updated_content,
                    wp_type=wp_type
                )
                
                if success:
                    await db.articles.update_one(
                        {"id": old_id},
                        {"$set": {"contenuto_html": updated_content, "contenuto": updated_content}}
                    )
                    await log_activity(client_id, "internal_linking", "success", {
                        "source_article": old_title,
                        "target_article": new_title,
                        "message": f"Aggiunto link a '{new_title}' nell'articolo '{old_title}'"
                    })
                else:
                    await log_activity(client_id, "internal_linking", "failed", {
                        "source_article": old_title,
                        "error": "Aggiornamento WordPress fallito"
                    })
    except Exception as e:
        logger.error(f"Error in _process_internal_links_post_publish: {e}")
        await log_activity(client_id, "internal_linking", "failed", {"error": str(e)})


# ============== JOBS ==============

@router.get("/jobs/{job_id}")
async def get_job_status(job_id: str, current_user: dict = Depends(get_current_user)):
    job = await db.jobs.find_one({"id": job_id}, {"_id": 0})
    if not job:
        raise HTTPException(status_code=404, detail="Job non trovato")
    if current_user["role"] != "admin" and job.get("client_id") not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    return job


# ============== STATS ==============

@router.get("/stats/overview")
async def get_overview_stats(current_user: dict = Depends(get_current_user)):
    if current_user["role"] == "admin":
        total_clients = await db.clients.count_documents({})
        active_clients = await db.clients.count_documents({"attivo": True})
        total_articles = await db.articles.count_documents({})
        published_articles = await db.articles.count_documents({"stato": "published"})
        generated_articles = await db.articles.count_documents({"stato": "generated"})
        recent_clients = await db.clients.find({}, {"_id": 0}).sort("created_at", -1).limit(5).to_list(5)
        return {"total_clients": total_clients, "active_clients": active_clients, "total_articles": total_articles,
                "published_articles": published_articles, "generated_articles": generated_articles, "recent_clients": recent_clients}
    else:
        client_id = current_user.get("client_id")
        total_articles = await db.articles.count_documents({"client_id": client_id})
        published_articles = await db.articles.count_documents({"client_id": client_id, "stato": "published"})
        generated_articles = await db.articles.count_documents({"client_id": client_id, "stato": "generated"})
        return {"total_articles": total_articles, "published_articles": published_articles, "generated_articles": generated_articles}


# ============== ACTIVITY LOG ==============

@router.get("/activity-logs/{client_id}")
async def get_activity_logs(client_id: str, limit: int = 50, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    logs = await db.activity_logs.find({"client_id": client_id}, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return logs


@router.get("/activity-logs")
async def get_all_activity_logs(limit: int = 100, current_user: dict = Depends(get_current_user)):
    query = {}
    if current_user["role"] != "admin":
        query = {"client_id": {"$in": current_user.get("client_ids", [])}}
    logs = await db.activity_logs.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    return logs


# ============== LLM PROVIDERS ==============

@router.get("/llm-providers")
async def get_llm_providers():
    return {"providers": [
        {"id": "openai", "name": "OpenAI", "models": [
            {"id": "gpt-4-turbo-preview", "name": "GPT-4 Turbo (Raccomandato)"},
            {"id": "gpt-4o", "name": "GPT-4o"}, {"id": "gpt-4", "name": "GPT-4"},
            {"id": "gpt-3.5-turbo", "name": "GPT-3.5 Turbo (Economico)"}]},
        {"id": "anthropic", "name": "Claude (Anthropic)", "models": [
            {"id": "claude-sonnet-4-5-20250929", "name": "Claude Sonnet 4.5"},
            {"id": "claude-3-5-haiku-20241022", "name": "Claude Haiku 3.5"},
            {"id": "claude-3-opus-20240229", "name": "Claude Opus 3"}]},
        {"id": "deepseek", "name": "DeepSeek", "models": [
            {"id": "deepseek-chat", "name": "DeepSeek Chat"},
            {"id": "deepseek-coder", "name": "DeepSeek Coder"},
            {"id": "deepseek-reasoner", "name": "DeepSeek Reasoner (R1)"}]},
        {"id": "perplexity", "name": "Perplexity", "models": [
            {"id": "sonar-pro", "name": "Sonar Pro"},
            {"id": "sonar", "name": "Sonar"},
            {"id": "llama-3.1-sonar-large-128k-online", "name": "Llama 3.1 Sonar Large"}]}]}


# ============== PASSWORDS ==============

@router.post("/verify-admin-password")
async def verify_admin_password(request: VerifyPasswordRequest, current_user: dict = Depends(get_current_user)):
    if request.password == ADMIN_MASTER_PASSWORD:
        return {"valid": True, "access_level": "admin"}
    return {"valid": False}


@router.post("/verify-prompt-password")
async def verify_prompt_password(request: VerifyPasswordRequest, current_user: dict = Depends(get_current_user)):
    if not request.client_id:
        raise HTTPException(status_code=400, detail="client_id richiesto")
    if request.password == ADMIN_MASTER_PASSWORD:
        return {"valid": True, "access_level": "admin"}
    client = await db.clients.find_one({"id": request.client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    client_password = client.get("configuration", {}).get("advanced_prompt", {}).get("prompt_password", "")
    if client_password and request.password == client_password:
        return {"valid": True, "access_level": "client"}
    return {"valid": False}


@router.put("/clients/{client_id}/advanced-prompt")
async def update_advanced_prompt(client_id: str, request: UpdateAdvancedPromptRequest, current_user: dict = Depends(get_current_user)):
    is_admin = request.password == ADMIN_MASTER_PASSWORD
    if not is_admin:
        client = await db.clients.find_one({"id": client_id}, {"_id": 0})
        if not client:
            raise HTTPException(status_code=404, detail="Cliente non trovato")
        client_password = client.get("configuration", {}).get("advanced_prompt", {}).get("prompt_password", "")
        if not client_password or request.password != client_password:
            raise HTTPException(status_code=403, detail="Password non valida")
    update_data = {}
    if request.secondo_livello_prompt is not None:
        update_data["configuration.advanced_prompt.secondo_livello_prompt"] = request.secondo_livello_prompt
    if request.keyword_injection_template is not None:
        update_data["configuration.advanced_prompt.keyword_injection_template"] = request.keyword_injection_template
    if is_admin and request.prompt_password is not None:
        update_data["configuration.advanced_prompt.prompt_password"] = request.prompt_password
    if not update_data:
        raise HTTPException(status_code=400, detail="Nessun dato da aggiornare")
    result = await db.clients.update_one({"id": client_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    return {"message": "Prompt avanzato aggiornato", "is_admin": is_admin}


# ============== SERP ==============

@router.post("/serp/images")
async def serp_images(request: dict, current_user: dict = Depends(get_current_user)):
    keyword = request.get("keyword", "").strip()
    if not keyword:
        raise HTTPException(status_code=400, detail="Keyword obbligatoria")
    max_results = min(request.get("max_results", 12), 50)  # cap at 50
    
    # Refine keyword for better search results (avoid logos/icons)
    search_keywords = keyword
    if len(keyword.split()) < 3:
        search_keywords = f"{keyword} realistico fotografia stock"
    
    try:
        from duckduckgo_search import DDGS
        import httpx as _httpx
        import random as _random
        
        ua_list = [
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36"
        ]
        
        results = []
        try:
            with DDGS(headers={"User-Agent": _random.choice(ua_list)}) as ddgs:
                raw_results = list(ddgs.images(
                    keywords=search_keywords,
                    region="it-it",
                    safesearch="moderate",
                    size="Large",
                    max_results=max_results + 10
                ))
                # Filter out obvious icons/logos or tiny images
                for r in raw_results:
                    title_low = r.get("title", "").lower()
                    if any(x in title_low for x in ["logo", "icon", "vettore", "svg", "lettera"]):
                        continue
                    if "wikimedia" in r.get("image", "") and len(r.get("title", "")) < 10: # Likely categories or single letters
                        continue
                    results.append(r)
                
                results = results[:max_results]
        except Exception as ddg_err:
            logger.warning(f"Primary DDG image search failed: {ddg_err}")

        if not results:
            logger.warning("No images found via DDG. Trying Wikimedia Commons fallback...")
            from helpers import web_search_images_wikimedia
            results = await web_search_images_wikimedia(keyword, max_results)

        if not results:
            logger.warning("No images found via any provider. Returning empty list.")
            return {"keyword": keyword, "results": [], "total": 0}
        
        async def get_file_size(url: str, w: int, h: int) -> int:
            """Try to get real file size via HEAD request, fallback to dimension estimate."""
            try:
                async with _httpx.AsyncClient(timeout=3.0, follow_redirects=True) as c:
                    r = await c.head(url, headers={"User-Agent": "Mozilla/5.0"})
                    cl = r.headers.get("content-length")
                    if cl and cl.isdigit():
                        return max(1, int(cl) // 1024)
            except Exception:
                pass
            return max(10, int(w * h * 0.0002))  # dimension-based estimate
        
        # Fetch sizes concurrently for all results
        import asyncio as _asyncio
        formatted_results = []
        for r in results[:max_results]:
            w = r.get("width", 800)
            h = r.get("height", 600)
            img_url = r.get("image", "")
            if img_url:
                formatted_results.append({
                    "image": img_url,
                    "url": img_url,
                    "thumbnail": r.get("thumbnail"),
                    "title": r.get("title", ""),
                    "source": r.get("source", ""),
                    "width": int(w) if w else 0,
                    "height": int(h) if h else 0,
                    "weight_kb": None  # Will be filled below
                })
        
        # Concurrent size fetching (up to 8 at a time)
        sem = _asyncio.Semaphore(8)
        async def fetch_with_sem(item):
            async with sem:
                kb = await get_file_size(item["image"], item["width"], item["height"])
                item["weight_kb"] = kb
        
        await _asyncio.gather(*[fetch_with_sem(item) for item in formatted_results])
        
        return {"keyword": keyword, "results": formatted_results, "total": len(formatted_results)}
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Image search failed: {e}")
        return {"keyword": keyword, "results": [], "error": str(e)}



@router.post("/serp/search")
async def serp_search(request: dict, current_user: dict = Depends(get_current_user)):
    from helpers import scrape_google_serp
    keyword = request.get("keyword", "").strip()
    if not keyword:
        raise HTTPException(status_code=400, detail="Keyword obbligatoria")
    country = request.get("country", "it")
    num_results = min(request.get("num_results", 5), 10)
    results = await scrape_google_serp(keyword, country, num_results)
    return {"keyword": keyword, "country": country, "results": results, "count": len(results)}


@router.post("/serp/analyze-full")
async def serp_full_analysis(request: dict, current_user: dict = Depends(get_current_user)):
    """Full SERP analysis: search + extract titles/headings from top results."""
    from helpers import scrape_google_serp
    keyword = request.get("keyword", "").strip()
    if not keyword:
        raise HTTPException(status_code=400, detail="Keyword obbligatoria")
    country = request.get("country", "it")
    num_results = min(request.get("num_results", 4), 10)
    results = await scrape_google_serp(keyword, country, num_results)
    # Build structured competitor analysis
    competitors = []
    for r in results:
        competitors.append({
            "position": r["position"],
            "url": r["url"],
            "title": r["title"],
            "headings": r.get("headings", []),
            "description": r.get("description", ""),
            "text_preview": r.get("text_preview", "")
        })
    # Build suggested prompt context from SERP data
    serp_titles = [c["title"] for c in competitors if c["title"]]
    serp_headings = []
    for c in competitors:
        for h in c.get("headings", []):
            if h and h not in serp_headings:
                serp_headings.append(h)
    return {
        "keyword": keyword,
        "competitors": competitors,
        "count": len(competitors),
        "extracted": {
            "titles": serp_titles,
            "headings": serp_headings[:20]
        }
    }



@router.post("/clients/{client_id}/serp-analysis")
async def analyze_serp(client_id: str, request: SerpScrapingRequest, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    config = client.get("configuration", {})
    apify_config = config.get("apify", {})
    api_key = apify_config.get("api_key")
    if not api_key:
        raise HTTPException(status_code=400, detail="API Key Apify non configurata")
    # Legacy Apify endpoint - kept for backward compatibility
    raise HTTPException(status_code=400, detail="Usa il nuovo endpoint /api/serp/search")


@router.get("/clients/{client_id}/serp-history")
async def get_serp_history(client_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    analyses = await db.serp_analyses.find({"client_id": client_id}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    return {"analyses": analyses}


# ============== SAVE AND GENERATE ==============

@router.post("/clients/{client_id}/save-and-generate")
async def save_and_generate(client_id: str, session_name: str = "", notes: str = "",
                             generate_articles: bool = True, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    config = client.get("configuration", {})
    keywords = config.get("keyword_combinations", {})
    advanced_prompt = config.get("advanced_prompt", {})
    yesterday = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    serp_docs = await db.serp_analyses.find({"client_id": client_id, "created_at": {"$gte": yesterday}}, {"_id": 0}).to_list(20)
    if not session_name:
        session_name = f"Sessione {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')}"
    session_id = str(uuid.uuid4())
    session_doc = {"id": session_id, "client_id": client_id, "session_name": session_name,
        "keywords": keywords, "serp_analyses": serp_docs,
        "advanced_prompt": {"secondo_livello_prompt": advanced_prompt.get("secondo_livello_prompt", ""),
                            "keyword_injection_template": advanced_prompt.get("keyword_injection_template", "")},
        "notes": notes, "articles_generated": 0, "created_at": datetime.now(timezone.utc).isoformat()}
    await db.seo_sessions.insert_one(session_doc)
    generated_count = 0
    if generate_articles:
        servizi = keywords.get("servizi", [])
        citta = keywords.get("citta_e_zone", [])
        tipi = keywords.get("tipi_o_qualificatori", [])
        combinations = [{"servizio": c[0], "citta": c[1], "tipo": c[2]} for c in itertools.product(servizi, citta, tipi)]
        generated_count = len(combinations)
        await db.seo_sessions.update_one({"id": session_id}, {"$set": {"articles_generated": generated_count, "combinations": combinations}})
    return {"session_id": session_id, "session_name": session_name, "message": "Sessione salvata",
            "keywords_saved": {"servizi": len(keywords.get("servizi", [])), "citta": len(keywords.get("citta_e_zone", [])),
                               "tipi": len(keywords.get("tipi_o_qualificatori", []))},
            "combinations_ready": generated_count}


# ============== EDITORIAL PLAN ==============

@router.get("/editorial-plan/{client_id}")
async def get_editorial_plan(client_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    plan = await db.editorial_plans.find_one({"client_id": client_id}, {"_id": 0})
    if not plan:
        return None
    return plan


@router.delete("/editorial-plan/{client_id}")
async def delete_editorial_plan(client_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    await db.editorial_plans.delete_one({"client_id": client_id})
    return {"message": "Piano editoriale eliminato"}

@router.post("/save-plan/{client_id}")
async def save_editorial_plan(client_id: str, plan: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    plan["updated_at"] = datetime.now(timezone.utc).isoformat()
    await db.editorial_plans.update_one(
        {"client_id": client_id},
        {"$set": plan},
        upsert=True
    )
    return {"message": "Piano salvato"}

from pydantic import BaseModel
class PlanRequest(BaseModel):
    objective: str = ""
    num_topics: int = 10

@router.post("/generate-plan/{client_id}")
async def generate_editorial_plan(client_id: str, req: PlanRequest = None, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
        
    client_doc = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
        
    config = client_doc.get("configuration") or {}
    llm_config = config.get("llm", {}) or config.get("openai", {})
    
    from agents.strategist import StrategistAgent
    strategist = StrategistAgent(client_id=client_id, llm_config=llm_config)
    
    kb_data = config.get("knowledge_base", {})
    # Load recent GSC data from DB
    gsc_cache = await db.gsc_cache.find_one({"client_id": client_id}, sort=[("created_at", -1)])
    gsc_data = gsc_cache.get("data", {}) if gsc_cache else {}
    target_keywords = config.get("keyword_combinations", {}).get("servizi", [])
    
    objective = req.objective if req else ""
    num_topics = req.num_topics if req else 10
    
    existing_articles = await db.articles.find({"client_id": client_id}, {"titolo": 1, "_id": 0}).to_list(200)
    existing_topics = [a.get("titolo") for a in existing_articles if a.get("titolo")]
    
    # Also fetch titles from Sitemap to avoid duplicates
    sitemap_url = config.get("seo", {}).get("sitemap_url") or config.get("knowledge_base", {}).get("sitemap_url")
    total_existing_count = len(existing_topics)
    if sitemap_url:
        try:
            from helpers import get_sitemap_links
            sitemap_links = await get_sitemap_links(sitemap_url)
            total_existing_count += len(sitemap_links)
            # Limit sitemap titles to avoid context window explosion (max 150 from sitemap)
            count = 0
            for l in sitemap_links:
                if l.get("titolo") and l["titolo"] not in existing_topics:
                    existing_topics.append(l["titolo"])
                    count += 1
                if count >= 150: break 
        except Exception as e:
            logger.warning(f"Could not fetch sitemap for existing topics check: {e}")
    
    # Add a note about the total count to inform the LLM
    objective_with_context = objective or "Massimizzare il traffico organico in linea con le keywords."
    objective_with_context += f"\n(Nota: Il sito ha già {total_existing_count} contenuti indicizzati. Proponi argomenti freschi e non trattati.)"
    
    # Fetch Global SEO/GEO Guidelines
    global_settings = await db.global_settings.find_one({"id": "global"}, {"_id": 0})
    global_g = global_settings.get("seo_geo_guidelines", []) if global_settings else []
    
    try:
        topics = await strategist.generate_plan(
            gsc_data=gsc_data, 
            kb_data=kb_data, 
            target_keywords=target_keywords, 
            existing_topics=existing_topics,
            num_topics=num_topics,
            global_guidelines=global_g,
            objective=objective_with_context
        )

        # Fetch stock images for the plan topics
        try:
            from duckduckgo_search import DDGS
            with DDGS() as ddgs:
                for t in topics[:12]:
                    kw = t.get("keyword") or t.get("titolo")
                    if not kw: continue
                    try:
                        image_results = ddgs.images(keywords=kw, max_results=1)
                        # Correct iterator handling for newer DDGS versions
                        for res0 in image_results:
                            t["stock_image_url"] = res0.get("image")
                            t["stock_image_thumb"] = res0.get("thumbnail")
                            break # Just first result
                    except Exception as img_err:
                        logger.warning(f"Image fetch failed for '{kw}': {img_err}")
        except Exception as ddg_init_err:
            logger.error(f"DDGS init failed: {ddg_init_err}")
        
        plan_doc = {
            "client_id": client_id,
            "topics": topics,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.editorial_plans.update_one(
            {"client_id": client_id},
            {"$set": plan_doc},
            upsert=True
        )
        
        return plan_doc
    except Exception as e:
        import traceback
        logger.error(f"Plan generation crash: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(status_code=500, detail=f"Errore generazione: {str(e)}")



@router.post("/articles/batch-plan")
async def batch_plan(request: dict, current_user: dict = Depends(get_current_user)):
    client_id = request.get("client_id")
    if not client_id:
        raise HTTPException(status_code=400, detail="client_id richiesto")
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    client_doc = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    config = client_doc.get("configuration") or {}
    
    topics = request.get("topics", [])
    publish_to_wp = request.get("publish_to_wordpress", False)
    content_type = request.get("content_type", "articolo")
    generate_cover = request.get("generate_cover", False)
    
    if not topics:
        raise HTTPException(status_code=400, detail="Nessun topic fornito")

    job_id = await ArticleService.create_job(client_id, len(topics))
    asyncio.create_task(ArticleService.generate_and_publish_batch(
        job_id, client_id, topics, publish_to_wp, content_type, config.get("advanced_prompt", {}), config, client_doc, is_topic_based=True
    ))
    return {"job_id": job_id, "status": "running", "total": len(topics)}

@router.post("/articles/suggest-silo")
async def suggest_silo(request: SiloSuggestRequest, current_user: dict = Depends(get_current_user)):
    client = await db.clients.find_one({"id": request.client_id})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    config = client.get("configuration", {})
    llm_config = config.get("llm", {}) or config.get("openai", {})
    kb = config.get("knowledge_base", {})
    
    # Get GSC context if available
    gsc_data = await db.gsc_data.find_one({"client_id": request.client_id})
    top_queries = gsc_data.get("keywords", [])[:20] if gsc_data else []
    
    from agents.strategist import StrategistAgent
    strategist = StrategistAgent(client_id=request.client_id, llm_config=llm_config)
    
    clusters = await strategist.suggest_silo_clusters(request.pillar_topic, kb, top_queries)
    return {"clusters": clusters}

@router.post("/articles/programmatic/architect")
async def programmatic_architect(req: ProgrammaticArchitectRequest, current_user: dict = Depends(get_current_user)):
    client_doc = await db.clients.find_one({"id": req.client_id})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    config = client_doc.get("configuration", {})
    llm_config = config.get("llm", {}) or config.get("openai", {})
    
    try:
        # Get correlates
        intents = await get_web_intents(req.service, req.cities[0] if req.cities else "Italia", llm_config)
        # Generate spintax
        spintax = await generate_ai_master_spintax(req.service, intents, llm_config)
        return {"correlates": intents, "master_spintax": spintax}
    except Exception as e:
        logger.error(f"Architect error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/articles/programmatic/preview")
async def programmatic_preview(req: ProgrammaticPreviewRequest, current_user: dict = Depends(get_current_user)):
    try:
        # Simple spintax resolver for preview
        import re
        import random
        
        def resolve_spintax(text):
            while "{" in text:
                match = re.search(r"\{([^{}]+)\}", text)
                if not match: break
                parts = match.group(1).split("|")
                text = text.replace(match.group(0), random.choice(parts), 1)
            return text
            
        content = resolve_spintax(req.template)
        # Replace placeholders
        content = content.replace("[[SERVIZIO]]", req.item.get("servizio", "Servizio"))
        content = content.replace("[[CITTA]]", req.item.get("citta", "Città"))
        content = content.replace("[[TIPO]]", req.item.get("tipo", "Premium"))
        
        # Distribute images
        if req.global_images:
            content = distribute_global_images(content, req.global_images)
            
        return {"html": content}
    except Exception as e:
        logger.error(f"Preview error: {e}")
        raise HTTPException(status_code=500, detail=str(e))
