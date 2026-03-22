# Programmatic SEO Engine - PRD

## Problem Statement
Applicazione web full-stack per la SEO programmatica. Genera articoli SEO ottimizzati tramite LLM e li pubblica su WordPress.

## Architecture
- **Frontend**: React + Shadcn UI + Tailwind CSS (mobile-first)
- **Backend**: FastAPI (modulare con APIRouter)
- **Database**: MongoDB
- **LLM**: Multi-provider (OpenAI, Claude, DeepSeek) tramite API dirette
- **SERP**: DuckDuckGo Lite con retry logic
- **WordPress**: Pubblicazione via REST API (post + pagine), formato Gutenberg blocks
- **GSC**: OAuth 2.0 per dati Google Search Console
- **Object Storage**: SEO Engine Object Storage per upload immagini (S3 compatibile)

## Core Features (Implemented)
1. Multi-Tenant: Ruoli Admin e Cliente
2. Wizard 5 Step (Admin): Strategia -> SERP -> GSC -> Prompt -> Genera
3. Generazione Articoli: Singolo e Programmatica (batch)
4. 3 Tipi Contenuto: Articolo Blog, Landing Page, Pillar Page (con prompt differenziati)
5. Pubblicazione WordPress immediata: Post per articoli, Pagine per landing/pillar (status: publish)
6. Upload Immagini (Admin + Client): Prima=evidenza WP, altre inline. Responsive/mobile-first
7. Formato Gutenberg: Contenuto convertito in wp:heading, wp:paragraph, wp:list blocks
8. H1 Unico: Sanitizzazione post-generazione rimuove H1 duplicati
9. Meta Description Ottimizzata: Max 155 chars, frase completa, keyword + CTA
10. Layout Responsive: Sidebar nascosta su mobile con hamburger menu
11. Dashboard Unificata: Lista clienti con stats
12. Storico Articoli per cliente
13. Activity Log con stati running/success/failed
14. GSC Integration OAuth 2.0

## Pending / Backlog
- P2: Finalizzare UI gestione multi-sito
- P2: Migliorare gestione errori UI
- Refactoring: Scomporre GeneratorPage.jsx (1200+ righe)

## Credentials
- Admin: admin@seoengine.it / admin123
- Client: testclient@test.it / test123
- WordPress: sergio / d33X EFRx 2zdB wESU NKRb TS5V
