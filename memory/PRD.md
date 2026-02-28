# SEO Content Hub — PRD

## Problema Originale
Trasformare script Python per la SEO programmatica in un'applicazione web completa con architettura multi-tenant (Admin/Cliente), generazione contenuti AI, integrazione WordPress e Google Search Console.

## Architettura
- **Frontend**: React + Shadcn UI + Tailwind CSS
- **Backend**: FastAPI (modulare con APIRouter) + MongoDB (Motor)
- **Auth**: JWT
- **LLM**: Multi-provider (OpenAI, Claude, DeepSeek, Perplexity) via API key del cliente

## Navigazione App
### Admin
- **Dashboard** (/) → Stats + Tabella Clienti unificata
- **Utenti** → Gestione assegnazioni utenti-clienti
- **Activity Log** → Log operazioni
- Click cliente → **Genera Articoli** (5 step wizard) + Storico Articoli
  - Sub-pagine: Configurazione (3 tab), GSC

### Client
- **Genera** → Flusso semplificato (keyword → analisi auto → genera) + Storico
- **Activity Log** → Log proprie operazioni

## Flusso Genera Articoli (Admin) - 5 Step
1. **Strategia**: Funnel, obiettivo, copywriting model, buyer persona
2. **Analisi SERP**: Top 4 competitor → titoli + headings
3. **Dati GSC**: Auto-load keyword + metriche (se connesso, badge sky-blue)
4. **Prompt Avanzato**: Auto-generato da SERP+GSC, editabile
5. **Genera**: Singolo (titolo+kw+obiettivo) o Programmatica (combinazioni)
   - Contesto GSC e SERP iniettato nel system prompt

## Funzionalità Implementate
- [x] Auth JWT + Dashboard Admin unificata
- [x] CRUD Clienti multi-sito + Storico Articoli in-page
- [x] Generazione AI multi-provider con contesto GSC+SERP
- [x] Pubblicazione WordPress
- [x] Activity Log dedicato
- [x] Gestione Utenti admin
- [x] Config: API Keys, Knowledge Base, Tono & Stile
- [x] GSC OAuth 2.0 (PKCE) con persistenza sessione
- [x] SERP DuckDuckGo Lite (retry 3x + User-Agent rotation)
- [x] GSC step auto-load + badge connessione nel wizard

## GSC Setup
- Redirect URI: `https://gsc-content-builder.preview.emergentagent.com/api/gsc/callback`

## Credenziali Test
- Admin: admin@seoengine.it / admin123

## Backlog
- [ ] Verificare umanizzazione prompt AI
- [ ] UI multi-sito migliorata nel modale clienti
