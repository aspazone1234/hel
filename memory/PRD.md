# Shrimad Bhagavat Katha Mahotsav 2026 — Swamsevak Portal (PRD)

**Last updated:** 2026-04-17

## Original Problem Statement
Import the GitHub repo `aspazone1234/hel@new2`, install deps, get it running end-to-end, then progressively complete the WhatsApp feature roadmap (the original HANDOFF's Sessions 1–5).

## Architecture
- **Backend**: FastAPI monolith (`/app/backend/server.py`, ~5100 LOC). Port 8001, supervisor-managed. All routes prefixed `/api`.
- **Frontend**: React 19 + CRA+CRACO + Tailwind + shadcn/ui. Port 3000, supervisor-managed.
- **DB**: MongoDB (motor async). DB name = `test_database`.
- **Auth**: JWT HS256. Super admin `superashwini` / `supersebhiupper123`.
- **WhatsApp**: Meta Cloud API v21.0. Webhook, Templates, Flows (RSA-2048 encrypted), OTP, Conversations, Campaigns, Auto-Response, System Triggers.

## Event window
28 May – 3 Jun 2026, Pushkar, Rajasthan. Registration cutoff 19 May 2026.

## Personas
- **Guest / Shraddhalu**: public registrant. Uses public site to register, opens WA Flow for help, receives system messages.
- **Swayamsevak (Sevak)**: volunteer. Assigned to specific guests as Point of Contact. Receives admin-side triggers, resolves HC tickets.
- **Super Admin**: top-level operator. Approves registrations, assigns rooms/sevaks, manages WA templates/triggers/campaigns, handles escalations.

## Core modules (all live)
- Public registration + cutoff enforcement + public-update window
- Attendee-level arrival tracking (family / partially-arrived / arrived / departed / not-coming)
- Room management + assignments + vacancy forecast
- QR code generation + scan-based check-in
- Reference Person + Relation Category taxonomy
- Custom fields on registrations
- Help Centre: ticket CRUD, SLA, auto-assign, auto-escalation, WA Flow auto-create
- To-Do module for swayamsevaks
- Notification Management UI: Bulk Campaigns, Auto Response, System Messages, Template Registry, Conversations, OTP Logs
- WA Flow Settings (under Help Centre)

## Implemented (rolling log)
### 2026-04-17 Session 1 — Import & bootstrap
- Imported from `aspazone1234/hel@new2`; installed deps; wired JWT_SECRET; services up.
- Meta webhook verified (verify token `swamsevak2026`), Flow public key uploaded (status VALID).

### 2026-04-17 Session 2 — Bulk campaign export + i18n phone fix + HC handover (Sessions 4B + 5)
- **Campaign export (CSV + PDF)** — `.../export.csv` and `.../export.pdf`. BOM-prefixed CSV, landscape A4 PDF, auto-paginates recipient table. UI buttons wired.
- **International number fix** — single `normalize_phone_for_wa()` helper; replaced 4 broken ad-hoc normalizers. UK/US/any CC-prefixed number now routes correctly.
- **HC system triggers wired** (`hc_flow_captured`, `hc_flow_not_on_premise`, `hc_ticket_resolved`, `hc_ticket_escalated_all`, `help_ticket_created` POC-notify).
- **SLA escalation scanner** — asyncio loop 60 s, auto-broadcasts to all sevaks.
- **Keyword → Flow-CTA template** — `send_wa_flow_template()` helper + `run_flow_keyword_matcher()` wired into webhook.
- **User/Admin trigger split** — audience toggle + per-trigger template dropdown + delay input in frontend.

### 2026-04-17 Session 3 — Trigger registry cleanup + fire-call wiring
- **Removed 8 rejected triggers** from SYSTEM_TRIGGERS: `registration_approved`, `registration_rejected`, `qr_generated`, `room_assigned`, `swamsevak_assigned`, `marked_not_coming`, `room_transferred`, `new_registration`. Old rows auto-purged on startup.
- **Wired 5 missing `fire_system_trigger` calls** — previously these trigger keys existed but no code path called them:
  - `registration_submitted` → fires on `POST /api/registrations` after insert
  - `arrival_confirmed` → fires on `mark_arrival` when status→arrived
  - `guest_arrived` (admin) → fires on same mark_arrival, to assigned swayamsevak
  - `departure_marked` → fires on mark_arrival when status→departed
  - `help_ticket_response` → fires on `PUT /api/admin/tickets/{id}` when `notes` field changes
- **Alias-aware variable resolution** in `fire_system_trigger` — lowercases + strips `var_` prefix + resolves multiple aliases, so templates labeled `Name`, `guest_name`, `GUEST_NAME` all work.
- **Structured trigger logs** — every fire logs `[Trigger] <key>: firing template=… to <phone> params=[…]` or skipped reason.
- **WA Flow Builder test-mode ticket** — flow submissions via Meta Flow Builder (token prefix `flows-builder-`) now create a visible test ticket with placeholder phone `+00-flow-builder-test` so admins can verify flow end-to-end in Help Centre without real WhatsApp.
- **`keyword_template_name` field added to WA Flow Settings** — so admins can configure which Meta template opens on keyword match.

## In-flight / awaiting user decision
- 🟡 Delete button on trigger cards (core vs optional distinction agreed, not built)
- 🟡 Auto-Response editor UI exposing `is_flow_step` / `flow_id` fields (backend ready)
- 🟡 User must create 4 Meta templates for HC triggers (captured / not-on-premise / resolved / escalated) in Meta Business Manager and map them in System Messages tab
- 🟡 Live UK-number WA send test

## Backlog (P2, rejected suggestions not included)
- "Claim ticket" deep-link button in escalation template (first-to-claim becomes new POC)

## Known stable behaviours
- Hot reload ON — no service restart needed for code edits; only for `.env` or dep installs.
- Backend auto-startup: seeds 6 relation categories, 10 message templates, 15 ticket categories if collections empty; creates all required indexes; kicks off SLA scanner.
- Trigger registry is source-of-truth in Python `SYSTEM_TRIGGERS` list. DB rows are synced on startup (stale keys purged).

## Rejected (user explicitly said no)
- Adding curated "additional" triggers I proposed (pre_arrival_reminder, katha reminders, daily briefing, post-event feedback, etc.) — user wants to keep the system minimal with only the 10 current triggers.
