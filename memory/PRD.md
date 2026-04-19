# PRD — Swayamsevak Portal (Shrimad Bhagavat Katha 2026)

## Original Problem Statement
Imported GitHub repo `https://github.com/aspazone1234/hel/tree/final1` and implemented two feature tasks:

**Task 1** — Role-gated admin experience for normal admins (swamsevaks) vs super admins.
**Task 2** — Per-reference-person relation categories (each reference person owns its own list).

## Architecture
- Backend: FastAPI (`/app/backend/server.py`) + MongoDB (`test_database`)
- Frontend: React + Tailwind + Radix UI + Sonner (toasts)
- WhatsApp: Meta Cloud API (currently **MOCKED** — WA_* env vars empty)

## User Personas
- **Super admin (swami / superashwini)** — full access to all settings, sensitive data, configuration.
- **Normal admin (swamsevak)** — day-to-day operations access. Can browse sensitive modules but cannot change them. Sensitive values (OTPs, contact names/phones) are masked for them.

## Core Requirements (static)
1. Only super admin can create/edit reference persons, relation categories (now per-person), help categories, WA flow config, run bulk campaigns, manage custom fields, approve/reject registrations as admin.
2. Normal admin sees operational tools (help tickets, duties, attendance marker, room mgmt, expected/arrived lists).
3. On any blocked action, user gets a clear toast: **"You cannot change these settings. Contact the super admin for this."**

## What's been implemented
### 2026-04-19 (this session) — full import + role gating + reference model redesign
- Repo imported from branch `final1`; `.env`, deps, and MongoDB snapshot restored.
- **Task 1:**
  - `/app/frontend/src/lib/roleGuard.js` — global axios 403 interceptor shows the warning toast automatically on any backend-protected mutation.
  - `AdminPage.js` — sidebar for normal admin split into primary section (operational) + secondary faded "VIEW-ONLY (SUPER ADMIN CONTROLLED)" section (Reference Persons, Notifications, Custom Fields). Super admin sees them inline with full-access styling.
  - `ViewOnly.js` pointer-blocker wrapper removed from Reference Persons / Notifications / Custom Fields — users can now click freely.
  - `WAFlowSettings.js` — hides the entire dark endpoint/JSON card, flow-id/flow-token chips, Add/Edit/Delete buttons, and events viewer when `isSuper=false`. Shows amber "sensitive data hidden" banner instead.
  - `NotificationManagement.js` — accepts `user` prop, masks OTP codes (→ `••••••`), mobile numbers (→ `+91•••••••XX`), and conversation names/messages (→ "Hidden conversation" / "Protected message content"). Clicking a conversation row as non-super triggers the warning toast instead of opening detail.
  - `HelpCentre.js` — removes old ViewOnly wrappers; pipes `isSuper` into children.
- **Task 2:**
  - `ReferencePersonManager.js` redesigned to a single-panel layout. Each reference person card has inline chip-list of relation categories with remove-X and an "add category" input (supports comma-separated bulk add).
  - `RegisterPage.js` (public form): relation-category `<Select>` is rendered **only when the selected reference person has non-empty `relation_categories`**; derived list comes from the selected person. Changing reference person resets the chosen relation. Validation requires a relation only if the person has categories.
  - `MyRegistrationPage.js` EditReferenceModal: same conditional behaviour.
  - Dropped the (now-unused) global relation-categories fetch from both pages.

## Current Verified Status
- All 20 backend API tests PASSED (role-gating + reference-person CRUD + regression).
- All frontend UI tests PASSED (super + non-super flows; toast, masking, hidden sections, per-person chips).
- No regressions in dashboard / registrations / rooms / auth.

## Prioritized Backlog / Future
- **P1** — Hook up real WhatsApp Cloud API credentials in `/app/backend/.env` (WA_PHONE_NUMBER_ID, WA_ACCESS_TOKEN, WA_BUSINESS_ACCOUNT_ID, WA_WEBHOOK_VERIFY_TOKEN) so OTP send, bulk campaigns, and flow webhooks become live. Currently MOCKED.
- **P1** — Configure `APP_URL` env var for deep links generated in templates (already points to preview URL; update on production).
- **P2** — Allow an opt-in "show OTP for audit" button that unmasks a single OTP on-click for normal admins with a short reason prompt (audit logged).
- **P2** — Consider deprecating `/api/relation-categories/public` (unused by new UI) after a migration window.
- **P2** — In the Reference Persons manager, allow drag-reorder of categories per person.

## Test Credentials
- Super admin — `superashwini` / `supersebhiupper123`
- Normal admin (seeded) — `testadmin` / `test1234`
