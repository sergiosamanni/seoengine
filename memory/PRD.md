# SEO Content Hub — PRD

## Problema Originale
Trasformare script Python per la SEO programmatica in un'applicazione web completa con architettura multi-tenant (Admin/Cliente), generazione contenuti AI, integrazione WordPress e Google Search Console.

## Architettura
- **Frontend**: React + Shadcn UI + Tailwind CSS
- **Backend**: FastAPI (modulare con APIRouter) + MongoDB (Motor)
- **Auth**: JWT
- **LLM**: Multi-provider (OpenAI, Claude, DeepSeek, Perplexity) via API key del cliente

## Struttura Backend (Refactorizzato)
```
/app/backend/
├── server.py          # Entry point (~48 righe), importa routers
├── database.py        # Connessione MongoDB
├── auth.py            # Auth helpers (JWT, password hash/verify)
├── helpers.py         # Funzioni utilità (build_prompt, generate_with_llm, scrape_serp, publish_wp)
├── models.py          # Modelli Pydantic
└── routes/
    ├── auth_users.py  # Auth + gestione utenti
    ├── clients.py     # CRUD clienti + config + siti + XLSX + sessioni
    ├── articles.py    # Articoli + generazione + pubblicazione + jobs + stats + logs + SERP
    └── gsc.py         # Google Search Console OAuth
```

## Funzionalità Implementate

### ✅ Core
- [x] Auth JWT (login/register)
- [x] Dashboard Admin con statistiche
- [x] CRUD Clienti multi-sito
- [x] CRUD Articoli con anteprima
- [x] Generazione contenuti AI multi-provider
- [x] Pubblicazione WordPress (bozza/pubblicato)
- [x] Activity Log dedicato

### ✅ Configurazione (semplificata)
- [x] API Keys (LLM + WordPress + Apify)
- [x] Knowledge Base
- [x] Tono & Stile

### ✅ Genera Articoli (ristrutturato)
- [x] **Articolo Singolo**: titolo + keywords + obiettivo
- [x] **SEO Programmatica**: keywords combinate + strategia + SERP + prompt avanzato
- [x] GSC data panel integrato (se connesso)

### ✅ Integrazioni
- [x] Google Search Console OAuth 2.0 (PKCE)
- [x] SERP scraping via DuckDuckGo Lite (fix: era googlesearch-python, non funzionava)
- [x] Upload XLSX per keyword
- [x] Scraping sito per Knowledge Base

### ✅ Gestione Utenti
- [x] Pagina admin per associare utenti a clienti
- [x] Supporto multi-sito per cliente

## Credenziali Test
- Admin: admin@seoengine.it / admin123
- Cliente: mario.rossi / password

## Task Completati (questa sessione)
- Backend refactoring: monolitico → modulare (3028 → 48 righe server.py)
- Fix SERP: googlesearch-python → DuckDuckGo Lite (funzionante)
- Ristrutturazione UI: Config semplificata + Generator con 2 modalità
- Rimossi tab da Config: Keywords, Strategia, SERP, Prompt → spostati nel Generator
- Activity Log rimosso dal Generator, solo nella pagina dedicata
- GSC panel integrato nella pagina Genera Articoli

## Backlog (P1-P2)
- [ ] Finalizzare interfaccia cliente semplificata (SimpleGeneratorPage)
- [ ] Verificare fix GSC OAuth 500 (code_verifier)
- [ ] Verificare umanizzazione prompt AI
- [ ] Implementare UI scraping per Knowledge Base
- [ ] UI multi-sito nel modale clienti (aggiungere/rimuovere siti)
