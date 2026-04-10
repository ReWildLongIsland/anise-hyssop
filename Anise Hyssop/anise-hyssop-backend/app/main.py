"""
Anise Hyssop — FastAPI application entry point.

Start locally:
    uvicorn app.main:app --reload --port 8000

The Vite dev server proxies /api/* to this process.
"""

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import admin, auth, registration, teams, user

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Anise Hyssop API",
    description="ReWild Long Island Volunteer Management Portal",
    version="0.7.1",
)

# ── CORS ──────────────────────────────────────────────────────────────────────
# Allow only the configured frontend origin. Tighten to specific methods/headers
# before production if desired.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[settings.FRONTEND_URL],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────────────────
app.include_router(teams.router)
app.include_router(auth.router)
app.include_router(registration.router)
app.include_router(user.router)
app.include_router(admin.router)


# ── Health check ──────────────────────────────────────────────────────────────
@app.get("/health", tags=["meta"])
async def health():
    return {"status": "ok", "version": "0.7.1"}
