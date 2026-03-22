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

app = FastAPI(title="Programmatic SEO Engine")

from routes.auth_users import router as auth_router
from routes.clients import router as clients_router
from routes.articles import router as articles_router
from routes.gsc import router as gsc_router
from routes.uploads import router as uploads_router

api_router = APIRouter(prefix="/api")
api_router.include_router(auth_router)
api_router.include_router(clients_router)
api_router.include_router(articles_router)
api_router.include_router(gsc_router)
api_router.include_router(uploads_router)


@api_router.get("/")
async def root():
    return {"message": "Programmatic SEO Engine API", "version": "2.0"}


app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://italiarentalsi.it",
    ] + [o for o in os.environ.get('CORS_ORIGINS', '').split(',') if o],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    try:
        from storage import init_storage
        init_storage()
    except Exception as e:
        logger.warning(f"Storage init failed (will retry on first upload): {e}")


@app.on_event("shutdown")
async def shutdown_db_client():
    from database import client
    client.close()
