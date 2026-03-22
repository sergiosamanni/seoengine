import json
from .base import BaseAgent

class StrategistAgent(BaseAgent):
    """
    Agent responsible for analyzing GSC data and Knowledge Base 
    to generate an editorial plan for a client.
    """
    
    def __init__(self, client_id: str, llm_config: dict):
        super().__init__(name="Strategist", client_id=client_id, llm_config=llm_config)
        
    async def generate_plan(self, gsc_data: dict, kb_data: dict, target_keywords: list = None, existing_topics: list = None, num_topics: int = 10) -> list:
        """
        Generates a list of suggested topics/titles based on GSC, KB, and Target Keywords.
        Each topic includes an SEO-optimized outline and an image search query for the cover.
        """
        await self.log("running", {"topics_requested": num_topics})
        
        system_prompt = f"""Sei un SEO Strategist e Content Architect esperto. Il tuo compito è analizzare i dati di Google Search Console (GSC) 
e la Knowledge Base (KB) di un cliente per proporre un piano editoriale di {num_topics} articoli.

Obiettivo: Massimizzare il traffico organico e l'autorevolezza del sito, dando PRIORITÀ alle Keyword Target fornite dal cliente.

IMPORTANTE: Evita duplicati o argomenti già trattati. Ti forniremo un elenco di "Argomenti già trattati" da NON ripetere.

Dati di input:
1. GSC: Elenco di query con impressioni, clic e CTR.
2. KB: Descrizione dell'attività e dei servizi core.
3. Keyword Target: Parole chiave specifiche per cui il cliente VUOLE posizionarsi.
4. Argomenti già trattati: Elenco di titoli o keyword già pubblicati (da evitare).

Regole:
- Se sono fornite "Keyword Target", crea articoli SPECIFICI per queste keyword.
- Identifica anche keyword con "Impressioni elevate ma basso CTR" dai dati GSC.
- Identifica lacune di contenuto basandoti sulla KB.
- Assicurati che i titoli siano accattivanti e in linea con il brand.
- Per ogni articolo, genera un OUTLINE SEO ottimizzato (H1, H2, H3) con logica di silos tematici.
- Per ogni articolo, includi una query di ricerca immagine in inglese per trovare una foto di stock adatta.

Rispondi ESCLUSIVAMENTE con un JSON valido nel seguente formato:
{{
  "plan": [
    {{
      "titolo": "Titolo articolo",
      "keyword": "Keyword principale",
      "topic": "Nome del cluster tematico (es. Noleggio Elettrico, Fiscalità, Manutenzione)",
      "funnel": "TOFU/MOFU/BOFU",
      "motivo": "Perché hai scelto questo tema basandoti sui dati o sulle keyword target?",
      "image_search_query": "Query in inglese per cercare immagine di stock (es. 'car rental business man city')",
      "outline": [
        {{"type": "h1", "text": "Titolo H1 SEO ottimizzato"}},
        {{"type": "h2", "text": "Prima sezione principale"}},
        {{"type": "h3", "text": "Sottosezione opzionale"}},
        {{"type": "h2", "text": "Seconda sezione principale"}},
        {{"type": "h2", "text": "FAQ – Domande Frequenti (OBBLIGATORIO)"}},
        {{"type": "h2", "text": "Conclusione"}}
      ]
    }}
  ]
}}
"""
        user_prompt = f"""ANALIZZA I SEGUENTI DATI:

### KEYWORD TARGET (PRIORITÀ):
{json.dumps(target_keywords or [], indent=2)}

### ARGOMENTI GIÀ TRATTATI (DA NON RIPETERE):
{json.dumps(existing_topics or [], indent=2)}

### KNOWLEDGE BASE:
{json.dumps(kb_data, indent=2)}

### SEARCH CONSOLE DATA (Top Keywords):
{json.dumps(gsc_data.get('keywords', []), indent=2)}
"""
        try:
            raw_response = await self.chat(system_prompt, user_prompt)
            # Find JSON block
            import re
            json_match = re.search(r'\{.*\}', raw_response, re.DOTALL)
            if json_match:
                json_str = json_match.group(0)
                data = json.loads(json_str)
                plan = data.get("plan", [])
                await self.log("success", {"topics_generated": len(plan)})
                return plan
            else:
                raise ValueError("Could not find JSON in LLM response")
        except Exception as e:
            await self.log("failed", {"error": str(e)})
            return []
