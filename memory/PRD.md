# PRD - Shrimad Bhagavat Katha 2026 Event Operations Platform

## Overview
Comprehensive event operations platform for Shrimad Bhagavat Katha 2026, Pushkar. React + FastAPI + MongoDB.

## Core Identity
- **Mobile Number (WhatsApp)** = immutable primary identity key across ALL workflows
- Event: May 28 - June 3, 2026 | Registration Cutoff: May 19, 2026
- Venue: Shri Gautam Ashram, Pushkar, Rajasthan

## Implemented Features (All Verified)

### Landing Page
- Splash animation, Hindi/English toggle, countdown timer
- All info sections (About, Vyas Peeth, Schedule, Special Programs, Venue, Loving Memory, Family)
- **Deadline notice**: "Registrations and application changes are open until 19 May 2026"
- CTA: "Register / Update" (both Hindi and English)

### Registration Flow (Public)
- OTP-based WhatsApp mobile verification (mocked)
- Multi-step form: Attendees -> Stay/Travel -> Reference -> Review
- **Mandatory**: Names, Age, Additional Phone, Address, Days, Arrival Time, Departure Time, Reference Person, Relation
- **Removed**: Family/Group Special Request, Preferred Language
- Returning users (existing registration) -> redirect to User Portal
- New submissions -> redirect to User Portal with success banner

### User Portal (/my-registration)
- Single-page, collapsible sections: Attendees, Contact, Address, Stay & Travel, Reference, Allocation
- Modal-based inline edits per section (saves instantly via API)
- Edit locked after May 19, 2026 (cutoff)
- **Confirmed state**: approved + room + QR + contact assigned -> locked edits, room/QR display, admin contact (+91 7048850050)
- Language switcher (Hindi/English)
- Backend audit logging for all user self-edits

### Admin Portal
- 3 roles: Super Admin, Swamsevak, Custom Admin
- Command Centre: merged stat blocks, click-to-drill-down
- **3-Bucket Guest Management**: Pending -> Expected -> Arrived
- Pending: Approve/Disapprove with **instant UI update** (local state, no re-fetch)
- Expected: Search, filters, pagination, Swamsevak/Room/QR assignment
- Arrived: Departure marking, undo arrival/departure
- Room Management (floor/capacity/AC type)
- Help Centre (ticketing), To-Do Module, Message Center
- Audit Logs, Swamsevak "My Day" panel
- **CSV/PDF Exports** on ALL admin lists (Pending, Expected, Arrived, Rooms)
- **Manual Entry form**: exact field-level replica of public form (reference person/relation dropdowns, mandatory age/times, no obsolete fields)

### QR Code System
- **Super Admin only** generation (in Expected list)
- QR permanently bound to mobile: `KATHA2026:{reg_id}:{token}:v{version}:{mobile}`
- QR versioning with invalidation, bulk generation (Super Admin only)
- QR image stored as base64 PNG (`qr_image_b64` field)
- QR scan validates token + active status + attendance conditions

### Attendance Rules (Hard Blocks)
- **3-condition block**: ALL required before marking arrival:
  1. Contact person (Swamsevak) assigned
  2. Room assigned
  3. QR code generated and active
- Specific error messages for each missing condition
- **No double-marking** (already arrived -> blocked)
- Both manual and QR-scan paths enforce these rules
- AttendanceCheckin uses dedicated `mark-arrival` endpoint

### Bugs Fixed
- "Registration not found" on View Submission (path param fix)
- Double `/api/api/` URL in RegisterPage edit flow
- Admin approve/disapprove not updating UI (instant local state)
- QR image rendering in ArrivedGuestList (used `qr_data` instead of `qr_image_b64`)
- Edit loop (returning users redirected to portal, not back to mobile entry)
- AttendanceCheckin bypassing 3-condition block (now uses mark-arrival endpoint)

## Remaining Backlog
### P0
- Super Admin global edit/delete permissions across all buckets

### P1
- Real Twilio SMS / WhatsApp Business API integration

### P2
- Push notifications for status changes
- Advanced analytics dashboard
