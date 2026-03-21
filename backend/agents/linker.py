import json
from .base import BaseAgent

class LinkerAgent(BaseAgent):
    """
    Agent responsible for indexing WordPress content and suggesting
    internal links for new articles.
    """
    
    def __init__(self, client_id: str, llm_config: dict):
        super().__init__(name="Linker", client_id=client_id, llm_config=llm_config)
        
    async def suggest_links(self, new_article_content: str, site_index: list) -> list:
        """
        Suggests relevant internal links for the given new content.
        """
        await self.log("running", {"index_size": len(site_index)})
        
        system_prompt = """Sei un Senior SEO Specialist esperto di Architettura dell'Informazione e Linking Interno.
Il tuo compito è analizzare nuovi contenuti e suggerire link interni strategici verso pagine esistenti per migliorare il posizionamento e l'indicizzazione.

REGOLE PROFESSIONALI PER GLI ANCHOR TEXT:
1. BREVITÀ: L'anchor text deve essere di massimo 5 parole.
2. PERTINENZA: Evita frasi vaghe o clickbait come "clicca qui" o "scopri di più". L'anchor text deve descrivere chiaramente l'argomento della pagina di destinazione.
3. OTTIMIZZAZIONE: Usa anchor text ricchi di parole chiave (keyword-rich). L'esatta corrispondenza (exact-match) è accettabile se naturale, ma evita il keyword stuffing.
4. VARIAZIONE: Usa variazioni naturali della keyword principale della pagina di destinazione (es: se la pagina è "Migliori macchine caffè", usa anche "macchine espresso migliori" o "macchine da caffè per casa").

REGOLE STRATEGICHE:
1. TOPIC SIMILARITY: Suggerisci link solo verso pagine che trattano argomenti simili o correlati. Non linkare post a caso.
2. STRUTTURA: Verifica che l'URL fornita sia presente nell'indice del sito.
3. QUANTITÀ: Suggerisci 3-5 link interni di alta qualità per articolo.

RISPONDI ESCLUSIVAMENTE IN JSON:
{
  "suggestions": [
    {
      "url": "https://sito.it/pagina-destinazione",
      "anchor_text": "Variante Keyword Strategica",
      "contesto": "Il paragrafo originale dove inserire il link (il link deve essere naturale nel flusso della frase)"
    }
  ]
}
"""
        # Limit index size for context window if needed
        trimmed_index = site_index[:30] # Top 30 posts for now
        
        user_prompt = f"""NUOVO ARTICOLO DA LINKARE:
{new_article_content}

INDICE DEL SITO (Pagine esistenti):
{json.dumps(trimmed_index, indent=2)}
"""

        try:
            raw_response = await self.chat(system_prompt, user_prompt)
            import re
            json_match = re.search(r'\{.*\}', raw_response, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group(0))
                suggestions = data.get("suggestions", [])
                await self.log("success", {"links_suggested": len(suggestions)})
                return suggestions
            return []
        except Exception as e:
            await self.log("failed", {"error": str(e)})
            return []

    async def suggest_inbound_links(self, 
                                    new_article_title: str, 
                                    new_article_url: str, 
                                    new_article_keyword: str, 
                                    site_index: list) -> list:
        """
        Suggests which existing pages should link TO the new article.
        """
        await self.log("running_inbound", {"index_size": len(site_index)})
        
        system_prompt = """Sei un Senior SEO Specialist. Il tuo compito è il "Reverse Internal Linking".
Hai appena pubblicato un NUOVO ARTICOLO e devi decidere quali pagine ESISTENTI del sito dovrebbero linkarlo per spingerlo in SERP.

REGOLE PER INBOUND LINKS:
1. SELEZIONE: Scegli 2-3 pagine esistenti dall'indice che siano tematicamente correlate al nuovo articolo.
2. ANCHOR TEXT: Usa anchor text brevi (max 5 parole), keyword-rich e naturali.
3. VARIANTI: Diversifica gli anchor text tra i vari link suggeriti.
4. POSIZIONAMENTO: Individua il concetto o la frase nelle pagine esistenti dove il link si inserirebbe meglio.

RISPONDI ESCLUSIVAMENTE IN JSON:
{
  "inbound_suggestions": [
    {
      "existing_page_url": "...",
      "existing_page_title": "...",
      "suggested_anchor_text": "...",
      "reason": "Perché questa pagina è correlata?"
    }
  ]
}
"""
        user_prompt = f"""NUOVO ARTICOLO PUBBLICATO:
Titolo: {new_article_title}
URL: {new_article_url}
Keyword: {new_article_keyword}

INDICE DEL SITO (Pagine da cui far partire il link):
{json.dumps(site_index[:40], indent=2)} 
"""
        try:
            raw_response = await self.chat(system_prompt, user_prompt)
            import re
            json_match = re.search(r'\{.*\}', raw_response, re.DOTALL)
            if json_match:
                data = json.loads(json_match.group(0))
                suggestions = data.get("inbound_suggestions", [])
                await self.log("success_inbound", {"links_suggested": len(suggestions)})
                return suggestions
            return []
        except Exception as e:
            await self.log("failed_inbound", {"error": str(e)})
            return []
