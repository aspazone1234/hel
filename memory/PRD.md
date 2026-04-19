# Product Requirements Document (PRD)

## Current State
Full codebase replaced from **`github.com/aspazone1234/hel`** branch **`final2`** on **2026-04-19**.
Previous Katha 2026 implementation was completely wiped (user-requested full replacement).

## Stack
- Frontend: React 19 + CRA/Craco + Tailwind + Shadcn UI
- Backend: FastAPI (`/app/backend/server.py` — monolithic)
- Database: MongoDB (`test_database`)
- Restored from dump: `/app/db_export/test_database/` — 1134 documents across 25 collections

## Core App (from repo)
Shrimad Bhagavat Katha 2026 / Swayamsevak Portal — registration, QR workflows, WhatsApp messaging,
tickets/SLA escalation, rooms, custom fields, admin dashboards.

## Replacement Summary (2026-04-19)
- Preserved: `/app/.git`, `/app/.emergent`, `backend/.env`, `frontend/.env` (MONGO_URL, DB_NAME, REACT_APP_BACKEND_URL)
- Installed: pip (requirements.txt) + yarn (package.json)
- Services: backend + frontend RUNNING
- Smoke test: `GET /api/` → 200, `/` → 200, `POST /api/auth/login` with super admin → 200 with token
- DB restored with `mongorestore --db test_database --drop`

## Pending / Backlog
User will drive next feature requests on the newly restored codebase.
Previous Katha 2026 P1/P2 items are no longer tracked (complete replacement).

## Credentials
See `/app/memory/test_credentials.md`.
