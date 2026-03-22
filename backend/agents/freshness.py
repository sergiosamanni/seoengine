import json
import logging
from typing import Dict, Any, List, Optional
from .base import BaseAgent

logger = logging.getLogger("agents")

class FreshnessAgent(BaseAgent):
    """
    Agent responsible for analyzing existing content and proposing updates
    based on current SERP trends and GSC performance data.
    """
    
    def __init__(self, client_id: str, llm_config: Dict[str, Any]):
        super().__init__(name="FreshnessAnalyst", client_id=client_id, llm_config=llm_config)
    
    async def analyze_and_suggest(self, 
                                  current_title: str, 
                                  current_content: str, 
                                  gsc_data: Optional[Dict], 
                                  serp_data: Optional[Dict],
                                  kb: Dict[str, Any]) -> Dict[str, Any]:
        """
        Infers the keyword and suggests improvements.
        """
        await self.log("running", {"article": current_title})
        
        system_prompt = """Sei un SEO Content Specialist esperto in 'Content Freshness'.
Il tuo compito è analizzare un articolo esistente e suggerire come migliorarlo per scalare la SERP.

PROCESSO:
1. Identifica la Keyword Target principale basandoti sul testo.
2. Analizza i dati GSC (se forniti) per capire come si sta posizionando.
3. Analizza i Competitor in SERP (se forniti) per identificare lacune di contenuto o nuovi angle.
4. Proponi modifiche concrete: paragrafi da aggiungere, titoli da cambiare, link interni da inserire.

RISPONDI ESCLUSIVAMENTE IN JSON:
{
  "inferred_keyword": "...",
  "status_analysis": "Breve analisi delle performance attuali",
  "serp_gaps": "Cosa hanno i competitor che noi non abbiamo?",
  "suggestions": [
     {"type": "content_update", "description": "..."},
     {"type": "new_section", "title": "...", "content_brief": "..."},
     {"type": "seo_improvement", "description": "..."}
  ],
  "estimated_impact": "Alto/Medio/Basso"
}
"""

        user_prompt = f"""DATI ARTICOLO:
Titolo: {current_title}
Contenuto (estratto): {current_content[:2000]}

GSC DATA:
{json.dumps(gsc_data, indent=2) if gsc_data else "Non disponibili"}

SERP COMPETITORS (Titles & Headings):
{json.dumps(serp_data, indent=2) if serp_data else "Non disponibili"}

KNOWLEDGE BASE:
{json.dumps(kb, indent=2)}
"""

        try:
            raw_response = await self.chat(system_prompt, user_prompt)
            import re
            json_match = re.search(r'\{.*\}', raw_response, re.DOTALL)
            if json_match:
                result = json.loads(json_match.group(0))
                await self.log("success", {"keyword": result.get("inferred_keyword")})
                return result
            else:
                raise ValueError("No JSON found in LLM response")
        except Exception as e:
            await self.log("failed", {"error": str(e)})
            return {"error": str(e)}
    async def apply_suggestion(self, current_content: str, suggestion: Dict[str, Any], kb: Dict[str, Any]) -> str:
        """
        Actually applies a specific suggestion to the content by rewriting/editing it.
        """
        await self.log("running_apply", {"type": suggestion.get("type")})
        
        system_prompt = """Sei un Senior SEO Content Editor e Copywriter esperto. 
Il tuo obiettivo è trasformare i suggerimenti (automatici o istruzioni manuali) in modifiche perfette all'interno di un articolo esistente.

REGOLE CRITICHE:
1. INTEGRITÀ DEL TESTO: NON cancellare, riassumere o troncare l'articolo originale a meno che non sia ESPLICITAMENTE richiesto dal comando. Se l'utente chiede di aggiungere un paragrafo, l'80-90% del testo originale deve rimanere IDENTICO.
2. NO LAZYNESS: Restituisci ogni singola riga dell'articolo, dall'inizio alla fine. Non saltare parti con commenti come "[...resto del testo...]".
3. TONO DI VOCE: Mantieni rigorosamente lo stile e il tono dell'articolo originale (KB: {kb.get('palette', 'N/A')}).
4. CONTESTO: Comprendi l'argomento profondo e agisci come un esperto del settore.
5. SPECIFICITÀ: Esegui il comando come un'operazione chirurgica. Se l'utente chiede di modificare X, modifica SOLO X e lascia invariato tutto il resto.
6. FORMATO: Mantieni tutti i tag HTML (p, h2, h3, ul, li, strong, ecc.) originali.
7. PULIZIA: Restituisci SOLO il contenuto dell'articolo. Niente introduzioni, niente "Ecco il testo", niente "Ho applicato le modifiche". Solo il corpo del post.
"""

        is_manual = suggestion.get('type') == 'manual_edit'
        
        user_prompt = f"""
### CONTESTO CLIENTE (Knowledge Base):
{json.dumps(kb, indent=2)}

### ARTICOLO ORIGINALE (HTML):
{current_content}

### TIPO DI MODIFICA: {"ISTRUZIONE MANUALE DELL'UTENTE" if is_manual else "SUGGERIMENTO AUTOMATICO AI"}
{"L'utente ha ordinato:" if is_manual else "Dettaglio Suggerimento:"}
> {suggestion.get('description') or suggestion.get('content_brief') or "Nessun dettaglio"}

{f"Titolo suggerito: {suggestion.get('title')}" if suggestion.get('title') else ""}

### ISTRUZIONE OPERATIVA:
Agisci come un esperto Copywriter. Prendi il comando sopra ed eseguilo con precisione maniacale sul testo originale. 
Sia che si tratti di aggiungere sezioni, riscrivere parti o correggere errori, assicurati che il risultato finale sia pronto per la pubblicazione e indistinguibile da un testo scritto da un umano esperto SEO.

RESTITUISCI L'INTERO ARTICOLO AGGIORNATO:
"""

        try:
            updated_content = await self.chat(system_prompt, user_prompt)
            await self.log("success_apply")
            return updated_content.strip()
        except Exception as e:
            await self.log("failed_apply", {"error": str(e)})
            raise e
