import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def check_wp_config():
    load_dotenv()
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    
    client_id = "de7cb45c-99e3-4665-bda2-3daeb1a0ba96"
    client_doc = await db.clients.find_one({"id": client_id})
    
    if client_doc:
        wp = client_doc.get("configuration", {}).get("wordpress", {})
        print(f"URL: {wp.get('url_api')}")
        print(f"User: {wp.get('utente')}")
        print(f"Status: {wp.get('stato_pubblicazione')}")
        print(f"Has Password: {bool(wp.get('password_applicazione'))}")
    else:
        print("Client not found.")

if __name__ == "__main__":
    asyncio.run(check_wp_config())
