# PRD - Shrimad Bhagavat Katha Mahotsav 2026

## Original Problem Statement
Premium devotional event website for "Shrimad Bhagavat Katha Mahotsav 2026" in Pushkar with multi-role admin dashboard. V2 overhaul: OTP-based registration, 3-bucket guest management, QR scanning, Help Centre, Message Center, Todo, Custom Fields. V2.5: Sidebar rename/reorder, dashboard restructure, permission enforcement, room 3-view, departure flow, travel fields, disapproved entries, drill-down modals.

## Architecture
- **Frontend**: React.js + Tailwind CSS + Shadcn UI (port 3000)
- **Backend**: FastAPI + Motor (async MongoDB) (port 8001)
- **Database**: MongoDB
- **Auth**: JWT Bearer tokens, hardcoded admins + dynamic custom admins

## Terminology
- **Swamsevak**: Admin/volunteer
- **Shraddhalu**: Guest/attendee
- **Panchariya AI**: Help desk chatbot
- **Command Centre**: Dashboard (renamed)
- **Attendance Marker**: QR scan module (renamed)

## Completed Features (V2.5 — 09 Apr 2026)

### Phase A: Gap Fixes
- Registration cutoff enforcement (date-based lock after 19 May 2026)
- Room Management 3 views: Floor-wise, Reference Person, Swamsevak-wise (with occupant names)
- Departure flow frontend: Confirmation dialog, date-check guard, super admin force, undo
- Swamsevak Assignment UI on Expected Guest List
- Help Centre: My Tickets / All Tickets views, assigned_to filtering, escalation alerts
- Travel fields (travel_mode, travel_details) in registration form + summary + backend
- SLA configuration API (GET/PUT /api/admin/sla-config)
- Disapproved entries section in Pending Approval
- Dashboard drill-down modals (clickable stat chips)
- Undo arrival/departure endpoints (super admin only)
- QR management view (list all QRs, disable)

### Phase B: Sidebar, Dashboard & Permission Overhaul
- Sidebar renamed: Command Centre, Attendance Marker
- Sidebar reordered: CC → AM → Help Centre (highlighted) → To-Do → then rest
- Command Centre: Merged stat blocks (rooms, arrival status), pending as alert, daily schedule chips
- Pending Approval: Super admin only, full view modal, disapproved tab
- Expected Guest List: Assign swamsevak, assign room, generate QR — all super admin only
- Arrived Guest List: No manual add, QR display in view, arrival/departure filters, departure confirmation
- Attendance Marker: 4 modes (Scan, Manual Search, Generate, QR List), manual attendance by name
- Help Centre: My/All tickets toggle, escalation alert banner
- Todo: Self-only for admins, super admin per-admin view
- Full Registration View shows ALL fields including travel, reference, special requests

## Key API Endpoints (V2.5 additions)
- GET /api/admin/dashboard/drill-down — Family-level drill-down for any stat
- GET /api/admin/registrations/rejected — Disapproved entries
- PUT /api/admin/registrations/{id}/undo-arrival — Super admin only
- PUT /api/admin/registrations/{id}/undo-departure — Super admin only
- GET /api/admin/sla-config — SLA categories
- PUT /api/admin/sla-config — Update SLA (super admin)
- GET /api/admin/qr-management — List all QR codes (super admin)
- GET /api/admin/registration-cutoff-status — Cutoff date info

## Key Dates
- Registration closes: 19 May 2026
- Finalization window: 19-21 May 2026
- Welcome communication: 21 May 2026
- Post-release amendments: 21-28 May 2026
- Event: 28 May - 3 June 2026
- Stay selection: 27 May - 4 June 2026

## Remaining Tasks

### Phase C: Attendance Marker & Departure Logic (Next)
- Departure reminder notification to assigned Swamsevak
- System-generated to-dos (departure follow-ups, special needs)
- Consolidated Swamsevak "My Day" operational view

### Phase D: Customer Form & Frontend Polish
- Field renames (Additional phone, Relation with reference person)
- Language control repositioning (below timeline, large button)
- Remove "wrong number of people" warning note
- OTP phone input with country code selector
- Form validation (email, mobile, numbers)
- Arrival/departure calculation highlight
- Thank You page redesign with animations
- User self-service summary/update page (post-submission profile view)

### Phase E: Advanced Operational Features
- Zone as operational entity (grouping, zone head)
- Proximity/nearby-person notification support
- Pre-registration outreach campaign workflow
- Message scheduling UI
- Custom fields in filtering/reporting/exports
- Room near-future vacancy insights
- Terms-of-use/training section in sidebar
- WhatsApp confirmation after form submission

### Future
- P2: Add to Calendar functionality
- P2: Actual Twilio SMS / WhatsApp Business API integration
