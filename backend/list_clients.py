import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient

async def list_clients():
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    clients = await db.clients.find().to_list(length=100)
    for c in clients:
        print(c.get("nome"), c.get("id"))

asyncio.run(list_clients())
