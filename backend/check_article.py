import asyncio
import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

async def check_article():
    load_dotenv()
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    
    slug = "sedie-e-tavoli-pieghevoli-per-noleggio-guida-alla-scelta-per-massima-efficienza"
    client_id = "de7cb45c-99e3-4665-bda2-3daeb1a0ba96"
    
    article = await db.articles.find_one({
        "client_id": client_id,
        "wordpress_link": {"$regex": slug}
    })
    
    if article:
        print(f"Article found: {article.get('id')}")
        print(f"WP Post ID: {article.get('wordpress_post_id')}")
        print(f"Stato: {article.get('stato')}")
    else:
        print("Article not found in database.")

if __name__ == "__main__":
    asyncio.run(check_article())
