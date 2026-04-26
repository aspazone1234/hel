# Product Requirements Document (PRD)

## Original Problem Statement
Import the entire repo `https://github.com/aspazone1234/hel/tree/new7` and make it functional.

## Current State (2026-04-26)
Full codebase imported from `github.com/aspazone1234/hel` branch `new7` into `/app`.
Pre-existing scaffold in `/app` was wiped (only `.git`, `.emergent`, `.env` files preserved).

## Stack
- Frontend: React 19 + CRA/Craco + Tailwind + shadcn/ui (port 3000)
- Backend: FastAPI monolith `/app/backend/server.py` (~5500 LOC, port 8001)
- Database: MongoDB (`test_database`)
- Auth: JWT HS256
- WhatsApp: Meta Cloud API v21.0 + encrypted Flows (RSA-2048 + AES-GCM)

## Core App
Shrimad Bhagavat Katha Mahotsav 2026 / Swayamsevak Portal — guest registration, room
assignments, attendance tracking, QR check-in, WhatsApp messaging (campaigns / auto-response /
flows), Help Centre tickets with SLA escalation, swayamsevak (volunteer) coordination,
custom admin accounts, audit logs.

## Setup Done (2026-04-26)
- Cloned repo `new7` branch into `/app`
- Restored `backend/.env` (MONGO_URL, DB_NAME) + appended JWT_SECRET, WA_* keys (from HANDOFF)
- Restored `frontend/.env` (REACT_APP_BACKEND_URL)
- `pip install -r backend/requirements.txt`  → success
- `yarn install` in frontend  → success
- `mongorestore --db test_database /app/db_export/test_database/ --drop` → 1222 docs restored
- supervisor restart backend + frontend → both RUNNING
- Smoke tests:
  - `GET /api/` → `{"message":"Shrimad Bhagavat Katha Mahotsav 2026 API V2"}`
  - `POST /api/auth/login` (superashwini / supersebhiupper123) → 200 with JWT token
  - Frontend `/` → 200 (Hindi entry screen renders)

## Credentials
See `/app/memory/test_credentials.md`.

## Backlog / Pending
User will drive next feature requests on the now-functional codebase.

## Notes
- WhatsApp Flow private key file `/app/backend/keys/flow_private.pem` is NOT in repo.
  Live WhatsApp send/receive flows will require the user to drop the key in place
  or supply `WA_FLOW_PRIVATE_KEY_B64` env var. Token-only WA sends still work.
