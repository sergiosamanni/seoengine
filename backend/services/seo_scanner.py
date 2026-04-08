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
            
        # Prepare context of recent history (max 10, both completed and rejected)
        cursor = db.autopilot_tasks.find({
            "client_id": client_id, 
            "status": {"$in": ["completed", "rejected"]}
        }).sort("created_at", -1).limit(10)
        recent_history_msgs = []
        async for task in cursor:
            status_label = "FATTO" if task.get("status") == "completed" else "RIFIUTATO DALL'UTENTE (NON PROPORLO MAI PIÙ)"
            recent_history_msgs.append(f"[{status_label}] {task.get('type')} - {task.get('title')}: {task.get('suggestion')}")
            
        history_context = ""
        if recent_history_msgs:
            history_context = "\n\nCONTESTO STORICO RECENTE (BLACKLIST / DONE):\nQueste operazioni sono già state gestite. NON PROPORLE DI NUOVO. Sii complementare o concentrati su altre aree:\n" + "\n".join(recent_history_msgs) + "\n"
        
        # 1. Evaluate Freshness (Old Content)
        await cls.evaluate_freshness(client, history_context)
        
        # 2. Evaluate Editorial Plan (New Content)
        await cls.evaluate_editorial_plan(client, history_context)
        
        # 3. Evaluate Internal Linking (Spider)
        await cls.evaluate_internal_linking(client, history_context)
        
        # 4. Evaluate Cannibalization (Gardener)
        await cls.evaluate_cannibalization(client, history_context)
        
        # 5. Evaluate Semantic Gap (Analysis)
        await cls.evaluate_semantic_gap(client, history_context)
        
        logger.info(f"SEO Scan completed for client {client_id}")

    @classmethod
    async def evaluate_freshness(cls, client, history_context: str = ""):
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

        current_year = datetime.now().year
        prompt = (
            "Sei un SEO Strategist. Analizza questi 5 articoli datati e proponi un'azione di REVAMP "
            "per ognuno. Concentrati su aggiornamento dati, link interni e miglioramento dell'intento.\n"
            f"{history_context}\n"
            "RISPONDI SOLO IN JSON (lista di oggetti):\n"
            "[\n"
            "  {\n"
            "    \"titolo\": \"...\",\n"
            "    \"url\": \"...\",\n"
            f"    \"reason\": \"Perché aggiornare (es. calo rilevanza {current_year})\",\n"
            f"    \"suggestion\": \"Cosa fare esattamente (max 250 car - cita dati {current_year})\"\n"
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
                if not isinstance(proposals, list):
                    logger.warning(f"Freshness scan expected list, got {type(proposals)}")
                    return
                    
                for prop in proposals:
                    if not isinstance(prop, dict): continue
                    url = prop.get("url")
                    if not url: continue
                    
                    # Normalize URL for comparison
                    norm_url = url.strip().rstrip("/")
                    if norm_url.startswith("http://"): norm_url = "https" + norm_url[4:]
                    
                    # Check if task already exists with this URL (any status)
                    exists = await db.autopilot_tasks.find_one({
                        "client_id": client_id,
                        "$or": [
                            {"url": url},
                            {"url": url + "/"},
                            {"url": url[:-1] if url.endswith("/") else url}
                        ],
                        "status": {"$in": ["pending", "completed", "rejected"]}
                    })
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
    async def evaluate_internal_linking(cls, client, history_context: str = ""):
        client_id = client["id"]
        config = client.get("configuration", {})
        from services.gsc_service import GSCService
        
        # 1. Fetch Performance Data
        pages = await GSCService.get_page_performance(client_id, limit=20)
        if not pages:
            return

        # Donors: Top 5 pages (safeguard for None elements)
        non_null_pages = [p for p in pages if isinstance(p, dict)]
        donors = sorted(non_null_pages, key=lambda x: x.get("clicks", 0), reverse=True)[:5]
        # Recipients: Low click, high impression (potential)
        recipients = sorted([p for p in non_null_pages if p.get("clicks", 0) < 5], key=lambda x: x.get("impressions", 0), reverse=True)[:5]
        
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
            "e proponi UN SOLO suggerimento di LINK INTERNO basato sulla rilevanza semantica degli URL.\n"
            f"{history_context}\n"
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
                if not isinstance(prop, dict):
                    logger.warning(f"Spider scan expected dict, got {type(prop)}")
                    return
                
                # Verify keys
                if "source_url" in prop and "target_url" in prop:
                    # Check if task already exists (any status)
                    exists = await db.autopilot_tasks.find_one({
                        "client_id": client_id,
                        "$or": [
                            {"source_url": prop["source_url"], "target_url": prop["target_url"]},
                            {"source_url": prop["source_url"] + "/", "target_url": prop["target_url"]},
                            {"source_url": prop["source_url"], "target_url": prop["target_url"] + "/"}
                        ],
                        "status": {"$in": ["pending", "completed", "rejected"]}
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
    async def evaluate_cannibalization(cls, client, history_context: str = ""):
        client_id = client["id"]
        config = client.get("configuration", {})
        from services.gsc_service import GSCService
        
        # 1. Fetch Conflicts
        conflicts = await GSCService.get_keyword_cannibalization(client_id, limit=50)
        if not conflicts:
            return

        # Pick a significant conflict (max 2 per scan to avoid noise)
        significant_conflicts = []
        for c in conflicts:
            if not isinstance(c, dict) or not c.get("pages"): continue
            
            total_clicks = sum((p.get("clicks", 0) or 0) for p in c["pages"] if isinstance(p, dict))
            if total_clicks > 2:
                significant_conflicts.append(c)
        
        significant_conflicts = significant_conflicts[:2]
        
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
                f"\n\n{history_context}Proponi una strategia di CONSOLIDAMENTO.\n"
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
                    if not isinstance(prop, dict): continue
                    
                    winner_url = prop.get("winner_url")
                    loser_url = prop.get("loser_url")
                    if not winner_url or not loser_url: continue
                    
                    # Check if task already exists (any status)
                    exists = await db.autopilot_tasks.find_one({
                        "client_id": client_id,
                        "$or": [
                            {"winner_url": winner_url, "loser_url": loser_url},
                            {"winner_url": winner_url + "/", "loser_url": loser_url},
                            {"winner_url": winner_url, "loser_url": loser_url + "/"}
                        ],
                        "status": {"$in": ["pending", "completed", "rejected"]}
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
    async def evaluate_semantic_gap(cls, client, history_context: str = ""):
        client_id = client["id"]
        config = client.get("configuration", {})
        from services.gsc_service import GSCService
        from helpers import web_search_text
        
        # 1. Fetch Striking Distance Keywords
        keywords = await GSCService.get_striking_distance_keywords(client_id, limit=3)
        if not keywords:
            return

        llm_config = config.get("llm", {}) or config.get("openai", {})
        if not llm_config or not (llm_config.get("api_key") or llm_config.get("openai_api_key")):
            llm_config = {
                "provider": os.environ.get("LLM_PROVIDER", "openai"),
                "api_key": os.environ.get("OPENAI_API_KEY"),
                "modello": os.environ.get("LLM_MODEL", "gpt-4o-mini")
            }

        for kw_info in keywords:
            kw = kw_info["query"]
            # 2. Search Top 3 snippets
            search_results = await web_search_text(kw, max_results=3)
            if not search_results:
                continue

            competitors_context = "\n".join([f"- {r['title']}: {r['body'][:300]}" for r in search_results])
            
            prompt = (
                f"Sei un SEO Consultant. La nostra pagina {kw_info['url']} è in posizione {kw_info['position']} per '{kw}'.\n"
                "I Top 3 competitor mostrano questi snippet/contenuti:\n"
                + competitors_context + 
                f"\n\n{history_context}"
                "Individua un 'Semantic Gap' (cosa hanno loro che noi non abbiamo: tabelle, FAQ, dati, grafici).\n"
                "FORNISCI IL RISULTATO SOLO IN JSON:\n"
                "{\n"
                "  \"gap_identified\": \"cosa manca esatto (max 100 car)\",\n"
                "  \"reason\": \"Perché aggiungerlo (max 150 car)\",\n"
                "  \"suggestion\": \"Testo o elemento preciso da inserire per scalare in Top 3 (max 250 car)\"\n"
                "}\n"
            )

            try:
                response_text = await generate_with_rotation(llm_config, prompt, "Autopilot Semantic Gap Scan:")
                json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
                if json_match:
                    prop = json.loads(json_match.group(0))
                    if not isinstance(prop, dict): continue
                    
                    # Check if task already exists (any status)
                    exists = await db.autopilot_tasks.find_one({
                        "client_id": client_id,
                        "$or": [
                            {"url": kw_info.get("url")},
                            {"url": (kw_info.get("url") or "") + "/"},
                            {"url": (kw_info.get("url") or "").rstrip("/")}
                        ],
                        "title": {"$regex": "Semantic Gap"}, 
                        "status": {"$in": ["pending", "completed", "rejected"]}
                    })
                    if not exists:
                        await db.autopilot_tasks.insert_one({
                            "id": str(uuid.uuid4()),
                            "client_id": client_id,
                            "type": "SEMANTIC_GAP",
                            "status": "pending",
                            "title": f"Semantic Gap: {kw}",
                            "reason": f"Siamo in striking distance ({kw_info['position']}). Manca: {prop['gap_identified']}",
                            "suggestion": prop["suggestion"],
                            "url": kw_info["url"],
                            "created_at": datetime.now(timezone.utc).isoformat()
                        })
            except Exception as e:
                logger.error(f"Semantic Gap evaluation failed for {client_id} (kw: {kw}): {e}")

    @classmethod
    async def evaluate_editorial_plan(cls, client, history_context: str = ""):
        client_id = client["id"]
        config = client.get("configuration", {})
        llm_config = config.get("llm", {}) or config.get("openai", {})
        
        plan = await db.editorial_plans.find_one({"client_id": client_id})
        if not plan or not plan.get("topics"):
            return
            
        # Find the first topic not already in tasks (any status)
        selected_topic = None
        for topic in plan["topics"]:
            topic_titolo = topic["titolo"]
            # Search with regex that covers the prefix the scanner usually adds
            exists = await db.autopilot_tasks.find_one({
                "client_id": client_id,
                "$or": [
                    {"title": {"$regex": re.escape(topic_titolo), "$options": "i"}},
                    {"payload.titolo": topic_titolo}
                ],
                "status": {"$in": ["pending", "completed", "rejected"]}
            })
            if not exists:
                selected_topic = topic
                break
        
        if selected_topic:
            await db.autopilot_tasks.insert_one({
                "id": str(uuid.uuid4()),
                "client_id": client_id,
                "type": "NEW_CONTENT",
                "status": "pending",
                "title": f"Nuovo Contenuto: {selected_topic['titolo']}",
                "reason": f"Pianificato nel Piano Editoriale. Keyword: {selected_topic.get('keyword')}",
                "suggestion": f"Generazione articolo basata sull'outline: {selected_topic.get('outline', '')[:100]}...",
                "payload": selected_topic,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
