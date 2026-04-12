import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def check_chat():
    load_dotenv()
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    
    client_id = "de7cb45c-99e3-4665-bda2-3daeb1a0ba96"
    
    session = await db.chat_sessions.find_one({
        "client_id": client_id
    }, sort=[("updated_at", -1)])
    
    if session:
        print(f"Latest Session: {session.get('id')}")
        print(f"Title: {session.get('title')}")
        messages = session.get("messages", [])
        print(f"Message Count: {len(messages)}")
        if messages:
            last_msg = messages[-1]
            print(f"Last Role: {last_msg['role']}")
            print(f"Last Content Excerpt: {last_msg['content'][:200]}...")
    else:
        print("No chat sessions found for this client.")

if __name__ == "__main__":
    asyncio.run(check_chat())
