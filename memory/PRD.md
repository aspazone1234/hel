# Shrimad Bhagavat Katha 2026 / Swamsevak Portal — PRD

## Original Problem Statement
Import repo https://github.com/aspazone1234/hel/tree/new8 (branch `new8`) — make it functional, skip automated testing.

## Architecture
- **Backend**: FastAPI (`/app/backend/server.py`) + MongoDB (motor)
- **Frontend**: React (CRA + craco) in `/app/frontend`
- **DB**: MongoDB `test_database` — restored from `/app/db_export/test_database/` (mongodump)

## Environment Setup Completed
- Backend `.env`: `MONGO_URL`, `DB_NAME=test_database`, `CORS_ORIGINS=*`, `JWT_SECRET=dev-secret-...`
  - Optional (left unset, guarded in code): `WA_PHONE_NUMBER_ID`, `WA_ACCESS_TOKEN`, `WA_BUSINESS_ACCOUNT_ID`, `WA_WEBHOOK_VERIFY_TOKEN`, `WA_FLOW_*`, `APP_URL`
- Frontend `.env`: preserved (`REACT_APP_BACKEND_URL=https://hel-stage.preview.emergentagent.com`)
- Python deps installed from `requirements.txt`
- Frontend deps installed via `yarn install`
- Mongo snapshot restored via `mongorestore --db test_database /app/db_export/test_database/ --drop` (1222 documents)
- Supervisor: backend + frontend running; backend seeded family tree (75 nodes), categories, templates, ticket categories

## Verification
- `GET /api/registrations/count` → `{"total": 1}` ✓
- External URL routing works (`https://hel-stage.preview.emergentagent.com/api/registrations/count` returns data) ✓
- Frontend renders entry screen ("प्रवेश करें") ✓

## Seeded Super Admin (from code)
- Username: `superashwini`
- Password: `supersebhiupper123`

## What's Implemented (already in repo)
- Auth (JWT, superadmin + custom_admins), OTP via WhatsApp, registrations CRUD with 3-bucket flow (pending/expected/arrived), family reference tree editor, relation categories, rooms & assignments, tickets, audit logs, message templates & WA auto-responses, WhatsApp Flows endpoints, QR generation, exports (CSV/XLSX/PDF).

## Backlog / Next Actions
- To enable live WhatsApp: set `WA_PHONE_NUMBER_ID`, `WA_ACCESS_TOKEN`, `WA_BUSINESS_ACCOUNT_ID`, `WA_WEBHOOK_VERIFY_TOKEN` in `/app/backend/.env` (currently OTP/WA endpoints return errors when called).
- To enable WA Flow encryption: set `WA_FLOW_PRIVATE_KEY_B64` (+ passphrase) and `WA_FLOW_PUBLIC_KEY_B64`.
- Functional/QA testing deferred per user request.
