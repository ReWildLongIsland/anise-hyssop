from pydantic import BaseModel
from typing import Optional


# ── Sheet column names ──────────────────────────────────────────────────────
# These mirror the exact header row in the Volunteers Google Sheet.
VOLUNTEERS_HEADERS = [
    "VolunteerID",
    "Email",
    "FirstName",
    "LastName",
    "Town",
    "ZipCode",
    "DateOfBirth",
    "isAdult",
    "School",
    "Grade",
    "Status",
    "GlobalRole",
    "WaiverSignedDate",
    "WaiverFileURL",   # Google Drive link for uploaded Youth waiver documents
]


# ── Internal model (matches sheet columns) ──────────────────────────────────
class Volunteer(BaseModel):
    volunteer_id: str
    email: str
    first_name: str
    last_name: str
    town: str
    zip_code: str
    date_of_birth: Optional[str] = None   # YYYY-MM-DD; required for Youth, optional for Adults
    is_adult: bool
    school: Optional[str] = None          # Required for Youth
    grade: Optional[str] = None           # Required for Youth
    status: str                            # Pending | Active | Inactive
    global_role: str                       # Volunteer | Admin
    waiver_signed_date: Optional[str] = None
    waiver_file_url: Optional[str] = None  # Google Drive URL; Youth waivers only

    @classmethod
    def from_sheet_row(cls, row: dict) -> "Volunteer":
        return cls(
            volunteer_id=row["VolunteerID"],
            email=row["Email"],
            first_name=row["FirstName"],
            last_name=row["LastName"],
            town=row["Town"],
            zip_code=row["ZipCode"],
            date_of_birth=row.get("DateOfBirth") or None,
            is_adult=str(row.get("isAdult", "True")).lower() in ("true", "1", "yes"),
            school=row.get("School") or None,
            grade=row.get("Grade") or None,
            status=row.get("Status", "Pending"),
            global_role=row.get("GlobalRole", "Volunteer"),
            waiver_signed_date=row.get("WaiverSignedDate") or None,
            waiver_file_url=row.get("WaiverFileURL") or None,
        )

    def to_sheet_row(self) -> dict:
        return {
            "VolunteerID": self.volunteer_id,
            "Email": self.email,
            "FirstName": self.first_name,
            "LastName": self.last_name,
            "Town": self.town,
            "ZipCode": self.zip_code,
            "DateOfBirth": self.date_of_birth or "",
            "isAdult": str(self.is_adult),
            "School": self.school or "",
            "Grade": self.grade or "",
            "Status": self.status,
            "GlobalRole": self.global_role,
            "WaiverSignedDate": self.waiver_signed_date or "",
            "WaiverFileURL": self.waiver_file_url or "",
        }


# ── Public model (safe subset sent to the frontend) ─────────────────────────
class VolunteerPublic(BaseModel):
    id: str
    email: str
    firstName: str
    lastName: str
    town: str
    zipCode: str
    status: str
    globalRole: str
    isAdult: bool
    waiverSignedAt: Optional[str] = None
    school: Optional[str] = None
    grade: Optional[str] = None
    # dateOfBirth intentionally omitted from the default public shape;
    # Admin endpoints include it separately when needed.

    @classmethod
    def from_volunteer(cls, v: Volunteer) -> "VolunteerPublic":
        return cls(
            id=v.volunteer_id,
            email=v.email,
            firstName=v.first_name,
            lastName=v.last_name,
            town=v.town,
            zipCode=v.zip_code,
            status=v.status,
            globalRole=v.global_role,
            isAdult=v.is_adult,
            waiverSignedAt=v.waiver_signed_date,
            school=v.school,
            grade=v.grade,
        )
