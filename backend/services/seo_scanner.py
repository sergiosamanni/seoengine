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
        
        # 3. Evaluate Internal Linking (Spider)
        await cls.evaluate_internal_linking(client)
        
        # 4. Evaluate Cannibalization (Gardener)
        await cls.evaluate_cannibalization(client)
        
        # 5. Placeholder for Semantic Gap
        
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
    async def evaluate_internal_linking(cls, client):
        client_id = client["id"]
        config = client.get("configuration", {})
        from services.gsc_service import GSCService
        
        # 1. Fetch Performance Data
        pages = await GSCService.get_page_performance(client_id, limit=20)
        if not pages:
            return

        # Donors: Top 5 pages
        donors = sorted(pages, key=lambda x: x["clicks"], reverse=True)[:5]
        # Recipients: Low click, high impression (potential)
        recipients = sorted([p for p in pages if p["clicks"] < 5], key=lambda x: x["impressions"], reverse=True)[:5]
        
        if not donors or not recipients:
            return

        llm_config = config.get("llm", {}) or config.get("openai", {})
        if not llm_config or not (llm_config.get("api_key") or llm_config.get("openai_api_key")):
            llm_config = {
                "provider": os.environ.get("LLM_PROVIDER", "openai"),
                "api_key": os.environ.get("OPENAI_API_KEY"),
                "modello": os.environ.get("LLM_MODEL", "gpt-4o-mini")
            }

        prompt = (
            "Sei un esperto SEO Technical. Analizza questi due elenchi (Pagine Donatrici e Pagine Riceventi) "
            "e proponi UN SOLO suggerimento di LINK INTERNO basato sulla rilevanza semantica degli URL.\n\n"
            "DONATRICI (Alta autorità):\n" + "\n".join([f"- {d['url']}" for d in donors]) + "\n\n"
            "RICEVENTI (Hanno bisogno di spinta):\n" + "\n".join([f"- {r['url']}" for r in recipients]) + "\n\n"
            "FORNISCI IL RISULTATO SOLO IN JSON:\n"
            "{\n"
            "  \"source_url\": \"...\",\n"
            "  \"target_url\": \"...\",\n"
            "  \"reason\": \"Perché collegarle (max 150 car)\",\n"
            "  \"suggestion\": \"Testo esatto dell'anchor o dove inserirlo (max 150 car)\"\n"
            "}\n"
        )

        try:
            response_text = await generate_with_rotation(llm_config, prompt, "Autopilot Spider Scan:")
            json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
            if json_match:
                prop = json.loads(json_match.group(0))
                
                # Verify keys
                if "source_url" in prop and "target_url" in prop:
                    # Check if task already exists
                    exists = await db.autopilot_tasks.find_one({
                        "source_url": prop["source_url"], 
                        "target_url": prop["target_url"], 
                        "status": "pending"
                    })
                    if not exists:
                        await db.autopilot_tasks.insert_one({
                            "id": str(uuid.uuid4()),
                            "client_id": client_id,
                            "type": "INTERNAL_LINKING",
                            "status": "pending",
                            "title": f"Spider: Nuovo Link Interno",
                            "reason": prop["reason"],
                            "suggestion": prop["suggestion"],
                            "source_url": prop["source_url"],
                            "target_url": prop["target_url"],
                            "created_at": datetime.now(timezone.utc).isoformat()
                        })
        except Exception as e:
            logger.error(f"Spider evaluation failed for {client_id}: {e}")

    @classmethod
    async def evaluate_cannibalization(cls, client):
        client_id = client["id"]
        config = client.get("configuration", {})
        from services.gsc_service import GSCService
        
        # 1. Fetch Conflicts
        conflicts = await GSCService.get_keyword_cannibalization(client_id, limit=50)
        if not conflicts:
            return

        # Pick a significant conflict (max 2 per scan to avoid noise)
        significant_conflicts = [c for c in conflicts if sum(p['clicks'] for p in c['pages']) > 2][:2]
        
        if not significant_conflicts:
            return

        llm_config = config.get("llm", {}) or config.get("openai", {})
        if not llm_config or not (llm_config.get("api_key") or llm_config.get("openai_api_key")):
            llm_config = {
                "provider": os.environ.get("LLM_PROVIDER", "openai"),
                "api_key": os.environ.get("OPENAI_API_KEY"),
                "modello": os.environ.get("LLM_MODEL", "gpt-4o-mini")
            }

        for conflict in significant_conflicts:
            prompt = (
                f"Sei un SEO Consultant. Ho rilevato una cannibalizzazione per la keyword '{conflict['query']}'.\n"
                "Queste pagine competono per lo stesso traffico:\n"
                + "\n".join([f"- {p['url']} (Clic: {p['clicks']}, Pos: {p['position']})" for p in conflict['pages']]) + 
                "\n\nProponi una strategia di CONSOLIDAMENTO.\n"
                "FORNISCI IL RISULTATO SOLO IN JSON:\n"
                "{\n"
                "  \"winner_url\": \"url da mantenere\",\n"
                "  \"loser_url\": \"url da reindirizzare\",\n"
                "  \"reason\": \"Perché farlo (max 150 car)\",\n"
                "  \"suggestion\": \"Azione pratica (es: Copia il paragrafo X da Y in Z e fai 301)\"\n"
                "}\n"
            )

            try:
                response_text = await generate_with_rotation(llm_config, prompt, "Autopilot Gardener Scan:")
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    prop = json.loads(json_match.group(0))
                    
                    # Check if task already exists
                    exists = await db.autopilot_tasks.find_one({
                        "winner_url": prop.get("winner_url"), 
                        "loser_url": prop.get("loser_url"), 
                        "status": "pending"
                    })
                    if not exists:
                        await db.autopilot_tasks.insert_one({
                            "id": str(uuid.uuid4()),
                            "client_id": client_id,
                            "type": "CANNIBALIZATION",
                            "status": "pending",
                            "title": f"Gardener: Cannibalizzazione rilevata",
                            "reason": f"Conflitto per keyword '{conflict['query']}': {prop['reason']}",
                            "suggestion": prop["suggestion"],
                            "winner_url": prop.get("winner_url"),
                            "loser_url": prop.get("loser_url"),
                            "created_at": datetime.now(timezone.utc).isoformat()
                        })
            except Exception as e:
                logger.error(f"Gardener evaluation failed for {client_id}: {e}")

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
