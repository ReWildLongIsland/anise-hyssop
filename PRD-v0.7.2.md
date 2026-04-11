Volunteer Management Prototype "Anise Hyssop"
Product Requirements Document (PRD) — Version 0.7.2

Prototype Objective

The primary goal of this prototype is to validate the end-to-end user onboarding journey and provide administrative oversight for the ReWild Long Island Volunteer Portal.

Success is achieved if:

- Onboarding: A new user can register, verify their email via Auth0, select teams, and sign a liability waiver.
- Geographic Logic: The system applies zip code-based pre-selection for Chapters during registration.
- Age-Based Compliance: The system automatically classifies users as Adult or Youth to restrict access to sensitive team types (Committees).
- Admin Control: Staff can search, bulk-manage, and override volunteer data via a secure dashboard.
- Data Integrity: Google Sheets serves as the reliable "System of Record" for all profile and membership data.

Out of Scope

The following are explicitly excluded from this version of the prototype:

- Automated Notifications: Email notifications beyond standard Auth0 transactional flows (verification/password reset).
- Native Apps: No iOS or Android applications; web-only.
- Bulk User Import: Manual creation via Google Sheets or individual registration only.
- Advanced Features: Audit trails of data changes, reporting/analytics dashboards.
- Email Revert on Admin Changes: When an Admin changes a volunteer's email, the change takes effect immediately. A notification-and-revert mechanism for the old email address is deferred to a future version.
- Coordinator Role: The Coordinator global role is not implemented in this version. The UI shows only two contexts: Volunteer Portal and Admin Dashboard.

Tech Stack

- Frontend: React (Hosted on Vercel).
- Backend: Python 3.11/3.12 with FastAPI, served by uvicorn (deployed on Google Cloud Run).
- Authentication: Auth0 (Tenant: dev-i7s07siq4nnbdklq.us.auth0.com). Configured as a Single Page Application (SPA) using the Authorization Code with PKCE flow. Manages credentials, email verification, and password resets.
- Data Storage: Google Sheets (using Google Sheets API).
  - Volunteers sheet: Personal profiles and admin status.
  - Memberships sheet: Relational mapping of volunteers to teams and roles.
  - Teams configuration: Read-only source for team metadata.
- File Storage: Google Drive (using Google Drive API via the same service account). Used for storing uploaded Youth waiver documents.
- Visual Styling: Tailwind CSS using the "Stone & ReWild Green" palette.

Core Entities

Teams

ReWild is organised into multiple overlapping Teams. Each Team is one of three types:

- Chapter: Geographically defined by a list of zip codes. During registration, Chapters whose zip codes match the user's zip code are automatically pre-selected. Users may override this pre-selection and join any Chapter regardless of their zip code. Chapters support Adult Volunteer, Youth Volunteer, and Lead roles. Users default to Adult Volunteer or Youth Volunteer on joining. Promotion to Lead requires administrator action.
- Committee: Not geographically defined. Adults only — Committees are hidden from Youth users during registration and portal use. Supports Adult Prospect, Member, and Lead roles. Users default to Adult Prospect on joining. Promotion to Member or Lead requires administrator action.
- Program: Optionally geographic. Users self-select Programs during registration. Supports Adult Prospect, Youth Prospect, Adult Volunteer, Youth Volunteer, Student Intern, Student Organizer, and Adult Organizer roles. Users default to Adult Prospect or Youth Prospect on joining. Promotion to any other role requires administrator action.

The teams are presented identically and do not expose any geographic information to the user. Zip Code information is used solely for Chapter pre-selection.

See Current List of Chapters and Zip Codes here: Chapters Committees Programs

The list of teams and their attributes is stored as a configuration Google Sheet on ReWild's Google Drive. This file is maintained by administrators and is never modified by the application.

Team Type | Default Role (Adult) | Default Role (Youth) | Admin Can Promote To
--- | --- | --- | ---
Chapter | Adult Volunteer | Youth Volunteer | Lead
Committee | Adult Prospect | N/A (Adults Only) | Member, Lead
Program | Adult Prospect | Youth Prospect | Adult Volunteer, Youth Volunteer, Student Intern, Student Organizer, Adult Organizer

Landing Page

New and verified users access the Volunteer Portal through the Landing Page at volunteer.rewildlongisland.org. The page uses ReWild Long Island's branding — logo and colour palette as established at www.rewildlongisland.org — and presents two calls to action: Register and Log In. Password Reset is handled through Auth0's hosted password reset flow.

User Roles & The "Two-Hat" System

The system supports two active user roles in this version. Access to the Management Dashboard and specific data sets is controlled by the GlobalRole attribute.

- Volunteer: Access to their personal Volunteer Portal only. Can sign up for events and edit non-locked profile fields.
- Admin: Full "Superpower" access. Can override locked fields (Email, Age Group), manage all user accounts, and modify global configurations.

