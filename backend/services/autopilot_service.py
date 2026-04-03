import asyncio
import logging
import uuid
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from database import db
from services.article_service import ArticleService
from services.seo_scanner import SEOScanner
from helpers import log_activity, build_system_prompt

logger = logging.getLogger("server")

class AutopilotService:
    _scheduler = AsyncIOScheduler()

    @classmethod
    def start(cls):
        if not cls._scheduler.running:
            cls._scheduler.add_job(cls.run_autopilot_check, "interval", minutes=30)
            cls._scheduler.start()
            logger.info("Autopilot Scheduler started (checking every 30m)")

    @classmethod
    async def run_autopilot_check(cls):
        """Finds clients due for autopilot tasks and processes them."""
        now = datetime.now(timezone.utc)
        now_iso = now.isoformat()
        
        # Query clients with autopilot enabled and next_run <= now
        cursor = db.clients.find({
            "configuration.autopilot.enabled": True,
            "$or": [
                {"configuration.autopilot.next_run": {"$lte": now_iso}},
                {"configuration.autopilot.next_run": None}
            ]
        })

        async for client in cursor:
            try:
                await cls.process_client(client)
            except Exception as e:
                logger.error(f"Error processing autopilot for client {client['id']}: {e}")

    @classmethod
    async def process_client(cls, client):
        client_id = client["id"]
        config = client.get("configuration", {})
        auto_config = config.get("autopilot", {})
        
        logger.info(f"Processing Autopilot for {client['nome']} ({client_id})")
        
        # 1. Trigger the Modular SEO Scanner
        # This will populate the autopilot_tasks queue for HITL approval
        try:
            await log_activity(client_id, "autopilot_scan", "running", {})
            await SEOScanner.scan_client(client_id)
            
            # 2. Email notification if new tasks were generated
            try:
                pending_tasks = []
                cursor = db.autopilot_tasks.find({
                    "client_id": client_id, 
                    "status": "pending",
                    "seen_by_admin": {"$ne": True}
                }).sort("created_at", -1).limit(5)
                async for t in cursor:
                    pending_tasks.append({"title": t.get("title", ""), "type": t.get("type", "")})
                
                if pending_tasks:
                    from services.email_service import notify_autopilot_scan_complete
                    asyncio.create_task(notify_autopilot_scan_complete(
                        client_name=client.get("nome", "Cliente"),
                        tasks_count=len(pending_tasks),
                        task_summaries=pending_tasks
                    ))
            except Exception as email_err:
                logger.debug(f"Autopilot email notification skipped: {email_err}")
                
        except Exception as e:
            logger.error(f"Autopilot scan failed for {client_id}: {e}")

        # 3. Update Scheduling
        await cls.update_next_run(client_id, auto_config)


    @classmethod
    async def update_next_run(cls, client_id, auto_config):
        now = datetime.now(timezone.utc)
        freq = auto_config.get("frequency", "weekly")
        
        if freq == "daily":
            next_run = now + timedelta(days=1)
        elif freq == "biweekly":
            next_run = now + timedelta(days=3)
        elif freq == "monthly":
            next_run = now + timedelta(days=30)
        else: # weekly
            next_run = now + timedelta(days=7)
            
        # Set to specific time of day if provided
        try:
            time_parts = auto_config.get("time_of_day", "09:00").split(":")
            next_run = next_run.replace(hour=int(time_parts[0]), minute=int(time_parts[1]), second=0)
        except:
            pass

        await db.clients.update_one({"id": client_id}, {"$set": {
            "configuration.autopilot.last_run": now.isoformat(),
            "configuration.autopilot.next_run": next_run.isoformat()
        }})
        logger.info(f"Updated scheduling for {client_id}: Next run at {next_run}")
