# Anise Hyssop — Build Plan

> **Purpose of this file:** Single source of truth for what's been built, what's next, and any decisions made along the way. Read this before starting work on either machine. Update it before pushing.

---

## Quick Status

| Phase | Status | Last updated |
|-------|--------|--------------|
| Phase 0 — Foundation & Scaffolding | **COMPLETE** | 2026-04-10 |
| Phase 1 — Authentication Layer | **COMPLETE** | 2026-04-11 |
| Phase 2 — Registration Flow | **COMPLETE** | 2026-04-11 |
| Phase 3 — Volunteer Portal | In progress | 2026-04-11 |
| Phase 4 — Admin Dashboard | Not started | — |
| Phase 5 — Business Logic & Compliance | Not started | — |
| Phase 6 — Deployment & Hardening | Not started | — |

---

## Working Across Two Computers

**Before starting work:**
```bash
cd "C:\Users\raju\Desktop\Code"   # or your path on the other machine
git pull
```

**After finishing work:**
```bash
git add .
git commit -m "describe what you did"
git push
```

**Secrets (never committed):** Copy these manually between machines:
- `anise-hyssop-backend/.env`
- `anise-hyssop-backend/credentials/service-account.json`
- `anise-hyssop-frontend/.env`

---

## Phase 0 — Foundation & Scaffolding ✅

**Goal:** Project structure, tooling, and service layers in place so everything can talk to everything.

### What was built
- **Backend skeleton** (`anise-hyssop-backend/`)
  - `app/config.py` — Pydantic settings from `.env`
  - `app/models/volunteer.py` — Volunteer + VolunteerPublic, VOLUNTEERS_HEADERS
  - `app/models/membership.py` — Membership + MembershipPublic, DEFAULT_ROLES, PROMOTABLE_ROLES
  - `app/services/sheets.py` — Full Google Sheets CRUD layer (singleton `sheets`)
  - `app/services/auth0_service.py` — Auth0 Management API wrapper (singleton `auth0_management`)
  - `app/middleware/auth.py` — JWT validation via Auth0 JWKS (`verify_token`, `require_admin`)
  - `app/routers/teams.py` — `GET /api/teams` (live, reads from Teams Config sheet)
  - `app/routers/auth.py`, `registration.py`, `user.py`, `admin.py` — stubs for Phases 1–4
  - `app/main.py` — FastAPI app, CORS, router registration, `/health`
  - `scripts/setup_sheets.py` — Verifies sheet headers; run once per environment
  - `Dockerfile` — Production image for Cloud Run
  - `requirements.txt`, `.env.example`, `.gitignore`
- **Frontend fixes** (`anise-hyssop-frontend/`)
  - `vite.config.ts` — `/api/*` proxy to `localhost:8000`
  - `src/index.css` — CSS custom properties (`--color-rewild-green`, `--color-earth-sand`, etc.)
  - `.env.example` — Auth0 + API URL vars
- **Root**
  - `.gitignore` — blocks `.env`, `credentials/`, `node_modules/`, `.claude/`

### PRD v0.7.2 corrections applied
- Added `WaiverFileURL` column to `VOLUNTEERS_HEADERS` and `Volunteer` model
- Updated Program `PROMOTABLE_ROLES` to match consolidated role table (added `Adult Volunteer`, `Youth Volunteer`; removed stale `Student Volunteer`)
- Removed `Coordinator` from GlobalRole comments (deferred per v0.7.2)

---

## Phase 1 — Authentication Layer ✅

**Goal:** Real Auth0 login/register with email verification replaces all mocks.

### What was built
- [x] `@auth0/auth0-react` installed in frontend
- [x] `Auth0Provider` in `main.tsx` with refresh tokens, `offline_access` scope, localStorage cache
- [x] `AuthContext.tsx` rewritten as thin wrapper around `useAuth0` — fetches `/api/auth/me` on login
- [x] `Landing.tsx` replaced email/password form with Auth0 Universal Login buttons (Register / Log In)
- [x] `Navigation.tsx` logout wired to Auth0 `logout()` with `returnTo`
- [x] `App.tsx` updated with `Spinner`, `ProtectedRoute`, `RegistrationRoute`, `GlobalRole` casing fix
- [x] Backend `GET /api/auth/me` — checks Volunteers sheet by email, returns profile or `{isNewUser: true}`
- [x] `verify_token` middleware confirmed working with Auth0-issued JWTs
- [x] Debug logging added to JWT middleware (`auth.py`) for troubleshooting
- [x] Resume logic working: Auth0 account with no Volunteers row → redirects to `/register`
- [x] Full flow tested: Register → Auth0 Universal Login → redirect back → `/api/auth/me` → `/register`

### Auth0 Dashboard setup (manual, not in code)
- API registered: `https://volunteer.rewildlongisland.org/api` with "Allow Offline Access" enabled
- SPA app: "Volunteer Management Portal" (`LzsgJTYej8xljSetqBXQoeiPDO1oE5T8`) authorized for the API
- **Post Login Action** created: "Add email to access token" — injects `email` claim into access tokens
- Database connection: signups enabled

### Runtime notes
- Backend runs on port **8001** (port 8000 had a stale process issue on Bumblebee)
- Vite proxy in `vite.config.ts` points to `http://localhost:8001`
- If switching back to port 8000, update `vite.config.ts` accordingly

---

## Phase 2 — Registration Flow ✅

**Goal:** The full 5-step flow writes to Google Sheets and activates the account.