Admin Bootstrap: The first administrator must be created manually by setting the GlobalRole column to Admin for a specific email address in the Google Sheet.

Multi-Role Navigation (The Role Switcher): For users holding the Admin role, the interface provides a toggle to switch between contexts:
- Desktop: [ Volunteer Portal ] [ Admin Dashboard ]
- Mobile: A scrollable horizontal ribbon or a fixed bottom-navigation bar for "thumb-friendly" switching.
- Visual Distinction: Each view should have a subtle header color shift to signal the active role (e.g., a "Staff Mode" banner).

Core Entities: Teams & Age Classification

Team Types

ReWild is organized into three canonical team types:

- Chapters: Geographically defined by zip codes. Supports roles: Adult Volunteer, Youth Volunteer, Lead.
- Committees: Adults Only. Hidden from Youth users. Supports roles: Adult Prospect, Member, Lead.
- Programs: Optionally geographic. Supports roles: Adult Prospect, Youth Prospect, Adult Volunteer, Youth Volunteer, Student Intern, Student Organizer, Adult Organizer.

Age Group Classification

- Logic: Users self-identify as Adult (18+) or Youth (<18) during registration. Youth users are required to provide their Date of Birth. Adults may optionally provide a Date of Birth but are not required to.
- School & Grade: Youth users are required to provide their School and Grade during registration (Step 2: Identity).
- The "Committee" Rule: During registration and portal use, Committees are hidden from Youth users. If an Admin attempts to bulk-add a Youth user to a Committee, the system filters them out automatically.
- Annual Recalculation: For users who have a Date of Birth on file, the ageGroup (isAdult) is recalculated annually on January 1st to ensure accuracy. Users without a DOB on file retain their self-identified age group.

The 5-Step Registration Flow

Registration captures identity and location data before committing it to the permanent database. In-progress registration data is stored in the browser's localStorage with a timestamp. Data is only written to the permanent Volunteers and Memberships sheets after the Step 5 waiver is signed.

Step | Action | Logic Detail
--- | --- | ---
1. Email & Password | Auth0 Gate | User signs up via Auth0 Universal Login (SPA + PKCE flow). Auth0 triggers a verification email. Blocks existing emails.
2. Identity | Personal Info | Captures First Name, Last Name, Town, Zip Code, and Age Group (Adult/Youth self-identification). Youth must also provide Date of Birth, School, and Grade. Includes Resume Logic: users who log in without a profile in the Volunteers sheet are redirected here.
3. Team Selection | Dynamic Grid | All available teams displayed. Chapters matching the user's zip code are auto-selected. Youth cannot see Committees. Users can override any pre-selection.
4. Safety Rules | Mandatory Review | Displays safety graphic; requires checkbox confirmation to proceed.
5. Liability Waiver | Legal Sign-off | Displays age-appropriate waiver (Adult or Youth variant). Youth waivers require a parent/guardian signature — the signed document is uploaded and stored in Google Drive. Adult waivers require a checkbox agreement. Final agreement triggers the commit: Volunteer row and Membership rows are written to Google Sheets with Status set to Active.

Abandonment Policy: If registration is not completed within 4 hours, the localStorage data expires and is cleared on the next visit. The user must restart from Step 2 (their Auth0 account from Step 1 persists).

Commit Logic: Data is only written to the permanent Volunteers and Memberships sheets after the Step 5 waiver is signed.

Administrative Features (Management Dashboard)

The "Staff" view serves as the central command center for community oversight.

- Searchable Table: Live filtering by Name, Email, Chapter, or Status (including "Pending" users).
- The Edit Modal: Allows "Superpower" overrides:
  - Change locked fields (Email and Age Group).
  - Manually assign any Team or Role.
  - Restriction: Cannot save changes to a "Pending" user until they sign the waiver.
- Bulk Quick-Actions: Admins can check multiple rows to batch-update teams or roles in a single operation.

Business Logic & Secure Changes

Email Changes:
- Volunteers cannot change their own email.
- Admins can change email via the Edit Modal. The change takes effect immediately in both Auth0 and Google Sheets.

DOB Changes: If a DOB change flips a user between Adult and Youth status, the system warns the Admin. Upon confirmation, all roles are reset to default to require Admin re-qualification.

Account Deletion:
- Deleted: Auth0 credentials and Date of Birth (if any).
- Anonymized: Name and Email are replaced with placeholders.
- Retained: Zip code, team history, and the Youth/Adult status (calculated at time of deletion) for grant reporting.

Visual Identity Standards

