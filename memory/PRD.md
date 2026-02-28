# Programmatic SEO Engine - PRD

## Problem Statement
Applicazione web full-stack per la SEO programmatica. Genera articoli SEO ottimizzati tramite LLM e li pubblica su WordPress.

## Architecture
- **Frontend**: React + Shadcn UI + Tailwind CSS
- **Backend**: FastAPI (modulare con APIRouter)
- **Database**: MongoDB
- **LLM**: Multi-provider (OpenAI, Claude, DeepSeek, Perplexity) tramite API dirette
- **SERP**: DuckDuckGo Lite con retry logic
- **WordPress**: Pubblicazione via REST API + Application Password
- **GSC**: OAuth 2.0 per dati Google Search Console

## Core Features (Implemented)
1. **Multi-Tenant**: Ruoli Admin e Cliente
2. **Wizard 5 Step** (Admin): Strategia → Analisi SERP → GSC → Prompt → Genera
3. **Generazione Articoli**: Singolo e Programmatica (batch)
4. **Pubblicazione WordPress**: Automatica come bozza con SEO metadata
5. **Dashboard Unificata**: Lista clienti con stats
6. **Storico Articoli**: Per-client con preview e eliminazione
7. **Activity Log**: Tracciamento operazioni con stato running/success/failed
8. **GSC Integration**: OAuth 2.0, dati keyword ultimi 28 giorni

## Key Fixes Applied (28/02/2026)
- **CRITICAL**: `helpers.py` `log_activity` usava `update_one(sort=...)` che non è supportato da pymongo. Sostituito con `find_one_and_update` che supporta `sort`. Questo causava log bloccati in "running".
- **Frontend**: Aggiunto flag `publish_to_wordpress` nel payload di generazione singola (mancava)
- **Frontend**: Aggiunto toggle "Pubblica su WordPress" nella modalità Articolo Singolo
- **Frontend**: Aggiunto job polling per la generazione singola (mostra progresso e risultato in tempo reale)
- **Frontend**: Aggiunto job polling anche per il ClientGenerator

## Verified Working (28/02/2026)
- Login admin/client
- Generazione articolo singolo con DeepSeek (deepseek-reasoner)
- Pubblicazione automatica su WordPress (testato con noleggioautoasalerno.it, post 1528 e 1529)
- Activity logs con stato corretto (0 log bloccati in "running")
- Storico articoli con badge stato e link WordPress
- Wizard 5 step con contesto GSC

## Pending / Backlog
- **P1**: Verifica flusso semplificato ruolo "Cliente" (test end-to-end)
- **P2**: Finalizzare UI gestione multi-sito
- **P2**: Migliorare gestione errori UI
- **Refactoring**: Scomporre GeneratorPage.jsx (1000+ righe) in componenti

## Credentials
- Admin: admin@seoengine.it / admin123
- Client: mario.rossi / password
- WordPress: sergio / d33X EFRx 2zdB wESU NKRb TS5V
