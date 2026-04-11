"""Google Analytics 4 (GA4) OAuth and data routes."""
import os
import uuid
import logging
from datetime import datetime, timezone, timedelta
from fastapi import APIRouter, Depends, HTTPException, Request, Query

from database import db
from auth import get_current_user, require_admin

logger = logging.getLogger("server")
router = APIRouter()

GA4_SCOPES = [
    "https://www.googleapis.com/auth/analytics.readonly"
]
# We allow using the same GSC credentials if GA4 ones are not provided
GA4_OAUTH_CLIENT_ID = os.environ.get("GA4_OAUTH_CLIENT_ID") or os.environ.get("GSC_OAUTH_CLIENT_ID", "")
GA4_OAUTH_CLIENT_SECRET = os.environ.get("GA4_OAUTH_CLIENT_SECRET") or os.environ.get("GSC_OAUTH_CLIENT_SECRET", "")


def _get_ga4_redirect_uri(base_url: str = None):
    override = os.environ.get("GA4_REDIRECT_URI", "")
    if override:
        return override
    
    final_url = ""
    if base_url:
        final_url = f"{base_url.rstrip('/')}/api/ga4/callback"
    else:
        frontend_url = os.environ.get("FRONTEND_URL", "")
        if not frontend_url:
            raise HTTPException(status_code=500, detail="FRONTEND_URL non configurato")
        final_url = f"{frontend_url}/api/ga4/callback"
        
    # Force HTTPS for non-localhost domains
    if "localhost" not in final_url and "127.0.0.1" not in final_url:
        final_url = final_url.replace("http://", "https://")
    
    return final_url


