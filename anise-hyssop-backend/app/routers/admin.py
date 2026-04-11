"""
Admin (Management Dashboard) router — Phase 4 placeholder.

Will implement:
  GET  /api/admin/users                    — paginated volunteer list
  PUT  /api/admin/users/{id}               — superpower profile override
  PUT  /api/admin/users/{id}/waiver        — reset waiver
  PUT  /api/admin/memberships/{id}         — promote role
  POST /api/admin/bulk                     — bulk team/role operations
  POST /api/admin/annual-reset             — Jan 1 age recalc + waiver expiry
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/admin", tags=["admin"])

# Phase 4 will add all endpoints listed above.
