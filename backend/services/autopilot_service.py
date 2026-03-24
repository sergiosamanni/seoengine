import asyncio
import logging
import uuid
from datetime import datetime, timezone, timedelta
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from database import db
from services.article_service import ArticleService
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
        
        # 1. Select Content
        topic = None
        keyword = None
        source = "editorial_plan"
        
        # Strategy: Editorial Plan First
        if auto_config.get("strategy") == "editorial_plan_first":
            plan = await db.editorial_plans.find_one({"client_id": client_id})
            if plan and plan.get("topics"):
                # Pick the first topic
                target = plan["topics"][0]
                keyword = target.get("keyword")
                topic = f"{target.get('titolo')}\n\nFunnel: {target.get('funnel')}\nOutline: {target.get('outline')}"
            else:
                # Fallback to combinations
                source = "combinations"
        
        if source == "combinations":
            kw_config = config.get("keyword_combinations", {})
            import itertools
            import random
            servizi = kw_config.get("servizi", [])
            citta = kw_config.get("citta_e_zone", [])
            tipi = kw_config.get("tipi_o_qualificatori", [])
            
            if servizi and citta and tipi:
                # Pick a random combination
                s = random.choice(servizi)
                c = random.choice(citta)
                t = random.choice(tipi)
                keyword = f"{s} {t} a {c}"
                topic = f"Generazione automatica per la combinazione: {keyword}"
            else:
                logger.warning(f"No content available for client {client_id} autopilot")
                await cls.update_next_run(client_id, auto_config)
                return

        # 2. Prepare Generation
        job_id = await ArticleService.create_job(client_id, 1)
        await log_activity(client_id, "autopilot_run", "running", {"keyword": keyword, "source": source})
        
        # Get LLM and Knowledge Base
        llm_config = config.get("llm", {}) or config.get("openai", {})
        kb = config.get("knowledge_base", {})
        tone = config.get("tono_e_stile", {})
        seo = config.get("seo", {})
        advanced_prompt = config.get("advanced_prompt", {})
        strategy = config.get("content_strategy", {})
        
        system_prompt = build_system_prompt(
            kb, tone, seo, client["nome"], advanced_prompt, strategy, 
            "articolo_blog", {}, [] # No specific brief or existing context for now
        )

        # 3. Trigger Generation (Asynchronous)
        # Note: We use a simple task so it doesn't block the main scheduler thread
        asyncio.create_task(ArticleService.run_simple_article_generation(
            job_id, client_id, keyword, topic, 
            auto_config.get("auto_publish", True),
            system_prompt, llm_config, config.get("wordpress", {}),
            kb, {"servizio": keyword, "citta": kb.get("citta_principale", ""), "tipo": "Autopilot"}
        ))

        # 4. Update Scheduling
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
