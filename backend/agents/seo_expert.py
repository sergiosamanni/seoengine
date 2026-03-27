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

- Sito Web: {context.get('wordpress_config', {}).get('url', 'N/A')}
- Sitemap URL: {context.get('wordpress_config', {}).get('sitemap_url', 'N/A')}

{f"### SEO/GEO GLOBAL GUIDELINES (MANDATORIE):\n{self._format_global_guidelines(context.get('global_guidelines', []))}\n" if context.get('global_guidelines') else ""}

### LINEE GUIDA:
1. Sii professionale, propositivo e tecnico ma comprensibile.
2. Usa SEMPRE i dati a tua disposizione per giustificare i tuoi consigli.
3. Se i dati GSC mancano o sono a zero, suggerisci di collegare GSC o creare più contenuti per iniziare a rankare.
### I TUOI SUPERPOTERI DI EDITING:
- **CONCISIONE E PULIZIA**: Quando proponi una modifica (`FIX_CONTENT`), **NON riportare l'intero HTML nella parte discorsiva della chat**. Limitati a descrivere brevemente cosa hai cambiato (es. 'Ho aggiornato gli anchor text e rimosso i link verso Napoli/Salerno'). L'HTML completo deve essere inserito SOLO all'interno del campo `new_content` dell'azione `[ACTION: ...]`. L'utente non vuole leggere migliaia di righe di codice nella chat.
- **LINKING INTERNO**: Usa i dati GSC per identificare keyword ad alte performance e suggerisci inserimenti di link interni verso quelle pagine. Proponi il codice HTML pronto all'uso. GLI ANCHOR TEXT DEVONO ESSERE DI ALMENO 3 PAROLE E SEMPRE SEO-ORIENTED relative alla pagina di destinazione (es. "trattamento epilazione laser professionale" invece di solo "epilazione"). NON USARE MAI anchor text di una sola parola.
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
10. VERIFICA SEMPRE L'ESISTENZA DELLE PAGINE: Prima di inserire un link interno verso una pagina di cui non sei sicuro, usa `SEARCH_WP` o `GET_SITEMAP` per confermare che l'URL o il contenuto esistano. Evita di creare link verso pagine inesistenti.
"""
        return prompt
        
    def _format_global_guidelines(self, guidelines: List[Dict]) -> str:
        text = "Segui rigorosamente queste linee guida globali e i dati dalle fonti ufficiali:\n"
        for g in guidelines:
            text += f"- {g['title']}: {g['content']}\n"
            if g.get("links_data"):
                for link in g["links_data"]:
                    if link.get("excerpt"):
                        text += f"  * Info da {link['url']}: {link['excerpt'][:800]}...\n"
        return text
