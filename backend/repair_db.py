import asyncio
import uuid
import logging
import os
from database import db
from bson import ObjectId

# Log to a file we can read later
LOG_FILE = "/tmp/repair_db.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(LOG_FILE),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("repair")

async def repair_database():
    logger.info("--- Starting Database Repair ---")
    try:
        # 1. Repair Clients
        clients_count = 0
        async for client in db.clients.find({}):
            if "id" not in client:
                new_id = str(uuid.uuid4())
                logger.info(f"Repairing client '{client.get('nome')}': assigning ID {new_id}")
                await db.clients.update_one({"_id": client["_id"]}, {"$set": {"id": new_id}})
                
                # Update related articles that might use the old ObjectId as string
                old_id_str = str(client["_id"])
                art_res = await db.articles.update_many({"client_id": old_id_str}, {"$set": {"client_id": new_id}})
                logger.info(f"Updated {art_res.modified_count} articles for client {new_id}")
                clients_count += 1
        logger.info(f"Repaired {clients_count} clients.")

        # 2. Repair Chat Sessions
        sessions_count = 0
        async for session in db.chat_sessions.find({}):
            needs_update = False
            update_fields = {}
            
            if "id" not in session:
                new_id = str(uuid.uuid4())
                update_fields["id"] = new_id
                needs_update = True
                logger.info(f"Repairing session '{session.get('title', 'Untitled')}': assigning ID {new_id}")
            
            # Ensure client_id in session is a UUID if possible
            curr_client_id = session.get("client_id")
            if curr_client_id and len(curr_client_id) == 24: # Looks like ObjectId string
                try:
                    c_doc = await db.clients.find_one({"_id": ObjectId(curr_client_id)})
                    if c_doc and c_doc.get("id"):
                        update_fields["client_id"] = c_doc["id"]
                        needs_update = True
                        logger.info(f"Updating session {session.get('id', 'new')} with new client_id UUID")
                except: pass

            if needs_update:
                await db.chat_sessions.update_one({"_id": session["_id"]}, {"$set": update_fields})
                sessions_count += 1
        logger.info(f"Repaired {sessions_count} sessions.")

        logger.info("--- Database Repair Finished Successfully ---")
    except Exception as e:
        logger.error(f"FATAL ERROR DURING REPAIR: {e}", exc_info=True)

if __name__ == "__main__":
    asyncio.run(repair_database())
