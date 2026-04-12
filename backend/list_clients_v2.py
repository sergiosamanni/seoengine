import asyncio
import os
import sys
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def run():
    print("Starting client list...")
    sys.stdout.flush()
    try:
        load_dotenv()
        url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
        print(f"Connecting to {url}...")
        sys.stdout.flush()
        
        client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=5000)
        db = client[os.environ.get("DB_NAME", "seoengine")]
        
        print("Fetching clients...")
        sys.stdout.flush()
        clients = await db.clients.find({}, {"nome": 1, "id": 1}).to_list(length=100)
        
        print(f"Found {len(clients)} clients:")
        for c in clients:
            print(f"- {c.get('nome')}: {c.get('id')}")
        sys.stdout.flush()
    except Exception as e:
        print(f"Error: {e}")
        sys.stdout.flush()

if __name__ == "__main__":
    asyncio.run(run())
