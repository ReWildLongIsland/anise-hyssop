"""
One-time script to reset all three Google Sheets with clean headers.
Clears existing data and writes correct headers (no trailing spaces).

Run from the backend directory with venv active:
    python scripts/reset_sheets.py
"""

import gspread
from google.oauth2.service_account import Credentials
from dotenv import load_dotenv
import os

load_dotenv()

SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.readonly",
]

GOOGLE_CREDENTIALS_FILE = os.getenv("GOOGLE_CREDENTIALS_FILE", "./credentials/service-account.json")
VOLUNTEERS_SHEET_ID = os.getenv("VOLUNTEERS_SHEET_ID")
MEMBERSHIPS_SHEET_ID = os.getenv("MEMBERSHIPS_SHEET_ID")
TEAMS_SHEET_ID = os.getenv("TEAMS_SHEET_ID")

creds = Credentials.from_service_account_file(GOOGLE_CREDENTIALS_FILE, scopes=SCOPES)
client = gspread.authorize(creds)

# ── 1. Volunteers Sheet ──────────────────────────────────────────────────────
print("Resetting Volunteers sheet...")
ws_vol = client.open_by_key(VOLUNTEERS_SHEET_ID).sheet1
ws_vol.clear()
vol_headers = [
    "VolunteerID", "Email", "FirstName", "LastName", "Town", "ZipCode",
    "DateOfBirth", "isAdult", "School", "Grade", "Status", "GlobalRole",
    "WaiverSignedDate", "WaiverFileURL",
]
ws_vol.update(values=[vol_headers], range_name="A1", value_input_option="RAW")
print(f"  Wrote {len(vol_headers)} headers to Volunteers sheet.")

# ── 2. Memberships Sheet ─────────────────────────────────────────────────────
print("Resetting Memberships sheet...")
ws_mem = client.open_by_key(MEMBERSHIPS_SHEET_ID).sheet1
ws_mem.clear()
mem_headers = ["MembershipID", "VolunteerID", "TeamID", "Role", "DateJoined"]
ws_mem.update(values=[mem_headers], range_name="A1", value_input_option="RAW")
print(f"  Wrote {len(mem_headers)} headers to Memberships sheet.")

# ── 3. Teams Config Sheet ────────────────────────────────────────────────────
print("Resetting Teams Config sheet...")
ws_teams = client.open_by_key(TEAMS_SHEET_ID).sheet1
ws_teams.clear()

teams_headers = ["TeamID", "Name", "Type", "Description", "ZipCodes"]
teams_rows = [
    teams_headers,
    ["CH-COWNECK", "Cow Neck Chapter", "Chapter",
     "Locations include Port Washington, Manhasset, and Roslyn and nearby areas. As ReWild's founding chapter, we focus on native plant education and hands-on rewilding projects within our local community.",
     "11050,11051,11052,11053,11054,11055,11030,11576,11577"],
    ["CH-SNASSAU", "South Nassau Chapter", "Chapter",
     "Locations include Rockville Centre, Valley Stream, Baldwin, North Massapequa, and Merrick and nearby areas. This chapter supports rewilding efforts across Nassau County's southern shore.",
     "11570,11580,11581,11510,11758,11566,11572,11518,11563"],
    ["CH-MIDSUFFOLK", "Mid Suffolk Chapter", "Chapter",
     "Locations include the Town of Brookhaven and eastern parts of Smithtown and Islip and nearby areas. We work to restore biodiversity through community-driven native planting projects in central Suffolk.",
     "11772,11713,11715,11719,11720,11727,11733,11738,11741,11742,11763,11764,11766,11767,11776,11777,11778,11779,11780,11784,11786,11787,11788,11789,11790,11792,11794,11950,11951,11953,11961,11967,11973,11980"],
    ["CH-NFORK", "North Fork Chapter", "Chapter",
     "Locations include Riverhead, Southold, and Orient and nearby areas. Our work includes native garden maintenance, educational programs, and partnering with local organizations for sustainable landscaping.",
     "11901,11931,11933,11935,11939,11941,11944,11947,11948,11952,11957,11958,11970,11971"],
    ["CH-SFORK", "South Fork Chapter", "Chapter",
     "Locations include Hampton Bays, East Hampton, Amagansett, Sag Harbor, and Montauk and nearby areas. We manage the Summer Program to Fight Hunger, community gardens, and local composting initiatives.",
     "11930,11932,11937,11946,11954,11959,11962,11963,11968,11975,11976"],
    ["CH-WSUFFOLK", "West Suffolk Chapter", "Chapter",
     "Locations include Huntington, Deer Park, and Kings Park and nearby areas. We lead regional maintenance projects and host community library talks on native gardening.",
     "11743,11721,11724,11725,11729,11731,11740,11746,11747,11754,11768"],
    ["CM-ACCOUNTS", "Accounts Committee", "Committee",
     "Manages ReWild's budget and tracks spending in collaboration with professional bookkeepers. Ideal for volunteers with accounting skills.",
     ""],
    ["CM-COMPOST", "Compost Crew", "Committee",
     "Educates individuals and municipal governments on the benefits and practices of composting to reduce waste and enrich soil.",
     ""],
    ["CM-GARDENS", "Gardens Program", "Committee",
     "Screens and awards garden grants to community groups annually and tracks the ongoing success of these rewilded spaces.",
     ""],
    ["CM-GRANTS", "Grants Committee", "Committee",
     "Prospects for new funding opportunities, responds to RFPs, and manages reporting for current grants. No prior experience needed.",
     ""],
    ["CM-LABELING", "Native Labeling Team", "Committee",
     "Advocates for native plants at local nurseries by labeling them to make them more visible and accessible to consumers.",
     ""],
    ["CM-PLANTSALES", "Plant Sales Committee", "Committee",
     "Organizes the popular Spring and Fall Native Plant Sales, from plant selection and procurement to volunteer coordination.",
     ""],
    ["CM-SOCIALMEDIA", "Social Media & Web Committee", "Committee",
     "Manages ReWild's digital presence, including the newsletter, social content, and overall communications strategy.",
     ""],
    ["CM-SPEAKERS", "Speakers Bureau", "Committee",
     "Trains volunteers to become articulate advocates for rewilding and organizes webinars and presentations at local venues.",
     ""],
    ["CM-TEACHERS", "Teachers Network", "Committee",
     "An emerging group developing a curriculum based on native ecosystems for real-world student engagement.",
     ""],
    ["PG-NORTHSHORE", "North Shore Summer Program", "Program",
     "Our sites range from Port Washington to Huntington on the North Shore of Long Island. Open to adults and youth who would like to work outdoors to protect our environment.",
     "11050,11051,11052,11053,11054,11055,11030,11576,11577,11743,11721,11724,11725,11740,11746,11768,11542,11545,11548,11731,11791,11797"],
    ["PG-SOUTHFORK", "South Fork Summer Program", "Program",
     "Our sites are located around East Hampton on the South Fork of Long Island. Open to adults and youth who would like to work outdoors to protect our environment.",
     "11937,11930,11932,11962,11963,11975,11968,11976,11954,11964,11965,11959,11942,11946"],
]

ws_teams.update(values=teams_rows, range_name="A1", value_input_option="RAW")
print(f"  Wrote {len(teams_rows) - 1} teams to Teams Config sheet.")

print("\nDone! All three sheets reset with clean headers.")
