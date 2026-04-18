# HANDOFF DOCUMENT — Shrimad Bhagavat Katha Mahotsav 2026 · Swamsevak Portal

**Date:** 2026-04-18
**Handoff from:** E1 Agent (Emergent Labs)
**Purpose:** Complete system knowledge transfer for AI migration

---

## 1. PROJECT OVERVIEW

**What this is:** Event management portal for Shrimad Bhagavat Katha Mahotsav 2026 (28 May – 3 Jun, Pushkar, Rajasthan). Manages guest registrations, room assignments, attendance tracking, help requests via WhatsApp Flows, and volunteer (Swayamsevak) coordination.

**Tech Stack:**
- Backend: FastAPI (Python 3.11), `/app/backend/server.py` (~5500 LOC), port 8001
- Frontend: React 19 + CRA+CRACO + Tailwind + shadcn/ui, port 3000
- Database: MongoDB (motor async), DB name = `test_database`
- Auth: JWT HS256, 24h expiry
- WhatsApp: Meta Cloud API v21.0, encrypted Flows (RSA-2048 + AES-GCM)
- Process Manager: Supervisor (backend + frontend hot-reload)

---

## 2. CREDENTIALS & SECRETS (CRITICAL)

### 2.1 Admin Login
- **Super Admin:** username=`superashwini` password=`supersebhiupper123` role=`superadmin`
- **Custom Admin (Swayamsevak):** username=`test` password=`test` name=`Tester` mobile=`+91 7229900422`

### 2.2 WhatsApp Meta Cloud API
- **Phone Number ID:** `1051687811364641`
- **Business Account ID:** `92620841022712`
- **Permanent Access Token:** `EAAL7LGRz8XsBRK2rLPsqapguZBf5vXrPuZBoPJElxCpw7NHGPK4vRE0PCbwa4p683pzSfd4sh2TVcUSe7DuhdgT1zSOlRy89mGg2e140rA9eN46zewApbaK9cRHzoVZBbUcjiF6OXtes3hRQsZC7Nm3RXyocpVX7q1FbFcIFl328ZByebvVE6ZBcS6FyaFQgZDZD`
- **Webhook Verify Token:** `swamsevak2026`
- **Webhook URL:** `{APP_URL}/api/webhooks/whatsapp`
- **Flow Data Exchange URL:** `{APP_URL}/api/webhooks/wa-flow`

### 2.3 WhatsApp Flow Encryption
- **Private Key:** `/app/backend/keys/flow_private.pem` (RSA-2048, no passphrase)
- **Public Key:** `/app/backend/keys/flow_public.pem` (uploaded to Meta, status VALID)
- **Flow ID in Meta:** `1015931884336181`
- **Auto-trigger template:** `raise_a_seva_request` (language: `hi`)

