"""
routers/results.py — GET /api/results/{session_id}

Returns the final workflow results once the pipeline completes.
"""

from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException

from routers.research import get_session

logger = logging.getLogger(__name__)
router = APIRouter(tags=["results"])


@router.get("/results/{session_id}")
async def get_results(session_id: str):
    """
    Return the final results for a completed research session.

    The frontend should call this after receiving a 'workflow_complete'
    SSE event, or can poll this endpoint periodically.
    """
    state = get_session(session_id)

    return {
        "session_id": session_id,
        "is_demo": state.is_demo,
        "student_name": state.student_profile.full_name,
        "agent_statuses": state.agent_statuses,
        "errors": state.errors,
        "opportunities_found": len(state.opportunities),
        "opportunities": [o.model_dump() for o in state.opportunities],
        "top_opportunities": [o.model_dump() for o in state.top_opportunities],
        "sop": state.sop.model_dump() if state.sop else None,
        "checklists": [c.model_dump() for c in state.checklists],
        "started_at": state.started_at,
        "completed_at": state.completed_at,
        "events": [e.model_dump() for e in state.events],
    }
