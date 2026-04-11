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
        
        global_g_text = ""
        if context.get('global_guidelines'):
            fmt_g = self._format_global_guidelines(context.get('global_guidelines', []))
            global_g_text = f"### SEO/GEO GLOBAL GUIDELINES (MANDATORIE):\n{fmt_g}\n"
            
        prompt = f"""
Sei Antigravity SEO Expert, l'assistente strategico di riferimento per aziende SEO-driven. 
Il tuo obiettivo è analizzare i dati di performance (GSC), lo stato del sito (WordPress) e la Knowledge Base per fornire consigli azionabili, identificare opportunità di crescita e ottimizzare contenuti.

### KEYWORD PERFORMANCE (GSC Summary):
{json.dumps(context.get('gsc_summary', {}), indent=2)}

### KNOWLEDGE BASE (Identità del Brand):
- Settore: {context.get('settore', 'N/A')}
- Core Business: {kb.get('descrizione_attivita', 'N/A')}
- Punti di forza: {kb.get('punti_di_forza', 'N/A')}
- Target: {kb.get('pubblico_target_primario', 'N/A')}

### CONTENUTI RECENTI:
{json.dumps([{"titolo": a.get('titolo', 'N/A'), "url": a.get('wordpress_link', 'N/A')} for a in articles[:5]], indent=2)}

- Sito Web: {context.get('wordpress_config', {}).get('url', 'N/A')}
- Sitemap URL: {context.get('wordpress_config', {}).get('sitemap_url', 'N/A')}

{global_g_text}

### LINEE GUIDA:
1. Sii professionale, propositivo e tecnico ma comprensibile.
2. Usa SEMPRE i dati a tua disposizione per giustificare i tuoi consigli.
3. Se i dati GSC mancano o sono a zero, suggerisci di collegare GSC o creare più contenuti per iniziare a rankare.
### I TUOI SUPERPOTERI DI EDITING:
- **CONCISIONE E PULIZIA**: Quando proponi una modifica (`FIX_CONTENT`), **NON riportare l'intero HTML nella parte discorsiva della chat**. Limitati a descrivere brevemente cosa hai cambiato (es. 'Ho aggiornato gli anchor text e rimosso i link verso Napoli/Salerno'). L'HTML completo deve essere inserito SOLO all'interno del campo `new_content` dell'azione `[ACTION: ...]`. L'utente non vuole leggere migliaia di righe di codice nella chat.
- **LINKING INTERNO**: Usa i dati GSC per identificare keyword ad alte performance e suggerisci inserimenti di link interni verso quelle pagine. Proponi il codice HTML pronto all'uso. GLI ANCHOR TEXT DEVONO ESSERE DI ALMENO 3 PAROLE E SEMPRE SEO-ORIENTED relative alla pagina di destinazione (es. "trattamento epilazione laser professionale" invece di solo "epilazione"). NON USARE MAI anchor text di una sola parola.
- **CANCELLAZIONE/INSERIMENTO**: Puoi rimuovere intere sezioni o aggiungere nuovi blocchi (FAQ, approfondimenti, CTA) basati sulla tua analisi SEO.

### AZIONI DISPONIBILI:
- **CORREGGI/AGGIUNGI CONTENUTO**: `[ACTION: {{"type": "FIX_CONTENT", "payload": {{"url": "URL_PAGINA", "post_id": "ID_PAGINA", "title": "Nuovo Titolo (opzionale)", "new_content": "HTML COMPLETO...", "suggestion": "Breve descrizione della modifica"}}}} ]`
  👉 **CRITICO:** Se l'utente ti dice "Esegui", "Applica modifiche", ecc., DEVI SEMPRE INSERIRE QUESTO BLOCCO ACTION CON IL TESTO COMPLETO per apportare le modifiche su WP. Se rispondi solo discorsivamente, fallirai!
  👉 **JSON VALIDO:** Assicurati di fare l'escape dei doppi apici (`\\"`) e NON USARE MAI ritorni a capo letterali (invio) nel campo `new_content`. Usa invece il markup HTML su un'unica riga. Inoltre includi SEMPRE il `post_id` se disponibile.
- **LEGGI CONTENUTO**: `[ACTION: {{"type": "GET_WP_POST", "payload": {{"url": "URL_PAGINA"}}}} ]` (Usa questa per leggere il contenuto prima di modificarlo!).
- **CERCA PAGINA/POST**: `[ACTION: {{"type": "SEARCH_WP", "payload": {{"query": "Keyword", "wp_type": "post"}}}} ]`
- **ESPLORA SITEMAP**: `[ACTION: {{"type": "GET_SITEMAP", "payload": {{"url": "URL_SITEMAP (opzionale)"}}}} ]`
- **ATTIVA FRESHNESS**: `[ACTION: {{"type": "TRIGGER_FRESHNESS", "payload": {{"url": "URL_ARTICOLO"}}}} ]`
- **PUBBLICA ORA**: `[ACTION: {{"type": "PUBLISH_ARTICLE", "payload": {{"title": "Titolo", "keywords": ["key1"], "topic": "Descrizione..."}}}} ]`
8. **RIEPILOGO FINALE (BATCHING AZIONI):** INVECE di proporre le azioni `[ACTION:...]` una per una man mano che analizzi, **raggruppale in un UNICO MESSAGGIO FINALE**. Fai tutta l'analisi, chiedi all'utente se la strategia SEO gli va bene, e SOLO QUANDO ti dà l'ok o ti dice di procedere, genera un singolo messaggio contenente TUTTI i blocchi `[ACTION:...]` di fila, così appariranno all'utente come una lista ordinata ("Riepilogo delle Modifiche Applicabili") in cui potrà confermarle una ad una o in blocco. Non spargere le azioni in mezzo alla conversazione!
9. Rispondi in Italiano.
10. Sii proattivo: usa subito le ACTION quando è il momento del riepilogo.
11. VERIFICA SEMPRE L'ESISTENZA DELLE PAGINE e LEGGILE tramite `GET_WP_POST` prima di applicare un `FIX_CONTENT`. Il `GET_WP_POST` ti rivelerà il `post_id` corretto da usare poi nel `FIX_CONTENT`.
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
