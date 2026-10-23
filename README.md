# ScholarSwarm AI 🎓

> **TetraNoodle AI Hackathon 2026** — AI Scholarship Finder

An AI agent swarm that researches universities and scholarships for students pursuing master's degrees abroad. Four specialized AI agents collaborate to find opportunities, verify eligibility, rank matches, and coach your application.

---

## Architecture

```
Browser (React + Vite + Tailwind)
       ↕  REST + SSE
FastAPI Backend (Python)
       ↕
LangGraph Orchestrator
    ├── Researcher Agent       (finds 10+ programs)
    ├── Eligibility Verifier   (checks requirements)
    ├── Opportunity Matcher    (ranks by fit)
    └── Application Coach      (SOP + checklist)
       ↕
External APIs: OpenAI / Gemini / Anthropic + Tavily / SerpAPI
```

---

## Quick Start

### Prerequisites
- Python 3.11+
- Node.js 18+
- API keys (see Configuration)

### 1. Clone & configure

```bash
git clone https://github.com/Vinay-Budde/scholarship.git
cd Tetra

# Backend env
cp .env.example backend/.env
# Edit backend/.env with your API keys
```

### 2. Backend

```bash
cd backend
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate

pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Visit: http://localhost:8000/api/health → should return `{"status":"ok"}`

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit: http://localhost:5173

---

## Configuration

Copy `.env.example` to `backend/.env` and fill in at least one key from each group:

| Variable | Description | Get it at |
|----------|-------------|-----------|
| `OPENAI_API_KEY` | OpenAI GPT | platform.openai.com |
| `GOOGLE_API_KEY` | Google Gemini | ai.google.dev |
| `ANTHROPIC_API_KEY` | Anthropic Claude | console.anthropic.com |
| `LLM_PROVIDER` | `openai` / `gemini` / `anthropic` | — |
| `TAVILY_API_KEY` | Web search (recommended) | app.tavily.com |
| `SERPAPI_API_KEY` | Web search (alternative) | serpapi.com |
| `DEMO_MODE` | `true` = run without real keys | — |

### Demo Mode

If you don't have API keys yet, set `DEMO_MODE=true` in `backend/.env`. The app will run with clearly labeled simulated results so you can explore the full UI.

---

## Features

- 📋 **Student Profile Form** — GPA, skills, projects, preferred countries, budget
- 📄 **Document Upload** — Resume and academic transcript (PDF / DOCX)
- 🤖 **4 AI Agents** — Researcher, Eligibility Verifier, Opportunity Matcher, Application Coach
- 📡 **Live Agent Feed** — See each agent's progress in real time via SSE
- 🎯 **10+ Opportunities** — Real programs with official links and funding info
- 🏆 **Top 5 Ranked** — Personalized match scores with explanations
- ✍️ **SOP Generation** — Personalized statement of purpose draft
- ✅ **Application Checklist** — What you need to apply for each program

---

## Project Structure

```
Tetra/
├── .env.example          ← env var template (no real secrets)
├── .gitignore
├── README.md
├── frontend/             ← React + Vite + Tailwind
│   ├── src/
│   │   ├── components/   ← UI components
│   │   ├── hooks/        ← custom React hooks
│   │   └── api/          ← API client
└── backend/              ← FastAPI + LangGraph
    ├── agents/           ← 4 AI agents
    ├── orchestrator/     ← LangGraph state machine
    ├── models/           ← Pydantic data models
    ├── routers/          ← API route handlers
    └── tools/            ← web search + document parsing
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check |
| POST | `/api/upload` | Upload resume / transcript |
| POST | `/api/research` | Start agent workflow |
| GET | `/api/stream/{id}` | SSE live agent feed |
| GET | `/api/results/{id}` | Final results JSON |

---

## Development Phases

| Phase | Status | Description |
|-------|--------|-------------|
| 1 | ✅ | Scaffold + minimal frontend & backend |
| 2 | ⏳ | Document upload + Pydantic models |
| 3 | ⏳ | Researcher Agent + web search |
| 4 | ⏳ | Eligibility Verifier + Opportunity Matcher |
| 5 | ⏳ | Application Coach Agent |
| 6 | ⏳ | LangGraph orchestration + SSE streaming |
| 7 | ⏳ | Full UI polish + end-to-end demo |

---

## Important Notes

- ⚠️ This tool **never automatically submits** university applications.
- ⚠️ Results are always clearly marked as **verified** vs **unverified**.
- ⚠️ API keys are **never hardcoded** — always read from environment variables.
- ⚠️ The matching logic works with **any student profile**, not a hardcoded one.

---

## License

MIT — built for TetraNoodle AI Hackathon 2026.
