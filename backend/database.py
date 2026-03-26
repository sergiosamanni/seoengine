from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "seoengine")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