### What was built
- [x] `POST /api/registration/complete` — validates form data, writes Volunteer + Membership rows to Sheets, uploads Youth waiver to Drive
- [x] `app/services/drive_service.py` — Google Drive upload service using same service account, files shared by link
- [x] `app/config.py` — added `DRIVE_WAIVER_FOLDER_ID` setting
- [x] `requirements.txt` — added `google-api-python-client==2.114.0`
- [x] `Registration.tsx` — removed password fields, added Auth0 Bearer token, localStorage persistence (4-hour expiry), submits multipart form to backend
- [x] `AuthContext.tsx` — added `refreshUser()` method
- [x] After successful registration, uses `window.location.href = "/portal"` (hard redirect) to avoid React state timing issues
- [x] `scripts/reset_sheets.py` — resets all three sheets with clean headers (no trailing spaces); run this once per environment
- [x] `scripts/populate_teams.py` — populates Teams Config sheet with all 17 teams

### Key decisions
- Registration redirect uses `window.location.href` (full reload) instead of React Router `navigate()` — avoids async state timing bug where `isNewUser` wasn't updated before redirect
- Google Sheets headers had trailing spaces from manual entry; fixed by stripping keys in `_all_records()` and providing `reset_sheets.py` for clean setup
- Teams sheet uses `numericise_ignore=["all"]` to prevent zip codes from being parsed as integers
- Abandonment is client-side only — localStorage expires after 4 hours. No backend cleanup needed.
- Adults do NOT provide DOB (optional). Youth MUST provide DOB, School, Grade.

### Known issue — Portal page stuck on "Loading"
After registration redirects to `/portal`, the page shows a loading spinner. This is the next thing to fix in Phase 3 (Portal page needs to call `/api/user/profile` and render real data).

---

## Phase 3 — Volunteer Portal

**Goal:** A volunteer can see their profile and team memberships.

### Next steps (pick up here)
1. **First:** Fix loading spinner on `/portal` — `Portal.tsx` currently has no data-fetching; it needs to call `GET /api/user/profile`
2. Build `GET /api/user/profile` backend endpoint — reads Volunteers sheet by email (from JWT), joins memberships with team names
3. `DELETE /api/user/profile` — anonymise sheet row, delete Auth0 credentials via Management API
4. Waiver re-sign gate — if `WaiverSignedDate` is expired (Jan 1 reset), show re-sign modal before portal access
5. Wire existing `Portal.tsx` to real data

---


---

## Phase 4 — Admin Dashboard

**Goal:** Staff can search, view, edit, and bulk-manage all volunteers.

### Plan
1. `GET /api/admin/users` — full Volunteers sheet + memberships; supports `?search=`, `?status=`
2. `PUT /api/admin/users/{id}` — superpower override (email, age group). Email change calls Auth0 Management API directly (no revert mechanism per v0.7.2). Age flip resets roles to defaults.
3. `PUT /api/admin/users/{id}/waiver` — reset waiver
4. `PUT /api/admin/memberships/{id}` — role promotion (validated against PROMOTABLE_ROLES)
5. `POST /api/admin/bulk` — batch team/role updates; auto-filters Youth from Committee adds
6. Cannot save changes to Pending users (backend validates)

---

## Phase 5 — Business Logic & Compliance

**Goal:** The system enforces all the rules the PRD defines.

### Plan
1. Age recalculation utility — given DOB, compute `isAdult`. Called on DOB change + annual reset.
2. `POST /api/admin/annual-reset` — loop all volunteers with DOB, recalculate `isAdult`, clear all `WaiverSignedDate` fields.
3. DOB change warning — if Admin changes DOB and it flips Adult↔Youth, warn → confirm → reset all memberships to default roles.

---

## Phase 6 — Deployment & Hardening

**Goal:** The app runs in production, securely.

### Plan
1. Backend → Google Cloud Run (Dockerfile already exists)
2. Frontend → Vercel (per PRD v0.7.2)
3. Production Auth0 tenant (separate from dev)
4. Google Secret Manager for credentials on Cloud Run
5. Security: rate-limit registration, validate all inputs server-side, admin routes check sheet GlobalRole (not just JWT)
6. Custom domain: `volunteer.rewildlongisland.org`

---

## Dependency Order (Critical Path)

```
Phase 0 (infra)  ✅
  → Phase 1 (auth)  ✅
    → Phase 2 (registration) + Phase 3 (portal)  [can run in parallel]
      → Phase 4 (admin)
        → Phase 5 (business logic)
          → Phase 6 (deploy)
```

---

## Change Log

All significant decisions, deviations, or corrections — newest first.

| Date | What | Why |
|------|------|-----|
| 2026-04-11 | Session commands created | `/start-sweatbee`, `/end-sweatbee`, `/start-bumblebee`, `/end-bumblebee` — automate session open/close on both machines. Commands live in `.claude/commands/` (not `.claude/skills/`). Bash `!` blocks don't work; commands use instruction-style prompts instead. |
| 2026-04-11 | Phase 2 complete | Registration writes to Sheets; redirect uses window.location.href to avoid React timing bug; Sheets headers stripped of trailing spaces |
| 2026-04-11 | Phase 1 complete | Auth0 flow working end-to-end; Auth0 Action needed for email claim; backend on port 8001 |
| 2026-04-10 | Updated models for PRD v0.7.2 | Added `WaiverFileURL`, fixed Program roles, dropped Coordinator |
| 2026-04-10 | Flattened directory structure | Removed `Anise Hyssop/` parent; paths are now `anise-hyssop-backend/` and `anise-hyssop-frontend/` at repo root |
| 2026-04-10 | Phase 1 started on other computer | Auth0 SPA + PKCE integration; `@auth0/auth0-react` added; Landing + AuthContext rewritten |
| 2026-04-10 | Phase 0 completed | Backend skeleton, sheets service, JWT middleware, Vite proxy, CSS vars, .env examples |
| 2026-04-10 | PRD v0.7.2 received | Key changes: localStorage abandonment, Youth waiver → Drive, Coordinator deferred, email revert deferred, role table consolidated |
