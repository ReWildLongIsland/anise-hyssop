"""
Auth router — Phase 1.

GET /api/auth/me  — returns the volunteer's Sheets record if it exists,
                    or { isNewUser: true } if this is a first-time login.
                    Protected by Auth0 JWT verification.
"""

import logging

from fastapi import APIRouter, Depends, HTTPException, status

from app.middleware.auth import verify_token
from app.services.sheets import sheets

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.get("/me")
async def get_me(payload: dict = Depends(verify_token)):
    """
    Called by the frontend immediately after Auth0 login.
    Determines whether the user needs to complete registration
    or can proceed directly to the Volunteer Portal.
    """
    email = payload.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email claim missing from token",
        )

    logger.info("GET /me — looking up email=%r", email)
    all_vols = sheets.get_all_volunteers()
    logger.info("GET /me — sheet has %d rows, columns=%s", len(all_vols), list(all_vols[0].keys()) if all_vols else "EMPTY")
    volunteer = sheets.get_volunteer_by_email(email)
    logger.info("GET /me — lookup result: %s", "FOUND" if volunteer else "NOT FOUND")

    if volunteer is None:
        return {"isNewUser": True, "email": email}

    return {"isNewUser": False, "volunteer": volunteer}
