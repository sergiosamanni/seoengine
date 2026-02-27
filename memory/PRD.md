# SEO Engine - PRD (Product Requirements Document)

## Problema Originale
Trasformare script Python per la SEO programmatica in un'applicazione web completa multi-tenant con generazione di articoli, pubblicazione su WordPress e analisi SERP.

## Architettura
- **Backend**: FastAPI + MongoDB (Motor/Beanie)
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Auth**: JWT con ruoli Admin/Client

## Funzionalita Implementate

### Core
- [x] Architettura multi-tenant (Admin + Client)
- [x] Login/Auth JWT con ruoli
- [x] Dashboard Admin con statistiche
- [x] Dashboard Cliente dedicata
- [x] Gestione Clienti (CRUD)

### Configurazione Cliente (6 Tab)
- [x] API Keys (LLM multi-provider + WordPress + Apify)
- [x] Knowledge Base (info azienda, territorio, target)
- [x] Tono & Stile (registro, persona narrativa, parole vietate)
- [x] Keywords (servizi, citta, tipi + upload XLSX)
- [x] Analisi SERP (integrazione Apify)
- [x] Prompt Avanzato (protetto da password)

### Generazione Contenuti
- [x] Supporto multi-LLM (OpenAI, Claude, DeepSeek, Perplexity)
- [x] Generazione articoli SEO con metadati
- [x] Metadati SEO: meta description, tags, slug, focus keyword
- [x] Anteprima articoli con tutti i metadati SEO

### Pubblicazione
- [x] Integrazione WordPress REST API
- [x] Pubblicazione con tag, categorie, Yoast/RankMath meta
- [x] Gestione errori e retry automatico

### Storico
- [x] Storico sessioni SEO con snapshot configurazione
- [x] Storico articoli con filtri

### Refactoring (27 Feb 2026)
- [x] ConfigurationPage.jsx suddiviso in 6 sotto-componenti
- [x] Fix bug anteprima articoli (SEO metadata non caricati)

## Credenziali Test
- Admin: admin@seoengine.it / admin123
- Client: cliente@noleggiosalerno.it
- Password prompt avanzato: seo_admin_2024

## Struttura File
```
backend/
  server.py          # API FastAPI completa
frontend/src/
  pages/
    ArticlesPage.jsx
    ClientsPage.jsx
    ConfigurationPage.jsx      # Orchestratore tab
    configuration/
      ApiKeysTab.jsx
      KnowledgeBaseTab.jsx
      ToneStyleTab.jsx
      KeywordsTab.jsx
      SerpAnalysisTab.jsx
      AdvancedPromptTab.jsx
    DashboardPage.jsx
    GeneratorPage.jsx
    LoginPage.jsx
    SessionHistoryPage.jsx
```

## Backlog
- Nessun task pendente definito
- Possibili miglioramenti futuri: analytics dettagliata, A/B testing contenuti, integrazione Google Search Console
