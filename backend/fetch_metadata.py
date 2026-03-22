import asyncio
import motor.motor_asyncio
import os

async def main():
    client = motor.motor_asyncio.AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["seoengine"]
    
    article = await db.articles.find_one({"id": "c5c2f992-4754-4b83-973b-a018e1997571"})
    
    if article:
        print(f"Image URL: {article.get('image_url')}")
        print(f"Report: {article.get('report')}")
        
        client_doc = await db.clients.find_one({"id": article['client_id']})
        if client_doc:
            wp = client_doc.get('configuration', {}).get('wordpress', {})
            print(f"WP URL: {wp.get('url_api')}")
            print(f"WP User: {wp.get('utente')}")
    else:
        print("Article not found")

if __name__ == "__main__":
    asyncio.run(main())
