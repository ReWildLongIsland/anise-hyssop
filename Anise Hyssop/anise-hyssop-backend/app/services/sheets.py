"""
Google Sheets service layer.

All reads and writes to the three core sheets (Volunteers, Memberships,
Teams Config) go through this module. The rest of the application never
touches the Sheets API directly.
"""

import logging
from typing import Optional

import gspread
from google.oauth2.service_account import Credentials

from app.config import settings
from app.models.volunteer import VOLUNTEERS_HEADERS
from app.models.membership import MEMBERSHIPS_HEADERS

logger = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly",
]

TEAMS_HEADERS = ["TeamID", "Name", "Type", "Description", "ZipCodes"]


class SheetsService:
    """Thin wrapper around gspread. One instance per application lifetime."""

    def __init__(self) -> None:
        self._client: Optional[gspread.Client] = None

    # ── Connection ────────────────────────────────────────────────────────────

    def _get_client(self) -> gspread.Client:
        if self._client is None:
            creds = Credentials.from_service_account_file(
                settings.GOOGLE_CREDENTIALS_FILE,
                scopes=SCOPES,
            )
            self._client = gspread.authorize(creds)
        return self._client

    def _worksheet(self, sheet_id: str, index: int = 0) -> gspread.Worksheet:
        return self._get_client().open_by_key(sheet_id).get_worksheet(index)

    # ── Generic helpers ───────────────────────────────────────────────────────

    def _all_records(self, sheet_id: str) -> list[dict]:
        """Return all data rows as a list of dicts keyed by the header row."""
        return self._worksheet(sheet_id).get_all_records()

    def _find_row(
        self, sheet_id: str, column: str, value: str
    ) -> Optional[tuple[int, dict]]:
        """
        Search for the first row where `column` == `value` (case-insensitive).
        Returns (1-based row index including header, record dict) or None.
        """
        records = self._all_records(sheet_id)
        for i, record in enumerate(records):
            if str(record.get(column, "")).strip().lower() == str(value).strip().lower():
                return (i + 2, record)   # +1 for 0-index, +1 for header row
        return None

    def _append(self, sheet_id: str, headers: list[str], data: dict) -> None:
        row = [str(data.get(h, "")) for h in headers]
        self._worksheet(sheet_id).append_row(row, value_input_option="USER_ENTERED")

    def _update_row(
        self, sheet_id: str, row_index: int, headers: list[str], data: dict
    ) -> None:
        ws = self._worksheet(sheet_id)
        row = [str(data.get(h, "")) for h in headers]
        end_col = chr(ord("A") + len(headers) - 1)
        ws.update(
            f"A{row_index}:{end_col}{row_index}",
            [row],
            value_input_option="USER_ENTERED",
        )

    # ── Teams Config (read-only) ──────────────────────────────────────────────

    def get_teams(self) -> list[dict]:
        """
        Returns all teams from the config sheet, with ZipCodes parsed into a list.
        This sheet is never written to by the application.
        """
        records = self._all_records(settings.TEAMS_SHEET_ID)
        teams = []
        for r in records:
            raw_zips = r.get("ZipCodes", "")
            zip_codes = (
                [z.strip() for z in raw_zips.split(",") if z.strip()]
                if raw_zips
                else []
            )
            teams.append(
                {
                    "id": r["TeamID"],
                    "name": r["Name"],
                    "type": r["Type"],
                    "description": r.get("Description", ""),
                    "zipCodes": zip_codes,
                }
            )
        return teams

    def get_team_by_id(self, team_id: str) -> Optional[dict]:
        all_teams = self.get_teams()
        return next((t for t in all_teams if t["id"] == team_id), None)

    # ── Volunteers ────────────────────────────────────────────────────────────

    def get_all_volunteers(self) -> list[dict]:
        return self._all_records(settings.VOLUNTEERS_SHEET_ID)

    def get_volunteer_by_email(self, email: str) -> Optional[dict]:
        result = self._find_row(settings.VOLUNTEERS_SHEET_ID, "Email", email)
        return result[1] if result else None

    def get_volunteer_by_id(self, volunteer_id: str) -> Optional[tuple[int, dict]]:
        """Returns (row_index, record) or None."""
        return self._find_row(settings.VOLUNTEERS_SHEET_ID, "VolunteerID", volunteer_id)

    def create_volunteer(self, data: dict) -> None:
        self._append(settings.VOLUNTEERS_SHEET_ID, VOLUNTEERS_HEADERS, data)

    def update_volunteer(self, row_index: int, data: dict) -> None:
        self._update_row(
            settings.VOLUNTEERS_SHEET_ID, row_index, VOLUNTEERS_HEADERS, data
        )

    # ── Memberships ───────────────────────────────────────────────────────────

    def get_memberships_for_volunteer(self, volunteer_id: str) -> list[dict]:
        records = self._all_records(settings.MEMBERSHIPS_SHEET_ID)
        return [r for r in records if r.get("VolunteerID") == volunteer_id]

    def get_all_memberships(self) -> list[dict]:
        return self._all_records(settings.MEMBERSHIPS_SHEET_ID)

    def get_membership_by_id(
        self, membership_id: str
    ) -> Optional[tuple[int, dict]]:
        return self._find_row(
            settings.MEMBERSHIPS_SHEET_ID, "MembershipID", membership_id
        )

    def create_membership(self, data: dict) -> None:
        self._append(settings.MEMBERSHIPS_SHEET_ID, MEMBERSHIPS_HEADERS, data)

    def update_membership(self, row_index: int, data: dict) -> None:
        self._update_row(
            settings.MEMBERSHIPS_SHEET_ID, row_index, MEMBERSHIPS_HEADERS, data
        )

    def delete_memberships_for_volunteer(self, volunteer_id: str) -> None:
        """
        Used during account deletion. Retains rows but could also remove them —
        per PRD, team history is retained for grant reporting, so we leave rows.
        This method is a no-op placeholder; call update_membership to anonymise
        if needed in Phase 3.
        """
        pass


# ── Singleton ─────────────────────────────────────────────────────────────────
# Imported by routers as: from app.services.sheets import sheets
sheets = SheetsService()
