"""Client CRUD, configuration, sites, XLSX, and related routes."""
import uuid
import io
import itertools
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
import pandas as pd
import logging

from database import db
from auth import get_current_user, require_admin
from models import (ClientCreate, ClientUpdate, ClientResponse, ClientConfiguration,
                    SerpScrapingRequest, SEOSessionCreate, SEOSessionResponse)
from helpers import scrape_website_info

logger = logging.getLogger("server")
router = APIRouter()


@router.get("/clients", response_model=List[ClientResponse])
async def get_clients(current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        client_ids = current_user.get("client_ids", [])
        if not client_ids:
            return []
        clients = await db.clients.find({"id": {"$in": client_ids}}, {"_id": 0}).to_list(100)
    else:
        clients = await db.clients.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    result = []
    for c in clients:
        total = await db.articles.count_documents({"client_id": c["id"]})
        c["totale_articoli"] = total
        if "siti_web" not in c:
            c["siti_web"] = [c.get("sito_web", "")] if c.get("sito_web") else []
        result.append(ClientResponse(**c))
    return result


@router.post("/clients", response_model=ClientResponse)
async def create_client(client: ClientCreate, current_user: dict = Depends(require_admin)):
    client_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    client_doc = {
        "id": client_id, "nome": client.nome, "settore": client.settore,
        "agenzia": client.agenzia,
        "sito_web": client.sito_web,
        "siti_web": client.siti_web if client.siti_web else [client.sito_web] if client.sito_web else [],
        "attivo": client.attivo, "created_at": now, "ultimo_run": None, "configuration": None
    }
    await db.clients.insert_one(client_doc)
    return ClientResponse(**{k: v for k, v in client_doc.items() if k != '_id'}, totale_articoli=0)


@router.get("/clients/{client_id}", response_model=ClientResponse)
async def get_client(client_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    total = await db.articles.count_documents({"client_id": client_id})
    client["totale_articoli"] = total
    if "siti_web" not in client:
        client["siti_web"] = [client.get("sito_web", "")] if client.get("sito_web") else []
    return ClientResponse(**client)


@router.put("/clients/{client_id}", response_model=ClientResponse)
async def update_client(client_id: str, update: ClientUpdate, current_user: dict = Depends(require_admin)):
    update_data = update.model_dump(exclude_none=True)
    if not update_data:
        raise HTTPException(status_code=400, detail="Nessun dato da aggiornare")
    result = await db.clients.update_one({"id": client_id}, {"$set": update_data})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    total = await db.articles.count_documents({"client_id": client_id})
    client["totale_articoli"] = total
    if "siti_web" not in client:
        client["siti_web"] = [client.get("sito_web", "")] if client.get("sito_web") else []
    return ClientResponse(**client)


@router.delete("/clients/{client_id}")
async def delete_client(client_id: str, current_user: dict = Depends(require_admin)):
    result = await db.clients.delete_one({"id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    await db.articles.delete_many({"client_id": client_id})
    return {"message": "Cliente e articoli eliminati"}


@router.put("/clients/{client_id}/configuration")
async def update_configuration(client_id: str, config: ClientConfiguration, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    config_dict = config.model_dump(exclude_none=True)
    existing = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    existing_config = existing.get("configuration") or {}
    existing_config.update(config_dict)
    await db.clients.update_one({"id": client_id}, {"$set": {"configuration": existing_config}})
    return {"message": "Configurazione aggiornata", "configuration": existing_config}


@router.get("/clients/{client_id}/combinations")
async def get_combinations(client_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    config = client.get("configuration", {})
    kw = config.get("keyword_combinations", {})
    servizi = kw.get("servizi", [])
    citta = kw.get("citta_e_zone", [])
    tipi = kw.get("tipi_o_qualificatori", [])
    
    # Fallback to single empty string if list is empty to avoid 0 products
    s_list = servizi if servizi else [""]
    c_list = citta if citta else [""]
    t_list = tipi if tipi else [""]
    
    combinations = []
    for combo in itertools.product(s_list, c_list, t_list):
        if not combo[0] and not combo[1]: continue # Skip if both core fields are empty
        
        # Build clean title
        parts = [p for p in [combo[0], combo[2]] if p]
        titolo_base = " ".join(parts)
        titolo = f"{titolo_base} a {combo[1]}" if combo[1] else titolo_base
        
        combinations.append({
            "servizio": combo[0], 
            "citta": combo[1], 
            "tipo": combo[2],
            "titolo": titolo.strip().title()
        })
    return {"combinations": combinations, "total": len(combinations)}


# ============== SITES ==============

@router.post("/clients/{client_id}/sites")
async def add_site_to_client(client_id: str, request: dict, current_user: dict = Depends(require_admin)):
    site_url = request.get("site_url", "").strip()
    if not site_url:
        raise HTTPException(status_code=400, detail="URL sito richiesto")
    await db.clients.update_one({"id": client_id}, {"$addToSet": {"siti_web": site_url}})
    return {"message": "Sito aggiunto"}


@router.delete("/clients/{client_id}/sites")
async def remove_site_from_client(client_id: str, request: dict, current_user: dict = Depends(require_admin)):
    site_url = request.get("site_url", "").strip()
    if not site_url:
        raise HTTPException(status_code=400, detail="URL sito richiesto")
    await db.clients.update_one({"id": client_id}, {"$pull": {"siti_web": site_url}})
    return {"message": "Sito rimosso"}


# ============== KB DOCUMENT UPLOAD ==============

@router.post("/clients/{client_id}/upload-kb-document")
async def upload_kb_document(client_id: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    filename = file.filename
    content = await file.read()
    
    from doc_parser import extract_content_from_file
    from helpers import extract_structured_kb_with_llm
    
    try:
        # 1. Parse document text
        text = await extract_content_from_file(content, filename)
        
        # 2. Extract structured Knowledge Base fields with LLM
        client = await db.clients.find_one({"id": client_id}, {"_id": 0})
        if not client:
            raise HTTPException(status_code=404, detail="Cliente non trovato")
            
        config = client.get("configuration", {})
        llm_config = config.get("llm", {}) or config.get("openai", {})
        
        if not llm_config.get("api_key"):
            raise HTTPException(status_code=400, detail="Chiave API LLM mancante nella configurazione del cliente")
            
        provider = llm_config.get("provider", "openai")
        model = llm_config.get("modello", "gpt-4o")
        
        # Prepare content for LLM (limit if too large)
        kb_data_raw = {"raw_text": text[:10000]} # Limit extraction input
        
        refined_info = await extract_structured_kb_with_llm(kb_data_raw, provider, llm_config["api_key"], model)
        
        return {
            "status": "success",
            "extracted_data": refined_info,
            "filename": filename
        }
    except Exception as e:
        logger.error(f"KB document processing error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============== SCRAPE WEBSITE FOR KB ==============

@router.post("/clients/{client_id}/scrape-website")
async def scrape_website_for_kb(client_id: str, request: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo admin")
    
    # Support both new 'urls' list and legacy single fields
    urls_input = request.get("urls", [])
    if isinstance(urls_input, str):
        urls_input = [urls_input]
        
    if not urls_input:
        single_url = request.get("url") or request.get("url_home") or request.get("url_chi_siamo") or request.get("url_contatti")
        if single_url:
            urls_input = [single_url]
    
    urls = [u.strip() for u in urls_input if u and isinstance(u, str) and u.strip()]
    
    if not urls:
        raise HTTPException(status_code=400, detail="Almeno un URL è obbligatorio")
    
    # 1. Scrape raw data
    from helpers import scrape_website_info, extract_structured_kb_with_llm
    info = await scrape_website_info(urls, max_pages=6)
    
    # 2. Refine with LLM if possible
    try:
        client = await db.clients.find_one({"id": client_id}, {"_id": 0})
        if client:
            config = client.get("configuration", {})
            llm_config = config.get("llm", {}) or config.get("openai", {})
            if llm_config and llm_config.get("api_key"):
                provider = llm_config.get("provider", "openai")
                model = llm_config.get("modello", "gpt-4o") # Use gpt-4o for better extraction
                refined_info = await extract_structured_kb_with_llm(info, provider, llm_config["api_key"], model)
                if refined_info:
                    # Merge refined info back into info, keeping raw data for debugging/fallback
                    for key, value in refined_info.items():
                        if value:
                            info[key] = value
    except Exception as e:
        logger.error(f"Error refining scraped website info with LLM: {e}")
        # We still return the 'info' we got from scraping even if refinement fails
    
    return info


# ============== XLSX UPLOAD ==============

@router.post("/clients/{client_id}/upload-xlsx")
async def upload_xlsx(client_id: str, file: UploadFile = File(...), current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    if not file.filename.endswith(('.xlsx', '.xls')):
        raise HTTPException(status_code=400, detail="File deve essere .xlsx o .xls")
    try:
        contents = await file.read()
        df = pd.read_excel(io.BytesIO(contents))
        columns = df.columns.tolist()
        keyword_columns = [c for c in columns if any(k in c.lower() for k in ['keyword', 'parola', 'chiave', 'query', 'servizio', 'citta', 'zona', 'tipo'])]
        extracted_data = {}
        for col in columns:
            extracted_data[col] = [str(v) for v in df[col].dropna().unique().tolist()[:500]]
        suggestions = {"servizi": [], "citta_e_zone": [], "tipi_o_qualificatori": []}
        for col in columns:
            col_lower = col.lower()
            values = extracted_data[col][:100]
            if any(k in col_lower for k in ['servizio', 'service', 'prodotto', 'product']):
                suggestions["servizi"].extend(values)
            elif any(k in col_lower for k in ['citta', 'zona', 'area', 'location']):
                suggestions["citta_e_zone"].extend(values)
            elif any(k in col_lower for k in ['tipo', 'type', 'qualificatore', 'categoria']):
                suggestions["tipi_o_qualificatori"].extend(values)
        for key in suggestions:
            suggestions[key] = list(set(suggestions[key]))
        upload_doc = {
            "id": str(uuid.uuid4()), "client_id": client_id, "filename": file.filename,
            "columns": columns, "row_count": len(df), "extracted_data": extracted_data,
            "suggestions": suggestions, "created_at": datetime.now(timezone.utc).isoformat()
        }
        await db.xlsx_uploads.insert_one(upload_doc)
        return {"upload_id": upload_doc["id"], "filename": file.filename, "columns": columns,
                "row_count": len(df), "keyword_columns_detected": keyword_columns,
                "suggestions": suggestions, "preview": df.head(10).to_dict(orient="records")}
    except Exception as e:
        logger.error(f"XLSX upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore elaborazione file: {str(e)}")


@router.post("/clients/{client_id}/apply-xlsx-suggestions")
async def apply_xlsx_suggestions(client_id: str, upload_id: str = Form(...), apply_servizi: bool = Form(True),
                                  apply_citta: bool = Form(True), apply_tipi: bool = Form(True),
                                  merge_mode: str = Form("append"), current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    upload = await db.xlsx_uploads.find_one({"id": upload_id, "client_id": client_id}, {"_id": 0})
    if not upload:
        raise HTTPException(status_code=404, detail="Upload non trovato")
    suggestions = upload.get("suggestions", {})
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    config = client.get("configuration", {})
    current_keywords = config.get("keyword_combinations", {})
    update_data = {}
    if apply_servizi and suggestions.get("servizi"):
        update_data["configuration.keyword_combinations.servizi"] = (
            suggestions["servizi"] if merge_mode == "replace"
            else list(set(current_keywords.get("servizi", []) + suggestions["servizi"])))
    if apply_citta and suggestions.get("citta_e_zone"):
        update_data["configuration.keyword_combinations.citta_e_zone"] = (
            suggestions["citta_e_zone"] if merge_mode == "replace"
            else list(set(current_keywords.get("citta_e_zone", []) + suggestions["citta_e_zone"])))
    if apply_tipi and suggestions.get("tipi_o_qualificatori"):
        update_data["configuration.keyword_combinations.tipi_o_qualificatori"] = (
            suggestions["tipi_o_qualificatori"] if merge_mode == "replace"
            else list(set(current_keywords.get("tipi_o_qualificatori", []) + suggestions["tipi_o_qualificatori"])))
    if not update_data:
        return {"message": "Nessuna modifica applicata"}
    await db.clients.update_one({"id": client_id}, {"$set": update_data})
    return {"message": "Suggerimenti applicati", "merge_mode": merge_mode}


@router.get("/clients/{client_id}/xlsx-uploads")
async def get_xlsx_uploads(client_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    uploads = await db.xlsx_uploads.find({"client_id": client_id}, {"_id": 0, "extracted_data": 0}).sort("created_at", -1).limit(20).to_list(20)
    return {"uploads": uploads}


# ============== SEO SESSIONS ==============

@router.post("/clients/{client_id}/seo-sessions")
async def create_seo_session(client_id: str, session: SEOSessionCreate, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    client = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    config = client.get("configuration", {})
    keywords = session.keywords or config.get("keyword_combinations", {})
    advanced_prompt = session.advanced_prompt or config.get("advanced_prompt", {})
    serp_data = []
    if session.serp_analyses:
        serp_data = await db.serp_analyses.find({"id": {"$in": session.serp_analyses}, "client_id": client_id}, {"_id": 0}).to_list(100)
    session_name = session.session_name or f"Sessione {datetime.now(timezone.utc).strftime('%d/%m/%Y %H:%M')}"
    session_doc = {
        "id": str(uuid.uuid4()), "client_id": client_id, "session_name": session_name,
        "keywords": keywords, "serp_analyses": serp_data, "advanced_prompt": advanced_prompt,
        "notes": session.notes, "articles_generated": 0, "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.seo_sessions.insert_one(session_doc)
    return SEOSessionResponse(**session_doc)


@router.get("/clients/{client_id}/seo-sessions")
async def get_seo_sessions(client_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    sessions = await db.seo_sessions.find({"client_id": client_id}, {"_id": 0}).sort("created_at", -1).limit(50).to_list(50)
    return {"sessions": sessions}


@router.get("/clients/{client_id}/seo-sessions/{session_id}")
async def get_seo_session(client_id: str, session_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    session = await db.seo_sessions.find_one({"id": session_id, "client_id": client_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Sessione non trovata")
    return SEOSessionResponse(**session)


@router.post("/clients/{client_id}/seo-sessions/{session_id}/restore")
async def restore_seo_session(client_id: str, session_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    session = await db.seo_sessions.find_one({"id": session_id, "client_id": client_id}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=404, detail="Sessione non trovata")
    update_data = {}
    if session.get("keywords"):
        update_data["configuration.keyword_combinations"] = session["keywords"]
    if session.get("advanced_prompt"):
        update_data["configuration.advanced_prompt.secondo_livello_prompt"] = session["advanced_prompt"].get("secondo_livello_prompt", "")
        update_data["configuration.advanced_prompt.keyword_injection_template"] = session["advanced_prompt"].get("keyword_injection_template", "")
    if update_data:
        await db.clients.update_one({"id": client_id}, {"$set": update_data})
    return {"message": "Sessione ripristinata", "session_name": session["session_name"]}


@router.delete("/clients/{client_id}/seo-sessions/{session_id}")
async def delete_seo_session(client_id: str, session_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    result = await db.seo_sessions.delete_one({"id": session_id, "client_id": client_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sessione non trovata")
    return {"message": "Sessione eliminata"}
