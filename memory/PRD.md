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

## Completed Features (Latest)
- **2026-04-29**: Relation Category two-line dropdown (secondary text/subtitle) — same pattern as Reference Person dropdown
  - Backend: Added `PUT /api/admin/relation-categories/{cat_id}` for updating name/description
  - Frontend RegisterPage: Fetches global `relation-categories/public`, shows descriptions in dropdown
  - Frontend Demo2Page: Static descriptions shown in two-line dropdown
  - Admin ReferencePersonManager: Added collapsible "Relation Category Descriptions" section for managing subtitles
- **2026-04-19 to 2026-04-28**: Reference Person two-line dropdown, Demo pages, GA4, Room Management, Command Centre updates, Bulk Messaging fix, WhatsApp Flow fixes, Help Centre bifurcation, and more (see handoff summary)

## Pending / Backlog
- P1: Verify real WhatsApp Business API / OTP in production (user redeploy action)
- P2: Push notifications for status changes
- P2: Advanced analytics dashboard
- Refactoring: Break `server.py` (~6000 lines) into `/routes/` modules

## Credentials
See `/app/memory/test_credentials.md`.