### 2.4 Backend Environment Variables
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
JWT_SECRET="1f09d9fc14187c31af1ff358ade688c04ff69fd1d2138dc6ed2dfa186bee8e83"
WA_PHONE_NUMBER_ID="1051687811364641"
WA_ACCESS_TOKEN="EAAL7LGRz8XsBRK2rLPsqapguZBf5vXrPuZBoPJElxCpw7NHGPK4vRE0PCbwa4p683pzSfd4sh2TVcUSe7DuhdgT1zSOlRy89mGg2e140rA9eN46zewApbaK9cRHzoVZBbUcjiF6OXtes3hRQsZC7Nm3RXyocpVX7q1FbFcIFl328ZByebvVE6ZBcS6FyaFQgZDZD"
WA_BUSINESS_ACCOUNT_ID="92620841022712"
WA_WEBHOOK_VERIFY_TOKEN="swamsevak2026"
WA_FLOW_PRIVATE_KEY_PATH="/app/backend/keys/flow_private.pem"
WA_FLOW_PRIVATE_KEY_PASSPHRASE=""
```

---

## 3. DATABASE RESTORE

The full MongoDB dump is at `/app/db_export/test_database/`. To restore:
```bash
mongorestore --drop --db test_database /app/db_export/test_database/
```

**Collections (703 docs total):**
- `registrations` (1) — guest registrations with attendees, room assignments, arrival status
- `custom_admins` (1) — swayamsevak accounts (separate from hardcoded superadmin)
- `rooms` (1) — room inventory with occupancy tracking
- `tickets` (7) — help centre tickets from WA Flow submissions
- `ticket_categories` (15) — service categories with priority + SLA
- `wa_templates` (15) — registered WhatsApp message templates
- `wa_triggers` (10) — system message trigger configs (enabled/disabled, template mapping, delay)
- `wa_flow_configs` (1) — active flow: "Raise a Seva Ticket" with keyword_template_name
- `wa_flow_sessions` (11) — flow_token→phone mappings for data exchange
- `wa_flow_events` (114) — all flow data exchange events (debugging log)
- `wa_conversations` (16) — WhatsApp chat history per phone
- `wa_webhook_events` (326) — raw incoming webhook events from Meta
- `wa_campaigns` (6) — bulk message campaigns
- `wa_campaign_recipients` (15) — per-recipient delivery tracking
- `wa_auto_responses` (1) — auto-response rules
- `wa_auto_response_runs` (6) — execution logs
- `wa_message_queue` (23) — outbound message queue with retry
- `message_templates` (10) — internal message templates
- `message_deliveries` (4) — delivery logs
- `relation_categories` (6) — guest relation taxonomy
- `reference_persons` (1) — reference person records
- `audit_logs` (112) — admin action audit trail
- `otp_sessions` (1) — OTP verification sessions

---

## 4. ARCHITECTURE & KEY CODE SECTIONS

### 4.1 Backend (`/app/backend/server.py`)
The entire backend is a single FastAPI file. Key sections by line range:

- **Lines 1-105:** Imports, MongoDB setup, auth helpers (JWT), audit logger
- **Lines 106-240:** Pydantic models for all entities
- **Lines 244-275:** Auth endpoints (login, me, logout)
- **Lines 275-340:** WhatsApp config, `normalize_phone_for_wa()`, `send_whatsapp_template()`
- **Lines 341-410:** OTP send/verify via WhatsApp
- **Lines 413-635:** Public registration endpoints + admin registration CRUD
- **Lines 636-700:** Reference persons + relation categories CRUD
- **Lines 695-930:** Admin registrations (3-bucket: pending/approved/rejected)
- **Lines 930-1030:** Mark arrival with system trigger firing (arrival_confirmed, guest_arrived, departure_marked)
- **Lines 1030-1100:** Mark not-coming with room release
- **Lines 1900-2000:** Help Centre tickets CRUD with SLA
- **Lines 2470-2530:** `run_flow_keyword_matcher()` (legacy, no longer called from webhook)
- **Lines 2530-2670:** `run_auto_response_matcher()` — fires auto-response step chains
- **Lines 2670-2700:** `_check_auto_response_match()` — quick check (no side effects)
- **Lines 2700-2740:** `trigger_help_center_flow()` — sends flow template when no auto-response matches
- **Lines 2740-2800:** `_handle_flow_completion()` — processes nfm_reply (flow complete) from webhook
- **Lines 2800-2870:** WhatsApp webhook (verify + receive) with message routing
- **Lines 2870-3400:** WA template registry, bulk campaigns, conversations, admin messaging
- **Lines 3900-3960:** Flow encryption helpers (decrypt/encrypt with RSA+AES-GCM)
- **Lines 3960-4000:** `_find_arrived_guest_by_phone()` — phone normalization + lookup
- **Lines 4000-4060:** `_create_ticket_from_flow()` — creates Help Centre ticket from flow data
- **Lines 4060-4250:** **`wa_flow_data_exchange()`** — THE MAIN FLOW HANDLER (see section 5)
- **Lines 4300-4470:** System triggers: SYSTEM_TRIGGERS list, `fire_system_trigger()`, `fire_hc_flow_outcome()`, `fire_hc_ticket_resolved()`, `fire_hc_ticket_escalated_all()`, SLA scanner
- **Lines 4470-4530:** `send_wa_flow_template()` — sends template with Flow CTA button
- **Lines 4530-4620:** `process_queue_item()` — processes outbound messages + logs to conversations
- **Lines 4850-4900:** `confirm_departure()` — with departure trigger firing

### 4.2 Frontend (`/app/frontend/src/`)
- `App.js` — Router: `/` (home), `/register`, `/my-registration`, `/admin`, `/privacy-policy`, `/thank-you`
- `pages/AdminPage.js` — Admin shell with sidebar navigation
- `components/admin/AdminDashboard.js` — Command Centre with stats
- `components/admin/NotificationManagement.js` — THE BIG ONE (1800+ LOC): Campaigns, Auto Response, Triggers, Templates, Conversations, OTP Logs tabs
- `components/admin/WAFlowSettings.js` — Help Centre → WA Flow tab (flow config, keyword_template_name)
- `components/admin/HelpCentre.js` — Tickets, Services/SLA, WA Flow Settings tabs
- `components/admin/AdminRoomManagement.js` — Room CRUD + assignments
- `components/admin/QRScanner.js` — QR-based check-in
- `components/admin/TodoModule.js` — Swayamsevak tasks
- `components/HeroSection.js` — Public landing page hero

---

## 5. WHATSAPP FLOW SYSTEM (CRITICAL — MOST COMPLEX PART)

### 5.1 Flow Architecture
The user's final Flow JSON (v7.1) is uploaded to Meta Flow Builder. Screen flow:

```
INTRO (static, navigate) → GUEST_DETAILS (data from INIT) → CATEGORY_SELECTION (data_exchange)
  → ISSUE_WATER / ISSUE_DAILY / ISSUE_MEDICAL / ISSUE_MEAL / ISSUE_CLEANING / ISSUE_ROOM / ISSUE_BEDDING / ISSUE_OTHER
    → SUMMARY_SUBMIT (terminal, complete action)
