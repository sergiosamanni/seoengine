import asyncio
import uuid
from database import db
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("repair")

async def repair_database():
    logger.info("Starting database repair...")

    # 1. Repair Clients
    clients = await db.clients.find({}).to_list(None)
    for client in clients:
        if "id" not in client:
            new_id = str(uuid.uuid4())
            logger.info(f"Adding ID {new_id} to client {client.get('nome')}")
            await db.clients.update_one({"_id": client["_id"]}, {"$set": {"id": new_id}})
            
            # Need to update related articles if any
            await db.articles.update_many({"client_id": str(client["_id"])}, {"$set": {"client_id": new_id}})

    # 2. Repair Chat Sessions
    sessions = await db.chat_sessions.find({}).to_list(None)
    for session in sessions:
        if "id" not in session:
            new_id = str(uuid.uuid4())
            logger.info(f"Adding ID {new_id} to chat session {session.get('title')}")
            await db.chat_sessions.update_one({"_id": session["_id"]}, {"$set": {"id": new_id}})

    # 3. Repair Articles
    articles = await db.articles.find({"id": {"$exists": False}}).to_list(None)
    for art in articles:
        new_id = str(uuid.uuid4())
        await db.articles.update_one({"_id": art["_id"]}, {"$set": {"id": new_id}})

    logger.info("Database repair completed.")

if __name__ == "__main__":
    asyncio.run(repair_database())
