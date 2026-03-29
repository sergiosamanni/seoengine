"""Google Search Console OAuth and data routes."""
import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Query

from database import db
from auth import get_current_user, require_admin

logger = logging.getLogger("server")
router = APIRouter()

GSC_SCOPES = [
    "https://www.googleapis.com/auth/webmasters.readonly",
    "https://www.googleapis.com/auth/webmasters", # For sitemap submission
    "https://www.googleapis.com/auth/indexing"    # For Indexing API
]
GSC_OAUTH_CLIENT_ID = os.environ.get("GSC_OAUTH_CLIENT_ID", "")
GSC_OAUTH_CLIENT_SECRET = os.environ.get("GSC_OAUTH_CLIENT_SECRET", "")


def _get_gsc_redirect_uri(base_url: str = None):
    override = os.environ.get("GSC_REDIRECT_URI", "")
    if override:
        return override
    
    final_url = ""
    if base_url:
        final_url = f"{base_url.rstrip('/')}/api/gsc/callback"
    else:
        frontend_url = os.environ.get("FRONTEND_URL", "")
        if not frontend_url:
            raise HTTPException(status_code=500, detail="FRONTEND_URL non configurato")
        final_url = f"{frontend_url}/api/gsc/callback"
        
    # Force HTTPS for non-localhost domains (Google requirement)
    if "localhost" not in final_url and "127.0.0.1" not in final_url:
        final_url = final_url.replace("http://", "https://")
    
    return final_url


def _require_gsc_credentials():
    if not GSC_OAUTH_CLIENT_ID or not GSC_OAUTH_CLIENT_SECRET:
        raise HTTPException(status_code=400, detail="Integrazione GSC non configurata. Contatta l'amministratore.")


