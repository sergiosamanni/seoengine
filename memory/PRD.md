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

### Configurazione Cliente (6 Tab - Refactored)
- [x] API Keys (LLM multi-provider + WordPress + Apify)
- [x] Knowledge Base (info azienda, territorio, target)
- [x] Tono & Stile (registro, persona narrativa, parole vietate)
- [x] Keywords (servizi, citta, tipi + upload XLSX)
- [x] Analisi SERP (integrazione Apify)
- [x] Prompt Avanzato (protetto da password)

### Generazione e Pubblicazione
- [x] Supporto multi-LLM (OpenAI, Claude, DeepSeek, Perplexity)
- [x] Generazione articoli SEO con metadati
- [x] **Genera e Pubblica su WordPress** in un unico step (async con polling)
- [x] Metadati SEO: meta description, tags, slug, focus keyword
- [x] Anteprima articoli con tutti i metadati SEO
- [x] Admin puo generare per qualsiasi cliente
- [x] Cliente puo generare e pubblicare autonomamente
- [x] Toggle WordPress on/off nella pagina generatore

### Activity Log
- [x] Tracciamento completo: batch, generazione, pubblicazione WP
- [x] Pagina Activity Log con statistiche (totali, successi, errori, WP pubblicati)
- [x] Filtri per cliente e tipo azione
- [x] Log in tempo reale nella pagina generatore
- [x] Link diretto ai post WordPress pubblicati

### Job System
- [x] Endpoint asincrono POST /api/articles/generate-and-publish
- [x] Background task con asyncio.create_task
- [x] Polling stato job GET /api/jobs/{job_id}
- [x] Progress tracking (completed/total)

### Storico
- [x] Storico sessioni SEO con snapshot configurazione
- [x] Storico articoli con filtri

## Test WordPress Reali Verificati
- WP Post #1525: Noleggio Auto Economico a Salerno
- WP Post #1526: Noleggio Auto Lungo Termine Senza Anticipo A Avellino
- WP Post #1527: Noleggio Auto Breve Termine Senza Anticipo A Avellino

## Credenziali Test
- Admin: admin@seoengine.it / admin123
- Client ID: a8ab5383-b444-4f17-9465-41fa32c34bb9
- Password prompt avanzato: seo_admin_2024

## Struttura File
```
backend/
  server.py              # API FastAPI completa con job system
frontend/src/
  pages/
    ArticlesPage.jsx       # Lista articoli con anteprima SEO
    ClientsPage.jsx        # Gestione clienti con azione "Genera Articoli"
    ConfigurationPage.jsx  # Orchestratore tab (refactored)
    configuration/         # Sub-componenti per ogni tab
      ApiKeysTab.jsx
      KnowledgeBaseTab.jsx
      ToneStyleTab.jsx
      KeywordsTab.jsx
      SerpAnalysisTab.jsx
      AdvancedPromptTab.jsx
    GeneratorPage.jsx      # Generatore con 3 colonne + polling + activity log
    ActivityLogPage.jsx    # Log attivita globale con filtri
    DashboardPage.jsx
    LoginPage.jsx
    SessionHistoryPage.jsx
```

## Backlog
- Analytics posizionamento keyword post-pubblicazione
- A/B testing contenuti SEO
- Integrazione Google Search Console
