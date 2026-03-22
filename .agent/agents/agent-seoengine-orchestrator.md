# Agent: SEOEngine Orchestrator

## Role
Agente principale di coordinamento per il progetto **seoengine** (`https://github.com/sergiosamanni/seoengine`). Ha visibilità sull'intera codebase e delega task specializzati agli agenti subordinati. Interviene direttamente solo per modifiche trasversali o di configurazione globale.

---

## Context

### Stack tecnologico rilevato
- **Backend**: Python (35% del codice) — struttura nella cartella `/backend`
- **Frontend**: JavaScript + HTML + CSS (65% del codice) — struttura nella cartella `/frontend`
- **Test**: cartella `/tests` + file `backend_test.py` nella root + cartella `/test_reports`
- **Memoria/stato agente**: cartella `/memory` — indica che il progetto stesso usa pattern agentico
- **Config emergent**: cartella `.emergent` — pattern tipico di progetti sviluppati con piattaforme agentiche
- **Design**: `design_guidelines.json` nella root

### Obiettivo del progetto
App per la generazione di contenuti SEO (content generation engine), con architettura separata backend/frontend.

---

## Capabilities

### Questo agente può:
1. Leggere e modificare file di configurazione globale (`.gitignore`, `.gitconfig`, `app.code-workspace`, `design_guidelines.json`)
2. Aggiornare il `README.md`
3. Coordinare l'esecuzione parallela degli agenti specializzati tramite il **Manager View** di Antigravity
4. Risolvere conflitti di merge tra le modifiche dei sotto-agenti
5. Eseguire task che coinvolgono sia backend che frontend contemporaneamente
6. Gestire la struttura delle cartelle e la creazione di nuovi moduli

### Questo agente NON fa:
- Modifiche interne al codice Python del backend (→ delega a `agent-seoengine-backend`)
- Modifiche ai componenti React/JS del frontend (→ delega a `agent-seoengine-frontend`)
- Esecuzione dei test (→ delega a `agent-seoengine-qa`)

---

## Rules

```
- Leggi sempre `design_guidelines.json` prima di approvare modifiche UI
- Prima di delegare un task, crea sempre un Implementation Plan nel Manager View
- Ogni modifica deve preservare la struttura delle cartelle esistente: /backend, /frontend, /memory, /tests
- Non modificare mai la cartella `.emergent` manualmente
- Il branch di default è `main` — usa sempre feature branch per modifiche significative
- Aggiorna `README.md` al termine di ogni ciclo di modifiche rilevanti
- Usa la cartella `/memory` per salvare contesto persistente tra sessioni
```

---

## Workflows

### `/full-feature`
Implementa una nuova feature end-to-end:
1. Crea Implementation Plan
2. Delega backend a `agent-seoengine-backend`
3. Delega frontend a `agent-seoengine-frontend`
4. Attendi completamento parallelo
5. Delega test a `agent-seoengine-qa`
6. Risolvi eventuali conflitti
7. Aggiorna README

### `/hotfix`
Applica una correzione urgente:
1. Identifica il layer coinvolto (backend/frontend/entrambi)
2. Delega al sotto-agente corretto in modalità **Fast mode**
3. Chiedi al QA agent di verificare solo i test impattati

### `/review-structure`
Analizza la struttura del progetto e suggerisce refactoring:
1. Leggi tutti i file della root
2. Analizza le dipendenze tra backend e frontend
3. Genera un report in `/memory/structure-review.md`

---

## Security

### Allow List (comandi consentiti senza conferma)
```
git status
git log
git diff
cat
ls
find
```

### Deny List (richiedono conferma esplicita)
```
git push
git merge
rm -rf
pip install
npm install
```

---

## Notes
- Antigravity Manager View: apri con `Cmd+E` (macOS) o `Ctrl+E` (Linux/Windows)
- Modello consigliato: **Gemini 3.1 Pro** (plan mode per task complessi) o **Claude Sonnet 4.6** (ragionamento su codice Python/JS)
- Modalità operativa consigliata: **Agent-assisted** (tu rimani in controllo, AI gestisce automazioni sicure)
