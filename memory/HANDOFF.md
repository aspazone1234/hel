# HANDOFF — Shrimad Bhagavat Katha Mahotsav 2026 · Swamsevak Portal

**Last updated:** 2026-04-17
**Purpose:** Onboard the next AI/developer picking up this codebase. Read this first. Then skim `PRD.md` and `test_credentials.md`.

---

## 1 · Project in 60 seconds

A full-stack admin portal for managing a 7-day spiritual event (Shrimad Bhagavat Katha) at Pushkar, 28 May – 3 Jun 2026. The event hosts thousands of guests (shraddhalus) coordinated by volunteer sevaks (swayamsevaks). The portal handles:

- **Public registration** (family/group, attendees, dates, travel, address)
- **Admin operations**: approvals, room assignment, QR check-in, arrival/departure tracking, departure forecasting
- **Help Centre**: ticket system with SLA + auto-escalation, auto-created from a WhatsApp Flow form
- **WhatsApp messaging stack**: Meta Cloud API for templates, OTP, bulk campaigns, free-form conversations, auto-response rules, Flow-based help tickets, system-event-triggered messages

Super admin: `superashwini` / `supersebhiupper123` (hardcoded in server.py, ADMIN_ACCOUNTS).
Public URL: `https://code-mirror-60.preview.emergentagent.com`

---

## 2 · Tech stack & layout

- **Backend**: FastAPI monolith — single file `/app/backend/server.py` (~5100 LOC)
  - Async MongoDB via `motor`, `pymongo`
  - JWT HS256 auth, `python-jose` / `PyJWT`
  - PDF: `fpdf2`, Excel: `openpyxl`, QR: `qrcode`
  - WhatsApp: direct `httpx` calls to Meta Graph API v21.0; Flow encryption via `cryptography` (RSA-2048)
  - Runs at `:8001` (supervisor-managed), path-prefixed `/api`

- **Frontend**: React 19 + CRA + CRACO, Tailwind + shadcn/ui
  - Entry: `/app/frontend/src/App.js` → routes → pages + admin components
  - Admin components in `/app/frontend/src/components/admin/`
  - Runs at `:3000` (supervisor-managed), proxied through Cloudflare ingress

