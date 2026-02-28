# SEO Engine - PRD (Product Requirements Document)

## Problema Originale
Trasformare script Python per la SEO programmatica in un'applicazione web completa multi-tenant con generazione di articoli, pubblicazione su WordPress e analisi SERP.

## Architettura
- **Backend**: FastAPI + MongoDB (Motor async)
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Auth**: JWT con ruoli Admin/Client
- **Job System**: Background tasks async con polling

## Funzionalita Implementate

### Core
- [x] Architettura multi-tenant (Admin + Client)
- [x] Login/Auth JWT con ruoli
- [x] Dashboard Admin con statistiche
- [x] Dashboard Cliente dedicata
- [x] Gestione Clienti (CRUD)

### Configurazione Cliente (7 Tab - Refactored)
- [x] API Keys (LLM multi-provider + WordPress + Apify)
- [x] Knowledge Base (info azienda, territorio, target)
- [x] Tono & Stile (registro, persona narrativa, parole vietate)
- [x] Keywords (servizi, citta, tipi + upload XLSX)
- [x] **Strategia Contenuti** (funnel stage, modello copywriting, buyer persona, leve psicologiche, CTA, keyword LSI)
- [x] Analisi SERP (integrazione Apify)
- [x] Prompt Avanzato (protetto da password)

### Content Strategy Framework
- [x] Funnel Stage (TOFU / MOFU / BOFU)
- [x] Modelli Copywriting: AIDA, PAS, FAB, PASTOR, Libero
- [x] Buyer Persona configurabile (nome, descrizione, obiezioni)
- [x] 7 Leve Psicologiche selezionabili (riprova sociale, autorita, scarsita, urgenza, reciprocita, simpatia, impegno)
- [x] Keyword secondarie e LSI (semantiche)
- [x] CTA personalizzabile
- [x] Lunghezza target configurabile
- [x] Tipo contenuto per-generazione (Articolo Blog / Pillar Page / Landing Page)
- [x] Brief editabile pre-generazione (CTA override, note aggiuntive)

### System Prompt SEO Copywriter
- [x] Prompt esperto: SEO on-page, title tag, meta description, H1-H3, keyword density
- [x] Integrazione modelli copywriting nel prompt
- [x] Leve psicologiche iniettate nel contesto
- [x] Regole formattazione SEO (paragrafi brevi, frasi brevi, grassetto, elenchi)
- [x] CTA ripetuta 2-3 volte (inizio, meta, fine)
- [x] Supporto featured snippet tramite elenchi puntati

### Generazione e Pubblicazione
- [x] Supporto multi-LLM (OpenAI, Claude, DeepSeek, Perplexity)
- [x] Genera e Pubblica su WordPress in un unico step (async con polling)
- [x] Metadati SEO: meta description, tags, slug, focus keyword
- [x] Admin e Cliente possono generare e pubblicare
- [x] Toggle WordPress on/off nel generatore

### Activity Log
- [x] Tracciamento completo: batch, generazione, pubblicazione WP
- [x] Pagina Activity Log con statistiche e filtri
- [x] Log in tempo reale nella pagina generatore

### Job System
- [x] Endpoint asincrono POST /api/articles/generate-and-publish
- [x] Background task con asyncio.create_task
- [x] Polling stato job GET /api/jobs/{job_id}

### Storico
- [x] Storico sessioni SEO con snapshot configurazione
- [x] Storico articoli con filtri e anteprima SEO

### Bug Fix
- [x] Config merge: PUT /configuration ora fa merge invece di sovrascrivere
- [x] Anteprima articoli: carica metadati SEO dal /full endpoint

## Credenziali Test
- Admin: admin@seoengine.it / admin123
- Client ID: a8ab5383-b444-4f17-9465-41fa32c34bb9
- Password prompt avanzato: seo_admin_2024

## Struttura File
```
backend/
  server.py
frontend/src/
  pages/
    ArticlesPage.jsx
    ClientsPage.jsx
    ConfigurationPage.jsx
    configuration/
      ApiKeysTab.jsx
      KnowledgeBaseTab.jsx
      ToneStyleTab.jsx
      KeywordsTab.jsx
      ContentStrategyTab.jsx    # NEW
      SerpAnalysisTab.jsx
      AdvancedPromptTab.jsx
    GeneratorPage.jsx
    ActivityLogPage.jsx
    DashboardPage.jsx
    LoginPage.jsx
    SessionHistoryPage.jsx
```

## Backlog
- Analytics posizionamento keyword post-pubblicazione
- A/B testing contenuti SEO
- Integrazione Google Search Console
- Coda di pubblicazione programmata
