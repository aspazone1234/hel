# PRD — Shrimad Bhagavat Katha Mahotsav 2026 / Swamsevak Portal

## Original Problem Statement
Import the GitHub repository `https://github.com/aspazone1234/hel` (branch `new4`) fully into the Emergent environment, install all dependencies, and verify that it runs end-to-end.

## Architecture
- Backend: FastAPI (single-file `backend/server.py`, ~5.5k lines) on port 8001, MongoDB via Motor
- Frontend: React (CRACO + CRA) on port 3000, TailwindCSS, shadcn/ui components
- Database: MongoDB `test_database` restored from `/app/db_export` (703 documents across ~30 collections)
- Auth: JWT (HS256) with one system-level super admin; city-level admins in `custom_admins` collection
- Integrations present in the code (most require env vars not currently set):
  - WhatsApp Cloud API (Meta) — MOCKED (WA_* env vars intentionally unset)
  - Stripe SDK imported but not configured
  - Google GenAI / emergentintegrations available

## Core Requirements (static)
- Registration portal for devotees for the 2026 event (28 May – 3 Jun 2026)
- Admin portal ("Swayamsevak Portal") with dashboard, rooms, guests, tickets, to-dos, notifications, reference persons, custom fields, audit log
- WhatsApp-based notifications and OTP flow (when WA credentials are configured)

## User Personas
- **Super Admin** (`superashwini`): Full system control, manages city admins and all config
- **City / Custom Admin** (`custom_admins` collection): Restricted city-level access
- **Swayamsevak (volunteer)**: Scoped admin tasks
- **Devotee / End user**: Public landing page and registration flow

## What's Been Implemented (this session — 2026-04-18)
- [2026-04-18] Cloned GitHub `aspazone1234/hel@new4` into `/app`, preserving `.env` files
- [2026-04-18] Added `JWT_SECRET` to `backend/.env`; kept protected vars (`MONGO_URL`, `DB_NAME`, `REACT_APP_BACKEND_URL`) intact
- [2026-04-18] Installed backend deps (`pip install -r requirements.txt`) — includes fpdf2, motor, litellm, stripe, emergentintegrations, etc.
- [2026-04-18] Installed frontend deps (`yarn install`) + added missing `country-state-city` and `jsqr`
- [2026-04-18] Restored MongoDB dump from `/app/db_export/test_database` via `mongorestore --drop` (703 docs)
- [2026-04-18] Restarted supervisor (backend + frontend) — both RUNNING
- [2026-04-18] Verified end-to-end with testing subagent:
  - Backend: 18/18 API tests PASS (auth, registrations, rooms, reference persons, admins, todos, tickets, dashboard, geo, custom fields, etc.)
  - Frontend: Landing → Main page → Admin login → Command Centre dashboard → Expected Guests → Room Management → Notifications — all PASS

## Test Credentials
See `/app/memory/test_credentials.md` (super admin: `superashwini` / `supersebhiupper123`)

## Mocked / Not-configured Integrations
- **WhatsApp Cloud API** — `WA_PHONE_NUMBER_ID`, `WA_ACCESS_TOKEN`, `WA_BUSINESS_ACCOUNT_ID`, `WA_WEBHOOK_VERIFY_TOKEN` intentionally unset. WhatsApp sends / OTP / campaigns will no-op or fail gracefully until real credentials are provided.
- **Stripe** — SDK present but no keys configured (no flow is currently using it in user-facing screens).
- **Google GenAI / emergentintegrations** — available if needed, no key set.

## Prioritized Backlog
- **P1** — Provide real WhatsApp Cloud API credentials to enable notifications / OTP
- **P1** — Configure `APP_URL` env var for deep links generated in templates
- **P2** — Clean up pre-existing React warnings (nested button in AdminDashboard, a few react-hooks/exhaustive-deps)
- **P2** — Add a lightweight CI smoke test using the generated `backend/tests/test_smoke_e2e.py`

## Next Tasks
- Await user direction on WhatsApp/Stripe key provisioning, or further feature work on top of the imported app.
