# SEOEngine — Configurazione Agente

## Progetto
App per la generazione di contenuti SEO. Stack: Python (backend) + JavaScript (frontend).

## Agenti disponibili
- `.agent/agents/agent-seoengine-orchestrator.md` — coordinamento generale
- `.agent/agents/agent-seoengine-backend.md` — backend Python
- `.agent/agents/agent-seoengine-frontend.md` — frontend JS/HTML/CSS
- `.agent/agents/agent-seoengine-qa.md` — testing e QA

## Regole globali
- Leggi sempre `design_guidelines.json` prima di modificare la UI
- Usa sempre feature branch, mai committare direttamente su `main`
- Aggiorna `memory/` con contesto rilevante dopo ogni sessione
- Non inserire mai API keys nel codice