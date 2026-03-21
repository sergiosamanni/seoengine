import logging
from typing import Dict, Any, Optional
from helpers import generate_with_llm, log_activity

logger = logging.getLogger("agents")

class BaseAgent:
    """
    Base class for all AI agents in SEO Engine.
    Provides shared methods for LLM interaction and activity logging.
    """
    
    def __init__(self, name: str, client_id: str, llm_config: Dict[str, Any]):
        self.name = name
        self.client_id = client_id
        self.llm_config = llm_config
    
    async def chat(self, system_prompt: str, user_prompt: str) -> str:
        """Helper to call LLM with agent's config."""
        try:
            response = await generate_with_llm(
                provider=self.llm_config.get("provider", "openai"),
                api_key=self.llm_config.get("api_key"),
                model=self.llm_config.get("model") or self.llm_config.get("modello") or "gpt-4-turbo-preview",
                temperature=self.llm_config.get("temperature") or self.llm_config.get("temperatura") or 0.7,
                system_prompt=system_prompt,
                user_prompt=user_prompt
            )
            return response
        except Exception as e:
            logger.error(f"Agent {self.name} failed to chat: {str(e)}")
            await self.log("error", {"error": str(e), "context": "llm_chat"})
            raise e

    async def log(self, status: str, details: Optional[Dict[str, Any]] = None):
        """Standardized logging for agent activities."""
        await log_activity(
            client_id=self.client_id,
            action=f"agent_{self.name.lower()}",
            status=status,
            details=details
        )
