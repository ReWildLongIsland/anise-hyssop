"""
Registration router — Phase 2 placeholder.

Will implement the 5-step registration commit logic:
  POST /api/registration/identity   — write Pending row to Volunteers sheet
  POST /api/registration/complete   — finalize waiver, write Memberships,
                                      flip Status to Active
"""

from fastapi import APIRouter

router = APIRouter(prefix="/api/registration", tags=["registration"])

# Phase 2 will add:
#   POST /api/registration/identity
#   POST /api/registration/complete
