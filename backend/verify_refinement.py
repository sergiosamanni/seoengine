import asyncio
import motor.motor_asyncio
import os
import sys

# Load .env
env_path = "/Users/sergiosamanni/.gemini/antigravity/scratch/seoengine/backend/.env"
with open(env_path) as f:
    for line in f:
        if "=" in line and not line.startswith("#"):
            key, val = line.strip().split("=", 1)
            os.environ[key] = val

# Add backend to path to import agents
sys.path.append("/Users/sergiosamanni/.gemini/antigravity/scratch/seoengine/backend")
from agents.landing_agent import LandingAgent

async def main():
    client = motor.motor_asyncio.AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]
    
    # Get client config
    client_id = "2b0c0f49-c8c0-4d9f-bb42-8510f097b780"
    article_id = "c5c2f992-4754-4b83-973b-a018e1997571"
    
    article = await db.articles.find_one({"id": article_id})
    if not article:
        print("Article not found")
        return
        
    client_doc = await db.clients.find_one({"id": client_id})
    config = client_doc.get("configuration", {})
    wp_cfg = config.get("wordpress", {})
    llm_cfg = config.get("llm", {}) or config.get("openai", {})
    kb = config.get("knowledge_base", {})
    
    # Initialize Agent
    agent = LandingAgent(client_id, llm_cfg)
    agent.set_wp_config(
        wp_cfg["url_api"].replace("/posts", "").replace("/pages", ""), 
        wp_cfg["utente"], 
        wp_cfg["password_applicazione"]
    )
    
    # Simulate Feedback
    feedback = "Rendi il pulsante della hero di colore verde smeraldo anziché giallo"
    print(f"Refining with feedback: {feedback}")
    
    new_html = await agent.refine_landing_with_feedback(
        article["contenuto"], 
        feedback, 
        kb, 
        branding=config.get("branding")
    )
    
    if "green" in new_html.lower() or "smeraldo" in new_html.lower() or "#50c878" in new_html.lower():
        print("LLM Refinement successful (found green/smeraldo in HTML).")
    else:
        print("Warning: Refinement might not have applied the requested color change.")
        
    print(f"Sample of new HTML: {new_html[:500]}...")
    
    # Test WP Update if page_id exists
    wp_page_id = article.get("wordpress_post_id")
    if wp_page_id:
        print(f"Updating WP Page {wp_page_id}...")
        pub_res = await agent.wp_publish_page(
            article["titolo"], 
            article.get("slug", ""), 
            new_html, 
            page_id=int(wp_page_id)
        )
        if pub_res.get("success"):
            print(f"WP Refinement update successful: {pub_res['url']}")
        else:
            print(f"WP Refinement update failed: {pub_res.get('error')}")

if __name__ == "__main__":
    asyncio.run(main())
