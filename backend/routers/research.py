"""
routers/research.py — POST /api/research

Accepts a student profile, starts the LangGraph workflow asynchronously,
and returns a session ID for polling/streaming results.
"""

from __future__ import annotations

import uuid
import asyncio
import logging
from typing import Any

from fastapi import APIRouter, BackgroundTasks, HTTPException

from config import get_settings
from models.workflow import ResearchRequest, ResearchResponse, WorkflowState, AgentStatus

logger = logging.getLogger(__name__)
router = APIRouter(tags=["research"])

# In-memory session store (Phase 6 will use Redis or similar for production)
# Maps session_id → WorkflowState
_sessions: dict[str, WorkflowState] = {}


def get_session(session_id: str) -> WorkflowState:
    """Retrieve a session or raise 404."""
    state = _sessions.get(session_id)
    if not state:
        raise HTTPException(status_code=404, detail=f"Session '{session_id}' not found")
    return state


def set_session(session_id: str, state: WorkflowState) -> None:
    _sessions[session_id] = state


async def _run_workflow(session_id: str) -> None:
    """
    Background task that runs the full agent pipeline.
    Phase 6 will replace this stub with the real LangGraph orchestrator.
    """
    settings = get_settings()
    state = _sessions.get(session_id)
    if not state:
        return

    try:
        # Import here to avoid circular imports at startup
        if settings.demo_mode or not settings.is_fully_configured:
            from orchestrator.graph import run_demo_workflow
            await run_demo_workflow(state)
        else:
            from orchestrator.graph import run_workflow
            await run_workflow(state)
    except Exception as e:
        logger.exception("Workflow error for session %s", session_id)
        state.errors["orchestrator"] = str(e)


@router.post("/research", response_model=ResearchResponse)
async def start_research(
    body: ResearchRequest,
    background_tasks: BackgroundTasks,
) -> ResearchResponse:
    """
    Start a new scholarship research workflow for the given student profile.

    Returns immediately with a session ID.
    Use GET /api/stream/{session_id} to watch live progress.
    Use GET /api/results/{session_id} to get the final results.
    """
    settings = get_settings()
    session_id = body.session_id or str(uuid.uuid4())

    is_demo = settings.demo_mode or not settings.is_fully_configured

    state = WorkflowState(
        session_id=session_id,
        student_profile=body.student_profile,
        is_demo=is_demo,
    )
    set_session(session_id, state)

    # Start the workflow in the background
    background_tasks.add_task(_run_workflow, session_id)

    logger.info(
        "Research session %s started for %s (demo=%s)",
        session_id, body.student_profile.full_name, is_demo,
    )

    return ResearchResponse(
        session_id=session_id,
        message=(
            "Demo mode: no real API keys detected. Results will be clearly labeled."
            if is_demo else
            "Research started. Connect to the stream URL to watch live progress."
        ),
        stream_url=f"/api/stream/{session_id}",
        results_url=f"/api/results/{session_id}",
        is_demo=is_demo,
    )
