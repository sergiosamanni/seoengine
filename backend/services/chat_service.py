import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from database import db
from agents.seo_expert import SEOExpertAgent

from services.gsc_service import GSCService

logger = logging.getLogger("server")

class ChatService:
    @staticmethod
    async def create_session(client_id: str, user_id: str, title: str = "Nuova Conversazione") -> str:
        session_id = str(uuid.uuid4())
        session = {
            "id": session_id,
            "client_id": client_id,
            "user_id": user_id,
            "title": title,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "messages": []
        }
        await db.chat_sessions.insert_one(session)
        return session_id

    @staticmethod
    async def get_sessions(client_id: str, user_id: str = None) -> List[Dict]:
        query = {"client_id": client_id}
        if user_id:
            query["user_id"] = user_id
        
        sessions = await db.chat_sessions.find(query, {"_id": 0, "messages": 0}).sort("updated_at", -1).to_list(100)
        return sessions

    @staticmethod
    async def get_session_messages(session_id: str) -> List[Dict]:
        session = await db.chat_sessions.find_one({"id": session_id}, {"messages": 1, "_id": 0})
        if not session:
            return []
        return session.get("messages", [])

    @staticmethod
    async def process_user_message(client_id: str, session_id: str, user_id: str, content: str) -> Dict[str, Any]:
        session = await db.chat_sessions.find_one({"id": session_id})
        if not session:
            raise ValueError("Sessione non trovata")
            
        client = await db.clients.find_one({"id": client_id})
        if not client:
            raise ValueError("Cliente non trovato")
            
        config = client.get("configuration", {})
        
        # 1. Gather context
        context = await ChatService._gather_context(client_id, client, config)
        
        # 2. Setup Agent
        agent = SEOExpertAgent(client_id=client_id, llm_config=config.get("llm", {}) or config.get("openai", {}))
        
        # 3. Get AI Response
        history = session.get("messages", [])
        ai_response = await agent.get_response(context, history, content)
        
        # 4. Save messages
        user_msg = {
            "role": "user",
            "content": content,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_id": user_id
        }
        ai_msg = {
            "role": "assistant",
            "content": ai_response,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "metadata": {"context_used": True}
        }
        
        await db.chat_sessions.update_one(
            {"id": session_id},
            {
                "$push": {"messages": {"$each": [user_msg, ai_msg]}},
                "$set": {"updated_at": datetime.now(timezone.utc).isoformat(), "last_message": content[:50]}
            }
        )
        
        return ai_msg

    @staticmethod
    async def _gather_context(client_id: str, client: Dict, config: Dict) -> Dict[str, Any]:
        """Collects relevant data for the SEO Expert."""
        # Use centralized GSC Service
        gsc_summary = await GSCService.get_performance_summary(client_id)
        
        # Fetch latest articles
        recent_articles = await db.articles.find(
            {"client_id": client_id, "stato": "published"}, 
            {"_id": 0, "titolo": 1, "wordpress_link": 1}
        ).sort("published_at", -1).limit(5).to_list(5)
        
        context = {
            "client_name": client.get("nome"),
            "settore": client.get("settore"),
            "knowledge_base": config.get("knowledge_base", {}),
            "gsc_summary": gsc_summary,
            "recent_articles": recent_articles
        }
        return context

