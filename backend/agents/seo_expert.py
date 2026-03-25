import json
import logging
from typing import Dict, Any, List
from .base import BaseAgent

logger = logging.getLogger("agents")

class SEOExpertAgent(BaseAgent):
    """
    Advanced SEO Agent with access to GSC, Knowledge Base, and Site Content.
    Designed for interactive chat and strategic advisory.
    """
    
    def __init__(self, client_id: str, llm_config: dict):
        super().__init__(name="SEOExpert", client_id=client_id, llm_config=llm_config)
        
    async def get_response(self, context: Dict[str, Any], message_history: List[Dict[str, str]], user_message: str) -> str:
        """
        Generates a context-aware response to a user query.
        """
        system_prompt = self._build_system_prompt(context)
        
        # Format history for the chat model
        # We assume generate_with_llm can handle a list of messages or we format it into a single prompt string
        # BaseAgent.chat uses a single system/user prompt. We'll adapt it here.
        
        full_user_prompt = "Ecco la cronologia della conversazione:\n"
        for msg in message_history[-10:]: # Last 10 messages for context
            full_user_prompt += f"{msg['role'].upper()}: {msg['content']}\n"
        
        full_user_prompt += f"\nUTENTE: {user_message}\nESPERTO SEO:"
        
        return await self.chat(system_prompt, full_user_prompt)

    def _build_system_prompt(self, context: Dict[str, Any]) -> str:
        client_name = context.get("client_name", "il cliente")
        kb = context.get("knowledge_base", {})
        gsc = context.get("gsc_summary", {})
        articles = context.get("recent_articles", [])
        
        prompt = f"""Sei un Esperto SEO Senior e Consulente Strategico per {client_name}.
Il tuo obiettivo è fornire consigli pratici, basati sui dati e orientati ai risultati per migliorare la visibilità organica del sito.

Hai accesso ai seguenti dati in tempo reale:

### DATI GOOGLE SEARCH CONSOLE (Ultimi 30 giorni):
- Keyword principali: {json.dumps(gsc.get('top_keywords', []), indent=2)}
- Performance: Clic: {gsc.get('total_clicks')}, Impressioni: {gsc.get('total_impressions')}, CTR Medio: {gsc.get('avg_ctr')}%

### KNOWLEDGE BASE (Identità del Brand):
- Settore: {context.get('settore')}
- Core Business: {kb.get('descrizione_attivita')}
- Punti di forza: {kb.get('punti_di_forza')}
- Target: {kb.get('pubblico_target_primario')}

### CONTENUTI RECENTI:
{json.dumps([{"titolo": a['titolo'], "url": a.get('wordpress_link')} for a in articles[:5]], indent=2)}

### LINEE GUIDA:
1. Sii professionale, propositivo e tecnico ma comprensibile.
2. Usa SEMPRE i dati a tua disposizione per giustificare i tuoi consigli.
3. Se l'utente chiede come sta andando una keyword, guarda i dati GSC.
4. Se l'utente chiede idee per nuovi contenuti, usa la Knowledge Base e GSC per suggerire topic rilevanti.
5. Incoraggia l'uso delle funzioni "Autopilot" e "Freshness" della piattaforma quando opportuno.
6. Rispondi in Italiano.
"""
        return prompt
