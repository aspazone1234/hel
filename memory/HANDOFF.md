# Swamsevak Portal — WhatsApp Integration Handoff

Project: **Shrimad Bhagavat Katha Mahotsav 2026 — Swamsevak Portal**
Repo branch imported: `aspazone1234/hel` (branch `new`)
Stack: FastAPI + MongoDB + React 19 (CRA + CRACO) + Meta WhatsApp Cloud API v21.0
Root: `/app` · Super admin: `superashwini` / `supersebhiupper123`
Preview URL: `https://hel-preview.preview.emergentagent.com`

---

## PART 1 — USER'S ORIGINAL TASK (verbatim, long message that initiated WA work)

> First of all, the things which you are asking for, like access token, phone number, ID, and business account ID, are already in the system and they are perfectly fine, so use them. Talking about the web book thing, I will be giving you. I will be setting up your given web book user ID and password in my system, and that's how we'll be ready to go. 
>
> ​The callback URL or verify token couldn't be validated. Please verify the provided information or try again later.
> (#N/A:WBxP-1880527016-4108878839) fix this
>
> for the otp setup:
> otp template exact name in the meta: 'otp_verification'
> this is the dummy formate: '123456 is your verification code.'
> it is in english. and authentacation type template
>
> In the notification panel, notification management, so there is a sub-tab which is conversations inside this. In the individual conversations, give me the ability to send media files and text together, like in a one group, similar to what in mobile phones it happens, like the photos attached to the same chat box. Also, if possible, if only if possible, then do it, otherwise no need. Can we add here header or footer as optional thing if I need to add, I can add. Can we do that? Because WhatsApp API kind of does provide that.
>
> You had created a WA Flow app inside the notification management. Currently, that is not working because I am not able to configure the endpoint, and that is because I'm not sure what is sign public key is. I'm not able to configure that. So give me all the resources which I need. Like, what do I need to do exactly so that I can just quickly set up? How can you help me with that? One thing is that, now, I want you to move the configurations of WA Flow's tab into the Help Center of the admin. Only admin will be able to view this particular setting there. Okay? Now, why this is so important? Because we are using flow feature of WhatsApp just for the help center thing. To receive a help center request, we currently just have manual ticket addition, but we want form data. to be there. Like we want the flow to be integrated to this help center particular thing. How we visualize it is, the user will type some particular command, which is reserved for a particular template. That template will open up. Now that template will contain the flow link. The user will type something and the flow will open. This will not happen directly, but via a template. So I need an option to pick that if somebody types this particular command, this particular template will open up. So this is a different type of setting I want. Okay, after that, once the flow opens, I need via whatever communication, the flow to be fully aware about which WhatsApp number is this communication happening with. If that WhatsApp number is not in the arrived guest, In that situation, after the flow submission, a reply should go to user. You can integrate that reply under the notification management section also in system messages. So this reply will go and tell the person that this service is only available for guests, for sorry, for shradhalus who have like who are on the premises, like on-premises shradhalus. Now, if that number exists in the arrived guest list, then the form flow submission will send again a default message, so which will also you can integrate in the notification panel under the system notifications that we have captured your response. And also on the basis of uh uh uh purity, like on the basis of SLA time. I want the person to be notified in that dynamic temp, like reply, that your query is this, your waiting time is this, and information that this query will be escalated once the waiting time, if the waiting, if your problem is not resolved within the response time, your query will be escalated. Just a note about this. Okay. Now, what happens is, in the help center, this query gets created. One more thing, like, in my flow, all the options that I'll be having, I want you to create inside the help center a configuration where I would be adding the same items for the help. The way we will remember it by is exact, I will be typing the exact list replica here with the exact name. naming convention here in the configuration as per it is in the flow. Whenever there is an item addition, I will be adding it here also. Why I am doing this configuration is, after every type of help support ticket, I will be able to add the system configuration of the SLA timings as well as I would be able to consider the ticket priority, like high, medium, or low. All right, going back to the flow again, this ticket has been created in the system now. At the same time, the user is notified about this ticket creation. I want you to first of all see that the person who has been assigned to that user as the first point of contact in our system, which is like a feature of our system you know already, I want that person to be notified also about this ticket has been raised. Only that person, okay? Not everybody will be bothered with it on the messages, like WhatsApp message I'm talking about. Whenever I'm saying about a message. Notification I'm only referring to WhatsApp messages. Also, when the query has been raised, the person automatically assigned, like in our health center dashboard, automatically assign the first point of contact person to that particular query. Of course, the super admin can reassign, but the default should be the interlinked of the person who is in the arrived guest list, like who is the point of contact of that guest, which swayamsevak. Now, once the query has been marked as resolved by the swayamsevak on the portal, what I want you to do is send another response on WhatsApp to customer message that your query has been resolved. Thank you. And then again, so this is something going to be the content. Perfect. Now with these contents that I'm talking about, I will also be configuring the exact same of them in the WhatsApp API portal also. So these system notifications inside the notification management panel, I will be configuring them on the WhatsApp also. Now, also, inside the inside the notification management panel, remove the option to create a trigger. Okay, so because these triggers are like in a way cannot be created by me as Let's remove that option. And also, in the flow configurations, you've Like the WF flow you have created, which I have already told to move in the health center because the flows are, like we will only going to create one flow and that is going to be super interconnected with the health center. That's it. No more flows, okay? So that's that. Yeah, escalation, what will happen is once the SLA has been breached of the person, we currently have it overdue option label enabled it. That is good. So what will happen also, like once a ticket is overdue or SLA period is over, I want every swayamsevak to be notified on WhatsApp about this particular thing. So make an escalation template and the target would going to be all the swayamsevaks, okay? Before it was just the person who was assigned, like who is the first one to contact that swavsevak only, but now if it's escalated, it will resend the query, but this time to all the swayamsevaks with overdue level to it on the WhatsApp again I'm talking about. Now the point is, in the notifications panel, you have system message triggers inside those. I want two sections. The first section will going to be the triggers for the user side of people. First of all, to clarify, the message systems are not web portal notifications, these are WhatsApp messages, proper WhatsApp messages. Now, this is the first category of it, what going to be users. Now, I want you to be smart enough who will be the user, target user. We will be going to be discussing and creating. The second thing which is about the admin or the Swayamsevak notifications. What I want you to do is, it should be very aware about that whatever the mobile number the Swayamsevak has registered with us, the WhatsApp number of the Swayamsevak, we already have, we know that. So that is the communication point of the Swayamsevak. And for the Shraddhalus, the guests, it will be their registered mobile number. So I want you to imagine and create the top or the most important, like as many as you want, system triggers for users, the points where something is happening and the user must be notified of it. So who will be notified? This will be the specific user whose action has been taken on or who has been impacted. What can be the scenarios? I want you to write them in the user triggers. And I've already told you about the admin triggers. If you need any clarification, please ask me. I just thought I'd mention again, all the triggers of system messages under the admin will always going to be like a super swayamsevak. Swayamsevak will always going to be on the registered swayamsevak WhatsApp number. And for the users, these triggers will going to be all the events which are specific to them on the portal, like any event. And I will assure you it is my duty that the content of these two things, like these messages, will always going to be like inside the template registry. I will always be truthful about it. This will be my task, like the exact and accepts template I will be matching with the triggers. This is my responsibility.
>
> I also want an ability here, which will be inside notification management. I want you to create another tab beside bulk campaign, system messages, template registry, etc. Whatever, this new tab will be named Auto Response. Here I would be able to add a face that the person will type, and whenever those exact words are typed, I can set a few automated templates. I am also able to add delays, like:
> 1. Template 1 with a delay of 1 second
> 2. After template 1 is sent, a delay of 2 seconds
> 3. This new template will be sent
> I can add that level of flow with any number of steps I want. I will configure all the template things if you want me to in the template section. I will be adding the template there only, and I would be able to just select that in this particular automated message kind of thing.

---

## PART 2 — SESSION BREAKDOWN (as the assistant proposed)

Because the scope was ~10 features spanning several days, I split it into 5 sessions:

| Session | Title | Status |
|---|---|---|
| **Session 1** | WA Webhook fix · OTP template alignment · Flow foundation (RSA keys + Flow JSON) | ✅ Done |
| **Session 2** | Conversations: text + multi-media bundled send (grouped like mobile WhatsApp) | ✅ Done |
| **Session 3** | Remove "Create Trigger" button · Move WA Flows → Help Centre · Auto Response scaffold (UI + CRUD) · Auto Response engine (matcher) | ✅ Done |
| **Session 4A** | Help Centre ↔ Flow backbone: service/SLA CRUD · RSA crypto in Flow endpoint · Flow submission → auto-ticket with point-of-contact auto-assign | ✅ Done |
| **Session 4B** | 4 HC system messages (captured / not-on-premise / resolved / escalated-to-all-swayamsevaks) · Point-of-contact WA notify on auto-assign · Keyword → Template-with-Flow-CTA (dynamic flow_token binding) | ⛔ NOT STARTED |
| **Session 5** | Split System Messages into **User Triggers** vs **Admin/Swayamsevak Triggers** with curated defaults · UX polish for Auto Response | ⛔ NOT STARTED |

---

## PART 3 — SESSIONS AS PER USER'S ORIGINAL TASK LIST (direct 1:1 mapping)

These are the distinct tasks the user listed, in their words, and where each landed:

| # | User-stated task | Mapped to session | Status |
|---|---|---|---|
| 1 | Fix webhook "callback URL or verify token couldn't be validated" | Session 1 | ✅ Done |
| 2 | OTP with template `otp_verification` (EN, Authentication, body: `{{1}} is your verification code.`) | Session 1 | ✅ Done |
| 3 | Conversations: send media files **and** text together in one group (like mobile phones) | Session 2 | ✅ Done |
| 4 | Optional header / footer in conversation compose | Session 2 | ❌ Not possible — Meta Cloud API does NOT support headers/footers on free-form (session) messages, only on templates. Documented in UI as a note. |
| 5 | Help with **Sign public key** (WA Flow endpoint setup) | Session 1 | ✅ Done (uploaded via Graph API `POST /{PHONE_ID}/whatsapp_business_encryption`) |
| 6 | Move **WA Flows** config from Notification Management → **Help Centre** (admin-only) | Session 3 | ✅ Done (new sub-tab "WA Flow Settings") |
| 7 | Single Flow for help-centre only (no more multiple flows) | Session 3 | ✅ Done |
| 8 | Keyword → reserved template → template opens Flow link | Session 4B | ⛔ Pending |
| 9 | Flow aware of WhatsApp phone number | Session 4A | ✅ Partially — `wa_flow_sessions` collection stores `flow_token → phone` binding; looked up on submission. The "send with binding" step is Session 4B. |
| 10 | If phone NOT in arrived-guest → send WA reply "service only for on-premise shraddhalus" | Session 4A/4B | ⚠️ Partial — `arrived_status` is calculated and returned to Flow SUCCESS screen; the **outbound WA reply** is Session 4B. |
| 11 | If phone IS arrived-guest → send WA reply "captured your response + SLA + escalation notice" | Session 4B | ⛔ Pending |
| 12 | In help-centre, add configuration for 15 services **exactly matching** Flow options, each with SLA + priority | Session 4A | ✅ Done (15 services seeded, IDs match Flow `service_type`) |
| 13 | Auto-create help-centre ticket on Flow submission | Session 4A | ✅ Done |
| 14 | Auto-assign ticket to guest's **first point of contact** (the swayamsevak from the registration) | Session 4A | ✅ Done (reads `assigned_swamsevak` from registration) |
| 15 | WA message to the assigned swayamsevak (point of contact) when ticket is raised | Session 4B | ⛔ Pending |
| 16 | On ticket **resolved** by swayamsevak → WA message to the guest | Session 4B | ⛔ Pending |
| 17 | SLA breached (overdue) → WA escalation message to **ALL swayamsevaks** | Session 4B | ⛔ Pending |
| 18 | Remove the "Create Trigger" button from Notification Management | Session 3 | ✅ Done |
| 19 | Remove delete option on existing triggers (system-owned) | Session 3 | ✅ Done (only toggle on/off remains) |
| 20 | Split System Messages tab into **two sections**: User Triggers · Admin/Swayamsevak Triggers | Session 5 | ⛔ Pending |
| 21 | Curate default "top most important" User Triggers (imagine them) | Session 5 | ⛔ Pending |
| 22 | Admin triggers fire on swayamsevak's registered mobile; User triggers fire on guest's registered mobile | Session 5 | ⛔ Pending (triggers exist but audience routing not wired) |
| 23 | New **Auto Response** tab with keyword → multi-step template chain with delays between steps | Session 3 | ✅ Done (UI + CRUD + matcher engine) |

---

## PART 4 — WHAT'S BEEN COMPLETED (every nuance)

### 4.1 Backend environment (`/app/backend/.env`)

Existing:
```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="test_database"
CORS_ORIGINS="*"
```

Added during WA sessions:
```
JWT_SECRET="<random>"
APP_URL="https://hel-preview.preview.emergentagent.com"
WA_WEBHOOK_VERIFY_TOKEN="swamsevak_verify_2026_xyz"
WA_PHONE_NUMBER_ID="1051687811364641"
WA_BUSINESS_ACCOUNT_ID="926208410227120"
WA_ACCESS_TOKEN="EAAL7LGRz8XsBRK2rLPsqapguZBf5vXrPuZBoPJElxCpw7NHGPK4vRE0PCbwa4p683pzSfd4sh2TVcUSe7DuhdgT1zSOlRy89mGg2e140rA9eN46zewApbaK9cRHzoVZBbUcjiF6OXtes3hRQsZC7Nm3RXyocpVX7q1FbFcIFl328ZByebvVE6ZBcS6FyaFQgZDZD"
WA_FLOW_PRIVATE_KEY_PATH="/app/backend/keys/wa_flow_private.pem"
WA_FLOW_PRIVATE_KEY_PASSPHRASE="swamsevak_flow_2026"
```

Meta side:
- Webhook callback URL: `https://hel-preview.preview.emergentagent.com/api/webhooks/whatsapp`
- Webhook verify token: `swamsevak_verify_2026_xyz`
- Subscribed field: `messages`
- Phone: `+91 70488 50050` (Panchariya Seva Desk, GREEN quality)
- Flow public key: uploaded via Graph API, status **VALID**
- Flow endpoint URL (to paste in Meta Flow Builder): `https://hel-preview.preview.emergentagent.com/api/webhooks/wa-flow`
- Flow ID (dummy, user will replace): `1015931884336181` — now published as "Raise a Seva Request"

### 4.2 RSA keypair for Flow encryption

Location: `/app/backend/keys/wa_flow_{private,public}.pem`
Algorithm: RSA-2048, passphrase-protected (passphrase in env)
Uploaded to Meta via: `POST https://graph.facebook.com/v21.0/{PHONE_ID}/whatsapp_business_encryption` with `business_public_key` form param.

### 4.3 Flow JSON (paste into Meta Flow Builder)

File: `/app/memory/whatsapp_flow.json` — 9 screens:
- WELCOME · CATEGORY_STAY_ESSENTIALS · CATEGORY_FOOD_BEVERAGES · CATEGORY_HOUSEKEEPING · CATEGORY_MEDICAL · CATEGORY_OTHER · SERVICE_DETAILS · REVIEW · SUCCESS

15 services grouped into 5 UX categories. Each submission passes `service_type`, `category`, `room_or_location`, `description` to `/webhooks/wa-flow` as `data_exchange` on the REVIEW screen.

### 4.4 Backend — changes to `/app/backend/server.py`

#### 4.4.1 OTP (Session 1)

`POST /api/otp/send` — sends template `otp_verification` (EN, Authentication) with body `{{1}}` = OTP code AND a URL button `COPY_CODE` with `otp{{1}}`. Live-tested on `+91 7229900422`.

#### 4.4.2 Webhook verification (Session 1)

`GET /api/webhooks/whatsapp` — validates `hub.verify_token` against `WA_WEBHOOK_VERIFY_TOKEN`, echoes `hub.challenge`. Works ✅.

#### 4.4.3 Conversation bundle send (Session 2)

`POST /api/admin/wa-conversations/{phone}/send-bundle`
- Accepts `text` (Form) + `files[]` (multi-UploadFile)
- If media present: text becomes caption on **first** media, rest sent plain (so mobile WhatsApp groups them).
- If audio-only (audio has no caption): text sent as separate text message.
- If no media: single text message.
- Persists every sub-message in `wa_conversations.messages[]`.

Kept legacy `POST /{phone}/send` and `POST /{phone}/send-media` for backward compat.

#### 4.4.4 Auto Response (Session 3)

MongoDB collection: `wa_auto_responses`
Doc shape:
```json
{
  "id": "<uuid>",
  "trigger_phrase": "hi",
  "match_type": "exact | contains",
  "description": "",
  "steps": [{"template_id": "<id>", "delay_seconds": 0}],
  "is_active": true,
  "created_at": "...",
  "created_by": "..."
}
```

Endpoints:
- `GET /api/admin/wa-auto-responses`
- `POST /api/admin/wa-auto-responses`
- `PUT /api/admin/wa-auto-responses/{rule_id}` (partial incl. `is_active`)
- `DELETE /api/admin/wa-auto-responses/{rule_id}`
- `GET /api/admin/wa-auto-responses/runs?limit=50` — execution history for debugging
- `POST /api/admin/wa-auto-responses/test` `{phone, text}` — dry-run a match without waiting for Meta

Matcher: `run_auto_response_matcher(from_number, text)` — hooked into `whatsapp_webhook_receive` via `asyncio.create_task`.
- Case-insensitive, trim-whitespace matching
- Exact or contains
- Sequential step execution with `asyncio.sleep(delay_seconds)`
- Reads template from `wa_templates` collection (by `template_id`), uses stored `meta_template_name`, `language`, `header_type`, `header_media_url`
- Sends via `send_whatsapp_template()` helper
- Logs every run in `wa_auto_response_runs` with per-step status + Meta error if any
- Also pushes outgoing messages into `wa_conversations` (sent_by: "AutoResponse")

#### 4.4.5 Ticket categories (Session 4A)

MongoDB collection: `ticket_categories`. Auto-seeded on startup with 15 default services matching Flow `service_type` IDs. Each doc:
```json
{
  "id": "drinking_water",
  "label": "Drinking Water",
  "group": "stay_essentials",
  "priority": "low | medium | high",
  "sla_minutes": 15,
  "is_active": true,
  "is_default": true
}
```

Endpoints:
- `GET /api/admin/tickets/categories` (DB-backed, falls back to `TICKET_CATEGORIES` constant if empty)
- `POST /api/admin/tickets/categories`
- `PUT /api/admin/tickets/categories/{cid}` (partial)
- `DELETE /api/admin/tickets/categories/{cid}` (default categories can only be disabled, not deleted)

`create_ticket()` now reads categories from DB.

#### 4.4.6 RSA + AES-GCM encryption (Session 4A)

Per Meta WhatsApp Flows encryption spec:
- Private key cached via `_load_flow_private_key()` (reads PEM, decrypts with passphrase)
- `_decrypt_flow_request(encrypted_flow_data_b64, encrypted_aes_key_b64, iv_b64)` → (body, aes_key, iv) — RSA-OAEP-SHA256 on the AES key, AES-128-GCM on the payload
- `_encrypt_flow_response(obj, aes_key, iv)` → base64 string — XOR-inverts IV, re-encrypts with same AES key, AES-128-GCM

Endpoint: `POST /api/webhooks/wa-flow`
- Detects encrypted payload (presence of all 3 keys) vs plaintext (local dev)
- Handles `ping` / `INIT` / `BACK` / `data_exchange` actions
- On `data_exchange` with `screen=REVIEW` → calls `_create_ticket_from_flow()`
- Returns encrypted response (base64) or JSON (plaintext) based on input type

Verified with Python round-trip (PING, INIT) — both return decryptable AES-GCM responses.

#### 4.4.7 Flow → ticket auto-create (Session 4A)

`_find_arrived_guest_by_phone(phone)` — normalizes phone (strips +, handles leading 91) and looks up `registrations` by `primary_mobile` with `approval_status != deleted`. Returns `(reg, arrived_status)` where `arrived_status` is `"on_site"` (arrival_status in arrived/partially_arrived/departed), `"not_arrived"`, or `"not_found"`.

`_create_ticket_from_flow(phone, service_type, category_group, room_location, description)`:
- Looks up category (priority + SLA) from DB
- Pulls guest name + mobile from registration if found
- Auto-assigns `assigned_to` = `custom_admins.username` matching `assigned_swamsevak` name on the registration
- Sets `source_type = "wa_flow"`, `source_registration_id = reg.id`
- Creates audit log entry

Flow response includes `extension_message_response.params`:
```json
{ "flow_token": "...", "ticket_id": "...", "arrived_status": "...", "priority": "..." }
```

#### 4.4.8 Flow session binding (Session 4A)

Collection: `wa_flow_sessions`. Doc: `{flow_token, phone, status, ticket_id?, arrived_status?, submitted_at?, created_at}`.
Endpoint: `POST /api/admin/wa-flow-sessions` `{flow_token, phone}` — manual binding for testing. Production binding (when a template with Flow CTA is sent to a user) is **Session 4B**.

### 4.5 Frontend — changes to `/app/frontend/src/`

- **`components/admin/NotificationManagement.js`** (1676 lines)
  - Tabs: Bulk Campaigns · Auto Response · System Messages · Template Registry · Conversations · OTP Logs (WA Flows REMOVED, Auto Response ADDED)
  - `ConversationsTab` composer now does multi-file select + pending chips (image/video thumbnails + doc icon) with × remove, textarea input, single Send button. Uses `/send-bundle`.
  - `TriggersTab` — create/delete buttons REMOVED. Only toggle remains. Reads from `wa_triggers`.
  - `AutoResponseTab` — new. Create rule with trigger phrase + match type (exact/contains) + description + multi-step chain with per-step delay (seconds). Dialog with add/remove steps, template select, delay input. List with inline toggle, chain preview (template names + delay chips), edit/delete.

- **`components/admin/WAFlowSettings.js`** (new) — extracted FlowsTab. Endpoint URL display with Copy button, flow config CRUD, flow events viewer. Admin-only.

- **`components/admin/HelpCategoryManager.js`** (new) — grouped services list (by `group`), inline toggle, priority chip + SLA display, edit/delete (default categories can't be deleted), create dialog with ID/label/group/priority/SLA.

- **`components/admin/HelpCentre.js`** — now has **3 admin-only sub-tabs**: Tickets · Services / SLA · WA Flow Settings. Non-super users see only tickets view (no tab bar).

### 4.6 MongoDB collections touched/created

- `wa_templates` (existing) — template registry
- `wa_auto_responses` — NEW — keyword → template chain rules
- `wa_auto_response_runs` — NEW — execution history
- `ticket_categories` — NEW — DB-backed help-centre services
- `wa_flow_sessions` — NEW — flow_token → phone binding
- `wa_flow_events` (existing, now richer payload)
- `tickets` — now has `source_type: "wa_flow"`, `source_registration_id`, `room_or_location` fields

### 4.7 Artifacts hosted

- `/app/backend/static/uploads/e-nimantran-panchariya-2026.pdf` (12.95 MB) — public URL served at `https://hel-preview.preview.emergentagent.com/api/static/uploads/e-nimantran-panchariya-2026.pdf`

---

## PART 5 — WHAT'S PENDING (handoff to next AI)

### 5.1 Session 4B — HC system messages + Keyword→Flow CTA + Assign-notify

**Goal**: wire the four Help Centre WhatsApp replies + the assignment notification + the keyword→Flow-CTA template send.

#### 5.1.1 Five new WhatsApp system triggers

Add these trigger keys to `db.wa_triggers` (extend the existing seed list) with audience classification and template mapping. The user will create matching approved templates in Meta and register them in `wa_templates`, then pick them in the UI.

| `trigger_key` | Audience | Fired when | Recommended template body (user will approve in Meta) |
|---|---|---|---|
| `hc_ticket_captured` | user (guest mobile) | Flow submission creates ticket AND guest is arrived | "आपका अनुरोध दर्ज हो गया है। Ticket: {{1}} · Category: {{2}} · Response time: {{3}} minutes. यदि समाधान इस समय में नहीं होता तो escalation हो जाएगा." (body params: short_ticket_id, category_label, sla_minutes) |
| `hc_not_on_premises` | user (guest mobile) | Flow submission but phone NOT in arrived-guest list | "यह सेवा केवल on-premise शृद्धालुओं के लिए उपलब्ध है। कृपया अपने स्वयंसेवक से संपर्क करें।" |
| `hc_ticket_assigned_swamsevak` | assigned swayamsevak (registered swayamsevak mobile) | Ticket auto-assigned from flow OR reassigned | "New help request assigned to you. Guest: {{1}} · Room: {{2}} · Category: {{3}} · Priority: {{4}} · SLA: {{5}} min. Open portal to respond." |
| `hc_ticket_resolved` | user (guest mobile) | Swayamsevak marks ticket resolved on portal | "आपकी query resolved हो गई है। Ticket: {{1}}. धन्यवाद!" |
| `hc_ticket_escalated_all` | ALL active swayamsevaks | Ticket SLA breached (overdue) | "⚠️ OVERDUE help request. Guest: {{1}} · Room: {{2}} · Category: {{3}} · Waiting since: {{4}} min. Please assist." |

**Implementation plan**:
1. Extend the existing `TRIGGER_TYPES` list in `TriggersTab` frontend with these 5 new IDs + labels + audience tag.
2. Add `audience` field to `wa_triggers` docs (values: `user`, `assigned_swamsevak`, `all_swamsevaks`).
3. Create a helper `fire_system_trigger(trigger_key, context)` in backend that:
   - Looks up active trigger row
   - Resolves template from `wa_templates`
   - Resolves recipient(s) based on audience
   - Substitutes body params from context dict (the helper maps audience-specific context keys to `{{1}} {{2}} {{3}}`)
   - Calls `send_whatsapp_template()` and logs to `wa_conversations`
4. Hook call sites:
   - `_create_ticket_from_flow` → if `arrived_status == "on_site"` fire `hc_ticket_captured` + `hc_ticket_assigned_swamsevak` (with the assigned swayamsevak's mobile from `custom_admins.mobile`). If `arrived_status == "not_arrived"` or `"not_found"` fire `hc_not_on_premises` instead (and do NOT auto-create ticket? or create with special flag? — **confirm with user**).
   - Existing `PUT /api/admin/tickets/{ticket_id}/resolve` → fire `hc_ticket_resolved`.
   - Add background SLA-monitor task (asyncio loop every 60s) that finds tickets where `status in ["open","in_progress"]` AND `now > created_at + resolution_time_minutes` AND `escalated_at is None`. Mark escalated, fire `hc_ticket_escalated_all` to all active swayamsevaks (query `custom_admins` where `role in ["swamsevak","admin"]` and pull `mobile`).

#### 5.1.2 Keyword → Template-with-Flow-CTA

Currently `AutoResponseTab` sends plain template steps. The user wants:
- User types reserved keyword (e.g. "help", "seva")
- Portal sends a template that contains a **Flow CTA button** linking to the Flow "Raise a Seva Request"
- When user taps the button, a unique `flow_token` binds that session to this user's phone → written to `wa_flow_sessions` → so when the Flow submits, we know the phone

**Implementation plan**:
1. Extend auto-response step schema with optional fields: `attach_flow: bool`, `flow_id: str`, `flow_cta: str`, `flow_screen: str`.
2. When sending such a step:
   - Generate `flow_token = f"katha-{uuid.uuid4().hex}"`.
   - Upsert `wa_flow_sessions` with `{flow_token, phone: recipient, status: "pending", created_at: now}`.
   - Build template payload with a button component of type `flow`:
     ```json
     {
       "type": "button",
       "sub_type": "flow",
       "index": 0,
       "parameters": [{
         "type": "action",
         "action": {"flow_token": flow_token, "flow_action_data": {}}
       }]
     }
     ```
     (requires the Meta template to be published with a Flow button already.)
3. UI addition in `AutoResponseTab` step row: toggle "Attach Flow" with fields Flow ID, CTA label, initial screen (default `WELCOME`).
4. Seed one default rule "Help request" with phrase `help` (exact), step 1 = template `raise_seva_request_cta` (user creates this template in Meta; it's a simple MARKETING/UTILITY template with a Flow button), `attach_flow: true`.

**Gotcha**: Meta templates with Flow buttons are a specific template category — "Marketing" or "Utility" with "Flow" button added during template creation. The user's existing `otp_verification` won't work for this; they need to **approve a new template** with Flow button in Meta first.

#### 5.1.3 UI additions

- **HelpCentre → Tickets**: add a filter/badge for `source_type: wa_flow`.
- **NotificationManagement → System Messages (TriggersTab)**: add audience tag chips next to each trigger row.

### 5.2 Session 5 — Split System Messages + Auto Response polish

1. Split `TriggersTab` into two logical groups in UI (rendered as sub-sections, not separate tabs): **User Triggers** and **Admin/Swayamsevak Triggers**. Filter based on `audience` field.

2. Seed comprehensive default triggers. **Proposed list (user explicitly asked AI to imagine these)**:

   **User Triggers** (fire on guest's `primary_mobile`):
   - `registration_submitted` — "Your registration is received. ID: {{1}}. We'll notify you upon approval."
   - `registration_approved` — "Your registration is approved! Room allocation will follow soon."
   - `registration_rejected` — "Your registration could not be approved. Reason: {{1}}. Contact us if needed."
   - `room_assigned` — "Room allocated: {{1}} · AC: {{2}}. Arrive on {{3}}."
   - `registration_finalized` — "Your attendance is finalized. Please arrive on {{1}}."
   - `pre_event_reminder_3d` — "3 days to go! Event starts on {{1}}. Pack your essentials."
   - `pre_event_reminder_1d` — "See you tomorrow at the venue. Directions: {{1}}."
   - `arrival_confirmed` — "Welcome, {{1}}! Your check-in is confirmed."
   - `departure_thanks` — "Thank you for attending. We hope to see you again."
   - `otp_sent` (already done via /otp/send) — documented only
   - `hc_ticket_captured` (above)
   - `hc_not_on_premises` (above)
   - `hc_ticket_resolved` (above)

   **Admin/Swayamsevak Triggers** (fire on swayamsevak's `mobile` from `custom_admins`):
   - `new_registration_in_my_city` — "New registration in {{1}}: {{2}} ({{3}}). Approval pending."
   - `guest_arrival_today` — "{{1}} expected today · Room {{2}} · PoC: {{3}}."
   - `hc_ticket_assigned_swamsevak` (above)
   - `hc_ticket_escalated_all` (above, audience = all_swamsevaks)
   - `daily_summary_8am` — "Today: {{1}} pending approvals · {{2}} arrivals · {{3}} open tickets."

3. Auto Response UX polish:
   - Variable mapping UI: when a template has `{{1}}`, `{{2}}`, allow binding each to: literal text / incoming message text / sender profile name / registration field (guest_name, room_number, etc.).
   - Validation: block rule creation if any selected template has `variable_count > 0` and no mapping defined.
   - Runs viewer UI: new sub-panel in AutoResponseTab that calls `GET /api/admin/wa-auto-responses/runs` and renders last 50 executions with filter by rule and status.

### 5.3 Known gotchas / things the next AI should be aware of

1. **Emergent platform constraints**:
   - Backend runs on internal `0.0.0.0:8001`, frontend on `3000`. NEVER change ports.
   - All frontend API calls MUST use `process.env.REACT_APP_BACKEND_URL + "/api"`.
   - All routes requiring ingress routing MUST start with `/api`.
   - Supervisor auto-restarts on code change; only call `sudo supervisorctl restart backend` when `.env` or deps change.
   - Environment vars: `MONGO_URL`, `DB_NAME`, `REACT_APP_BACKEND_URL` are PROTECTED — never delete.

2. **Auth**: super admin hardcoded in `ADMIN_ACCOUNTS` (server.py L42). Other admins live in `custom_admins` collection. JWT secret in env.

3. **WhatsApp template sending gotchas**:
   - Templates with variables fail with `(#132000)` if params don't match.
   - Templates with document/image/video HEADERS require `header_media_url` + `header_type` in `send_whatsapp_template()` call, else `(#132012)`.
   - The `send_whatsapp_template()` helper in server.py line 282 handles header correctly; always pass both.
   - Free-form (session) messages work only within 24h of user's last message (WhatsApp 24-hour window policy).

4. **Flow encryption**:
   - `_load_flow_private_key()` caches the private key on first load.
   - Response uses **inverted IV** (bitwise NOT each byte), not fresh IV.
   - Private key uses passphrase `swamsevak_flow_2026`.
   - Meta sends encrypted payloads only once the Flow is published — during draft/test, plaintext is OK, and my endpoint handles both.

5. **Phone number normalization** — registration stores `primary_mobile` sometimes as `7229900422` (10 digits), sometimes `917229900422` (with country code), sometimes with `+`. `_find_arrived_guest_by_phone()` checks all three variants. Auto Response / webhook receives always normalize to non-+, with `91` prefix.

6. **The "arrived guest" definition** in backend: `registrations.arrival_status in ("arrived", "partially_arrived", "departed")`. Not-yet-arrived = `"not_arrived"` or `"not_coming"`.

7. **Point of contact** lives on registration as `assigned_swamsevak` (stores the swayamsevak's NAME, not username). To get their mobile, look up `custom_admins.find_one({"name": assigned_swamsevak})` → `mobile` field.

8. **Auto Response engine** is already wired — if the next AI adds a new trigger_phrase pattern and it doesn't fire, debug via `GET /api/admin/wa-auto-responses/runs?limit=20`.

9. **Meta Flow `Raise a Seva Request`** currently in DRAFT. Flow JSON to paste is at `/app/memory/whatsapp_flow.json`. After publishing, use Meta's "Flow Preview" to send a test, which will hit `/webhooks/wa-flow` encrypted.

10. **Incorrect user assertion to beware of**: the user previously claimed WA credentials "were already in the system" but they were NOT — always verify with `grep WA_ /app/backend/.env`.

---

## PART 6 — KEY FILES REFERENCE

```
/app/backend/
├── .env                                    # All env vars (keep intact)
├── server.py                               # 4300+ lines, single-file FastAPI app
├── requirements.txt                        # pip install before running
└── keys/
    ├── wa_flow_private.pem                 # RSA private (passphrase in env)
    └── wa_flow_public.pem                  # Public key (uploaded to Meta)

/app/frontend/src/
├── pages/AdminPage.js                      # Admin shell with tab routing
└── components/admin/
    ├── HelpCentre.js                       # 3 sub-tabs (tickets/categories/flow)
    ├── HelpCategoryManager.js              # NEW — service/SLA CRUD
    ├── WAFlowSettings.js                   # NEW — extracted FlowsTab (moved here from Notif)
    └── NotificationManagement.js           # Tabs: Bulk / AutoResponse / SysMsgs / Templates / Convos / OTPLogs

/app/memory/
├── PRD.md                                  # Project requirements document
├── HANDOFF.md                              # THIS FILE
├── whatsapp_flow.json                      # Flow JSON to paste into Meta
└── test_credentials.md                     # superashwini credentials + WA env summary
```

---

## PART 7 — QUICK SANITY CHECKS FOR NEXT AI

```bash
# 1. Services up?
curl -s https://hel-preview.preview.emergentagent.com/api/ -w "\n%{http_code}\n"
# expect: {"message":"Shrimad Bhagavat Katha Mahotsav 2026 API V2"} · 200

# 2. Login
curl -s -X POST https://hel-preview.preview.emergentagent.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"superashwini","password":"supersebhiupper123"}'
# expect: { token, ..., role: superadmin }

# 3. Meta webhook verify
curl -s "https://hel-preview.preview.emergentagent.com/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=swamsevak_verify_2026_xyz&hub.challenge=ok123"
# expect: ok123

# 4. OTP send
curl -s -X POST https://hel-preview.preview.emergentagent.com/api/otp/send \
  -H "Content-Type: application/json" -d '{"mobile":"917229900422"}'
# expect: {"message":"OTP sent successfully via WhatsApp"}

# 5. Flow encryption PING (run locally on backend container)
# see bottom of Session 4A verification block in chat history

# 6. Auto Response runs
# GET /api/admin/wa-auto-responses/runs?limit=5 with superadmin bearer
```
