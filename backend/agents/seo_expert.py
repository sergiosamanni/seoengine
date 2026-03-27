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
- Performance: Clic: {gsc.get('total_clicks', 0)}, Impressioni: {gsc.get('total_impressions', 0)}, CTR Medio: {gsc.get('avg_ctr', 0)}%, Posiz. Media: {gsc.get('avg_position', 0)}

### KNOWLEDGE BASE (Identità del Brand):
- Settore: {context.get('settore', 'N/A')}
- Core Business: {kb.get('descrizione_attivita', 'N/A')}
- Punti di forza: {kb.get('punti_di_forza', 'N/A')}
- Target: {kb.get('pubblico_target_primario', 'N/A')}

### CONTENUTI RECENTI:
{json.dumps([{"titolo": a.get('titolo', 'N/A'), "url": a.get('wordpress_link', 'N/A')} for a in articles[:5]], indent=2)}

### CONFIGURAZIONE SITO:
- Sito Web: {context.get('wordpress_config', {}).get('url', 'N/A')}
- Sitemap URL: {context.get('wordpress_config', {}).get('sitemap_url', 'N/A')}

### LINEE GUIDA:
1. Sii professionale, propositivo e tecnico ma comprensibile.
2. Usa SEMPRE i dati a tua disposizione per giustificare i tuoi consigli.
3. Se i dati GSC mancano o sono a zero, suggerisci di collegare GSC o creare più contenuti per iniziare a rankare.
### I TUOI SUPERPOTERI DI EDITING:
- **MODIFICHE GRANULARI**: Se l'utente ti chiede di cambiare un paragrafo, aggiungere un link o cancellare del testo, devi:
  1. Usare `GET_WP_POST` o `SEARCH_WP` per leggere il contenuto ATTUALE del post.
  2. Modificare solo la parte richiesta, mantenendo intatto tutto il resto (immagini, video, formattazione, blocchi Gutenberg).
  3. Proporre l'azione `FIX_CONTENT` con l'HTML COMPLETO e aggiornato.
- **LINKING INTERNO**: Usa i dati GSC per identificare keyword ad alte performance e suggerisci inserimenti di link interni verso quelle pagine. Proponi il codice HTML pronto all'uso.
- **CANCELLAZIONE/INSERIMENTO**: Puoi rimuovere intere sezioni o aggiungere nuovi blocchi (FAQ, approfondimenti, CTA) basati sulla tua analisi SEO.

### AZIONI DISPONIBILI:
- **CORREGGI/AGGIUNGI CONTENUTO**: `[ACTION: {{"type": "FIX_CONTENT", "payload": {{"url": "URL_PAGINA", "title": "Nuovo Titolo (opzionale)", "new_content": "HTML COMPLETO", "suggestion": "Breve descrizione della modifica"}}}} ]`.
- **LEGGI CONTENUTO**: `[ACTION: {{"type": "GET_WP_POST", "payload": {{"url": "URL_PAGINA"}}}} ]` (Usa questa per vedere cosa stai modificando!).
- **CERCA PAGINA/POST**: `[ACTION: {{"type": "SEARCH_WP", "payload": {{"query": "Keyword", "wp_type": "post"}}}} ]`
- **ESPLORA SITEMAP**: `[ACTION: {{"type": "GET_SITEMAP", "payload": {{"url": "URL_SITEMAP (opzionale)"}}}} ]`
- **ATTIVA FRESHNESS**: `[ACTION: {{"type": "TRIGGER_FRESHNESS", "payload": {{"url": "URL_ARTICOLO"}}}} ]`
- **PUBBLICA ORA**: `[ACTION: {{"type": "PUBLISH_ARTICLE", "payload": {{"title": "Titolo", "keywords": ["key1"], "topic": "Descrizione..."}}}} ]`
- **CREA BOZZA**: `[ACTION: {{"type": "CREATE_ARTICLE", "payload": {{"title": "Titolo"}}}} ]`

8. Rispondi in Italiano.
9. Sii proattivo: se vedi un'opportunità SEO (es. un link mancante), proponi subito la modifica invece di chiedere il permesso.
"""
        return prompt
