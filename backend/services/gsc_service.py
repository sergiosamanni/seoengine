import logging
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException
from database import db

logger = logging.getLogger("server")

class GSCService:
    @staticmethod
    async def get_performance_summary(client_id: str, days: int = 28) -> dict:
        """Fetches a summary of GSC data for the given client."""
        client_doc = await db.clients.find_one({"id": client_id}, {"configuration.gsc": 1})
        if not client_doc:
            return {}
            
        gsc_config = (client_doc.get("configuration", {}) or {}).get("gsc", {})
        tokens = gsc_config.get("tokens")
        if not tokens or not gsc_config.get("connected"):
            logger.warning(f"GSC not connected for client {client_id}")
            return {}
            
        site_url = gsc_config.get("site_url", "")
        if not site_url:
            return {}

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
            
            # Simplified query for summary
            response = service.searchanalytics().query(
                siteUrl=site_url,
                body={
                    "startDate": start_date.isoformat(), 
                    "endDate": end_date.isoformat(),
                    "dimensions": ["query"], 
                    "rowLimit": 20
                }
            ).execute()
            
            rows = response.get("rows", [])
            keywords = []
            total_clicks = 0
            total_impressions = 0
            
            for row in rows:
                if row.get("keys"):
                    keywords.append({
                        "query": row["keys"][0],
                        "clicks": row.get("clicks", 0),
                        "impressions": row.get("impressions", 0),
                        "position": round(row.get("position", 0), 1)
                    })
                    total_clicks += row.get("clicks", 0)
                    total_impressions += row.get("impressions", 0)
            
            return {
                "top_keywords": keywords,
                "total_clicks": total_clicks,
                "total_impressions": total_impressions,
                "period": f"last {days} days"
            }
        except Exception as e:
            logger.error(f"GSC Summary fetch error for {client_id}: {e}")
            return {}