@router.post("/clients/{client_id}/ga4-config")
async def save_ga4_config(client_id: str, request: dict, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    client_doc = await db.clients.find_one({"id": client_id}, {"configuration.ga4": 1})
    current_ga4 = (client_doc.get("configuration", {}) or {}).get("ga4", {}) or {}
    
    if "property_id" in request:
        current_ga4["property_id"] = request["property_id"]
    if "enabled" in request:
        current_ga4["enabled"] = request["enabled"]
    if "oauth_client_id" in request:
        current_ga4["oauth_client_id"] = request["oauth_client_id"]
    if "oauth_client_secret" in request:
        current_ga4["oauth_client_secret"] = request["oauth_client_secret"]
    
    if "oauth_client_id" in request or "oauth_client_secret" in request:
        current_ga4["connected"] = False
        current_ga4["tokens"] = None

    await db.clients.update_one({"id": client_id}, {"$set": {"configuration.ga4": current_ga4}})
    return {"message": "Configurazione GA4 salvata"}


@router.get("/ga4/authorize/{client_id}")
async def ga4_authorize(client_id: str, request: Request, redirect_uri: str = Query(None), current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    client_doc = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    ga4_config = client_doc.get("configuration", {}).get("ga4", {})
    c_id = (ga4_config.get("oauth_client_id") or GA4_OAUTH_CLIENT_ID).strip()
    c_secret = (ga4_config.get("oauth_client_secret") or GA4_OAUTH_CLIENT_SECRET).strip()
    
    if not c_id or not c_secret:
        raise HTTPException(status_code=400, detail="Credenziali OAuth GA4 non configurate.")

    final_redirect_uri = redirect_uri or _get_ga4_redirect_uri(str(request.base_url).rstrip('/'))
    
    from google_auth_oauthlib.flow import Flow
    client_config = {
        "web": {
            "client_id": c_id, "client_secret": c_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [final_redirect_uri]
        }
    }
    flow = Flow.from_client_config(client_config, scopes=GA4_SCOPES, redirect_uri=final_redirect_uri)
    authorization_url, state = flow.authorization_url(access_type='offline', include_granted_scopes='true', prompt='consent')
    
    await db.ga4_states.insert_one({
        "state": state, "client_id": client_id, "code_verifier": flow.code_verifier,
        "redirect_uri": final_redirect_uri,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"authorization_url": authorization_url, "state": state, "redirect_uri": final_redirect_uri}


@router.get("/ga4/callback")
async def ga4_callback(code: str, state: str):
    from starlette.responses import RedirectResponse
    state_doc = await db.ga4_states.find_one({"state": state})
    if not state_doc:
        raise HTTPException(status_code=400, detail="State non valido o scaduto")
    
    client_id = state_doc["client_id"]
    code_verifier = state_doc.get("code_verifier")
    redirect_uri = state_doc.get("redirect_uri") or _get_ga4_redirect_uri()
    await db.ga4_states.delete_one({"state": state})
    
    client_doc = await db.clients.find_one({"id": client_id}, {"configuration.ga4": 1})
    ga4_config = (client_doc.get("configuration", {}) or {}).get("ga4", {}) or {}
    c_id = (ga4_config.get("oauth_client_id") or GA4_OAUTH_CLIENT_ID).strip()
    c_secret = (ga4_config.get("oauth_client_secret") or GA4_OAUTH_CLIENT_SECRET).strip()

    from google_auth_oauthlib.flow import Flow
    client_config = {
        "web": {
            "client_id": c_id, "client_secret": c_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": [redirect_uri]
        }
    }
    flow = Flow.from_client_config(client_config, scopes=GA4_SCOPES, redirect_uri=redirect_uri)
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
            {"$set": {"configuration.ga4.tokens": tokens, "configuration.ga4.connected": True}}
        )
    except Exception as e:
        logger.error(f"GA4 OAuth error: {e}")
        frontend_url = os.environ.get("FRONTEND_URL", "").rstrip("/")
        return RedirectResponse(url=f"{frontend_url}/clients/{client_id}?tab=ga4&ga4_error=auth_failed")

    frontend_url = os.environ.get("FRONTEND_URL", "").rstrip("/")
    return RedirectResponse(url=f"{frontend_url}/clients/{client_id}?tab=ga4&ga4_connected=true")


@router.post("/clients/{client_id}/ga4-disconnect")
async def ga4_disconnect(client_id: str, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    await db.clients.update_one(
        {"id": client_id},
        {"$set": {"configuration.ga4.tokens": None, "configuration.ga4.connected": False}}
    )
    return {"message": "GA4 disconnesso"}


@router.get("/clients/{client_id}/ga4-data")
async def get_ga4_data(client_id: str, days: int = 28, current_user: dict = Depends(get_current_user)):
    if current_user["role"] != "admin" and client_id not in current_user.get("client_ids", []):
        raise HTTPException(status_code=403, detail="Accesso non autorizzato")
    
    client_doc = await db.clients.find_one({"id": client_id}, {"_id": 0})
    if not client_doc:
        raise HTTPException(status_code=404, detail="Cliente non trovato")
    
    ga4_config = client_doc.get("configuration", {}).get("ga4", {})
    tokens = ga4_config.get("tokens")
    property_id = ga4_config.get("property_id")
    
    if not tokens or not ga4_config.get("connected"):
        raise HTTPException(status_code=400, detail="Google Analytics 4 non connesso.")
    if not property_id:
        raise HTTPException(status_code=400, detail="Property ID GA4 non configurato.")

    try:
        import google.oauth2.credentials
        from google.analytics.data_v1beta import BetaAnalyticsDataClient
        from google.analytics.data_v1beta.types import (
            DateRange, Dimension, Metric, RunReportRequest, OrderBy
        )
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
            await db.clients.update_one({"id": client_id}, {"$set": {"configuration.ga4.tokens": new_tokens}})
            
        client_ga4 = BetaAnalyticsDataClient(credentials=creds)
        
        request_ga4 = RunReportRequest(
            property=f"properties/{property_id}",
            dimensions=[Dimension(name="pagePath")],
            metrics=[
                Metric(name="screenPageViews"),
                Metric(name="sessions"),
                Metric(name="activeUsers"),
                Metric(name="averageSessionDuration")
            ],
            date_ranges=[DateRange(start_date=f"{days}daysAgo", end_date="today")],
            limit=100,
            order_bys=[OrderBy(metric=OrderBy.MetricOrderBy(metric_name="screenPageViews"), desc=True)]
        )
        
        response = client_ga4.run_report(request=request_ga4)
        
        pages = []
        for row in response.rows:
            pages.append({
                "page": row.dimension_values[0].value,
                "views": int(row.metric_values[0].value),
                "sessions": int(row.metric_values[1].value),
                "users": int(row.metric_values[2].value),
                "avg_duration": round(float(row.metric_values[3].value), 2)
            })
            
        return {
            "period": f"Last {days} days",
            "pages": pages,
            "totals": {
                "total_views": sum(p["views"] for p in pages),
                "total_sessions": sum(p["sessions"] for p in pages),
                "total_users": sum(p["users"] for p in pages)
            }
        }
    except Exception as e:
        logger.error(f"GA4 Data Error: {e}")
        raise HTTPException(status_code=500, detail=f"Errore GA4: {str(e)}")
