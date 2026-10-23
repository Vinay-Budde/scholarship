# Phase 3 – ScholarSwarm AI Agent System Implementation

**Goal**: Build a LangGraph‑based orchestration pipeline that runs four AI agents (Researcher, EligibilityVerifier, Matcher, ApplicationCoach) on a validated student profile, producing real scholarship opportunities and a draft SOP.

## User Review Required
> [!IMPORTANT]
> - This plan introduces **new dependencies** (`langgraph`, `langchain`, `httpx`, `pydantic` extensions) and **new backend modules** (`backend/orchestrator/graph.py`, `backend/agents/*`, new router `backend/routers/workflow.py`).
> - It also adds **Server‑Sent Events** for live progress. Ensure your development environment allows installing these packages and that the web‑search API keys are set.
> - The implementation will **not fabricate data**; in demo mode dummy results will be generated but clearly marked.

## Open Questions
- Do you have a preferred web‑search service (e.g., SerpAPI, Bing API)? If not, we can use a simple `requests`‑based DuckDuckGo scrape as fallback.
- Should the workflow be started via a **POST `/api/workflow/start`** that expects a saved profile ID, or will the frontend pass the full profile JSON directly?
- Desired polling interval for the frontend (e.g., every 2 s) or use **SSE**?

## Proposed Changes
---
### 1. Dependencies (`requirements.txt`)
- Add `langgraph>=0.0.11`, `langchain>=0.2.0`, `httpx`, `fastapi-sse` (or `sse-starlette`).

### 2. Environment variables (`.env`)
- `WEB_SEARCH_API_KEY` – API key for chosen search provider.
- `WEB_SEARCH_ENDPOINT` – Base URL for search API.
- `LLM_API_KEY` – Already used for OpenAI in Phase 1.
- `DEMO_MODE` – Optional flag to enable deterministic mock data when API keys missing.

### 3. New package structure
```
backend/
│   orchestrator/
│   │   __init__.py
│   │   graph.py          # LangGraph workflow definition
│   │   schemas.py        # Pydantic models for shared state
│   agents/
│   │   __init__.py
│   │   researcher.py     # Agent 1 implementation
│   │   eligibility.py   # Agent 2 implementation
│   │   matcher.py        # Agent 3 implementation
│   │   coach.py          # Agent 4 implementation
│   routers/
│   │   workflow.py      # POST /api/workflow/start + SSE endpoint
```

### 4. Shared State (`schemas.py`)
```python
class Opportunity(BaseModel):
    id: str
    institution: str
    program: str
    country: str
    funding: Optional[str]
    deadline: Optional[date]
    eligibility_requirements: list[str]
    source_url: HttpUrl
    evidence: str
    verified: bool = False
    verification_status: Literal["eligible","potential","ineligible","insufficient"]
    missing_requirements: list[str] = []
    score: Optional[float] = None
    score_explanation: Optional[str] = None
```
- `WorkflowState` aggregates `profile`, `research_results`, `verified_opps`, `ranked_opps`, `selected_opportunity`, `sop_draft`, and per‑agent status flags.

### 5. Agent implementations (high‑level)
- **Researcher** (`researcher.py`):
  - Input: `StudentProfile`.
  - Calls `search_web` helper (wraps configured API). Parses snippets with regex‑based extraction to produce `Opportunity` objects (no hallucination). Implements deduplication by `source_url`.
  - Returns list of opportunities.
- **EligibilityVerifier** (`eligibility.py`):
  - Input: list of `Opportunity` + profile.
  - For each opp, fetch full page via `httpx`. Extract eligibility sections using simple heuristics / regex. Compare with profile → set `verification_status` and `missing_requirements`.
  - Handles transient fetch failures with limited retries (3).
- **Matcher** (`matcher.py`):
  - Input: verified opportunities + profile.
  - Score function (0‑100) weighting:
    - eligibility_status (30),
    - academic fit (CGPA vs required GPA) (20),
    - funding amount / full‑funded (20),
    - country preference match (15),
    - career relevance (keywords in `preferred_fields`) (15).
  - Produces top‑5 list, attaches `score_explanation`.
