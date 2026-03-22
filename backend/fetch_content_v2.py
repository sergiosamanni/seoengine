import asyncio
import motor.motor_asyncio
import os

async def main():
    client = motor.motor_asyncio.AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["seoengine"]
    
    article = await db.articles.find_one({"id": "c5c2f992-4754-4b83-973b-a018e1997571"})
    
    if article:
        content = article.get('contenuto', '')
        # Save to workspace
        target_path = "/Users/sergiosamanni/.gemini/antigravity/scratch/seoengine/backend/tmp_landing_content.html"
        with open(target_path, 'w') as f:
            f.write(content)
        print(f"Content saved to {target_path}")
    else:
        print("Article not found")

if __name__ == "__main__":
    asyncio.run(main())
