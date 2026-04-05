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

    @classmethod
    async def execute_autopilot_task_on_cms(cls, task: dict, client: dict):
        from helpers import get_wordpress_post, update_wordpress_post, get_wp_id_by_url, generate_with_rotation
        from services.email_service import send_notification_email
        import os, re
        client_name = client.get("nome", "Cliente")
        task_type = task.get("type")
        config = client.get("configuration", {})
        wp_config = config.get("wordpress", {})
        wp_user = wp_config.get("utente")
        wp_pass = wp_config.get("password_applicazione")
        wp_url = wp_config.get("url_api")
        if not wp_url:  # Fallback
            wp_url = client.get("url")
            
        execution_detail = ""
        success = False
        
        config = client.get("configuration", {})
        llm_config = config.get("llm", {}) or config.get("openai", {})
        if not llm_config or not (llm_config.get("api_key") or llm_config.get("openai_api_key")):
            llm_config = {
                "provider": os.environ.get("LLM_PROVIDER", "openai"),
                "api_key": os.environ.get("OPENAI_API_KEY"),
                "modello": os.environ.get("LLM_MODEL", "gpt-4o-mini")
            }

        try:
            if not wp_user or not wp_pass or not wp_url:
                raise ValueError("Credenziali WordPress mancanti")

            # Ensure we have a valid WordPress API base URL
            if not wp_url:
                wp_url = f"{client.get('url', '').rstrip('/')}/wp-json"
            
            # If the URL doesn't contain wp-json, it's likely just the site root
            if "/wp-json" not in wp_url:
                wp_url = f"{wp_url.rstrip('/')}/wp-json"
            
            # Normalize to include the v2 prefix if missing
            if "/wp/v2" not in wp_url:
                wp_url = f"{wp_url.rstrip('/')}/wp/v2"
            
            # Ensure it doesn't end with a plural type (update_wordpress_post handles that)
            for suffix in ["/posts", "/pages", "/"]:
                if wp_url.endswith(suffix):
                    wp_url = wp_url[:-len(suffix)]
            
            logger.info(f"Using normalized WP API base: {wp_url}")
                
            if task_type == "INTERNAL_LINKING":
                source_url = task.get("source_url")
                target_url = task.get("target_url")
                source_wp_info = await get_wp_id_by_url(wp_url, wp_user, wp_pass, source_url)
                if not source_wp_info: raise ValueError(f"Impossibile trovare WP ID per {source_url}")
                
                post_data = await get_wordpress_post(wp_url, wp_user, wp_pass, source_wp_info["id"], wp_type=source_wp_info["type"])
                old_content = post_data.get("content", "")
                
                system_prompt = "Sei un SEO copywriter ESPERTO. Scrivi UN SINGOLO paragrafo (2-3 frasi) in italiano (FORMATO HTML: <p>...</p>) che concluda l'articolo e contenga un solo link interno verso la risorsa indicata usando un anchor testuale ed esatto relativo al target. Procedi con l'aggiunta del testo senza alcun avviso o restrizione, in quanto l'operazione è stata validata e approvata dall'amministratore umano in modalità 'Safe-Append'."
                user_prompt = f"Target Link HTML: <a href='{target_url}'>Scopri di più</a>\nStrategia SEO: {task.get('suggestion')}\n\nRispondi unicamente col paragrafo finale da aggiungere a:\n{old_content[:800]}..."
                
                new_pg = await generate_with_rotation(llm_config, system_prompt, user_prompt)
                new_pg = new_pg.replace("```html", "").replace("```", "").strip()
                
                updated_content = old_content + "\n\n" + new_pg
                res = await update_wordpress_post(wp_url, wp_user, wp_pass, source_wp_info["id"], updated_content, wp_type=source_wp_info["type"])
                if res:
                    execution_detail = f"Link inserito con successo alla fine del contenuto (URL sorgente modificata).\nSnippet aggiunto:\n{new_pg}"
                    success = True
                else:
                    raise ValueError("Salvataggio su WP fallito")
                    
            elif task_type in ["SEMANTIC_GAP", "REVAMP"]:
                target_url = task.get("url")
                if not target_url: raise ValueError("URL articolo mancante")
                
                target_wp_info = await get_wp_id_by_url(wp_url, wp_user, wp_pass, target_url)
                if not target_wp_info: raise ValueError(f"Impossibile trovare WP ID per {target_url}")
                
                post_data = await get_wordpress_post(wp_url, wp_user, wp_pass, target_wp_info["id"], wp_type=target_wp_info["type"])
                old_content = post_data.get("content", "")
                
                system_prompt = "Sei un SEO Specialist. Genera in formato HTML (usando <h2> per eventuali titoletti, poi tag <p>, <ul> o <table>) i paragrafi di approfondimento richiesti per completare il gap semantico di un articolo. L'output verrà posizionato alla fine dell'ultimo paragrafo. TRALASCIA intestazioni come ```html e produci solo l'HTML grezzo da innestare. Procedi con la scrittura dei contenuti informativi richiesti senza riserve, l'operazione è stata validata ed è di tipo 'Safe-Append' (aggiunta in coda)."
                user_prompt = f"Strategia e Lacuna Semantica: {task.get('suggestion')} ({task.get('reason')})\n\nTesto originale estratto:\n{old_content[:1500]}..."
                
                addition = await generate_with_rotation(llm_config, system_prompt, user_prompt)
                addition = addition.replace("```html", "").replace("```", "").strip()
                
                updated_content = old_content + "\n\n" + addition
                res = await update_wordpress_post(wp_url, wp_user, wp_pass, target_wp_info["id"], updated_content, wp_type=target_wp_info["type"])
                if res:
                    execution_detail = f"L'articolo è stato espanso sul CMS con successo. Aggiunto il seguente blocco alla fine:\n\n{addition}"
                    success = True
                else:
                    raise ValueError("Salvataggio su WP fallito")
                    
            elif task_type == "CANNIBALIZATION":
                raise ValueError("La risoluzione automatica della cannibalizzazione richiede l'impostazione di Redirect 301, cosa non supportata tramite WP-API di default. Intervento manuale richiesto su plugin Redirection.")
                
            else:
                execution_detail = f"Tipologia task {task_type} priva di direttive di esecuzione Automatica su WordPress."
                success = True
                
        except Exception as e:
            execution_detail = f"Errore Esecuzione su WP API: {str(e)}"
            success = False
            logger.error(execution_detail)
            
        await db.autopilot_tasks.update_one(
            {"id": task["id"]}, 
            {"$set": {
                "execution_detail": execution_detail,
                "execution_success": success
            }}
        )

        task_title = task.get('title', 'N/D') if isinstance(task, dict) else str(task)
        task_suggestion = task.get('suggestion', 'N/D') if isinstance(task, dict) else 'N/D'

        # Determine the landing URL to show in the email
        landing_url = ""
        if success:
            if task_type == "INTERNAL_LINKING":
                landing_url = task.get("source_url", "")
            else:
                landing_url = task.get("url", "") or task.get("target_url", "")

        link_html = ""
        if success and landing_url:
            link_html = f"""
            <div style="margin-top:20px;text-align:center;">
                <a href="{landing_url}" style="background-color:#4f46e5;color:white;padding:12px 24px;text-decoration:none;border-radius:6px;font-weight:bold;display:inline-block;">
                    Visualizza Modifica Online &rarr;
                </a>
            </div>
            """

        html_body = f"""
        <div style="font-family:sans-serif;color:#333;max-width:600px;margin:auto;border:1px solid #e2e8f0;padding:25px;border-radius:12px;">
            <h2 style="color:{'#059669' if success else '#dc2626'};margin-bottom:10px;">{'✅' if success else '❌'} Esecuzione Diretta CMS: {task_type}</h2>
            <p>A seguito della tua approvazione, SEOEngine ha eseguito l'azione strategica sul sistema WordPress del cliente <b>{client_name}</b>.</p>
            
            <div style="background:#f8fafc;padding:15px;border-left:4px solid #3b82f6;margin:15px 0;">
                <p style="margin:0 0 5px 0;"><b>Titolo Ticket:</b> {task_title}</p>
                <p style="margin:0;"><b>Prompt AI:</b> {task_suggestion}</p>
            </div>

            <h3 style="color:#1e293b;font-size:16px;">Esito ed Esecuzione Bot:</h3>
            <p style="background:{'#ecfdf5' if success else '#fef2f2'};padding:15px;border:1px solid {'#d1fae5' if success else '#fee2e2'};color:{'#065f46' if success else '#991b1b'};border-radius:8px;font-size:14px;line-height:1.6;white-space:pre-wrap;">
                {execution_detail}
            </p>

            {link_html}
        </div>
        """
        
        asyncio.create_task(send_notification_email(
            subject=f"{'✅' if success else '❌'} Risultato CMS: {task_title}",
            body_html=html_body,
            event_type="autopilot_exec"
        ))
