"""
Auth0 Management API client.

Used for admin operations that require server-side Auth0 access:
  - Updating a user's email address
  - Deleting Auth0 credentials on account deletion
  - Looking up a user's Auth0 ID by email

Requires a Machine-to-Machine application in Auth0 with the Management API
audience and the following scopes:
  read:users  update:users  delete:users
"""

import logging
from typing import Optional

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


class Auth0ManagementService:
    """Wraps the Auth0 Management API v2."""

    def __init__(self) -> None:
        self._token: Optional[str] = None

    # ── Token ─────────────────────────────────────────────────────────────────

    async def _get_token(self) -> str:
        """Fetch a short-lived M2M access token. Tokens are cached for the
        lifetime of the request; production should add expiry-aware caching."""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://{settings.AUTH0_DOMAIN}/oauth/token",
                json={
                    "client_id": settings.AUTH0_M2M_CLIENT_ID,
                    "client_secret": settings.AUTH0_M2M_CLIENT_SECRET,
                    "audience": f"https://{settings.AUTH0_DOMAIN}/api/v2/",
                    "grant_type": "client_credentials",
                },
                timeout=10,
            )
            resp.raise_for_status()
            self._token = resp.json()["access_token"]
            return self._token

    async def _headers(self) -> dict:
        token = await self._get_token()
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        }

    # ── User lookups ──────────────────────────────────────────────────────────

    async def get_user_by_email(self, email: str) -> Optional[dict]:
        """Returns the Auth0 user object or None if not found."""
        headers = await self._headers()
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://{settings.AUTH0_DOMAIN}/api/v2/users-by-email",
                params={"email": email},
                headers=headers,
                timeout=10,
            )
            resp.raise_for_status()
            users = resp.json()
            return users[0] if users else None

    # ── Email change ──────────────────────────────────────────────────────────

    async def update_email(self, auth0_user_id: str, new_email: str) -> None:
        """
        Updates the user's email in Auth0 and marks it as unverified so Auth0
        sends a fresh verification link to the new address.
        Phase 4 also sends a revert notification to the old address.
        """
        headers = await self._headers()
        async with httpx.AsyncClient() as client:
            resp = await client.patch(
                f"https://{settings.AUTH0_DOMAIN}/api/v2/users/{auth0_user_id}",
                json={"email": new_email, "email_verified": False},
                headers=headers,
                timeout=10,
            )
            resp.raise_for_status()
            logger.info("Auth0 email updated for user %s", auth0_user_id)

    # ── Deletion ──────────────────────────────────────────────────────────────

    async def delete_user(self, auth0_user_id: str) -> None:
        """
        Permanently removes the user's credentials from Auth0.
        Called as part of the account deletion flow in Phase 3.
        The Google Sheet row is anonymised separately by the user router.
        """
        headers = await self._headers()
        async with httpx.AsyncClient() as client:
            resp = await client.delete(
                f"https://{settings.AUTH0_DOMAIN}/api/v2/users/{auth0_user_id}",
                headers=headers,
                timeout=10,
            )
            resp.raise_for_status()
            logger.info("Auth0 user %s deleted", auth0_user_id)


# ── Singleton ─────────────────────────────────────────────────────────────────
auth0_management = Auth0ManagementService()
