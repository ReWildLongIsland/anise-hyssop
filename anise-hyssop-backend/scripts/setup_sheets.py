"""
Google Sheets setup script — run once per environment.

Usage:
    python -m scripts.setup_sheets

What it does:
  1. Connects to Google Sheets using the service account in .env.
  2. For the Volunteers and Memberships sheets, checks that the header row
     exists and matches the expected columns. If the sheet is blank, it writes
     the headers.
  3. Prints a status report so you can verify the connection is working before
     starting the server.

The Teams Config sheet is NOT touched here — it is maintained manually by
administrators via the Google Sheets UI.
"""

import sys
import os

# Allow running from repo root: python -m scripts.setup_sheets
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv()

from app.config import settings
from app.models.volunteer import VOLUNTEERS_HEADERS
from app.models.membership import MEMBERSHIPS_HEADERS
from app.services.sheets import TEAMS_HEADERS, SheetsService

import gspread
from google.oauth2.service_account import Credentials


SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly",
]

SHEET_CONFIGS = [
    {
        "name": "Volunteers",
        "id_env": "VOLUNTEERS_SHEET_ID",
        "sheet_id": settings.VOLUNTEERS_SHEET_ID,
        "headers": VOLUNTEERS_HEADERS,
        "readonly": False,
    },
    {
        "name": "Memberships",
        "id_env": "MEMBERSHIPS_SHEET_ID",
        "sheet_id": settings.MEMBERSHIPS_SHEET_ID,
        "headers": MEMBERSHIPS_HEADERS,
        "readonly": False,
    },
    {
        "name": "Teams Config",
        "id_env": "TEAMS_SHEET_ID",
        "sheet_id": settings.TEAMS_SHEET_ID,
        "headers": TEAMS_HEADERS,
        "readonly": True,   # App never writes here
    },
]


def check_or_create_headers(
    ws: gspread.Worksheet, expected: list[str], readonly: bool
) -> str:
    """
    Returns a status string. If the sheet is blank and not readonly, writes headers.
    """
    existing = ws.row_values(1)

    if not existing:
        if readonly:
            return "EMPTY (readonly — populate manually)"
        ws.update("A1", [expected])
        return "CREATED headers"

    if existing == expected:
        return "OK"

    missing = [h for h in expected if h not in existing]
    extra = [h for h in existing if h not in expected]
    parts = []
    if missing:
        parts.append(f"missing columns: {missing}")
    if extra:
        parts.append(f"unexpected columns: {extra}")
    return "MISMATCH — " + "; ".join(parts)


def main() -> None:
    print("\n── Anise Hyssop: Google Sheets Setup ──\n")

    # Verify credentials file exists
    creds_path = settings.GOOGLE_CREDENTIALS_FILE
    if not os.path.exists(creds_path):
        print(f"ERROR: Service account file not found at '{creds_path}'")
        print("  1. Go to Google Cloud Console → IAM & Admin → Service Accounts")
        print("  2. Create a service account and download the JSON key")
        print(f"  3. Save it to: {creds_path}")
        sys.exit(1)

    # Connect
    try:
        creds = Credentials.from_service_account_file(creds_path, scopes=SCOPES)
        client = gspread.authorize(creds)
        print(f"Connected as: {creds.service_account_email}\n")
    except Exception as e:
        print(f"ERROR: Could not connect to Google Sheets: {e}")
        sys.exit(1)

    # Check each sheet
    all_ok = True
    for cfg in SHEET_CONFIGS:
        sheet_id = cfg["sheet_id"]
        name = cfg["name"]

        if not sheet_id or sheet_id.startswith("your_"):
            print(f"  [{name}]  SKIPPED — {cfg['id_env']} not set in .env")
            all_ok = False
            continue

        try:
            ss = client.open_by_key(sheet_id)
            ws = ss.get_worksheet(0)
            status = check_or_create_headers(ws, cfg["headers"], cfg["readonly"])
            icon = "✓" if status in ("OK", "CREATED headers") else "✗"
            print(f"  {icon} [{name}]  {status}")
            if status not in ("OK", "CREATED headers") and not cfg["readonly"]:
                all_ok = False
        except gspread.exceptions.SpreadsheetNotFound:
            print(
                f"  ✗ [{name}]  NOT FOUND — check {cfg['id_env']} in .env "
                f"and share the sheet with {creds.service_account_email}"
            )
            all_ok = False
        except Exception as e:
            print(f"  ✗ [{name}]  ERROR — {e}")
            all_ok = False

    print()
    if all_ok:
        print("All sheets verified. You can start the server.\n")
    else:
        print(
            "One or more sheets need attention. Fix the issues above, "
            "then re-run this script.\n"
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
