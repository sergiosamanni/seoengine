# 🤖 SEOEngine Multi-Agent Workspace

Benvenuto nel workspace orchestrato di **SEOEngine**. Questo ambiente è configurato per permetterti di lavorare con specialisti AI dedicati a ogni parte del progetto.

## 👥 Agenti Disponibili

| Agente | Ruolo | Quando usarlo | Comando suggerito |
| :--- | :--- | :--- | :--- |
| **Orchestrator** | Coordinatore | Visione d'insieme, core features, gestione branch. | `@orchestrator` |
| **Backend** | Python/FastAPI | Database, logica API, integrazione LLM. | `@backend` |
| **Frontend** | React/JS | UI/UX, componenti, stato React, Tailwind. | `@frontend` |
| **QA** | Testing | Debugging, unit tests, bug fixes e QA automation. | `@qa` |

---

## 🚀 Come Collaborare

1.  **Apertura Task**: Se hai una feature complessa, usa l'**Orchestrator** per creare un piano.
2.  **Sviluppo Parallelo**: Puoi delegare task specifici ai sotto-agenti mentre lavori su altro.
3.  **Verifica**: Prima di ogni merge, chiedi all'agente **QA** di validare le modifiche.

## 📁 Struttura Workspace

- `/backend`: Core API, models, routes.
- `/frontend`: Applicazione React principale.
- `.agent/agents`: Definizioni e istruzioni per ciascun agente.
- `/memory`: Contesto persistente per gli agenti AI.

---

> [!TIP]
> Usa `Cmd+E` (macOS) per aprire il **Manager View** e visualizzare lo stato di tutti gli agenti in esecuzione.

---

### Dashboard Manutenzione
- [x] **Login Fix**: Completato (admin@seoengine.it ora ha ruolo `admin`).
- [x] **Workspace Configuration**: Aggiornata per multi-agent mode.
- [ ] **Prossimo Step**: Conferma il funzionamento all'utente.