- Palette: Stone-50 background (#fafaf9) with ReWild Green (#2D5A27) and Earth/Sand accents (#F4A460).
- Components: Large rounded corners (3xl), subtle shadows (shadow-md), and a top-level toggle for Admins: [My Portal] | [Management Dashboard].

Default Role Assignments

To ensure consistency across the platform, the following roles are automatically available or assigned within the three primary entity types. This logic governs what a user sees in their "Join Teams" view and what an Admin can assign in the Management Dashboard.

Entity Type | Role Name | Eligibility | Purpose / Notes
--- | --- | --- | ---
Chapter | Adult Volunteer | Adult (18+) | Default role for adults joining a local chapter.
Chapter | Youth Volunteer | Youth (<18) | Default role for minors; restricted from certain activities.
Chapter | Lead | Adult (18+) | Administrative oversight for a specific geographic chapter. Promoted by admin.
Committee | Adult Prospect | Adult Only | Default role for interested adults.
Committee | Member | Adult Only | General participation in high-level organizational units. Promoted by admin.
Committee | Lead | Adult Only | Chair or co-chair of a specific committee. Promoted by admin.
Program | Adult Prospect | Adult (18+) | Default role for adults expressing interest.
Program | Youth Prospect | Youth (<18) | Default role for youth expressing interest.
Program | Adult Volunteer | Adult (18+) | Standard adult participant role. Promoted by admin.
Program | Youth Volunteer | Youth (<18) | Standard youth participant role. Promoted by admin.
Program | Student Intern | Both | Specific tracking for student-credit or formal internship hours. Promoted by admin.
Program | Student Organizer | Both | Project management and logistical lead (student). Promoted by admin.
Program | Adult Organizer | Adult (18+) | Project management and logistical lead (adult). Promoted by admin.

Data Schema Summary (Google Sheets)

For technical reference during the build, these are the core columns required in the "System of Record":

Volunteers Sheet:
- VolunteerID (Unique ID)
- Email (Auth0 Primary Key)
- FirstName
- LastName
- Town
- ZipCode
- DateOfBirth (YYYY-MM-DD, required for Youth, optional for Adults)
- isAdult (Boolean, set from self-identification at registration)
- School (Required for Youth, blank for Adults)
- Grade (Required for Youth, blank for Adults)
- Status (Pending, Active, Inactive)
- GlobalRole (Volunteer, Admin)
- WaiverSignedDate
- WaiverFileURL (Google Drive link for uploaded Youth waiver documents)

Memberships Sheet:
- MembershipID
- VolunteerID
- TeamID
- Role (from the Default Role Assignments table above)
- DateJoined

Summary of Recent Logic Decisions

- Zip-Code Pre-selection: If a user's zip code matches the defined boundary of a Chapter (stored in the Teams config), that Chapter is checked by default in the registration UI.
- The "Committee" Filter: Youth users are programmatically blocked from seeing or joining any entity classified as a "Committee."
- Staff Context: Based on GlobalRole, the user interface provides a toggle to switch from the "Volunteer Portal" to the "Admin Dashboard" rather than having separate logins.
- Auth0 Integration: The frontend uses Auth0 as a Single Page Application (SPA) with the Authorization Code + PKCE flow. No client secret is exposed in the browser.
- Registration Persistence: In-progress registration data (Steps 2-4) is stored in browser localStorage with a 4-hour expiry timestamp. Data is committed to Google Sheets only after Step 5.
- Youth Waiver Storage: Uploaded Youth waiver documents are stored in a Google Drive folder via the service account. The Drive file URL is recorded in the WaiverFileURL column of the Volunteers sheet.

Annual Recalculation & Waiver Reset

On January 1st of each year, the system shall trigger an automated maintenance cycle:

- Age Recalculation: For volunteers who have a Date of Birth on file, the isAdult flag is updated based on their DateOfBirth as of January 1st. Volunteers without a DOB retain their existing age group.
- Waiver Expiry: All signed waivers are marked as "Expired."
- Re-acknowledgement: Volunteers are prompted to review and sign the updated annual liability release upon their first login after Jan 1st.

Changelog (v0.7.1 to v0.7.2)

1. Clarified age classification: self-identification with DOB required for Youth only, optional for Adults. Annual recalculation applies only to users with DOB on file.
2. Standardized role naming: all roles carry age prefixes. Committee roles are Adult-only (no Youth variants). Program roles use full age-prefixed list.
3. Added School and Grade as required fields for Youth users in Step 2 of registration.
4. Specified registration temp storage: browser localStorage with 4-hour expiry timestamp.
5. Specified Youth waiver file storage: Google Drive via service account, with WaiverFileURL column added to Volunteers sheet.
6. Removed Coordinator role from this version. UI shows two contexts only: Volunteer Portal and Admin Dashboard.
7. Deferred email revert mechanism to a future version. Admin email changes take effect immediately.
8. Locked Auth0 application type to SPA (Authorization Code + PKCE).
9. Locked frontend hosting to Vercel.
10. Consolidated the two contradictory role tables into a single authoritative Default Role Assignments table.
