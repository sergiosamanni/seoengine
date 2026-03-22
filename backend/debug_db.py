
import asyncio
import os
import motor.asyncio
from dotenv import load_dotenv

async def check_db():
    load_dotenv()
    mongo_url = os.getenv('MONGO_URL', 'mongodb://localhost:27017')
    db_name = os.getenv('DB_NAME', 'seoengine')
    
    print(f"Connecting to {mongo_url}, DB: {db_name}")
    client = motor.asyncio.AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    
    articles = await db.articles.find().sort('created_at', -1).limit(5).to_list(5)
    
    if not articles:
        print("No articles found.")
        return

    print("\nLAST 5 ARTICLES:")
    for a in articles:
        print(f"---")
        print(f"ID: {a.get('id')}")
        print(f"Title: {a.get('titolo')}")
        print(f"Status: {a.get('stato')}")
        print(f"WP ID: {a.get('wordpress_post_id')}")
        print(f"WP Link: {a.get('wordpress_link')}")
        print(f"Report length: {len(a.get('report', ''))}")
        if a.get('stato') == 'failed':
            print(f"Content snippet: {a.get('contenuto', '')[:100]}")

if __name__ == "__main__":
    asyncio.run(check_db())
