import logging
import json
import re
import os
import uuid
from datetime import datetime, timezone
from database import db
from helpers import generate_with_rotation, get_sitemap_links

logger = logging.getLogger("server")

class SEOScanner:
    @classmethod
    async def scan_client(cls, client_id: str):
        """Runs all SEO sensors for a client and generates proposals."""
        logger.info(f"Starting SEO Scan for client {client_id}")
        client = await db.clients.find_one({"id": client_id})
        if not client:
            return
        
        # 1. Evaluate Freshness (Old Content)
        await cls.evaluate_freshness(client)
        
        # 2. Evaluate Editorial Plan (New Content)
        await cls.evaluate_editorial_plan(client)
        
        # 3. Placeholder for Link Spider
        # 4. Placeholder for Content Gardening
        
        logger.info(f"SEO Scan completed for client {client_id}")

    @classmethod
    async def evaluate_freshness(cls, client):
        client_id = client["id"]
        config = client.get("configuration", {})
        
        # Get oldest published articles
        platform_cursor = db.articles.find({"client_id": client_id, "stato": "published"}).sort("published_at", 1).limit(5)
        articles_to_audit = []
        async for art in platform_cursor:
            articles_to_audit.append({
                "titolo": art["titolo"],
                "url": art.get("wordpress_link", "")
            })
            
        if not articles_to_audit:
            return

        # Generate Audit via LLM
        llm_config = config.get("llm", {}) or config.get("openai", {})
        if not llm_config or not (llm_config.get("api_key") or llm_config.get("openai_api_key")):
            llm_config = {
                "provider": os.environ.get("LLM_PROVIDER", "openai"),
                "api_key": os.environ.get("OPENAI_API_KEY"),
                "modello": os.environ.get("LLM_MODEL", "gpt-4o-mini")
            }

        prompt = (
            "Sei un SEO Strategist. Analizza questi 5 articoli datati e proponi un'azione di REVAMP "
            "per ognuno. Concentrati su aggiornamento dati, link interni e miglioramento dell'intento.\n\n"
            "RISPONDI SOLO IN JSON (lista di oggetti):\n"
            "[\n"
            "  {\n"
            "    \"titolo\": \"...\",\n"
            "    \"url\": \"...\",\n"
            "    \"reason\": \"Perché aggiornare (es. calo rilevanza 2024)\",\n"
            "    \"suggestion\": \"Cosa fare esattamente (max 250 car)\"\n"
            "  }\n"
            "]\n\nArticoli:\n"
        )
        for a in articles_to_audit:
            prompt += f"- {a['titolo']} ({a['url']})\n"

        try:
            response_text = await generate_with_rotation(llm_config, prompt, "Autopilot Freshness Scan:")
            json_match = re.search(r'\[\s*\{.*?\}\s*\]', response_text, re.DOTALL)
            if json_match:
                proposals = json.loads(json_match.group(0))
                for prop in proposals:
                    # Check if task already exists for this URL to avoid duplicates
                    exists = await db.autopilot_tasks.find_one({"url": prop["url"], "status": "pending"})
                    if not exists:
                        await db.autopilot_tasks.insert_one({
                            "id": str(uuid.uuid4()),
                            "client_id": client_id,
                            "type": "REVAMP",
                            "status": "pending",
                            "title": f"Revamp: {prop['titolo']}",
                            "reason": prop["reason"],
                            "suggestion": prop["suggestion"],
                            "url": prop["url"],
                            "created_at": datetime.now(timezone.utc).isoformat()
                        })
        except Exception as e:
            logger.error(f"Freshness evaluation failed for {client_id}: {e}")

    @classmethod
    async def evaluate_editorial_plan(cls, client):
        client_id = client["id"]
        # Simple picker for now: pick the first task from editorial plan not already proposed
        plan = await db.editorial_plans.find_one({"client_id": client_id})
        if not plan or not plan.get("topics"):
            return
            
        topic = plan["topics"][0]
        exists = await db.autopilot_tasks.find_one({"title": {"$regex": topic["titolo"]}, "status": "pending"})
        if not exists:
            await db.autopilot_tasks.insert_one({
                "id": str(uuid.uuid4()),
                "client_id": client_id,
                "type": "NEW_CONTENT",
                "status": "pending",
                "title": f"Nuovo Contenuto: {topic['titolo']}",
                "reason": f"Pianificato nel Piano Editoriale. Keyword: {topic.get('keyword')}",
                "suggestion": f"Generazione articolo basata sull'outline: {topic.get('outline')[:100]}...",
                "payload": topic, # Save the full topic object for later generation
                "created_at": datetime.now(timezone.utc).isoformat()
            })
