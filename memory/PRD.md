# Programmatic SEO Engine - PRD

## Data: 27 Febbraio 2026

## Problem Statement Originale
Trasformare script Python esistenti (che gestiscono file .json) in applicazioni web interattive per SEO programmatico. Il sistema deve:
- Gestire un registry multi-cliente con configurazioni JSON complete
- Generare articoli SEO con OpenAI GPT-4 basati su combinazioni di servizi/città/tipi
- Pubblicare articoli come bozze su WordPress
- Sistema multi-tenant: Admin vede tutti, Cliente vede solo la sua area

## Scelte Utente
- Backend Python diretto (no Google Colab/Google Drive)
- MongoDB per storage JSON e configurazioni
- Ogni cliente ha la propria API key OpenAI
- Accesso centralizzato admin + accesso cliente dedicato

## Architettura Implementata

### Backend (FastAPI + MongoDB)
- **Auth JWT** con ruoli admin/client
- **Collections**: users, clients, articles
- **Endpoints**:
  - `/api/auth/*` - login, register, me
  - `/api/clients/*` - CRUD clienti
  - `/api/clients/{id}/configuration` - configurazione completa
  - `/api/clients/{id}/combinations` - preview combinazioni keyword
  - `/api/articles/*` - CRUD articoli
  - `/api/articles/generate` - generazione con OpenAI
  - `/api/articles/publish` - pubblicazione WordPress
  - `/api/stats/overview` - statistiche dashboard
  - `/api/users/*` - gestione utenti e assegnazione clienti

### Frontend (React + Shadcn/UI)
- **Login Page**: split layout con features + auth form
- **Dashboard Admin**: stats globali, clienti recenti
- **Dashboard Cliente**: stats personali, quick actions
- **Gestione Clienti**: tabella, CRUD, assegnazione utenti
- **Configurazione**: 4 tab (API Keys, Knowledge Base, Tono & Stile, Keywords)
- **Generatore Articoli**: selezione combinazioni, preview, generazione batch
- **Storico Articoli**: tabella, filtri, anteprima, pubblicazione bulk

## User Personas

### Admin SEO Agency
- Gestisce multipli clienti
- Configura knowledge base e keyword per ogni cliente
- Monitora generazione e pubblicazione articoli
- Accesso completo a tutte le funzionalità

### Cliente (Proprietario Business)
- Vede solo i propri dati
- Gestisce la propria configurazione
- Genera articoli per il proprio sito
- Pubblica su WordPress personale

## Funzionalità Implementate

### P0 - Core (Completato)
- [x] Sistema autenticazione multi-tenant
- [x] Dashboard admin con overview clienti
- [x] Dashboard cliente con stats personali
- [x] CRUD clienti con tabella e ricerca
- [x] Configurazione completa (LLM multi-provider, WordPress, SEO, Tono, Knowledge Base, Keywords)
- [x] **Supporto multi-LLM: OpenAI, Claude (Anthropic), DeepSeek, Perplexity**
- [x] Generatore combinazioni keyword automatico
- [x] Selezione combinazioni per generazione
- [x] Generazione articoli con API LLM selezionato
- [x] Storico articoli con filtri
- [x] Anteprima articoli HTML
- [x] Pubblicazione articoli su WordPress

### P0.5 - Funzionalità Avanzate (Completato)
- [x] **Area Amministratore Protetta**: Password master (seo_admin_2024) per accesso avanzato
- [x] **Prompt di Secondo Livello**: Editor prompt avanzato con template keyword injection
- [x] **Password Cliente**: Admin può impostare password specifiche per ogni cliente
- [x] **Integrazione Apify**: SERP scraping dei primi 4 risultati Google per keyword target
- [x] **Upload XLSX**: Import automatico keyword da file Excel con detect colonne
- [x] **Merge/Replace Mode**: Scelta tra aggiungere o sostituire keyword esistenti

### P1 - In Backlog
- [ ] Import/Export configurazione JSON
- [ ] Schedulazione generazione automatica
- [ ] Template prompt personalizzabili
- [ ] Analytics articoli (performance SEO)
- [ ] Integrazione Google Search Console

### P2 - Future
- [ ] Multi-language support
- [ ] A/B testing titoli
- [ ] AI image generation per articoli
- [ ] Dashboard analytics avanzata

## Credenziali Demo

### Admin
- Email: admin@seoengine.it
- Password: admin123

### Cliente Demo
- Email: cliente@noleggiosalerno.it
- Password: cliente123
- Cliente: Noleggio Auto Salerno

## File Principali

### Backend
- `/app/backend/server.py` - API FastAPI completa
- `/app/backend/.env` - Configurazione MongoDB

### Frontend
- `/app/frontend/src/App.js` - Router e auth provider
- `/app/frontend/src/contexts/AuthContext.jsx` - Gestione auth
- `/app/frontend/src/pages/LoginPage.jsx` - Login/Register
- `/app/frontend/src/pages/DashboardPage.jsx` - Dashboard
- `/app/frontend/src/pages/ClientsPage.jsx` - Gestione clienti
- `/app/frontend/src/pages/ConfigurationPage.jsx` - Configurazione completa
- `/app/frontend/src/pages/GeneratorPage.jsx` - Generatore articoli
- `/app/frontend/src/pages/ArticlesPage.jsx` - Storico articoli
- `/app/frontend/src/components/DashboardLayout.jsx` - Layout sidebar

## Next Action Items
1. Implementare import/export JSON configurazione
2. Aggiungere preview articolo prima della generazione
3. Implementare schedulazione batch
4. Dashboard analytics con metriche SEO
