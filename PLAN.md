# Anise Hyssop — Build Plan

> **Purpose of this file:** Single source of truth for what's been built, what's next, and any decisions made along the way. Read this before starting work on either machine. Update it before pushing.

---

## Quick Status

| Phase | Status | Last updated |
|-------|--------|--------------|
| Phase 0 — Foundation & Scaffolding | **COMPLETE** | 2026-04-10 |
| Phase 1 — Authentication Layer | IN PROGRESS | 2026-04-10 |
| Phase 2 — Registration Flow | Not started | — |
| Phase 3 — Volunteer Portal | Not started | — |
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

## Phase 1 — Authentication Layer 🔧

**Goal:** Real Auth0 login/register with email verification replaces all mocks.

### What needs to happen
- [x] Install `@auth0/auth0-react` in frontend
- [x] Replace mock `AuthContext` with Auth0 `Auth0Provider` (SPA + PKCE)
- [x] Update `main.tsx` to wrap app with `Auth0Provider`
- [x] Rewrite `Landing.tsx` for Auth0 Universal Login redirect
- [x] Backend `POST /api/auth/callback` — (if needed for token exchange)
- [x] Backend `POST /api/auth/me` — check Volunteers sheet, return profile or `isNewUser`
- [ ] "Resume Logic" — if user has Auth0 account but no Volunteers row, redirect to `/register`
- [ ] Wire `Navigation.tsx` logout to Auth0 `logout()`
- [ ] Test full flow: register via Auth0 → email verify → redirect back → detect as new user

### What was done (from other computer, commit `228fc92`)
- Directory structure flattened: removed `Anise Hyssop/` parent folder
- `@auth0/auth0-react` added to frontend
- `AuthContext.tsx` rewritten to use Auth0 SDK
- `Landing.tsx` rewritten for Auth0 login redirect
- `main.tsx` updated with `Auth0Provider`
- Backend `auth.py` updated with real endpoints

### Still TODO
- Resume logic (new-user detection and redirect)
- Verify end-to-end Auth0 flow against the dev tenant
- Confirm `verify_token` middleware works with Auth0-issued JWTs

---

## Phase 2 — Registration Flow

**Goal:** The full 5-step flow writes to Google Sheets and activates the account.

### Plan
1. **Backend `GET /api/teams`** — already live from Phase 0
2. **Step 2 (Identity)** — Frontend form: First Name, Last Name, Town, Zip Code, Adult/Youth self-ID. Youth: DOB + School + Grade. Remove password fields (Auth0 owns credentials). No backend write yet (localStorage with 4-hour expiry per PRD v0.7.2).
3. **Step 3 (Team Selection)** — Zip-code pre-selection already implemented in frontend. Committee filter hides from Youth. Data held in localStorage.
4. **Step 4 (Safety Rules)** — Pure frontend; checkbox agreement in localStorage.
5. **Step 5 (Waiver & Commit)** — Adult: checkbox agreement. Youth: upload signed PDF.
   - **New dependency:** Google Drive API for Youth waiver storage → add `google-api-python-client` to `requirements.txt`, create `app/services/drive_service.py`
   - Backend `POST /api/registration/complete`:
     - Writes Volunteer row (Status=Active, WaiverSignedDate=today)
     - Writes Membership rows (one per selected team, default roles)
     - If Youth: uploads waiver file to Drive, saves URL to `WaiverFileURL`
     - Returns full user profile

### Key decisions (from PRD v0.7.2)
- Abandonment is **client-side only** — localStorage expires after 4 hours. No backend cleanup job needed.
- Adults do NOT provide DOB unless they want to (optional).
- Youth MUST provide DOB, School, Grade.

---

## Phase 3 — Volunteer Portal

**Goal:** A volunteer can see their profile and team memberships.

### Plan
1. `GET /api/user/profile` — reads Volunteers sheet by email (from JWT), joins memberships with team names
2. `DELETE /api/user/profile` — anonymise sheet row, delete Auth0 credentials via Management API
3. Waiver re-sign gate — if `WaiverSignedDate` is expired (Jan 1 reset), show re-sign modal before portal access
4. Wire existing `Portal.tsx` to real data

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
  → Phase 1 (auth)  🔧
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
| 2026-04-10 | Updated models for PRD v0.7.2 | Added `WaiverFileURL`, fixed Program roles, dropped Coordinator |
| 2026-04-10 | Flattened directory structure | Removed `Anise Hyssop/` parent; paths are now `anise-hyssop-backend/` and `anise-hyssop-frontend/` at repo root |
| 2026-04-10 | Phase 1 started on other computer | Auth0 SPA + PKCE integration; `@auth0/auth0-react` added; Landing + AuthContext rewritten |
| 2026-04-10 | Phase 0 completed | Backend skeleton, sheets service, JWT middleware, Vite proxy, CSS vars, .env examples |
| 2026-04-10 | PRD v0.7.2 received | Key changes: localStorage abandonment, Youth waiver → Drive, Coordinator deferred, email revert deferred, role table consolidated |
