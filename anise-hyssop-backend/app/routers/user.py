"""
User (Volunteer Portal) router — Phase 3 placeholder.

Will implement:
  GET    /api/user/profile  — return volunteer profile + memberships
  DELETE /api/user/profile  — anonymise sheet row, delete Auth0 credentials
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/user", tags=["user"])

# Phase 3 will add:
#   GET    /api/user/profile
#   DELETE /api/user/profile