- **ApplicationCoach** (`coach.py`):
  - Input: selected `Opportunity` + profile.
  - Calls LLM (via existing OpenAI wrapper) with a system prompt that **explicitly** asks for a draft SOP, a checklist, and a step‑by‑step application guide. The prompt includes a reminder *"Only use information present in the profile and verified opportunity; do not fabricate"*.
  - Returns `sop_draft` string and `checklist` list.

### 6. Orchestrator (`graph.py`)
- Build a LangGraph `StateGraph` with nodes: `research`, `verify`, `match`, `coach`.
- Each node runs the corresponding agent function, updates `WorkflowState`.
- Include **retry** logic via LangGraph's built‑in `retry` decorator (max 2 attempts) for network errors.
- Define a **fallback**: if a node fails, mark its status and keep previous successful data.
- Expose a `run_workflow(profile: StudentProfile) -> WorkflowState` async function.

### 7. API (`workflow.py`)
- **POST `/api/workflow/start`** – Accepts full profile JSON, validates, stores a temporary `workflow_id` (uuid4) in an in‑memory dict, launches `run_workflow` in background (`asyncio.create_task`). Returns `{workflow_id}`.
- **GET `/api/workflow/events/{workflow_id}`** – SSE endpoint streaming JSON messages:
  ```json
  {"agent":"researcher","status":"running","progress":0.3,"opportunities_found":12}
  ```
  Updates after each node and on errors.
- **GET `/api/workflow/result/{workflow_id}`** – Final result with ranked opportunities and SOP (if selected).
- Simple **polling fallback**: frontend can GET `/api/workflow/status/{workflow_id}` to obtain current `WorkflowState`.

### 8. Frontend integration
- Add a new component `WorkflowProgress.jsx` that opens the SSE endpoint, shows a vertical timeline with icons for each agent (using `agent-dot-*` classes already defined).
- When the workflow finishes, render `OpportunityCard` components (reuse existing styling, add fields for funding, deadline, eligibility, score, missing requirements). Include a **Select** button that triggers POST `/api/workflow/select/{workflow_id}/{opportunity_id}` which runs the coach node and streams the SOP draft.
- Minimal UI changes – leverage existing CSS utilities (`glass-card`, `badge`, etc.).

### 9. Tests (`tests/test_workflow.py`)
- Use `pytest-asyncio` to launch the workflow with a mock profile.
- **Scenario 1** – All env vars present, mock web‑search responses returning ≥10 opportunities → assert top‑5 returned, verify score fields.
- **Scenario 2** – Missing optional fields (e.g., `english_score`) → coach should note missing information.
- **Scenario 3** – Simulate search API failure (raise `httpx.HTTPError`) → workflow should return partial results and an error flag.
- **Scenario 4** – Inaccessible source URL (404) → eligibility status = `insufficient`.
- **Scenario 5** – LLM auth failure (simulate 401 from OpenAI) → coach node marks error; workflow still returns verified matches.
- **Scenario 6** – Fewer than 5 eligible opportunities → result list length reflects reality.
- **Scenario 7** – SOP generation with missing IELTS → checklist includes "Provide IELTS score".

### 10. Error handling & Demo mode
- At startup, read env vars; if any of `WEB_SEARCH_API_KEY` or `WEB_SEARCH_ENDPOINT` are missing, set `DEMO_MODE=True`.
- In demo mode, the researcher returns a **fixed set of 5 synthetic opportunities** (clearly labelled `source_url="demo://..."`). All downstream agents work on these, allowing UI testing without external calls.
- All error messages are returned in the SSE stream and stored in `WorkflowState.errors`.

## Verification Plan
- Run the unit‑test suite (`pytest -q`). All existing Phase 2 tests must still pass.
- Execute the new workflow tests under both real‑API (if keys present) and demo mode.
- Manually start the backend, open the React app, submit a profile, and watch the progress bar / timeline.
- Verify that selecting an opportunity displays a draft SOP with a disclaimer.

---
**Next Step**: Please review the plan, answer the open questions, and approve so we can start implementing the files and code.
