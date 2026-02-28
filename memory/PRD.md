# SEO Content Hub — PRD

## Problema Originale
Trasformare script Python per la SEO programmatica in un'applicazione web completa con architettura multi-tenant (Admin/Cliente), generazione contenuti AI, integrazione WordPress e Google Search Console.

## Architettura
- **Frontend**: React + Shadcn UI + Tailwind CSS
- **Backend**: FastAPI (modulare con APIRouter) + MongoDB (Motor)
- **Auth**: JWT
- **LLM**: Multi-provider (OpenAI, Claude, DeepSeek, Perplexity) via API key del cliente

## Struttura Backend
```
/app/backend/
├── server.py          # Entry point (~48 righe)
├── database.py        # Connessione MongoDB
├── auth.py            # Auth helpers (JWT, password hash/verify)
├── helpers.py         # build_prompt, generate_with_llm, scrape_serp (DuckDuckGo + retry), publish_wp
├── models.py          # Modelli Pydantic
└── routes/
    ├── auth_users.py  # Auth + gestione utenti
    ├── clients.py     # CRUD clienti + config + siti + XLSX + sessioni
    ├── articles.py    # Articoli + generazione + SERP + jobs + stats + logs
    └── gsc.py         # Google Search Console OAuth
```

## Navigazione App
### Admin
- **Dashboard** (/) → Stats + Tabella Clienti unificata
- **Utenti** → Gestione assegnazioni utenti-clienti
- **Activity Log** → Log tutte le operazioni
- Click cliente → **Genera Articoli** (5 step wizard)
  - Sub-pagine: Configurazione, GSC

### Client
- **Genera** → Flusso semplificato (keyword → analisi auto → genera)
- **Activity Log** → Log proprie operazioni

## Flusso Genera Articoli (Admin) - 5 Step
1. **Strategia**: Funnel, obiettivo, copywriting model, buyer persona
2. **Analisi SERP**: Keyword → top 4 competitor → estrazione titoli + headings
3. **Dati GSC**: Keyword + metriche dal sito (opzionale, se connesso)
4. **Prompt Avanzato**: Auto-generato da SERP+GSC, editabile
5. **Genera**: Articolo Singolo oppure SEO Programmatica (combinazioni)
- **Storico Articoli**: Pannello collapsible in fondo alla pagina

## Flusso Genera Articoli (Client) - Semplificato
1. Inserisci keyword → analisi SERP automatica + GSC → conferma → genera

## Funzionalità Implementate
- [x] Auth JWT + Dashboard Admin unificata (stats + clienti)
- [x] CRUD Clienti multi-sito
- [x] Generazione contenuti AI multi-provider
- [x] Pubblicazione WordPress
- [x] Activity Log dedicato
- [x] Gestione Utenti admin
- [x] Configurazione: API Keys, Knowledge Base, Tono & Stile
- [x] GSC OAuth 2.0 (PKCE) + display redirect URI
- [x] SERP scraping DuckDuckGo Lite (retry 3x + User-Agent rotation)
- [x] Storico articoli dentro vista cliente

## Credenziali Test
- Admin: admin@seoengine.it / admin123

## GSC Setup
- Redirect URI da aggiungere in Google Cloud Console:
  `https://gsc-content-builder.preview.emergentagent.com/api/gsc/callback`

## Backlog
- [ ] Verificare fix GSC OAuth con utente reale (dopo aggiunta redirect URI in Cloud Console)
- [ ] Verificare umanizzazione prompt AI
- [ ] UI multi-sito nel modale clienti migliorata
