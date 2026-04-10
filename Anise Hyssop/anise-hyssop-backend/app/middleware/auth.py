"""
JWT authentication middleware.

Every protected route depends on `verify_token`. Admin routes additionally
depend on `require_admin`, which cross-checks GlobalRole in the Volunteers
sheet rather than trusting a JWT claim alone — this prevents a stale token
from granting elevated access after a role change.

JWKS keys are cached in memory for the process lifetime. If Auth0 rotates
keys, restart the server (or add TTL-based cache invalidation in Phase 6).
"""

import logging
from typing import Optional

import httpx
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt

from app.config import settings

logger = logging.getLogger(__name__)

security = HTTPBearer()

_jwks_cache: Optional[dict] = None


async def _get_jwks() -> dict:
    """Fetch and cache Auth0's public signing keys."""
    global _jwks_cache
    if _jwks_cache is None:
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://{settings.AUTH0_DOMAIN}/.well-known/jwks.json",
                timeout=10,
            )
            resp.raise_for_status()
            _jwks_cache = resp.json()
    return _jwks_cache


async def verify_token(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> dict:
    """
    FastAPI dependency. Validates the Auth0 JWT and returns the decoded payload.

    Usage:
        @router.get("/protected")
        async def route(payload: dict = Depends(verify_token)):
            email = payload["email"]
    """
    token = credentials.credentials
    jwks = await _get_jwks()

    # Identify the signing key by key ID (kid)
    try:
        unverified_header = jwt.get_unverified_header(token)
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token header",
        )

    rsa_key: dict = {}
    for key in jwks.get("keys", []):
        if key.get("kid") == unverified_header.get("kid"):
            rsa_key = {
                "kty": key["kty"],
                "kid": key["kid"],
                "use": key["use"],
                "n": key["n"],
                "e": key["e"],
            }
            break

    if not rsa_key:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No matching signing key found",
        )

    try:
        payload = jwt.decode(
            token,
            rsa_key,
            algorithms=["RS256"],
            audience=settings.AUTH0_AUDIENCE,
            issuer=f"https://{settings.AUTH0_DOMAIN}/",
        )
    except JWTError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Token validation failed: {exc}",
        )

    return payload


def _extract_email(payload: dict) -> str:
    """
    Auth0 embeds email in the standard `email` claim when the profile scope
    is requested. Fall back to a custom namespace claim if configured.
    """
    email = payload.get("email") or payload.get(
        f"{settings.AUTH0_AUDIENCE}/email"
    )
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email claim missing from token",
        )
    return email


async def require_admin(payload: dict = Depends(verify_token)) -> dict:
    """
    Dependency for admin-only routes. Verifies GlobalRole == 'Admin' against
    the Volunteers sheet — not just the JWT — to prevent stale-token elevation.

    Returns the payload dict augmented with a 'volunteer' key containing the
    raw sheet record for the authenticated admin.
    """
    from app.services.sheets import sheets  # late import avoids circular deps

    email = _extract_email(payload)
    volunteer = sheets.get_volunteer_by_email(email)

    if not volunteer or volunteer.get("GlobalRole") != "Admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )

    return {**payload, "volunteer": volunteer}
