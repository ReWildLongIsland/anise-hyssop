"""
Google Drive service — uploads Youth waiver files.

Uses the same service account credentials as the Sheets service.
Files are stored in a configurable Drive folder. If no folder ID is
configured, files are uploaded to the service account's root.
"""

import io
import logging

from google.oauth2.service_account import Credentials
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseUpload

from app.config import settings

logger = logging.getLogger(__name__)

SCOPES = [
    "https://www.googleapis.com/auth/drive.file",
]


class DriveService:
    """Thin wrapper around the Google Drive API for waiver uploads."""

    def __init__(self) -> None:
        self._service = None

    def _get_service(self):
        if self._service is None:
            creds = Credentials.from_service_account_file(
                settings.GOOGLE_CREDENTIALS_FILE,
                scopes=SCOPES,
            )
            self._service = build("drive", "v3", credentials=creds)
        return self._service

    def upload_waiver(
        self,
        file_content: bytes,
        file_name: str,
        content_type: str,
        volunteer_email: str,
    ) -> str:
        """
        Upload a Youth waiver file to Google Drive.
        Returns the web-viewable URL of the uploaded file.
        """
        service = self._get_service()

        safe_name = f"waiver_{volunteer_email}_{file_name}"

        file_metadata: dict = {"name": safe_name}

        # If a waiver folder ID is configured, upload into it
        folder_id = getattr(settings, "DRIVE_WAIVER_FOLDER_ID", "")
        if folder_id:
            file_metadata["parents"] = [folder_id]

        media = MediaIoBaseUpload(
            io.BytesIO(file_content),
            mimetype=content_type,
            resumable=False,
        )

        uploaded = (
            service.files()
            .create(body=file_metadata, media_body=media, fields="id,webViewLink")
            .execute()
        )

        file_id = uploaded["id"]
        web_link = uploaded.get("webViewLink", f"https://drive.google.com/file/d/{file_id}/view")

        # Make viewable by anyone with the link
        service.permissions().create(
            fileId=file_id,
            body={"type": "anyone", "role": "reader"},
        ).execute()

        logger.info("Uploaded waiver %s for %s → %s", file_name, volunteer_email, web_link)
        return web_link


# Singleton
drive_service = DriveService()
