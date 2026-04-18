# Shrimad Bhagavat Katha Mahotsav 2026 — Swamsevak Portal (PRD)

**Last updated:** 2026-04-18

## Original Problem Statement
Import the GitHub repo `aspazone1234/hel@new3`, install deps, get it running end-to-end, then fix system issues and redesign the WA Flow system for the Panchariya Seva Desk.

## Architecture
- **Backend**: FastAPI monolith (`/app/backend/server.py`, ~5500 LOC). Port 8001, supervisor-managed. All routes prefixed `/api`.
- **Frontend**: React 19 + CRA+CRACO + Tailwind + shadcn/ui. Port 3000, supervisor-managed.
- **DB**: MongoDB (motor async). DB name = `test_database`.
- **Auth**: JWT HS256. Super admin `superashwini` / `supersebhiupper123`.
- **WhatsApp**: Meta Cloud API v21.0. Webhook, Templates, Flows (RSA-2048 encrypted), OTP, Conversations, Campaigns, Auto-Response, System Triggers.

## Event Window
28 May – 3 Jun 2026, Pushkar, Rajasthan. Registration cutoff 19 May 2026.

## Personas
- **Guest / Shraddhalu**: public registrant
- **Swayamsevak (Sevak)**: volunteer, assigned as POC to guests
- **Super Admin**: top-level operator

## Core Modules (all live)
- Public registration + cutoff enforcement
- Attendee-level arrival tracking
- Room management + assignments + vacancy forecast
- QR code generation + scan-based check-in
- Reference Person + Relation Category taxonomy
- Custom fields on registrations
- Help Centre: ticket CRUD, SLA, auto-assign, auto-escalation
- To-Do module for swayamsevaks
- Notification Management: Bulk Campaigns, Auto Response, System Messages, Template Registry, Conversations, OTP Logs
- WA Flow Settings (Panchariya Seva Desk)

## Implemented (rolling log)

### 2026-04-18 Session 1 — Import & Setup
- Cloned from `aspazone1234/hel@new3`, installed deps, restored MongoDB (448 docs)
- Configured JWT_SECRET and WA API credentials
- All services running, 21/21 API tests + all frontend flows passed

### 2026-04-18 Session 2 — Major System Fixes & Flow Redesign

#### Trigger Fixes
- **Guest Arrived trigger fixed**: Swamsevak lookup now checks both `username` AND `name` fields; phone lookup checks both `phone` and `mobile` fields on custom_admins
- **Delay minutes persistence fixed**: Backend casts `delay_minutes` to int before storing; verified round-trip persistence
- **Delay honoring**: `fire_system_trigger` now waits `delay_minutes * 60` seconds before sending

#### Conversation View Fix
- **System notifications now visible**: `process_queue_item` logs outgoing system trigger messages in `wa_conversations` with `msg_type=system_notification`
- **Frontend updated**: ConversationsTab renders `system_notification` messages with amber background, `template_flow` messages with blue background

#### Flow System Redesign (Panchariya Seva Desk)
- **Removed keyword-based trigger** (`run_flow_keyword_matcher` no longer called from webhook)
- **New message routing**: Auto-response check first → if no match → trigger Help Center Flow
- **Single flow architecture**: One active flow (Help Center), structurally flexible for future
- **5-screen flow implementation**:
  - Screen 0 (INIT): Eligibility gate — checks if guest is arrived/on-premise
  - Screen 1 (WELCOME): Introduction — Panchariya Seva Desk welcome text
  - Screen 2 (GUEST_DETAILS): Auto-fetched guest details (name, room, swamsevak, family)
  - Screen 3 (CATEGORY): 8 help categories (water, daily items, medical, meal, cleaning, room, bedding, other)
  - Screen 4 (ISSUE_DETAILS): Sub-issues per category with optional description
  - Screen 5 (SUMMARY): Compiled summary → Submit
  - NOT_ELIGIBLE: Rejection screen for non-arrived guests
  - SUCCESS: Confirmation with ticket ID
- **Submission creates ticket**: auto-creates Help Centre ticket with guest info, category, priority, SLA
- **Triggers fire on submission**: `hc_flow_captured` (on-premise) or `hc_flow_not_on_premise`, plus `help_ticket_created` to assigned swamsevak

#### All Swamsevak phone lookups fixed
- `fire_hc_flow_outcome`, `fire_hc_ticket_escalated_all`, `_create_ticket_from_flow` — all now check both `phone` and `mobile` fields

## Testing Status
- All 12 backend API tests passed (flow screens, triggers, tickets)
- All frontend UI tests passed (dashboard, notifications, conversations, triggers)

## In-flight / Awaiting User Decision
- User needs to build matching Flow JSON in Meta Flow Builder with screen IDs: WELCOME, GUEST_DETAILS, CATEGORY, ISSUE_DETAILS, SUMMARY, SUCCESS, NOT_ELIGIBLE
- WA Flow private key needs to be configured for encrypted data exchange in production
- `keyword_template_name` on the flow config needs to be set for auto-triggering flow on unmatched messages

## Backlog (P2)
- "Claim ticket" deep-link button in escalation template
- Auto-Response editor UI exposing `is_flow_step` / `flow_id` fields
- Delete button on trigger cards
