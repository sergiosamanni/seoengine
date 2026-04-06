import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def check_plans():
    mongo_url = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongo_url)
    db = client["seoengine"]
    
    # List all plans
    plans = await db.editorial_plans.find({}, {"client_id": 1}).to_list(100)
    print("ALL PLANS IN DB:")
    for p in plans:
        # Get client name
        client_doc = await db.clients.find_one({"id": p["client_id"]})
        name = client_doc["nome"] if client_doc else "Unknown"
        print(f"- {name} ({p['client_id']})")
    
    # Check Diseko specifically
    diseko = await db.clients.find_one({"nome": {"$regex": "Diseko", "$options": "i"}})
    if diseko:
        print(f"\nFOUND DISEKO: {diseko['id']}")
        plan = await db.editorial_plans.find_one({"client_id": diseko["id"]})
        if plan:
            print(f"PLAN FOUND for Diseko: {len(plan.get('topics', []))} topics")
        else:
            print("PLAN NOT FOUND for Diseko")
    else:
        print("\nDISEKO CLIENT NOT FOUND")

if __name__ == "__main__":
    asyncio.run(check_plans())
