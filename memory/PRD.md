# SEO Content Hub - PRD

## Problema Originale
Trasformare script Python per la SEO programmatica in un'applicazione web completa multi-tenant.

## Utenti e Ruoli
- **Admin**: Gestisce clienti, configurazioni avanzate, generazione articoli per tutti i clienti
- **Cliente**: Interfaccia semplificata per generare articoli con una singola keyword

## Architettura
- **Frontend**: React + TailwindCSS + Shadcn/UI
- **Backend**: FastAPI + MongoDB (Motor)
- **Auth**: JWT con ruoli admin/client

## Funzionalità Core

### Completate
1. **Autenticazione JWT** con ruoli admin/client
2. **Gestione Clienti (CRUD)** per admin
3. **Configurazione Cliente Avanzata** con 7 tab:
   - API Keys (LLM multi-provider + WordPress)
   - Knowledge Base (con scraping sito web)
   - Tono & Stile
   - Keywords (con upload XLSX)
   - Strategia Contenuti (AIDA, PAS, FAB, PASTOR)
   - Analisi SERP (senza Apify, usa googlesearch-python)
   - Prompt Avanzato (protetto da password)
4. **Generazione Articoli SEO** via multi-LLM (OpenAI, Claude, DeepSeek, Perplexity)
5. **Pubblicazione WordPress** diretta con tag e metadati SEO
6. **Processo Asincrono** con background task + polling dal frontend
7. **Activity Log** per tracciare operazioni
8. **Interfaccia Cliente Semplificata** (`/simple-generator`) con keyword + topic + obiettivo
9. **Scraping Sito Web** per pre-popolare Knowledge Base (admin only)
10. **Analisi SERP Custom** senza Apify (usa `googlesearch-python` + `BeautifulSoup`)
11. **Google Search Console** integrazione via OAuth — credenziali OAuth a livello sistema (env vars), UX semplificata: URL sito + "Connetti Google Search Console"
12. **Prompt Umanizzato** per output AI più naturale
13. **Storico Sessioni** per salvare snapshot delle configurazioni

### In Progress
- Nessuno

### Backlog
- Refactoring `server.py` in moduli APIRouter separati
- Test di generazione con LLM reale per verificare umanizzazione
- Test completo flusso OAuth GSC con account Google reale
- Miglioramenti UX per feedback SERP (gestire 0 risultati)

## Credenziali Test
- **Admin**: admin@seoengine.it / admin123
- **Cliente**: cliente@noleggiosalerno.it / password
- **Client ID**: a8ab5383-b444-4f17-9465-41fa32c34bb9

## Endpoint API Chiave
- `POST /api/auth/login` - Login
- `GET /api/clients` - Lista clienti
- `PUT /api/clients/{id}/configuration` - Salva configurazione
- `POST /api/articles/generate-and-publish` - Genera e pubblica (asincrono)
- `POST /api/articles/simple-generate` - Generazione semplificata (client)
- `POST /api/serp/search` - Analisi SERP
- `POST /api/clients/{id}/scrape-website` - Scraping sito per KB
- `GET /api/gsc/authorize/{id}` - Avvia OAuth GSC
- `GET /api/gsc/callback` - Callback OAuth GSC
- `GET /api/gsc/status` - Verifica se GSC configurato a livello sistema
- `GET /api/clients/{id}/gsc-data` - Dati GSC
- `POST /api/clients/{id}/gsc-config` - Salva URL sito GSC
- `POST /api/clients/{id}/gsc-disconnect` - Disconnetti GSC
- `GET /api/activity-logs/{id}` - Log attività

## Variabili d'Ambiente Backend
- `MONGO_URL` - Connessione MongoDB
- `DB_NAME` - Nome database
- `CORS_ORIGINS` - CORS
- `FRONTEND_URL` - URL frontend (per redirect OAuth callback)
- `GSC_OAUTH_CLIENT_ID` - Google OAuth Client ID (livello sistema)
- `GSC_OAUTH_CLIENT_SECRET` - Google OAuth Client Secret (livello sistema)

## Note Tecniche
- SERP: `googlesearch-python` può essere bloccato in ambienti container
- GSC: Credenziali OAuth configurate una volta come env vars, l'utente clicca solo "Connetti"
- LLM: Supporta OpenAI, Anthropic (Claude), DeepSeek, Perplexity via API key cliente