@router.post("/clients/{client_id}/gsc-config")
async def save_gsc_config(client_id: str, request: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    # Get existing config or create new
    client_doc = await db.clients.find_one({"id": client_id}, {"configuration.gsc": 1})
    current_gsc = (client_doc.get("configuration", {}) or {}).get("gsc", {}) or {}
    
    # Update only provided fields
    if "site_url" in request:
        current_gsc["site_url"] = request["site_url"]
    if "enabled" in request:
        current_gsc["enabled"] = request["enabled"]
    if "oauth_client_id" in request:
        current_gsc["oauth_client_id"] = request["oauth_client_id"]
    if "oauth_client_secret" in request:
        current_gsc["oauth_client_secret"] = request["oauth_client_secret"]
    
    # Reset connection if credentials change
    if "oauth_client_id" in request or "oauth_client_secret" in request:
        current_gsc["connected"] = False
        current_gsc["tokens"] = None

    await db.clients.update_one({"id": client_id}, {"$set": {"configuration.gsc": current_gsc}})
    return {"message": "Configurazione GSC salvata"}


@router.get("/gsc/authorize/{client_id}")
async def gsc_authorize(client_id: str, request: Request, redirect_uri: str = Query(None), current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    client_doc = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    gsc_config = client_doc.get("configuration", {}).get("gsc", {})
    # Use client credentials if available, otherwise global
    raw_c_id = gsc_config.get("oauth_client_id") or GSC_OAUTH_CLIENT_ID
    raw_c_secret = gsc_config.get("oauth_client_secret") or GSC_OAUTH_CLIENT_SECRET
    
    c_id = raw_c_id.strip() if raw_c_id else ""
    c_secret = raw_c_secret.strip() if raw_c_secret else ""
    
    source = "CLIENT-SPECIFIC" if gsc_config.get("oauth_client_id") else "GLOBAL"
    logger.info(f"GSC Authorize request for {client_id} using {source} credentials. ID starts with: {c_id[:10]}...")
    
    if not c_id or not c_secret:
        raise HTTPException(status_code=400, detail="Credenziali OAuth GSC non configurate.")

    # Use frontend-provided redirect_uri, or derive from request
    if redirect_uri:
        final_redirect_uri = redirect_uri
    else:
        base = str(request.base_url).rstrip('/')
        final_redirect_uri = _get_gsc_redirect_uri(base)
    
    from google_auth_oauthlib.flow import Flow
    client_config = {
        "web": {
            "client_id": c_id,
            "client_secret": c_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [final_redirect_uri]
        }
    }
    flow = Flow.from_client_config(client_config, scopes=GSC_SCOPES, redirect_uri=final_redirect_uri)
    authorization_url, state = flow.authorization_url(access_type='offline', include_granted_scopes='true', prompt='consent')
    await db.gsc_states.insert_one({
        "state": state, "client_id": client_id, "code_verifier": flow.code_verifier,
        "redirect_uri": final_redirect_uri,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"authorization_url": authorization_url, "state": state, "redirect_uri": final_redirect_uri}


@router.get("/gsc/callback")
async def gsc_callback(code: str, state: str):
    from starlette.responses import RedirectResponse
    state_doc = await db.gsc_states.find_one({"state": state})
    if not state_doc:
        raise HTTPException(status_code=400, detail="State non valido o scaduto")
    client_id = state_doc["client_id"]
    code_verifier = state_doc.get("code_verifier")
    saved_redirect_uri = state_doc.get("redirect_uri")
    await db.gsc_states.delete_one({"state": state})
    redirect_uri = saved_redirect_uri or _get_gsc_redirect_uri()
    client_doc = await db.clients.find_one({"id": client_id}, {"configuration.gsc": 1})
    gsc_config = (client_doc.get("configuration", {}) or {}).get("gsc", {}) or {}
    
    raw_c_id = gsc_config.get("oauth_client_id") or GSC_OAUTH_CLIENT_ID
    raw_c_secret = gsc_config.get("oauth_client_secret") or GSC_OAUTH_CLIENT_SECRET
    c_id = raw_c_id.strip() if raw_c_id else ""
    c_secret = raw_c_secret.strip() if raw_c_secret else ""
    
    logger.info(f"GSC Callback for client {client_id}. Exchange using ID: {c_id[:10]}...")

    from google_auth_oauthlib.flow import Flow
    client_config = {
        "web": {
            "client_id": c_id,
            "client_secret": c_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [redirect_uri]
        }
    }
    flow = Flow.from_client_config(client_config, scopes=GSC_SCOPES, redirect_uri=redirect_uri)
    if code_verifier:
        flow.code_verifier = code_verifier
    try:
        flow.fetch_token(code=code)
        credentials = flow.credentials
        tokens = {
            "token": credentials.token,
            "refresh_token": credentials.refresh_token,
            "token_uri": credentials.token_uri,
            "client_id": credentials.client_id,
            "client_secret": credentials.client_secret,
            "expiry": credentials.expiry.isoformat() if credentials.expiry else None
        }
        await db.clients.update_one(
            {"id": client_id},
            {"$set": {"configuration.gsc.tokens": tokens, "configuration.gsc.connected": True}}
        )
    except Exception as e:
        logger.error(f"GSC OAuth error: {e}")
        frontend_url = os.environ.get("FRONTEND_URL", "").rstrip("/")
        # Redirect to the configuration page with an error flag
        return RedirectResponse(url=f"{frontend_url}/clients/{client_id}?tab=gsc&gsc_error=auth_failed")

    frontend_url = os.environ.get("FRONTEND_URL", "").rstrip("/")
    # Success redirect to the specific GSC tab
    return RedirectResponse(url=f"{frontend_url}/clients/{client_id}?tab=gsc&gsc_connected=true")


@router.post("/clients/{client_id}/gsc-disconnect")
async def gsc_disconnect(client_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    await db.clients.update_one(
        {"id": client_id},
        {"$set": {"configuration.gsc.tokens": None, "configuration.gsc.connected": False}}
    )
    return {"message": "GSC disconnesso"}


@router.get("/gsc/status")
async def gsc_integration_status(request: Request, current_user: dict = Depends(get_current_user)):
    base = str(request.base_url).rstrip('/')
    redirect_uri = _get_gsc_redirect_uri(base)
    return {
        "configured": bool(GSC_OAUTH_CLIENT_ID and GSC_OAUTH_CLIENT_SECRET),
        "redirect_uri": redirect_uri,
        "instructions": f"Aggiungi questo URI di reindirizzamento autorizzato nella Google Cloud Console: {redirect_uri}"
    }


@router.get("/clients/{client_id}/gsc-data")
async def get_gsc_data(client_id: str, days: int = 28, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    client_doc = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    gsc_config = client_doc.get("configuration", {}).get("gsc", {})
    tokens = gsc_config.get("tokens")
    if not tokens or not gsc_config.get("connected"):
        raise HTTPException(status_code=400, detail="Google Search Console non connesso.")
    site_url = gsc_config.get("site_url", "")
    if not site_url:
        raise HTTPException(status_code=400, detail="URL del sito non configurato.")
    try:
        import google.oauth2.credentials
        from googleapiclient.discovery import build
        from google.auth.transport.requests import Request
        creds = google.oauth2.credentials.Credentials(
            token=tokens["token"],
            refresh_token=tokens.get("refresh_token"),
            token_uri=tokens.get("token_uri", "https://oauth2.googleapis.com/token"),
            client_id=tokens.get("client_id"),
            client_secret=tokens.get("client_secret")
        )
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            new_tokens = {
                "token": creds.token, "refresh_token": creds.refresh_token,
                "token_uri": creds.token_uri, "client_id": creds.client_id,
                "client_secret": creds.client_secret,
                "expiry": creds.expiry.isoformat() if creds.expiry else None
            }
            await db.clients.update_one({"id": client_id}, {"$set": {"configuration.gsc.tokens": new_tokens}})
        service = build("searchconsole", "v1", credentials=creds)
        end_date = datetime.now(timezone.utc).date()
        start_date = end_date - timedelta(days=days)
        import time
        start_t = time.time()
        
        # Helper to find correct siteUrl property if exact match fails
        async def get_valid_site_url(target_url):
            try:
                sites_resp = service.sites().list().execute()
                site_list = [s['siteUrl'] for s in sites_resp.get('siteEntry', [])]
                logger.info(f"Available GSC sites for discovery: {site_list}")
                
                # Normalize target
                def normalize_url(u):
                    return u.lower().replace("https://", "").replace("http://", "").replace("sc-domain:", "").replace("www.", "").strip("/")
 
                clean_target = normalize_url(target_url)
                
                # Try exact/substring normalization matches
                for s in site_list:
                    if normalize_url(s) == clean_target:
                        logger.info(f"Auto-discovered better match for GSC property: {s} (target was {target_url})")
                        return s
                
                # If target is listed in the account exactly, use it (sometimes list doesn't report everything if it's new)
                if target_url in site_list:
                    return target_url

                # If the property we have is missing the slash, try with slash
                if target_url.startswith("http") and not target_url.endswith("/"):
                    if (target_url + "/") in site_list:
                        return target_url + "/"

                # Last desperation: if it's missing but it's clearly a permission issue,
                # let's return None and raise a descriptive 400 later.
                if target_url not in site_list:
                    return None # Signal mismatch

                return target_url
            except Exception as e:
                logger.warning(f"Could not list GSC sites to discover best match: {e}")
                return target_url

        # Initial check/discovery
        effective_site_url = await get_valid_site_url(site_url)
        if not effective_site_url:
            # Let's try listing sites one more time to show them in the error
            try:
                sites_resp = service.sites().list().execute()
                avail = [s['siteUrl'] for s in sites_resp.get('siteEntry', [])]
                avail_str = ", ".join(avail[:10])
                if len(avail) > 10: avail_str += "..."
                raise HTTPException(status_code=400, detail=f"Errore GSC: La proprietà '{site_url}' non è presente in questo account Google. SITI TROVATI: {avail_str}. Verifica di aver autorizzato l'account corretto.")
            except:
                raise HTTPException(status_code=400, detail=f"Errore GSC: Proprietà '{site_url}' non trovata o permessi mancanti.")

        # We try 1000 keywords, 500 pages, and full date range for charts.
        try:
            logger.info(f"Primary GSC query for {effective_site_url} (KW: 1000, Pages: 500, Dates: {days})")
            kw_response = service.searchanalytics().query(
                siteUrl=effective_site_url,
                body={"startDate": start_date.isoformat(), "endDate": end_date.isoformat(),
                      "dimensions": ["query"], "rowLimit": 1000}
            ).execute()
            pages_response = service.searchanalytics().query(
                siteUrl=effective_site_url,
                body={"startDate": start_date.isoformat(), "endDate": end_date.isoformat(),
                      "dimensions": ["page"], "rowLimit": 500}
            ).execute()
            chart_response = service.searchanalytics().query(
                siteUrl=effective_site_url,
                body={"startDate": start_date.isoformat(), "endDate": end_date.isoformat(),
                      "dimensions": ["date"], "rowLimit": 500}
            ).execute()
        except Exception as e:
            logger.warning(f"GSC Primary query failed, attempting emergency fallback (100 rows): {e}")
            kw_response = service.searchanalytics().query(
                siteUrl=effective_site_url,
                body={"startDate": start_date.isoformat(), "endDate": end_date.isoformat(),
                      "dimensions": ["query"], "rowLimit": 100}
            ).execute()
            pages_response = service.searchanalytics().query(
                siteUrl=effective_site_url,
                body={"startDate": start_date.isoformat(), "endDate": end_date.isoformat(),
                      "dimensions": ["page"], "rowLimit": 50}
            ).execute()
            chart_response = service.searchanalytics().query(
                siteUrl=effective_site_url,
                body={"startDate": start_date.isoformat(), "endDate": end_date.isoformat(),
                      "dimensions": ["date"], "rowLimit": 100}
            ).execute()

        total_time = time.time() - start_t
        logger.info(f"GSC queries completed in {total_time:.2f}s")
        
        keywords = []
        for row in kw_response.get("rows", []):
            if not row.get("keys"): continue
            keywords.append({
                "keyword": row["keys"][0],
                "clicks": row.get("clicks") or 0,
                "impressions": row.get("impressions") or 0,
                "ctr": round((row.get("ctr") or 0) * 100, 2),
                "position": round(row.get("position") or 0, 1)
            })

        pages = []
        for row in pages_response.get("rows", []):
            if not row.get("keys"): continue
            pages.append({
                "page": row["keys"][0],
                "clicks": row.get("clicks") or 0,
                "impressions": row.get("impressions") or 0,
                "ctr": round((row.get("ctr") or 0) * 100, 2),
                "position": round(row.get("position") or 0, 1)
            })

        chart_data = []
        for row in chart_response.get("rows", []):
            if not row.get("keys"): continue
            chart_data.append({
                "date": row["keys"][0],
                "clicks": row.get("clicks") or 0,
                "impressions": row.get("impressions") or 0,
                "ctr": round((row.get("ctr") or 0) * 100, 2),
                "position": round(row.get("position") or 0, 1)
            })
        chart_data.sort(key=lambda x: x["date"])

        return {
            "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
            "keywords": keywords, 
            "pages": pages,
            "chart_data": chart_data,
            "totals": {
                "total_clicks": sum(k["clicks"] for k in keywords),
                "total_impressions": sum(k["impressions"] for k in keywords),
                "avg_ctr": round(sum(k["ctr"] for k in keywords) / max(len(keywords), 1), 2),
                "avg_position": round(sum(k["position"] for k in keywords) / max(len(keywords), 1), 1)
            }
        }
    except Exception as e:
        import traceback
        error_trace = traceback.format_exc()
        logger.error(f"GSC Error for client {client_id}: {str(e)}\n{error_trace}")
        error_msg = str(e)
        if "invalid_grant" in error_msg or "Token has been expired" in error_msg:
            await db.clients.update_one(
                {"id": client_id},
                {"$set": {"configuration.gsc.connected": False, "configuration.gsc.tokens": None}}
            )
            # Use 401 for token issues
            raise HTTPException(status_code=401, detail="Token GSC scaduto. Riconnetti con Google.")
        
        # Check for specific site-not-found errors which often happen with misconfigured site_urls
        if "site not found" in error_msg.lower() or "permission" in error_msg.lower():
            raise HTTPException(status_code=400, detail=f"Errore GSC: Proprietà o permessi mancanti per l'URL {site_url}. Verifica che l'utente Google abbia accesso a questa proprietà e che l'URL in config sia IDENTICO a quello in GSC console (inclusi protocollo e slash finale).")
            
        raise HTTPException(status_code=500, detail=f"Errore GSC: {error_msg}")


@router.get("/clients/{client_id}/gsc-status")
async def get_client_gsc_status(client_id: str, request: Request, current_user: dict = Depends(get_current_user)):
    """Status endpoint specifically for a client property (used by GscConnectionTab.jsx)."""
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
        
    client_doc = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
        
    gsc_config = client_doc.get("configuration", {}).get("gsc", {})
    
    base = str(request.base_url).rstrip('/')
    redirect_uri = _get_gsc_redirect_uri(base)
    
    has_client_creds = bool(gsc_config.get("oauth_client_id") and gsc_config.get("oauth_client_secret"))

    return {
        "configured": bool(has_client_creds or (GSC_OAUTH_CLIENT_ID and GSC_OAUTH_CLIENT_SECRET)),
        "connected": bool(gsc_config.get("connected") and gsc_config.get("tokens")),
        "site_url": gsc_config.get("site_url", ""),
        "oauth_client_id_set": bool(has_client_creds or GSC_OAUTH_CLIENT_ID), # System-wide or Per-client
        "redirect_uri": redirect_uri,
        "has_per_client_credentials": has_client_creds
    }


@router.post("/clients/{client_id}/gsc-strategic-suggestions")
async def gsc_strategic_suggestions(client_id: str, request: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
        
    client_doc = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
        
    gsc_data = request.get("gsc_data", {})
    if not gsc_data:
        raise HTTPException(status_code=400, detail="Dati GSC mancanti")
        
    config = client_doc.get("configuration", {})
    llm_config = config.get("llm", {}) or config.get("openai", {})
    
    # Costruisco il prompt per l'analisi strategica
    keywords = gsc_data.get("keywords", [])[:20]  # Top 20 keywords
    pages = gsc_data.get("pages", [])[:10]  # Top 10 pages
    
    kw_text = "\n".join([f"- {k['keyword']} (Click: {k['clicks']}, Imp: {k['impressions']}, Pos: {k['position']})" for k in keywords])
    pg_text = "\n".join([f"- {p['page']} (Click: {p['clicks']}, Imp: {p['impressions']})" for p in pages])
    
    system_prompt = (
        "Sei un Consulente SEO Senior. Analizzerai i dati di Google Search Console (ultimi 28 giorni) "
        "e darai suggerimenti STRATEGICI e AZIONABILI.\n\n"
        "REGOLE IMPORTANTISSIME:\n"
        "1. Tutti gli articoli (nuovi o aggiornati) DEVONO avere 3 link interni esatti con anchor text semantiche, "
        "   per prevenire contenuti orfani. Fai di questa regola un pilastro SEO.\n"
        "2. Rispondi SOLO con un array JSON di oggetti. Nessun markdown testuale fuori dal JSON.\n"
        "   Formato per Ogni Oggetto JSON:\n"
        "   {\n"
        "     \"type\": \"new_article\" OR \"update_article\",\n"
        "     \"title\": \"Titolo sugerito\",\n"
        "     \"keyword\": \"Focus keyword da attaccare\",\n"
        "     \"reason\": \"Perché questa azione è utile (breve, 1 frase). Cita esplicitamente l'uso di link interni/anchor nel reason.\"\n"
        "   }"
    )
    
    user_prompt = f"Dati Keyword:\n{kw_text}\n\nDati Pagine:\n{pg_text}\n\nGenera 5-7 suggerimenti strategici (JSON array limit):"
    
    from helpers import generate_with_rotation
    import json
    import re
    
    try:
        response_text = await generate_with_rotation(llm_config, system_prompt, user_prompt)
        
        # Estrazione JSON
        json_match = re.search(r'\[\s*\{.*?\}\s*\]', response_text, re.DOTALL)
        if json_match:
            suggestions = json.loads(json_match.group(0))
        else:
            suggestions = json.loads(response_text)
            
        return {"suggestions": suggestions}
    except Exception as e:
        logger.error(f"Errore generazione suggerimenti GSC: {e}")
        raise HTTPException(status_code=500, detail="Errore nell'elaborazione dei suggerimenti con l'AI")

@router.post("/clients/{client_id}/gsc/index-url")
async def gsc_index_url(client_id: str, request: dict, current_user: dict = Depends(get_current_user)):
    """Request indexing for a specific URL using the Google Indexing API."""
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
        
    url = request.get("url")
    if not url:
        raise HTTPException(status_code=400, detail="URL mancante")
        
    client_doc = await db.clients.find_one({"id": client_id}, {"configuration.gsc": 1})
    tokens = (client_doc.get("configuration", {}) or {}).get("gsc", {}).get("tokens")
    
    if not tokens:
        raise HTTPException(status_code=400, detail="GSC non connesso per questo cliente.")
        
    try:
        import google.oauth2.credentials
        from googleapiclient.discovery import build
        from google.auth.transport.requests import Request
        
        creds = google.oauth2.credentials.Credentials(
            token=tokens["token"],
            refresh_token=tokens.get("refresh_token"),
            token_uri=tokens.get("token_uri", "https://oauth2.googleapis.com/token"),
            client_id=tokens.get("client_id"),
            client_secret=tokens.get("client_secret")
        )
        
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            # Save new tokens
            new_tokens = {
                "token": creds.token, "refresh_token": creds.refresh_token,
                "token_uri": creds.token_uri, "client_id": creds.client_id,
                "client_secret": creds.client_secret,
                "expiry": creds.expiry.isoformat() if creds.expiry else None
            }
            await db.clients.update_one({"id": client_id}, {"$set": {"configuration.gsc.tokens": new_tokens}})

        # Use Indexing API
        indexing_service = build("indexing", "v3", credentials=creds)
        body = {
            "url": url,
            "type": "URL_UPDATED"
        }
        result = indexing_service.urlNotifications().publish(body=body).execute()
        
        return {"message": "Richiesta di indicizzazione inviata con successo", "details": result}
    except Exception as e:
        logger.error(f"Errore Indexing API per {url}: {e}")
        raise HTTPException(status_code=500, detail=f"Errore Indexing API: {str(e)}")


@router.post("/clients/{client_id}/gsc/submit-sitemap")
async def gsc_submit_sitemap(client_id: str, request: dict, current_user: dict = Depends(get_current_user)):
    """Submit a sitemap to Google Search Console."""
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
        
    sitemap_url = request.get("sitemap_url")
    
    client_doc = await db.clients.find_one({"id": client_id}, {"configuration": 1})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
        
    config = client_doc.get("configuration", {}) or {}
    gsc_config = config.get("gsc", {})
    seo_config = config.get("seo", {})
    
    # Priorità: URL da request -> URL da configurazione SEO -> Fallback manuale errore
    if not sitemap_url:
        sitemap_url = seo_config.get("sitemap_url")
        
    if not sitemap_url:
        raise HTTPException(status_code=400, detail="Sitemap URL non configurato per questo cliente.")
        
    tokens = gsc_config.get("tokens")
    site_url = gsc_config.get("site_url")
    
    if not tokens or not site_url:
        raise HTTPException(status_code=400, detail="GSC non connesso o URL sito non configurato.")
        
    try:
        import google.oauth2.credentials
        from googleapiclient.discovery import build
        from google.auth.transport.requests import Request
        
        creds = google.oauth2.credentials.Credentials(
            token=tokens["token"],
            refresh_token=tokens.get("refresh_token"),
            token_uri=tokens.get("token_uri", "https://oauth2.googleapis.com/token"),
            client_id=tokens.get("client_id"),
            client_secret=tokens.get("client_secret")
        )
        
        if creds.expired and creds.refresh_token:
            creds.refresh(Request())
            # Save new tokens omitted for brevity here if we assume the previous call or similar logic handles it, but better be safe
            new_tokens = {
                "token": creds.token, "refresh_token": creds.refresh_token,
                "token_uri": creds.token_uri, "client_id": creds.client_id,
                "client_secret": creds.client_secret,
                "expiry": creds.expiry.isoformat() if creds.expiry else None
            }
            await db.clients.update_one({"id": client_id}, {"$set": {"configuration.gsc.tokens": new_tokens}})

        # Google Search Console API (webmasters)
        service = build("searchconsole", "v1", credentials=creds)
        service.sitemaps().submit(siteUrl=site_url, feedpath=sitemap_url).execute()
        
        return {"message": "Sitemap inviata con successo"}
    except Exception as e:
        logger.error(f"Errore Sitemap submission per {sitemap_url}: {e}")
        raise HTTPException(status_code=500, detail=f"Errore invio Sitemap: {str(e)}")
