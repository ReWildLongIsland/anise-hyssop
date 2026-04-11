from pydantic import BaseModel
from typing import Optional


# ── Sheet column names ──────────────────────────────────────────────────────
MEMBERSHIPS_HEADERS = [
    "MembershipID",
    "VolunteerID",
    "TeamID",
    "Role",
    "DateJoined",
]


# ── Role constants by team type ─────────────────────────────────────────────
DEFAULT_ROLES = {
    "Chapter": {"adult": "Adult Volunteer", "youth": "Youth Volunteer"},
    "Committee": {"adult": "Adult Prospect", "youth": None},   # Youth blocked
    "Program": {"adult": "Adult Prospect", "youth": "Youth Prospect"},
}

PROMOTABLE_ROLES = {
    "Chapter": ["Lead"],
    "Committee": ["Member", "Lead"],
    "Program": [
        "Adult Volunteer",
        "Youth Volunteer",
        "Student Intern",
        "Student Organizer",
        "Adult Organizer",
    ],
}


# ── Internal model ───────────────────────────────────────────────────────────
class Membership(BaseModel):
    membership_id: str
    volunteer_id: str
    team_id: str
    role: str
    date_joined: str   # YYYY-MM-DD

    @classmethod
    def from_sheet_row(cls, row: dict) -> "Membership":
        return cls(
            membership_id=row["MembershipID"],
            volunteer_id=row["VolunteerID"],
            team_id=row["TeamID"],
            role=row["Role"],
            date_joined=row["DateJoined"],
        )

    def to_sheet_row(self) -> dict:
        return {
            "MembershipID": self.membership_id,
            "VolunteerID": self.volunteer_id,
            "TeamID": self.team_id,
            "Role": self.role,
            "DateJoined": self.date_joined,
        }


# ── Public model ─────────────────────────────────────────────────────────────
class MembershipPublic(BaseModel):
    id: str
    teamId: str
    teamName: str
    teamType: str
    role: str
    assignedAt: str
    promotableTo: Optional[list[str]] = None   # populated for Admin views

    @classmethod
    def from_membership(
        cls,
        m: Membership,
        team_name: str,
        team_type: str,
        include_promotions: bool = False,
    ) -> "MembershipPublic":
        return cls(
            id=m.membership_id,
            teamId=m.team_id,
            teamName=team_name,
            teamType=team_type,
            role=m.role,
            assignedAt=m.date_joined,
            promotableTo=PROMOTABLE_ROLES.get(team_type) if include_promotions else None,
        )
