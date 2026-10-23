"""
routers/stream.py — GET /api/stream/{session_id}

Server-Sent Events (SSE) endpoint.
The browser connects here and receives real-time agent progress events
as newline-delimited JSON.

What is SSE?
------------
SSE is a simple HTTP protocol where the server keeps the connection open
and sends lines of text prefixed with "data: " as events happen.
The browser's built-in EventSource API reads these automatically.
No WebSockets complexity needed!
"""

from __future__ import annotations

import asyncio
import json
import logging

from fastapi import APIRouter
from sse_starlette.sse import EventSourceResponse

from routers.research import get_session

logger = logging.getLogger(__name__)
router = APIRouter(tags=["stream"])

POLL_INTERVAL = 0.5   # seconds between checks for new events
MAX_WAIT_SECS = 300   # 5-minute timeout


@router.get("/stream/{session_id}")
async def stream_events(session_id: str):
    """
    SSE stream of agent events for a research session.

    Usage (browser):
        const es = new EventSource(`/api/stream/${sessionId}`);
        es.onmessage = (e) => console.log(JSON.parse(e.data));
    """
    state = get_session(session_id)

    async def event_generator():
        sent_count = 0
        elapsed = 0.0

        while elapsed < MAX_WAIT_SECS:
            events = state.events
            # Send any new events since we last checked
            for event in events[sent_count:]:
                yield {
                    "event": "agent_event",
                    "data": event.model_dump_json(),
                }
                sent_count += 1

            # Check if the workflow has completed (all agents done or failed)
            all_done = all(
                s in ("done", "failed", "skipped")
                for s in state.agent_statuses.values()
            )
            completed_at = state.completed_at

            if all_done and completed_at:
                yield {
                    "event": "workflow_complete",
                    "data": json.dumps({
                        "session_id": session_id,
                        "results_url": f"/api/results/{session_id}",
                        "is_demo": state.is_demo,
                    }),
                }
                return

            await asyncio.sleep(POLL_INTERVAL)
            elapsed += POLL_INTERVAL

        # Timeout
        yield {
            "event": "timeout",
            "data": json.dumps({"message": "Stream timed out after 5 minutes"}),
        }

    return EventSourceResponse(event_generator())