```

### 5.2 Backend Interactions (only 2 calls from Meta to our endpoint)

**Call 1: INIT** — When user opens the flow
- Backend looks up phone from `flow_token` → `wa_flow_sessions` collection
- Finds guest in `registrations` by phone (with normalization: +91, spaces, etc.)
- Returns `screen: "GUEST_DETAILS"` with auto-fetched data:
  - `guest_name`, `room_number`, `assigned_swayamsevak`, `swayamsevak_contact`, `family_members`, `mobile_number`
- NOTE: INTRO screen is skipped because it uses `navigate` (no backend call), so backend returns GUEST_DETAILS directly to populate dynamic data

**Call 2: data_exchange from CATEGORY_SELECTION** — When user selects category and clicks "Agla Step"
- Backend receives `category` from payload
- Maps category ID to issue screen:
  - `paani_chai_coffee` → `ISSUE_WATER`
  - `daily_use_items` → `ISSUE_DAILY`
  - `medical_sahayata` → `ISSUE_MEDICAL`
  - `meal_request` → `ISSUE_MEAL`
  - `safai_hygiene` → `ISSUE_CLEANING`
  - `room_utility_issue` → `ISSUE_ROOM`
  - `bedding_comfort` → `ISSUE_BEDDING`
  - `lost_found_other_help` → `ISSUE_OTHER`
- Returns the target ISSUE screen with guest data + category passed through

**Flow Completion (NOT a data_exchange call):**
- SUMMARY_SUBMIT uses `complete` action → Meta sends an `nfm_reply` interactive message to our webhook
- `_handle_flow_completion()` extracts: `guest_name`, `room_number`, `category`, `request_type`, `additional_details`
- Creates ticket in `tickets` collection via `_create_ticket_from_flow()`
- Fires system triggers: `hc_flow_captured` (on-premise) or `hc_flow_not_on_premise`, plus `help_ticket_created` to assigned swayamsevak

### 5.3 Flow Encryption
Meta encrypts all flow data with our public key (RSA-2048). Backend decrypts with private key at `/app/backend/keys/flow_private.pem`. The encryption uses:
1. RSA-OAEP to decrypt the AES key
2. AES-128-GCM to decrypt the payload
3. Response encrypted with flipped IV

### 5.4 Auto-Trigger Logic
When ANY user sends a WhatsApp message:
1. First: check if message matches any active auto-response rule (`wa_auto_responses` collection)
2. If match → fire auto-response step chain
3. If NO match → call `trigger_help_center_flow()`:
   - Looks up active flow config in `wa_flow_configs`
   - Gets `keyword_template_name` = `raise_a_seva_request`
   - Sends that WhatsApp template (which has Flow CTA button) to the user
   - User taps button → flow opens → INIT called → cycle begins

---

## 6. SYSTEM TRIGGERS

10 system triggers, configured in `SYSTEM_TRIGGERS` list in server.py and stored in `wa_triggers` collection:

### User Triggers (sent to guest's mobile):
| Key | Label | When Fired | Status |
|-----|-------|-----------|--------|
| `registration_submitted` | Registration Submitted | After POST /api/registrations | Enabled |
| `arrival_confirmed` | Arrival Confirmed | When mark_arrival → arrived/partially_arrived | Enabled |
| `departure_marked` | Departure Marked | When mark_arrival → departed OR confirm_departure | Enabled |
| `help_ticket_response` | Help Ticket Response | When admin updates ticket notes | Disabled |
| `hc_flow_captured` | HC: Query Captured | After flow submission (guest is on-premise) | Enabled |
| `hc_flow_not_on_premise` | HC: Not on Premise | After flow submission (guest NOT arrived) | Enabled |
| `hc_ticket_resolved` | HC: Ticket Resolved | When ticket marked resolved | Enabled |

### Admin Triggers (sent to swayamsevak/admin):
| Key | Label | When Fired | Status |
|-----|-------|-----------|--------|
| `help_ticket_created` | Help Ticket Created | After flow creates ticket → notifies assigned swayamsevak | Enabled |
| `hc_ticket_escalated_all` | HC: Ticket Escalated | When SLA breached → broadcasts to ALL swayamsevaks | Enabled |
| `guest_arrived` | Guest Arrived | When assigned guest checks in → notifies swayamsevak | Enabled (1min delay) |

### Trigger Firing Mechanics:
- `fire_system_trigger()` checks `wa_triggers` collection for enabled config + template mapping
- Honors `delay_minutes` (sleeps before sending)
- Resolves template variable labels via alias-aware matching (case-insensitive, strips var_ prefix)
- Queues message in `wa_message_queue`, processes immediately in background
- `process_queue_item()` sends via Meta API and logs outgoing message in `wa_conversations` with `msg_type: "system_notification"`

---

## 7. IMPORTANT BUGS FIXED IN THIS SESSION

1. **Guest Arrived trigger**: Was looking up swayamsevak by `username` only, but `assigned_swamsevak` field stores the **name**. Fixed to try both `username` AND `name`, and check both `phone` and `mobile` fields.

2. **Delay minutes**: Was stored as string, now cast to `int()` before saving.

3. **Departure trigger missing**: `confirm_departure` endpoint never called `fire_system_trigger("departure_marked")`. Fixed.

4. **System notifications invisible in conversations**: `process_queue_item` now logs outgoing system trigger messages in `wa_conversations` with `msg_type: "system_notification"`. Frontend renders these with amber background.

5. **Flow decryption 421 error**: Private key was not configured. Generated RSA-2048 key pair, uploaded public key to Meta via Graph API (`/whatsapp_business_encryption` endpoint), configured private key path in .env.

---

## 8. KNOWN LIMITATIONS & TODO

### In-Flight:
- INTRO screen in Flow JSON uses `navigate` (client-side) so backend skips it and returns GUEST_DETAILS directly on INIT. User sees GUEST_DETAILS as first screen. If user wants INTRO shown first, change INTRO's `on-click-action` from `navigate` to `data_exchange`.
- Health check on Meta Flow Builder may still show red — this is normal until the flow is tested end-to-end with a real WhatsApp message.

### Backlog:
- Delete button on trigger cards
- Auto-Response editor UI exposing `is_flow_step` / `flow_id` fields
- "Claim ticket" deep-link in escalation template
- `help_ticket_response` trigger not yet wired (disabled)

### Event Dates:
- Registration cutoff: 19 May 2026
- Finalization: 21 May 2026
- Stay window: 27 May – 4 Jun 2026
- Event: 28 May – 3 Jun 2026

---

## 9. HOW TO SET UP FROM SCRATCH

```bash
# 1. Install backend deps
cd /app/backend && pip install -r requirements.txt

