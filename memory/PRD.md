# PRD - Shrimad Bhagavat Katha 2026 Event Registration & Admin System

## Original Problem Statement
Full-stack event management platform for Katha 2026 (Shrimad Bhagavat). Mobile-first, WhatsApp-based guest registration and admin management system with QR code attendance, room assignments, volunteer management, and real-time dashboard.

---

## User Personas
1. **Guest / Attendee** — Registers via mobile number + WhatsApp OTP, gets confirmation with QR code
2. **Swamsevak (Volunteer Admin)** — Manages assigned guests, marks attendance via QR, handles help tickets
3. **Super Admin (superashwini)** — Full control: approvals, room assignment, analytics, task management, edit all records

---

## Core Requirements
- WhatsApp mobile-based primary identity (DO NOT change)
- QR code for attendance entry
- Mobile-first design
- Room management and swamsevak assignment
- Help ticket / support system

---

## Architecture
```
/app/
├── backend/
│   ├── server.py              # All endpoints (~2600 lines)
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── AddressSelector.js     # Country/State/City autocomplete
│   │   │   ├── Navbar.js              # Flute sound player
│   │   │   ├── HeroSection.js         # Golden door + flute trigger
│   │   │   └── admin/
│   │   │       ├── QRScanner.js       # jsQR auto-detect + re-scan read-only view
│   │   │       ├── AdminDashboard.js  # Command Center (3-block layout)
│   │   │       ├── TodoModule.js      # Tasks + recurring + Guest Assignment
│   │   │       ├── AdminAuditLog.js   # Activity Log
│   │   │       ├── AdminRoomManagement.js  # Room cards with vacancy info + transfer
│   │   │       ├── CustomFieldsManager.js  # target_scope redesign
│   │   │       ├── ExpectedGuestList.js    # Full edit dialog
│   │   │       └── ArrivedGuestList.js     # Full edit dialog
│   │   └── pages/
│   │       ├── RegisterPage.js        # Guest self-registration
│   │       ├── MyRegistrationPage.js  # Confirmation with volunteer contact
│   │       ├── ThankYouPage.js
│   │       └── AdminPage.js           # Admin shell with icon sidebar
└── memory/
    └── PRD.md
```

---

## What's Been Implemented

### June 2025 — Phase 1 (Foundation)
- WhatsApp OTP-based registration flow
- Guest self-registration (multi-step form)
- QR code generation + download
- Admin panel with login
- Basic expected/arrived guest lists

### Phase 2 (Core Features)
- Room management (create, assign, bulk create)
- Swamsevak assignment and dashboard
- Help Centre (tickets)
- Custom fields framework
- Todo/task module
- Reference person management
- PDF/CSV exports

### Phase 3 (Stabilization)
- Address standardization (Country/State/City via AddressSelector)
- DB cleanup (stale rooms, test data)
- Swamsevak count fixes
- Reference person stats
- Room management export
- Expected guest list filters

### Phase 4 (Apr 2026 — 18-Point Overhaul)
1. ✅ QR re-scan: shows full read-only guest profile + "contact super admin" note
2. ✅ Confirmation page: volunteer contact explanation, mobile number, bigger QR button, form-closed notice, System Admin label
3. ✅ Head of Family mandatory in registration form
4. ✅ Toast import fixed in AdminPage.js (admin creation no longer errors)
5. ✅ Edit permissions: Super Admin = full edit (all customer fields except mobile), Volunteer = admin notes + custom fields only. Edit button visible to ALL admin roles.
6. ✅ Active ticket notification at ABSOLUTE TOP of Command Center (above My Day)
7. ✅ Room transfer: super admin can shift occupied room to empty room
8. ✅ Dashboard blocks restructured: Expected+NotComing | ArrivalStatus(Arrived/NotArrived/Departed) | Rooms
9. ✅ Room cards: occupant name/family, departure date, "Vacant in X days" label
10. ✅ Custom fields: target_scope (Expected/Arrived/All), admin-only, guest selector
11. ✅ Activity Log uses full AdminAuditLog.js component
12. ✅ Guest Assignment section in TodoModule (see all volunteer→guest assignments)
13. ✅ Recurring tasks: daily reset at configured time, completion history, permissions (volunteers can't delete recurring/superadmin tasks)
14. ✅ Top Geographies: Countries + States + Cities (not just states)
15. ✅ My Day: Special Needs shows ALL guests for super admin, only assigned for volunteers
16. ✅ Flute sound: fallback to MP3 now also calls play()
17. ✅ Mobile sidebar: icon-only default on mobile, expanded default on desktop, blinking expand cue
18. ✅ Regression maintained

---

## Key API Endpoints
- `POST /api/auth/login` — Admin login
- `POST /api/register` — Guest registration
- `GET /api/registration/by-mobile/{mobile}` — Guest self-lookup
- `GET /api/admin/dashboard` — Full analytics (includes top_countries, top_cities)
- `GET /api/admin/swamsevak-dashboard` — My Day (superadmin=global, volunteer=scoped)
- `GET /api/admin/guests/expected` — Expected list (paginated)
- `GET /api/admin/guests/arrived` — Arrived list (paginated)
- `PUT /api/admin/registrations/{id}` — Update registration
- `PUT /api/admin/rooms/{code}/shift` — Room transfer
- `POST /api/admin/todos` — Create task (recurring supported)
- `POST /api/admin/custom-fields` — Create custom field (with target_scope, applies_to)
- `GET /api/admin/audit-logs` — Activity log
- `POST /api/admin/scan-qr` — QR attendance (already-arrived returns full details)

---

## DB Schema (Key Fields)
- `registrations`: `arrival_status` (expected/arrived/departed/not_coming), `address` (country/state/city/pin_code), `selected_days`, `group_head_id`, `assigned_swamsevak`, `assigned_swamsevak_mobile`, `custom_field_values`
- `rooms`: `room_code`, `status`, `capacity`, `floor`, `ac_type`, `notes`, `occupant_ids`
- `todos`: `is_recurring`, `recurring_time`, `completion_history`, `last_completed_date`, `created_by_role`
- `custom_fields`: `target_scope` (expected/arrived/all), `applies_to` (list of reg IDs), `visibility` (always "admin_only")
- `audit_logs`: `action`, `entity_type`, `target_id`, `performed_by`, `description`, `created_at`

---

## Prioritized Backlog

### P0 — Immediate Next
- None (all 18 tasks + QR scanner complete)

### P1 — High Priority
- Real Twilio SMS / WhatsApp Business API integration (currently mocked)
- Test coverage for new recurring tasks and custom fields features

### P2 — Important
- Push notifications for status changes
- Advanced analytics dashboard (trend charts)
- Bulk room assignment UI
- Email notifications for approvals

### P3 — Future
- Multi-event support
- Guest mobile app
- WhatsApp bot integration
- Report builder

---

## Known Issues / Caveats
- WhatsApp OTP is MOCKED (uses any 6-digit code)
- The `server.py` is ~2600 lines; future refactoring should split into route modules
- `top_countries/cities/states` only shows data when registrations have addresses
