from fastapi import FastAPI, APIRouter
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from pathlib import Path
import os
import logging

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = FastAPI(title="SEO Antigravity AI Engine")

from routes.auth_users import router as auth_router
from routes.clients import router as clients_router
from routes.articles import router as articles_router
from routes.gsc import router as gsc_router
from routes.uploads import router as uploads_router
from routes.freshness import router as freshness_router
from routes.reports import router as reports_router
from routes.citations import router as citations_router
from routes.chat import router as chat_router
from routes.actions import router as actions_router
from routes.diag import router as diag_router
from routes.autopilot import router as autopilot_router
from routes.settings import router as settings_router
from routes.reddit import router as reddit_router

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    ] + [o.strip() for o in os.environ.get('CORS_ORIGINS', '').split(',') if o.strip()],
    allow_methods=["*"],
    allow_headers=["*"],
)

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(clients_router)
api_router.include_router(articles_router)
api_router.include_router(gsc_router)
api_router.include_router(uploads_router)
api_router.include_router(freshness_router)
api_router.include_router(reports_router)
api_router.include_router(citations_router)
api_router.include_router(chat_router, prefix="/chat")
api_router.include_router(actions_router, prefix="/chat/action")
api_router.include_router(diag_router)
api_router.include_router(autopilot_router)
api_router.include_router(settings_router, prefix="/settings")
api_router.include_router(reddit_router)


@app.get("/")
async def app_root():
    return {"message": "SEO Antigravity AI Engine API", "version": "2.1", "docs": "/docs"}

@app.get("/health")
async def app_health_check():
    return {"status": "healthy"}

app.include_router(api_router)



@app.on_event("startup")
async def startup():
    try:
        from storage import init_storage
        init_storage()
    except Exception as e:
        logger.warning(f"Storage init failed (will retry on first upload): {e}")

    # Start Autopilot Engine
    try:
        from services.autopilot_service import AutopilotService
        AutopilotService.start()
    except Exception as e:
        logger.error(f"Autopilot start failed: {e}")

    # Seed initial data
    try:
        from routes.auth_users import seed_data
        await seed_data()
        logger.info("Database seeding checked/completed")
    except Exception as e:
        logger.error(f"Seeding failed: {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    from database import client
    client.close()
    
    # Shutdown Autopilot Engine
    try:
        from services.autopilot_service import AutopilotService
        if AutopilotService._scheduler.running:
            AutopilotService._scheduler.shutdown()
            logger.info("Autopilot Scheduler shut down")
    except Exception as e:
        logger.error(f"Autopilot shutdown failed: {e}")

# Auto-repair DB on startup
@app.on_event("startup")
async def startup_repair():
    from repair_db import repair_database
    await repair_database()
