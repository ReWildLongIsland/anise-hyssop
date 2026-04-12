"""
Registration router — Phase 2.

POST /api/registration/complete — validates registration data, writes Volunteer
and Membership rows to Google Sheets, optionally uploads Youth waiver to Drive.
"""

import logging
import uuid
from datetime import date

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status

from app.middleware.auth import verify_token
from app.models.membership import DEFAULT_ROLES, MEMBERSHIPS_HEADERS
from app.models.volunteer import VOLUNTEERS_HEADERS
from app.services.sheets import sheets

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/registration", tags=["registration"])


@router.post("/complete")
async def complete_registration(
    firstName: str = Form(...),
    lastName: str = Form(...),
    town: str = Form(...),
    zipCode: str = Form(...),
    isAdult: str = Form(...),
    selectedTeams: str = Form(...),      # JSON array string, e.g. '["T1","T2"]'
    dateOfBirth: str = Form(""),
    school: str = Form(""),
    grade: str = Form(""),
    waiverAgreed: str = Form("false"),
    youthWaiverFile: UploadFile | None = File(None),
    payload: dict = Depends(verify_token),
):
    """
    Final step of registration. Writes Volunteer + Membership rows.
    Protected by Auth0 JWT — email comes from the token, not the form.
    """
    import json

    email = payload.get("email")
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Email claim missing from token",
        )

    # Guard: don't allow double registration
    existing = sheets.get_volunteer_by_email(email)
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="User already registered",
        )

    is_adult = isAdult.lower() in ("true", "1", "yes")

    # Validate Youth fields
    if not is_adult:
        if not dateOfBirth:
            raise HTTPException(status_code=422, detail="Date of birth required for Youth")
        if not school:
            raise HTTPException(status_code=422, detail="School required for Youth")
        if not grade:
            raise HTTPException(status_code=422, detail="Grade required for Youth")
        if not youthWaiverFile:
            raise HTTPException(status_code=422, detail="Youth waiver file required")

    # Validate Adult waiver
    if is_adult and waiverAgreed.lower() not in ("true", "1", "yes"):
        raise HTTPException(status_code=422, detail="Waiver agreement required")

    # Parse selected teams
    try:
        team_ids = json.loads(selectedTeams)
    except json.JSONDecodeError:
        raise HTTPException(status_code=422, detail="Invalid selectedTeams format")

    if not team_ids:
        raise HTTPException(status_code=422, detail="At least one team must be selected")

    # Upload Youth waiver to Drive
    waiver_file_url = ""
    if not is_adult and youthWaiverFile:
        try:
            from app.services.drive_service import drive_service
            file_content = await youthWaiverFile.read()
            waiver_file_url = drive_service.upload_waiver(
                file_content=file_content,
                file_name=youthWaiverFile.filename or "waiver.pdf",
                content_type=youthWaiverFile.content_type or "application/pdf",
                volunteer_email=email,
            )
        except Exception as exc:
            logger.error("Youth waiver upload failed: %s", exc)
            raise HTTPException(status_code=500, detail="Waiver upload failed")

    # Generate volunteer ID and write to Sheets
    volunteer_id = f"V-{uuid.uuid4().hex[:8].upper()}"
    today = date.today().isoformat()

    volunteer_data = {
        "VolunteerID": volunteer_id,
        "Email": email,
        "FirstName": firstName.strip(),
        "LastName": lastName.strip(),
        "Town": town.strip(),
        "ZipCode": zipCode.strip(),
        "DateOfBirth": dateOfBirth if not is_adult else "",
        "isAdult": str(is_adult),
        "School": school if not is_adult else "",
        "Grade": grade if not is_adult else "",
        "Status": "Active",
        "GlobalRole": "Volunteer",
        "WaiverSignedDate": today,
        "WaiverFileURL": waiver_file_url,
    }

    sheets.create_volunteer(volunteer_data)
    logger.info("Created volunteer %s for %s", volunteer_id, email)

    # Write Membership rows — one per selected team with default role
    all_teams = sheets.get_teams()
    teams_by_id = {t["id"]: t for t in all_teams}

    for team_id in team_ids:
        team = teams_by_id.get(team_id)
        if not team:
            logger.warning("Unknown team ID %s, skipping", team_id)
            continue

        team_type = team["type"]

        # Youth cannot join Committees
        if not is_adult and team_type == "Committee":
            logger.info("Skipping Committee %s for Youth user", team_id)
            continue

        role_key = "adult" if is_adult else "youth"
        default_role = DEFAULT_ROLES.get(team_type, {}).get(role_key)
        if not default_role:
            logger.warning("No default role for %s/%s, skipping", team_type, role_key)
            continue

        membership_id = f"M-{uuid.uuid4().hex[:8].upper()}"
        membership_data = {
            "MembershipID": membership_id,
            "VolunteerID": volunteer_id,
            "TeamID": team_id,
            "Role": default_role,
            "DateJoined": today,
        }
        sheets.create_membership(membership_data)
        logger.info("Created membership %s: %s -> %s (%s)", membership_id, volunteer_id, team_id, default_role)

    return {"isNewUser": False, "volunteer": volunteer_data}
