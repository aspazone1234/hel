# Shrimad Bhagavat Katha Mahotsav 2026 — Swamsevak Portal (PRD)

## Original Problem Statement
Import the GitHub repo `aspazone1234/hel@new2`, install deps, get it running end-to-end, then progressively complete the WhatsApp feature roadmap documented in `HANDOFF.md` (Sessions 1–5).

## Architecture
- **Backend**: FastAPI monolith (`/app/backend/server.py`, ~5000 LOC). Runs on `:8001` behind nginx/CF ingress, path-prefixed `/api`.
- **Frontend**: React 19 + CRA+CRACO, Tailwind + shadcn/ui. Runs on `:3000`.
- **DB**: MongoDB (motor async). DB = `test_database`.
- **Auth**: JWT HS256. Super admin `superashwini` / `supersebhiupper123`.
- **Integrations**: WhatsApp Cloud API v21.0 (templates, OTP, media, Flows), Meta WA Flow RSA-2048 encryption.

## Environment (backend/.env)
```
MONGO_URL, DB_NAME, CORS_ORIGINS, JWT_SECRET
APP_URL=https://code-mirror-60.preview.emergentagent.com
WA_PHONE_NUMBER_ID, WA_BUSINESS_ACCOUNT_ID, WA_ACCESS_TOKEN
WA_WEBHOOK_VERIFY_TOKEN=swamsevak2026
WA_FLOW_PRIVATE_KEY_PATH=/app/backend/keys/wa_flow_private.pem
WA_FLOW_PRIVATE_KEY_PASSPHRASE=swamsevak_flow_2026
```
Meta webhook callback: `https://<APP_URL>/api/webhooks/whatsapp` · Flow endpoint: `https://<APP_URL>/api/webhooks/wa-flow`

## What's Been Implemented (rolling log)
### 2026-04-17 (session 1)
- Imported repo from GitHub; installed deps; wired JWT_SECRET; services running; Meta webhook verified; Flow public key uploaded (status VALID).

### 2026-04-17 (session 2) — Feature add + Sessions 4B & 5 handover
- **Campaign Export (CSV + PDF)** — every detail included: `GET /api/admin/wa-campaigns/{id}/export.csv` and `.pdf`. CSV has BOM for Excel. PDF is landscape A4 with summary card + stats row + recipient table, auto-paginates. UI buttons added next to Refresh.
- **International number fix** — Centralized `normalize_phone_for_wa()` in server.py. Replaced 4 hand-rolled normalizers. UK (+44), US (+1), and any country-code-prefixed number now routes correctly. 10-digit bare numbers still assumed India.
- **Session 4B — HC system triggers**:
  - Added 4 new triggers: `hc_flow_captured`, `hc_flow_not_on_premise`, `hc_ticket_resolved`, `hc_ticket_escalated_all`.
  - `help_ticket_created` (POC notify) wired on auto-assign during WA-Flow ticket creation.
  - `resolve_ticket` now fires `hc_ticket_resolved` to guest.
  - **SLA escalation scanner**: background task runs every 60 s → scans open tickets past SLA → marks `escalated_at` + broadcasts `hc_ticket_escalated_all` to ALL swayamsevaks. Admin override endpoint: `POST /api/admin/tickets/escalate-check`.
  - **Keyword → Template-with-Flow-CTA**: new helper `send_wa_flow_template()` mints `flow_token`, binds it to the phone in `wa_flow_sessions`, and sends a template with a Flow CTA button. Auto-Response engine now supports a `is_flow_step` step type.
- **Session 5 — User vs Admin trigger split**:
  - Backend `SYSTEM_TRIGGERS` already carries `type: "user"|"admin"`; now 14 user + 4 admin triggers.
  - Frontend `TriggersTab` rewritten: audience toggle (User / Admin-Swayamsevak), per-trigger enable toggle, template dropdown, delay input, recipient label ("Guest's registered mobile" / "Assigned Swayamsevak" / "All Swayamsevaks" / "Super Admin").

## Core Requirements (static)
- Guest registration workflow
- Volunteer (Swayamsevak) portal with room/QR/help-centre management
- Super-admin control panel
- Full WhatsApp messaging stack: OTP, templates, bulk campaigns, free-form conversations, auto-response, Flow-based help tickets

## Backlog
- **P1** Frontend Auto-Response editor: expose `is_flow_step` / `flow_id` fields on a step so admins can wire keyword → Flow template without DB edits.
- **P1** Seed default HC templates in Meta, then pick them from the trigger UI.
- **P2** Add "Test Send" button on each enabled trigger (send to the operator's own phone for QA).
- **P2** Notify POC also via `hc_ticket_resolved` (currently only the guest gets notified on resolve).
- **P2** Localize HC system messages (en + hi) based on guest's preferred language.

## Next Tasks
1. Create Meta templates matching the 4 new HC triggers and map them in the System Messages tab.
2. Live-test `hc_flow_captured` by submitting the WA Flow from an on-premise arrived-guest number.
3. Live-test escalation by forcing a ticket's `resolution_time_minutes` to 1 and watching the 60-s scanner broadcast.
