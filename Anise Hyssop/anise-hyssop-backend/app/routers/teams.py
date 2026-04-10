"""
Teams router — Phase 0.

GET /api/teams is the only unauthenticated endpoint in the application.
It serves the Teams Config sheet so the frontend can render the team
selection grid and apply zip-code pre-selection logic.
"""

from fastapi import APIRouter, HTTPException

from app.services.sheets import sheets

router = APIRouter(prefix="/api/teams", tags=["teams"])


@router.get("")
async def get_teams():
    """
    Returns all teams from the Teams Config Google Sheet.
    Shape: { id, name, type, description, zipCodes[] }
    """
    try:
        return sheets.get_teams()
    except Exception as exc:
        raise HTTPException(status_code=503, detail=f"Teams config unavailable: {exc}")
