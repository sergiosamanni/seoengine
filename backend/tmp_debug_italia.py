import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def find_client():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client.seoengine
    c = await db.clients.find_one({"nome": {"$regex": "italiarentalsi", "$options": "i"}}, {"_id": 0, "id": 1, "nome": 1})
    if c:
        print(f"ID: {c['id']}, NOME: {c['nome']}")
        # Now find tasks for this client related to that URL
        target_url = "https://italiarentalsi.it/noleggio-lungo-termine-renault-migliori-offerte-e-vantaggi/"
        tasks = await db.autopilot_tasks.find({"client_id": c['id'], "params.target_url": target_url}).to_list(10)
        for t in tasks:
            print(f"TASK: {t.get('id')}, TYPE: {t.get('type')}, STATUS: {t.get('status')}")
            print(f"STATE: {t.get('state')}")
    else:
        print("None")
    await client.close()

if __name__ == "__main__":
    asyncio.run(find_client())
