import asyncio
import os
import json
from motor.motor_asyncio import AsyncIOMotorClient
from bson import json_util

async def diagnose_diseko():
    # Try common MONGO_URLs
    urls = [
        os.environ.get("MONGO_URL"),
        "mongodb://localhost:27017",
        "mongodb://127.0.0.1:27017"
    ]
    
    db = None
    for url in urls:
        if not url: continue
        try:
            print(f"Connecting to {url}...")
            client = AsyncIOMotorClient(url, serverSelectionTimeoutMS=2000)
            await client.admin.command('ping')
            db = client["seoengine"]
            print("Connected successfully!")
            break
        except Exception as e:
            print(f"Failed to connect to {url}: {e}")

    if not db:
        print("COULD NOT CONNECT TO ANY DATABASE")
        return

    # Find Diseko
    diseko = await db.clients.find_one({"nome": {"$regex": "Diseko", "$options": "i"}})
    if not diseko:
        print("CLIENT 'Diseko' NOT FOUND")
        # List first 5 clients to see what we have
        all_clients = await db.clients.find({}, {"nome": 1}).to_list(10)
        print("Available clients:", [c['nome'] for c in all_clients])
        return

    print(f"FOUND CLIENT: {diseko['nome']} (ID: {diseko['id']})")
    
    # Check Plan
    plan = await db.editorial_plans.find_one({"client_id": diseko["id"]})
    if plan:
        print(f"PLAN FOUND: {len(plan.get('topics', []))} topics, Updated at: {plan.get('updated_at')}")
    else:
        print("PLAN NOT FOUND IN 'editorial_plans' collection")

    # Check Configuration (Masking sensitive parts)
    config = diseko.get("configuration", {})
    llm = config.get("llm", {}) or config.get("openai", {})
    has_key = "api_key" in llm and len(llm["api_key"]) > 5
    print(f"LLM Config: Provider: {llm.get('provider')}, Model: {llm.get('model')}, Has Key: {has_key}")
    
    sitemap = config.get("seo", {}).get("sitemap_url")
    print(f"Sitemap URL: {sitemap}")

if __name__ == "__main__":
    asyncio.run(diagnose_diseko())