- **DB**: MongoDB, db name **`test_database`** (yes, really — don't rename or data is lost)

- **Ingress**: Cloudflare → nginx → supervisor → services. `/api/*` → backend, else → frontend.

- **Hot reload**: ON for both services. Only restart via `sudo supervisorctl restart backend|frontend` after `.env` changes or dep installs.

### Key files you'll edit
| File | What it holds |
|---|---|
| `/app/backend/server.py` | ALL backend routes, models, business logic, WA integrations |
| `/app/backend/.env` | secrets (WA creds, JWT, Mongo) |
| `/app/backend/keys/wa_flow_{private,public}.pem` | Meta WA Flow RSA keys |
| `/app/frontend/src/components/admin/NotificationManagement.js` | WhatsApp campaigns, triggers, templates, conversations, OTP logs UI |
| `/app/frontend/src/components/admin/HelpCentre.js` | Ticket management UI |
| `/app/frontend/src/components/admin/WAFlowSettings.js` | Flow config UI (lives under Help Centre) |
| `/app/frontend/src/components/admin/AdminDashboard.js` | Root admin router/shell |
| `/app/memory/whatsapp_flow.json` | Reference copy of the Flow JSON definition for Meta Flow Builder |

### Environment (`/app/backend/.env` — do NOT commit)
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
CORS_ORIGINS="*"
JWT_SECRET=swamsevak_jwt_secret_2026_emergent
APP_URL=https://code-mirror-60.preview.emergentagent.com
WA_PHONE_NUMBER_ID=1051687811364641
WA_BUSINESS_ACCOUNT_ID=926208410227120
WA_ACCESS_TOKEN=<long bearer — see test_credentials.md>
WA_WEBHOOK_VERIFY_TOKEN=swamsevak2026
WA_FLOW_PRIVATE_KEY_PATH=/app/backend/keys/wa_flow_private.pem
WA_FLOW_PRIVATE_KEY_PASSPHRASE=swamsevak_flow_2026
```

Frontend `.env` has `REACT_APP_BACKEND_URL` — leave alone.

---

## 3 · WhatsApp integration — exactly what's where

### Webhook (Meta → us)
- **Callback URL**: `https://code-mirror-60.preview.emergentagent.com/api/webhooks/whatsapp`
- **Verify token**: `swamsevak2026` (short lowercase — Meta was failing earlier on long tokens, pasting glitches suspected)
- **Handler**: `whatsapp_webhook_receive` in `server.py` (~line 2552). Handles GET verify, POST incoming messages AND POST status updates.
- Incoming messages → upserts `wa_conversations`, then fires **two matchers in parallel**:
  1. `run_flow_keyword_matcher(from, text)` — checks `wa_flow_configs.trigger_keywords` → sends template w/ Flow CTA via `send_wa_flow_template()`. **Requires `keyword_template_name` to be set on the flow config.**
  2. `run_auto_response_matcher(from, text)` — free-form keyword → step-chain matcher in `wa_auto_responses`.

### Flow endpoint (Meta Flows → us, encrypted)
- **URL**: `https://code-mirror-60.preview.emergentagent.com/api/webhooks/wa-flow`
- **Public key uploaded to Meta**: signature status = **VALID**
- **Private key**: `/app/backend/keys/wa_flow_private.pem` (passphrase-protected)
- **Handler**: `wa_flow_data_exchange` (~line 3857). Decrypts payload with `_decrypt_flow_request`, handles `INIT`/`BACK`/`data_exchange`/`ping`/REVIEW submit.
- **Phone resolution logic** (critical): on submit (screen=REVIEW):
  1. Look up `flow_token → phone` in `wa_flow_sessions`
  2. Else use `flow_data.phone` if Flow passed it
  3. **If still missing AND token starts with `flows-builder-`** → use placeholder `+00-flow-builder-test` (so testing via Meta Flow Builder still creates a visible ticket in Help Centre). This was added because the user was confused that Builder test submissions silently did nothing.
- After ticket creation, fires HC triggers: `hc_flow_captured` (on-premise) / `hc_flow_not_on_premise` (off-premise) + `help_ticket_created` to POC.

### Outbound helpers in server.py
- `send_whatsapp_template(phone, template_name, language, body_params, header_media_url, header_type)` — standard template send.
- `send_wa_flow_template(phone, template_name, language, flow_id, flow_cta_text, body_params)` — mints fresh `flow_token`, binds to phone in `wa_flow_sessions`, sends template with `sub_type=flow` button.
- `fire_system_trigger(trigger_key, phone, variables)` — queues system-event message through `wa_message_queue`, processed by `process_queue_item`.
- `send_otp` endpoint — uses `otp_verification` template with OTP as body param + URL button param.

### ⚠️ PHONE NORMALIZATION — critical learning
Originally the codebase had **four hand-rolled phone normalizers** that blindly prefixed `91` whenever the number didn't start with `+`. This broke UK (+44), US (+1), every non-India number — e.g. `447911123456` became `91447911123456`.

**Fix**: One helper — `normalize_phone_for_wa(phone)` — is the ONLY way to normalize. Rules:
- Strip spaces, dashes, parens
- If starts with `+` → strip `+`, return as-is (country code already present)
- Else if length is 10 AND first digit is 6/7/8/9 → prefix `91` (Indian mobile)
- Else → return as-is (assume country code already present)

All 4 send sites (`send_whatsapp_template`, `send_otp`, 1-to-1 text, 1-to-1 media bundle) use this helper. **If you add new send paths — MUST use this helper.** Ad-hoc `"91" + phone` is a bug.

---

## 4 · System triggers — what fires, where, and how

**Collection**: `wa_triggers` (one doc per enabled trigger with template_id, template_name, delay_minutes, enabled). Seed data comes from Python list `SYSTEM_TRIGGERS` (~line 4020).

**On startup**, server purges `wa_triggers` rows whose `trigger_key` isn't in `SYSTEM_TRIGGERS` anymore — so removing a trigger from Python auto-cleans DB.

### Current registry (10 triggers: 7 user + 3 admin)

| Key | Audience | Fires in | Variables passed |
|---|---|---|---|
| `registration_submitted` | user | `POST /api/registrations` after insert | `name`, `guest_name`, `shraddhalu_name`, `full_name`, `mobile`, `phone`, `num_people`, `members`, `arrival_date`, `departure_date`, `registration_id`, `reg_id` |
| `arrival_confirmed` | user | `mark_arrival` when status→arrived/partially_arrived (and was not before) | `name`, `guest_name`, `shraddhalu_name`, `mobile`, `phone`, `room`, `room_code`, `room_no` |
| `help_ticket_response` | user | `PUT /api/admin/tickets/{id}` when `notes` field changes | `name`, `guest_name`, `ticket_id`, `response`, `reply`, `message`, `service`, `responder_name`, `sevak_name` |
| `departure_marked` | user | `mark_arrival` when status→departed | `name`, `guest_name`, `mobile`, `room` |
| `hc_flow_captured` | user | WA Flow submit (phone found in arrived_guest list) | `guest_name`, `ticket_id`, `service_type`, `priority`, `sla_minutes`, `sla`, `arrived_status` |
| `hc_flow_not_on_premise` | user | WA Flow submit (phone NOT in arrived_guest list) | same as above |
| `hc_ticket_resolved` | user | `PUT /api/admin/tickets/{id}/resolve` | `guest_name`, `ticket_id`, `service_type`, `resolved_by_name`, `closing_note` |
| `help_ticket_created` | admin | WA Flow submit (POC notify — assigned swayamsevak's WA number) | `swamsevak_name`, `guest_name`, `guest_mobile`, `service_type`, `ticket_id`, `priority`, `room_or_location`, `description` |
| `hc_ticket_escalated_all` | admin | `sla_escalation_scanner` loop (60s interval), broadcasts to all sevaks | `swamsevak_name`, `ticket_id`, `guest_name`, `guest_mobile`, `service_type`, `priority`, `room_or_location`, `description`, `assigned_to_name` |
| `guest_arrived` | admin | `mark_arrival` when guest arrives — sent to assigned swayamsevak's WA | `swamsevak_name`, `sevak_name`, `guest_name`, `room`, `guest_mobile` |

### REMOVED (user rejected these — DO NOT RE-ADD without asking)
`registration_approved`, `registration_rejected`, `qr_generated`, `room_assigned`, `swamsevak_assigned`, `marked_not_coming`, `room_transferred`, `new_registration`.

### Variable resolution (very important to understand)
`fire_system_trigger` builds a **case-insensitive alias map** from the passed `variables` dict. So a template whose Meta variable labels are `Name`, `GUEST_NAME`, or `shraddhalu_name` all resolve to the same value. Keys are lowercased, spaces→underscores, and `var_N` prefix stripped.

If the template has `variable_labels` set → each label is resolved via the alias map.
If the template has only `variable_count` (positional `{{1}}`,`{{2}}`) → uses `variables["_positional"]` list.

When you add a NEW trigger-firing call-site: **pass a dict with MULTIPLE aliases** (e.g., include both `name` AND `guest_name` AND `shraddhalu_name` AND a `_positional` fallback list) so the trigger works regardless of how the admin named their variables in Meta template registration.

### Structured logging
Every trigger fire logs:
```
[Trigger] <key>: firing template='<meta_name>' to <phone> params=[...]
```
or
```
[Trigger] <key>: skipped (not enabled or no template set)
```
Tail `/var/log/supervisor/backend.err.log` and grep `[Trigger]` to debug any "message not arriving" complaint.

---

## 5 · SLA escalation scanner

Background asyncio task started on app startup (~line 5025). Every 60 seconds:
1. Queries `tickets` where `status ∈ [open, in_progress]` AND `escalated_at` empty.
2. For each, computes age from `created_at`. If age ≥ `resolution_time_minutes` → mark `escalated_at` + `escalation_level="all_swamsevaks"` and fire `hc_ticket_escalated_all` to every swayamsevak in `custom_admins` (role ∈ [swamsevak, admin]).

Admin override: `POST /api/admin/tickets/escalate-check` runs the same check immediately and returns count + per-ticket detail.

---

## 6 · Campaign export

User requested CSV + PDF export of any bulk campaign. Endpoints:
- `GET /api/admin/wa-campaigns/{id}/export.csv` — BOM-prefixed UTF-8, summary block + recipient rows with all variable_values flattened to `var: <key>` columns.
- `GET /api/admin/wa-campaigns/{id}/export.pdf` — landscape A4. Uses `fpdf2` core Helvetica font. Em-dashes replaced with ASCII `-` to avoid `FPDFException: Not enough horizontal space to render a single character` (core font doesn't have U+2014).

UI: Two buttons (`Export CSV`, `Export PDF`) next to Refresh in `CampaignDetailView` (`NotificationManagement.js`).

---

## 7 · How to debug common "not working" complaints

### "I configured a trigger but the WhatsApp message isn't arriving"
1. Tail backend logs, grep `[Trigger]`:
   ```bash
   tail -f /var/log/supervisor/backend.err.log | grep '\[Trigger\]'
   ```
   Then reproduce the action. You'll see either `firing template=…` or `skipped (not enabled or no template set)`.
2. If `firing` but no WA delivery → check `wa_message_queue` for the item's status + `error_detail`:
   ```
   GET /api/admin/wa-queue?per_page=10
   ```
3. If error says "Template name does not exist…" → template not approved in Meta yet.
4. If error says "Recipient phone number not in allowed list" → Meta's phone is in sandbox mode; verify test numbers in Meta Business Manager.
5. If NO log line at all for that trigger_key → **the code path isn't calling `fire_system_trigger` for that event**. Add it. The pattern is in `mark_arrival`, `update_ticket`, `create_registration`, `resolve_ticket`.

### "The `help` keyword doesn't open my Flow"
- Check `wa_flow_configs` collection — is the flow row present with correct `trigger_keywords` and `keyword_template_name`?
- If `keyword_template_name` is empty → matcher logs `"keyword matched but no keyword_template_name configured — nothing to send"` and skips. Fill it in via the Flow Settings UI.
- Template MUST contain a Flow-type button referencing the `flow_id` — Meta approves these under `AUTHENTICATION` or `MARKETING` category.

### "WA Flow submission creates no ticket"
- `wa_flow_events` collection has every request received — check the most recent row to see `action`/`screen`/`flow_token`/`data`.
- If `screen=REVIEW` but no ticket → check log for `[WA Flow] Submission but phone not resolved`. Token not in `wa_flow_sessions` AND no `phone` in data AND token doesn't start with `flows-builder-` → handler returns `error: phone_missing`.
- In production, `flow_token` is minted by `send_wa_flow_template` and bound to phone BEFORE the template is sent — so this should always work. If it doesn't, check that `send_wa_flow_template` successfully inserted into `wa_flow_sessions`.

### "International number (UK/US) not receiving messages"
- Already fixed — but check Meta error. Likely the number is not in Meta's sandbox allow-list for this test phone. Real production app with approved business phone has no such restriction.
- Verify `normalize_phone_for_wa` produced the right string (log it temporarily with `logger.info`).

### "Frontend compiles with errors after my edit"
- `yarn.lock` is stable. Don't edit `package.json` by hand — use `yarn add <pkg>`.
- The `@emergentbase/visual-edits` plugin is expected and harmless; its "overlay.js not found" warning is benign.

---

## 8 · Things in-flight / needing clarification — READ BEFORE PICKING UP

### 🟡 Delete button for triggers (user requested, not built yet)
User wants a "delete" action on triggers in the System Messages tab. My proposal (pending their OK):
- **Core triggers** (registration_submitted, arrival_confirmed, help_ticket_created) → only disable, NOT delete (system code paths depend on them).
- **Optional triggers** → allow full delete.
- Backend: `DELETE /api/admin/wa-triggers/{key}` + mark trigger as `deletable: true/false` in SYSTEM_TRIGGERS.
- Frontend: trash icon on deletable trigger cards, disabled with tooltip on core ones.

**NOT DONE YET.** Ask user before building.

### 🟡 Auto-Response editor UI for `is_flow_step` / `flow_id`
Backend already supports it (see `run_auto_response_matcher` around line 2540). Frontend Auto-Response editor doesn't yet expose those fields — admins have to set them via DB. User acknowledged P1 backlog but hasn't picked it up.

### 🟡 4 new Meta templates not yet created
User needs to create in Meta Business Manager:
- A template for `hc_flow_captured` (body text with vars: guest_name, ticket_id, service_type, sla)
- A template for `hc_flow_not_on_premise`
- A template for `hc_ticket_resolved`
- A template for `hc_ticket_escalated_all`
Until created + mapped in the UI, those 4 triggers won't deliver messages even when firing.

### 🟡 UK number live test
User suggested test a UK (+44) number after the normalization fix. Not live-tested yet because the sample number is likely not on Meta's sandbox allow-list. Production WA number should work without issue.

### ✅ Just completed (do not re-do)
- 8 rejected triggers removed from registry + DB purged on startup.
- 5 missing `fire_system_trigger` calls wired: `registration_submitted`, `arrival_confirmed`, `guest_arrived`, `departure_marked`, `help_ticket_response`.
- Variable resolution made alias-aware + structured logging added.
- PDF/CSV campaign export live.
- International number bug fixed.
- SLA escalation scanner live.
- Keyword → Flow-CTA template matcher wired.

---

## 9 · Common commands

```bash
# Services
sudo supervisorctl status
sudo supervisorctl restart backend    # after server.py major edit
sudo supervisorctl restart frontend   # after frontend config/dep change
tail -f /var/log/supervisor/backend.err.log
tail -f /var/log/supervisor/frontend.out.log

# DB inspection
python3 -c "
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
async def main():
    c = AsyncIOMotorClient('mongodb://localhost:27017')
    db = c['test_database']
    print('triggers:', await db.wa_triggers.count_documents({}))
    print('templates:', await db.wa_templates.count_documents({}))
    print('tickets:', await db.tickets.count_documents({}))
    print('flow_sessions:', await db.wa_flow_sessions.count_documents({}))
asyncio.run(main())
"

# Quick API sanity (use REACT_APP_BACKEND_URL — localhost:8001 bypasses ingress)
API_URL="https://code-mirror-60.preview.emergentagent.com"
TOKEN=$(curl -s -X POST "$API_URL/api/auth/login" -H "Content-Type: application/json" \
  -d '{"username":"superashwini","password":"supersebhiupper123"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['token'])")
curl -s "$API_URL/api/admin/wa-triggers" -H "Authorization: Bearer $TOKEN" | python3 -m json.tool

# Webhook verification manually
curl -s "$API_URL/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=swamsevak2026&hub.challenge=hello" -w "\nHTTP=%{http_code}\n"
```

---

## 10 · Coding conventions in this codebase

- FastAPI routes: all backend routes MUST start with `/api` (ingress routes only `/api/*` to 8001).
- `require_superadmin(request)` at top of super-admin-only routes; `get_current_user(request)` for any logged-in user.
- MongoDB reads: always `find({...}, {"_id": 0})` or projection — ObjectId not JSON-serializable.
- UUIDs for `id` fields (`str(uuid.uuid4())`), not Mongo's `_id`.
- Datetimes: `datetime.now(timezone.utc).isoformat()` — ISO strings, never `datetime.utcnow()`.
- Log audit trail for mutating actions: `await log_audit(action_type, target_type, target_id, target_name, details, performed_by)`.
- Phone normalization: always `normalize_phone_for_wa(phone)` before sending to Meta.
- Trigger fires: always pass alias dict + `_positional` list — never a naive single-key dict.

---

## 11 · Files to NOT touch

- `/app/.emergent/` — platform config, do not modify.
- `/app/.git/` — preserve.
- `/app/backend/.env` — you may ADD keys, never DELETE `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`.
- `/app/frontend/.env` — `REACT_APP_BACKEND_URL` is protected (production URL).
- Supervisor configs, nginx configs, port bindings — all platform-managed.

---

Good luck. Read `PRD.md` for product context, `test_credentials.md` for secrets, and `whatsapp_flow.json` for the Meta Flow JSON definition. Ping the user on any of the 🟡 in-flight items before making assumptions.
