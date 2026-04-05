import certifi
from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "seoengine")

is_localhost = "localhost" in MONGO_URL or "127.0.0.1" in MONGO_URL
client = AsyncIOMotorClient(
    MONGO_URL,
    tls=not is_localhost,
    tlsCAFile=certifi.where() if not is_localhost else None,
    retryWrites=True,
    connectTimeoutMS=10000
)
db = client[DB_NAME]
