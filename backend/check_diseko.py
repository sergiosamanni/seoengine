import motor.motor_asyncio
import asyncio

async def check():
    client = motor.motor_asyncio.AsyncIOMotorClient('mongodb://localhost:27017')
    db = client.seoengine
    try:
        c = await db.clients.find_one({'nome': 'Diseko'})
        if c:
            print(f"Client Diseko Found: {c.get('id')}")
            p = await db.editorial_plans.find_one({'client_id': c.get('id')})
            if p:
                print(f"Editorial Plan Found: {len(p.get('topics', []))} topics")
            else:
                print("Editorial Plan NOT Found for Diseko")
        else:
            print("Client Diseko NOT Found in DB")
    except Exception as e:
        print(f"DB Error: {e}")

if __name__ == "__main__":
    asyncio.run(check())
