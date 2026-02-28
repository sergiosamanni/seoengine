"""Google Search Console OAuth and data routes."""
import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException
from starlette.responses import RedirectResponse

from database import db
from auth import get_current_user, require_admin

logger = logging.getLogger("server")
router = APIRouter()

GSC_SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]
GSC_OAUTH_CLIENT_ID = os.environ.get("GSC_OAUTH_CLIENT_ID", "")
GSC_OAUTH_CLIENT_SECRET = os.environ.get("GSC_OAUTH_CLIENT_SECRET", "")


def _get_gsc_redirect_uri():
    frontend_url = os.environ.get("FRONTEND_URL", "")
    if not frontend_url:
        raise HTTPException(status_code=500, detail="FRONTEND_URL non configurato")
    return f"{frontend_url}/api/gsc/callback"


def _require_gsc_credentials():
    if not GSC_OAUTH_CLIENT_ID or not GSC_OAUTH_CLIENT_SECRET:
        raise HTTPException(status_code=400, detail="Integrazione GSC non configurata. Contatta l'amministratore.")


@router.post("/clients/{client_id}/gsc-config")
async def save_gsc_config(client_id: str, request: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo admin")
    gsc_config = {
        "site_url": request.get("site_url", ""),
        "enabled": request.get("enabled", True),
        "connected": False,
        "tokens": None
    }
    await db.clients.update_one({"id": client_id}, {"$set": {"configuration.gsc": gsc_config}})
    return {"message": "URL sito GSC salvato"}


@router.get("/gsc/authorize/{client_id}")
async def gsc_authorize(client_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo admin")
    _require_gsc_credentials()
    client_doc = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    redirect_uri = _get_gsc_redirect_uri()
    from google_auth_oauthlib.flow import Flow
    client_config = {
        "web": {
            "client_id": GSC_OAUTH_CLIENT_ID,
            "client_secret": GSC_OAUTH_CLIENT_SECRET,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [redirect_uri]
        }
    }
    flow = Flow.from_client_config(client_config, scopes=GSC_SCOPES, redirect_uri=redirect_uri)
    authorization_url, state = flow.authorization_url(access_type='offline', include_granted_scopes='true', prompt='consent')
    await db.gsc_states.insert_one({
        "state": state, "client_id": client_id, "code_verifier": flow.code_verifier,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"authorization_url": authorization_url, "state": state}


@router.get("/gsc/callback")
async def gsc_callback(code: str, state: str):
    _require_gsc_credentials()
    state_doc = await db.gsc_states.find_one({"state": state})
    if not state_doc:
        raise HTTPException(status_code=400, detail="State non valido o scaduto")
    client_id = state_doc["client_id"]
    code_verifier = state_doc.get("code_verifier")
    await db.gsc_states.delete_one({"state": state})
    redirect_uri = _get_gsc_redirect_uri()
    from google_auth_oauthlib.flow import Flow
    client_config = {
        "web": {
            "client_id": GSC_OAUTH_CLIENT_ID,
            "client_secret": GSC_OAUTH_CLIENT_SECRET,
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
        frontend_url = os.environ.get("FRONTEND_URL", "")
        return RedirectResponse(url=f"{frontend_url}/clients/{client_id}/gsc?error=auth_failed")
    frontend_url = os.environ.get("FRONTEND_URL", "")
    return RedirectResponse(url=f"{frontend_url}/clients/{client_id}/gsc?gsc_connected=true")


@router.post("/clients/{client_id}/gsc-disconnect")
async def gsc_disconnect(client_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin":
        raise HTTPException(status_code=403, detail="Solo admin")
    await db.clients.update_one(
        {"id": client_id},
        {"$set": {"configuration.gsc.tokens": None, "configuration.gsc.connected": False}}
    )
    return {"message": "GSC disconnesso"}


@router.get("/gsc/status")
async def gsc_integration_status(current_user: dict = Depends(get_current_user)):
    return {"configured": bool(GSC_OAUTH_CLIENT_ID and GSC_OAUTH_CLIENT_SECRET)}


@router.get("/clients/{client_id}/gsc-data")
async def get_gsc_data(client_id: str, days: int = 28, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and current_user.get("client_id") != client_id:
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
        kw_response = service.searchanalytics().query(
            siteUrl=site_url,
            body={"startDate": start_date.isoformat(), "endDate": end_date.isoformat(),
                  "dimensions": ["query"], "rowLimit": 50}
        ).execute()
        pages_response = service.searchanalytics().query(
            siteUrl=site_url,
            body={"startDate": start_date.isoformat(), "endDate": end_date.isoformat(),
                  "dimensions": ["page"], "rowLimit": 30}
        ).execute()
        keywords = [{"keyword": row["keys"][0], "clicks": row.get("clicks", 0),
                      "impressions": row.get("impressions", 0),
                      "ctr": round(row.get("ctr", 0) * 100, 2),
                      "position": round(row.get("position", 0), 1)}
                     for row in kw_response.get("rows", [])]
        pages = [{"page": row["keys"][0], "clicks": row.get("clicks", 0),
                   "impressions": row.get("impressions", 0),
                   "ctr": round(row.get("ctr", 0) * 100, 2),
                   "position": round(row.get("position", 0), 1)}
                  for row in pages_response.get("rows", [])]
        return {
            "period": {"start": start_date.isoformat(), "end": end_date.isoformat()},
            "keywords": keywords, "pages": pages,
            "totals": {
                "total_clicks": sum(k["clicks"] for k in keywords),
                "total_impressions": sum(k["impressions"] for k in keywords),
                "avg_ctr": round(sum(k["ctr"] for k in keywords) / max(len(keywords), 1), 2),
                "avg_position": round(sum(k["position"] for k in keywords) / max(len(keywords), 1), 1)
            }
        }
    except Exception as e:
        error_msg = str(e)
        if "invalid_grant" in error_msg or "Token has been expired" in error_msg:
            await db.clients.update_one(
                {"id": client_id},
                {"$set": {"configuration.gsc.connected": False, "configuration.gsc.tokens": None}}
            )
            raise HTTPException(status_code=401, detail="Token GSC scaduto. Riconnetti con Google.")
        raise HTTPException(status_code=500, detail=f"Errore GSC: {error_msg}")
