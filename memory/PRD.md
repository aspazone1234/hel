# Shrimad Bhagavat Katha Mahotsav 2026 — Swamsevak Portal (PRD)

**Last updated:** 2026-04-18

## Original Problem Statement
Import the GitHub repo `aspazone1234/hel@new3`, install deps, get it running end-to-end as-is.

## Architecture
- **Backend**: FastAPI monolith (`/app/backend/server.py`, ~5100 LOC). Port 8001, supervisor-managed. All routes prefixed `/api`.
- **Frontend**: React 19 + CRA+CRACO + Tailwind + shadcn/ui. Port 3000, supervisor-managed.
- **DB**: MongoDB (motor async). DB name = `test_database`.
- **Auth**: JWT HS256. Super admin `superashwini` / `supersebhiupper123`.
- **WhatsApp**: Meta Cloud API v21.0 (requires real Meta API credentials, not configured in this environment).

## Event Window
28 May – 3 Jun 2026, Pushkar, Rajasthan. Registration cutoff 19 May 2026.

## Personas
- **Guest / Shraddhalu**: public registrant
- **Swayamsevak (Sevak)**: volunteer
- **Super Admin**: top-level operator

## Core Modules (all live)
- Public registration + cutoff enforcement + public-update window
- Attendee-level arrival tracking (family / partially-arrived / arrived / departed / not-coming)
- Room management + assignments + vacancy forecast
- QR code generation + scan-based check-in
- Reference Person + Relation Category taxonomy
- Custom fields on registrations
- Help Centre: ticket CRUD, SLA, auto-assign, auto-escalation
- To-Do module for swayamsevaks
- Notification Management UI: Bulk Campaigns, Auto Response, System Messages, Template Registry, Conversations, OTP Logs
- WA Flow Settings (under Help Centre)

## Implemented (rolling log)

### 2026-04-18 — Import & Setup in new environment
- Cloned from `aspazone1234/hel@new3` branch
- Installed backend Python dependencies (fpdf2, qrcode, openpyxl, pycountry, cryptography, etc.)
- Installed frontend Node.js dependencies (React 19, shadcn/ui, recharts, html5-qrcode, etc.)
- Configured JWT_SECRET and WA webhook verify token in backend .env
- Restored MongoDB from db_export (448 documents across 25+ collections)
- All services running via supervisor (backend port 8001, frontend port 3000)
- Testing: 21/21 backend API tests passed, all frontend UI flows working

## What's Working
- Homepage splash page with Hindi/English language toggle
- Main event page with navigation, info sections, countdown
- Public registration with OTP verification flow
- Admin login at /admin (superashwini/supersebhiupper123)
- Admin Command Centre dashboard with stats
- All admin sidebar modules: Attendance Marker, Help Centre, My Duties, Pending Approval, Expected/Arrived Guests, Room Management, Reference Persons, Notifications, Custom Fields, Swayamsevak Mgmt, Activity Log

## In-flight / Awaiting User Decision
- WhatsApp API integration requires real Meta Cloud API credentials (WA_PHONE_NUMBER_ID, WA_ACCESS_TOKEN, WA_BUSINESS_ACCOUNT_ID)
- Delete button on trigger cards
- Auto-Response editor UI exposing `is_flow_step` / `flow_id` fields
- Live UK-number WA send test

## Backlog (P2)
- "Claim ticket" deep-link button in escalation template

## Next Tasks
- Configure WhatsApp Meta API credentials if user has them
- Any feature enhancements or bug fixes as requested
