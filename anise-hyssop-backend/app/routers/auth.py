"""
Auth router — Phase 1.

GET /api/auth/me  — returns the volunteer's Sheets record if it exists,
                    or { isNewUser: true } if this is a first-time login.
                    Protected by Auth0 JWT verification.
"""

from fastapi import APIRouter, Depends, HTTPException, status

from app.middleware.auth import verify_token
from app.services.sheets import sheets

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

    volunteer = sheets.get_volunteer_by_email(email)

    if volunteer is None:
        return {"isNewUser": True, "email": email}

    return {"isNewUser": False, "volunteer": volunteer}
