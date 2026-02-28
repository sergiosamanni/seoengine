# SEO Content Hub — PRD

## Problema Originale
Trasformare script Python per la SEO programmatica in un'applicazione web completa con architettura multi-tenant (Admin/Cliente), generazione contenuti AI, integrazione WordPress e Google Search Console.

## Architettura
- **Frontend**: React + Shadcn UI + Tailwind CSS
- **Backend**: FastAPI (modulare con APIRouter) + MongoDB (Motor)
- **Auth**: JWT
- **LLM**: Multi-provider (OpenAI, Claude, DeepSeek, Perplexity) via API key del cliente

## Struttura Backend (Modulare)
```
/app/backend/
├── server.py          # Entry point (~48 righe), importa routers
├── database.py        # Connessione MongoDB
├── auth.py            # Auth helpers (JWT, password hash/verify)
├── helpers.py         # build_prompt, generate_with_llm, scrape_serp, publish_wp
├── models.py          # Modelli Pydantic
└── routes/
    ├── auth_users.py  # Auth + gestione utenti
    ├── clients.py     # CRUD clienti + config + siti + XLSX + sessioni
    ├── articles.py    # Articoli + generazione + SERP + jobs + stats + logs
    └── gsc.py         # Google Search Console OAuth
```

## Flusso Genera Articoli (Admin) - 5 Step
1. **Strategia**: Funnel stage, obiettivo, modello copywriting, buyer persona, CTA
2. **Analisi SERP**: Keyword → analisi top 4 competitor → estrazione titoli e headings
3. **Dati GSC**: Caricamento keyword e metriche dal sito (opzionale)
4. **Prompt Avanzato**: Auto-generato da SERP+GSC, editabile dall'admin
5. **Genera**: Articolo Singolo (titolo+keyword+obiettivo) oppure SEO Programmatica (combinazioni)

## Flusso Genera Articoli (Client) - Semplificato
1. Inserisci keyword target
2. Sistema analizza automaticamente SERP + GSC
3. Conferma analisi completata
4. Lancia generazione

## Funzionalità Implementate

### Core
- [x] Auth JWT + Dashboard Admin con statistiche
- [x] CRUD Clienti multi-sito + CRUD Articoli
- [x] Generazione contenuti AI multi-provider
- [x] Pubblicazione WordPress
- [x] Activity Log dedicato
- [x] Gestione Utenti (admin assegna utenti a clienti)

### Configurazione (one-time setup)
- [x] API Keys (LLM + WordPress + Apify)
- [x] Knowledge Base
- [x] Tono & Stile

### Integrazioni
- [x] GSC OAuth 2.0 (PKCE)
- [x] SERP scraping via DuckDuckGo Lite
- [x] Upload XLSX per keyword
- [x] Scraping sito per Knowledge Base

## Credenziali Test
- Admin: admin@seoengine.it / admin123

## Backlog
- [ ] Verificare fix GSC OAuth 500 (code_verifier) con utente reale
- [ ] Verificare umanizzazione prompt AI
- [ ] UI multi-sito nel modale clienti (aggiungere/rimuovere siti)