# 2. Install frontend deps
cd /app/frontend && yarn install

# 3. Configure .env files (see Section 2.4 above)

# 4. Restore MongoDB
mongorestore --drop --db test_database /app/db_export/test_database/

# 5. Copy keys
mkdir -p /app/backend/keys
# (flow_private.pem and flow_public.pem should be in /app/backend/keys/)

# 6. Restart services
sudo supervisorctl restart backend frontend
```

---

## 10. FILE STRUCTURE

```
/app/
├── backend/
│   ├── server.py              # THE backend (5500 LOC FastAPI monolith)
│   ├── requirements.txt       # Python deps
│   ├── .env                   # All secrets (see Section 2.4)
│   ├── keys/
│   │   ├── flow_private.pem   # RSA-2048 private key for WA Flow decryption
│   │   └── flow_public.pem    # Corresponding public key (uploaded to Meta)
│   ├── static/
│   │   ├── uploads/           # File uploads
│   │   └── e-nimantran.pdf    # Event invitation PDF
│   └── tests/                 # Pytest files
├── frontend/
│   ├── src/
│   │   ├── App.js             # Router
│   │   ├── pages/             # HomePage, AdminPage, RegisterPage, etc.
│   │   ├── components/
│   │   │   ├── admin/         # All admin panel components
│   │   │   │   ├── NotificationManagement.js  # 1800+ LOC: campaigns, triggers, conversations
│   │   │   │   ├── WAFlowSettings.js          # Flow config with keyword_template_name
│   │   │   │   ├── HelpCentre.js              # Tickets + services + WA Flow
│   │   │   │   ├── AdminDashboard.js          # Command Centre
│   │   │   │   └── ... (12 more admin components)
│   │   │   └── ui/            # shadcn/ui components
│   │   ├── context/           # LanguageContext (Hindi/English)
│   │   └── hooks/             # use-toast
│   ├── package.json
│   ├── craco.config.js
│   └── .env                   # REACT_APP_BACKEND_URL
├── db_export/test_database/   # MongoDB dump (mongorestore this!)
├── memory/
│   ├── PRD.md                 # Product requirements document
│   ├── HANDOFF.md             # THIS FILE
│   └── test_credentials.md    # Login credentials
└── design_guidelines.json     # UI design guidelines
```
