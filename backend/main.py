"""
main.py — FastAPI application entry point.

Registers all routers, configures CORS, and provides the /api/health endpoint.
Run with:  uvicorn main:app --reload --port 8000
"""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from routers import research, results, stream, upload, profile

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle hook."""
    settings = get_settings()
    logger.info("═" * 60)
    logger.info("  ScholarSwarm AI — Backend starting")
    logger.info("  LLM provider : %s (%s)", settings.llm_provider, settings.effective_llm_model)
    logger.info("  Demo mode    : %s", settings.demo_mode)
    if not settings.is_fully_configured and not settings.demo_mode:
        logger.warning("  ⚠ Missing keys: %s", ", ".join(settings.missing_keys()))
        logger.warning("  ⚠ Set DEMO_MODE=true in .env to run without real keys.")
    else:
        logger.info("  ✓ All API keys present — full AI mode active")
    logger.info("═" * 60)
    yield
    logger.info("ScholarSwarm AI backend shutting down.")


app = FastAPI(
    title="ScholarSwarm AI",
    description="AI agent swarm for finding master's scholarships abroad",
    version="1.0.0",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────────────
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────
app.include_router(research.router, prefix="/api")
app.include_router(stream.router,   prefix="/api")
app.include_router(results.router,  prefix="/api")
app.include_router(upload.router,   prefix="/api")
app.include_router(profile.router,  prefix="/api")


# ── Health check ─────────────────────────────────────────────
@app.get("/api/health", tags=["system"])
async def health():
    """
    Returns the system health and configuration status.
    The frontend uses this to decide whether to show a warning banner.
    """
    cfg = get_settings()
    return {
        "status": "ok",
        "demo_mode": cfg.demo_mode,
        "llm_provider": cfg.llm_provider,
        "llm_model": cfg.effective_llm_model,
        "has_llm_key": cfg.has_llm_key,
        "has_search_key": cfg.has_search_key,
        "fully_configured": cfg.is_fully_configured,
        "missing_keys": cfg.missing_keys(),
    }
