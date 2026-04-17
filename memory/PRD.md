# PRD - Shrimad Bhagavat Katha 2026 Event Registration & Admin System

## Original Problem Statement
Full-stack event management platform for Katha 2026 (Shrimad Bhagavat). Mobile-first, WhatsApp-based guest registration and admin management system with QR code attendance, room assignments, volunteer management, real-time dashboard, and WhatsApp notification management.

---

## User Personas
1. **Guest / Attendee** — Registers via mobile number + WhatsApp OTP, gets confirmation with QR code
2. **Swamsevak (Volunteer Admin)** — Manages assigned guests, marks attendance via QR, handles help tickets
3. **Super Admin (superashwini)** — Full control: approvals, room assignment, analytics, task management, notification management, WhatsApp campaigns

---

## Architecture
```
/app/
├── backend/
│   ├── server.py              # All endpoints (~3400 lines)
│   └── .env                   # Meta WhatsApp API credentials included
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── admin/
│   │   │   │   ├── NotificationManagement.js  # NEW: 3-tab WhatsApp module
│   │   │   │   ├── AdminDashboard.js
│   │   │   │   └── ... (other admin components)
│   │   └── pages/
│   │       ├── PrivacyPolicyPage.js  # NEW: Privacy policy
│   │       └── ... (other pages)
└── memory/
    └── PRD.md
```

---

## What's Been Implemented

### Phase 1-4 (Previously implemented)
- Full registration flow, QR codes, admin panel, room management, help centre, etc.

### Session 1 — Import & Enhancements
- Codebase imported from GitHub
- Enhanced CSV/PDF exports with family member details
- Popup behavior fix (shows only after door opens, blur, language toggle)

### Session 2 — Privacy Policy & Notification Management

#### Privacy Policy Page
- Created at /privacy-policy with 11 sections
- Linked from footer and registration consent checkbox

#### Notification Management Module (Phase 1) — LIVE
**Sub-module 1: Bulk Campaign Sender**
- Create campaigns with name + template selection
- Download sample Excel (auto-generated columns based on template variables)
- Upload Excel to parse recipients + variables
- Preview table before launch
- Launch campaign (background async processing via Meta Cloud API)
- Campaign list with status badges (sending/completed/partially_failed/failed)
- Campaign detail view with stats (sent/delivered/read/failed)
- Recipient-level log with status timeline

**Sub-module 2: System Messages (Triggers)**
- 11 User notification triggers: registration submitted/approved/rejected, QR generated, room assigned, swamsevak assigned, arrival confirmed, not coming, room transferred, help ticket response, departure
- 3 Admin notification triggers: help ticket created, new registration, guest arrived
- Enable/disable toggle per trigger
- Configure dialog: assign WhatsApp template + set delay minutes
- Background queue processing with retry logic (3 attempts, exponential backoff)

**Sub-module 3: Template Registry**
- Register Meta-approved WhatsApp templates
- Fields: meta_template_name, display_name, language, category, header_type (IMAGE/DOCUMENT/VIDEO), body_text with placeholders, variable_count, variable_labels, sample_values
- Edit and delete templates
- Templates shared across campaigns and triggers

**Infrastructure**
- Meta webhook endpoint (GET for verification, POST for status updates)
- Background message queue with retry (MongoDB-backed)
- Webhook event storage for audit trail
- Rate-limited sending (~50 msgs/sec)

---

## Meta WhatsApp API Configuration
- Business Account ID: 926208410227120
- Phone Number ID: 1051687811364641
- Webhook URL: https://dharma-connect-13.preview.emergentagent.com/api/webhooks/whatsapp
- Webhook Verify Token: katha2026_whatsapp_webhook_verify_x9k2m

---

## Key API Endpoints (New)
- `GET/POST /api/webhooks/whatsapp` — Meta webhook verify + receive
- `GET/POST/PUT/DELETE /api/admin/wa-templates` — Template registry CRUD
- `GET /api/admin/wa-campaigns` — Campaign list
- `GET /api/admin/wa-campaigns/sample-excel` — Download sample Excel
- `POST /api/admin/wa-campaigns/upload-excel` — Parse uploaded Excel
- `POST /api/admin/wa-campaigns/launch` — Launch campaign
- `GET /api/admin/wa-campaigns/{id}/recipients` — Recipient logs
- `GET /api/admin/wa-campaigns/{id}/stats` — Live campaign stats
- `GET /api/admin/wa-triggers` — List all system triggers
- `PUT /api/admin/wa-triggers/{key}` — Configure trigger

---

## Prioritized Backlog

### P1 — Phase 2 Notification Features
- Full system trigger integration (fire triggers from existing endpoints)
- Template sync from Meta API (auto-fetch approved templates)
- Scheduled campaigns (send at future date/time)
- Campaign analytics dashboard (delivery rate charts)
- Admin in-app notification bell

### P2 — Important
- Opt-out/unsubscribe tracking
- Conversation window tracking for cost optimization
- Admin WhatsApp notifications (opt-in, high-priority only)
- Push notifications for status changes

### P3 — Future
- Multi-event support
- Guest mobile app
- WhatsApp bot integration
- Report builder

---

## Known Issues / Caveats
- WhatsApp OTP is LIVE (uses `otp_verification` template via Meta Cloud API)
- WhatsApp campaign sending depends on Meta-approved templates
- System triggers are defined but not yet wired into existing event endpoints (Phase 2)
