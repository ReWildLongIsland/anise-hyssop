"""
Auth router — Phase 1 placeholder.

The mock /api/auth/login and /api/auth/check-email endpoints from the
frontend prototype will be replaced in Phase 1 with real Auth0 callback
handling. This file is intentionally minimal for Phase 0.
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/auth", tags=["auth"])

# Phase 1 will add:
#   POST /api/auth/callback  — receives Auth0 code, exchanges for tokens
#   POST /api/auth/me        — returns current user profile from the sheet
