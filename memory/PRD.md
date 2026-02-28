# Programmatic SEO Engine - PRD

## Problem Statement
Applicazione web full-stack per la SEO programmatica. Genera articoli SEO ottimizzati tramite LLM e li pubblica su WordPress.

## Architecture
- **Frontend**: React + Shadcn UI + Tailwind CSS
- **Backend**: FastAPI (modulare con APIRouter)
- **Database**: MongoDB
- **LLM**: Multi-provider (OpenAI, Claude, DeepSeek, Perplexity) tramite API dirette
- **SERP**: DuckDuckGo Lite con retry logic
- **WordPress**: Pubblicazione via REST API + Application Password (post e pagine)
- **GSC**: OAuth 2.0 per dati Google Search Console
- **Object Storage**: Emergent Object Storage per upload immagini

## Core Features (Implemented)
1. **Multi-Tenant**: Ruoli Admin e Cliente
2. **Wizard 5 Step** (Admin): Strategia -> Analisi SERP -> GSC -> Prompt -> Genera
3. **Generazione Articoli**: Singolo e Programmatica (batch)
4. **3 Tipi Contenuto**: Articolo Blog, Landing Page, Pillar Page (con prompt differenziati)
5. **Pubblicazione WordPress**: Post per articoli, Pagine per landing/pillar
6. **Upload Immagini**: Prima=evidenza WP, altre inline nell'articolo
7. **Dashboard Unificata**: Lista clienti con stats
8. **Storico Articoli**: Per-client con preview e eliminazione
9. **Activity Log**: Tracciamento operazioni con stato running/success/failed
10. **GSC Integration**: OAuth 2.0, dati keyword ultimi 28 giorni
11. **Meta Description Ottimizzata**: Generata dall'LLM (150-160 chars) con keyword + CTA
12. **H1 Unico**: Regola critica nel prompt: un solo `<h1>` per documento

## Files Key
- `/app/backend/routes/articles.py` - Generazione e pubblicazione
- `/app/backend/routes/uploads.py` - Upload immagini
- `/app/backend/helpers.py` - Prompt builder, WP publish, SEO metadata
- `/app/backend/storage.py` - Object storage integration
- `/app/backend/models.py` - Modelli Pydantic
- `/app/frontend/src/pages/GeneratorPage.jsx` - Wizard admin + client generator

## Verified Working (28/02/2026)
- Login admin/client
- Generazione articolo singolo con DeepSeek
- Pubblicazione automatica su WordPress (post e pagine)
- Upload immagini con object storage
- Selettore tipo contenuto (3 opzioni) in modalita singola e programmatica
- Activity logs senza log bloccati
- Meta description ottimizzata con keyword, semantica, CTA
- Prompt con regola H1 unico e strutture specifiche per tipo contenuto

## Pending / Backlog
- **P1**: Verifica flusso semplificato ruolo "Cliente" end-to-end
- **P2**: Finalizzare UI gestione multi-sito
- **P2**: Migliorare gestione errori UI
- **P2**: Responsive sidebar per mobile
- **Refactoring**: Scomporre GeneratorPage.jsx (1200+ righe) in componenti

## Credentials
- Admin: admin@seoengine.it / admin123
- Client: testclient@test.it / test123
- WordPress: sergio / d33X EFRx 2zdB wESU NKRb TS5V
