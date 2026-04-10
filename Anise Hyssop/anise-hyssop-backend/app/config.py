from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Auth0 — SPA application
    AUTH0_DOMAIN: str
    AUTH0_AUDIENCE: str

    # Auth0 — Machine-to-Machine app (Management API access)
    AUTH0_M2M_CLIENT_ID: str = ""
    AUTH0_M2M_CLIENT_SECRET: str = ""

    # Google Sheets
    GOOGLE_CREDENTIALS_FILE: str = "./credentials/service-account.json"
    VOLUNTEERS_SHEET_ID: str
    MEMBERSHIPS_SHEET_ID: str
    TEAMS_SHEET_ID: str

    # App
    FRONTEND_URL: str = "http://localhost:5173"


settings = Settings()
