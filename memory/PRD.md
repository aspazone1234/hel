# PRD - Shrimad Bhagavat Katha 2026 (Katha 2026) Event Operations Platform

## Overview
A comprehensive event operations platform for Shrimad Bhagavat Katha 2026, a religious gathering in Pushkar, Rajasthan. Built with React (Frontend), FastAPI (Backend), and MongoDB.

## Core Identity
- **Mobile Number (WhatsApp)** is the immutable primary identity key across all workflows
- Event Dates: May 28 - June 3, 2026
- Registration Cutoff: May 19, 2026
- Venue: Shri Gautam Ashram, Pushkar, Rajasthan

## Architecture
- React SPA with Tailwind CSS + Shadcn UI
- FastAPI backend with MongoDB (Motor async driver)
- JWT-based admin authentication
- Mocked OTP for public registration (no real SMS)
- Mocked WhatsApp confirmation

## Implemented Features

### Landing Page
- Splash animation entry screen
- Hindi/English language toggle
- Event countdown timer
- Sections: About, Vyas Peeth, Schedule, Special Programs, Venue, Loving Memory, Family
- **Registration CTA with deadline notice**: "Registrations and application changes are open until 19 May 2026"
- CTA buttons say "Register / Update" (not "Fill Form")

### Registration Flow (Public)
- OTP-based verification using WhatsApp mobile number
- Multi-step form: Attendees → Stay/Travel → Reference → Review
- **Mandatory fields**: Names, Age, Additional Phone, Address, Selected Days, Expected Arrival Time, Expected Departure Time, Reference Person, Relation
- **Removed fields**: Family/Group Special Request, Preferred Language for Communication
- Returning users (OTP verified with existing registration) redirect to User Portal
- New submissions redirect to User Portal with success banner

### User Portal (/my-registration)
- Single-page portal showing registration status
- Collapsible sections: Attendees, Contact, Address, Stay & Travel, Reference, Allocation
- **Modal-based section edits** (each saves instantly via API)
- Edit locked after May 19, 2026 (cutoff)
- **Confirmed state**: If approved + room + QR + contact assigned → locked edits, room details, QR download, admin contact
- Language switcher (Hindi/English)
- Backend audit logging for all user self-edits

### Admin Portal
- 3 admin roles: Super Admin, Swamsevak, Custom Admin
- **Command Centre**: Merged stat blocks with click-to-drill-down
- **3-Bucket Guest Management**: Pending → Expected → Arrived
- **Pending Approval**: Approve/Disapprove with instant UI updates (local state, no re-fetch)
- **Expected Guest List**: Search, filters (reference, relation), pagination, Swamsevak assignment, Room assignment, QR generation
- **Arrived Guest List**: Departure marking, undo arrival/departure, filters
- Room Management with floor/capacity/AC type
- Help Centre (ticketing system)
- To-Do Module
- Message Center with scheduled messages
- Audit Logs
- **CSV/PDF Exports** for all buckets (Pending, Expected, Arrived, Rooms)

### QR Code System
- **Super Admin only** can generate QR codes (in Expected list)
- QR permanently bound to mobile number
- Dynamic QR data: `KATHA2026:{reg_id}:{token}:v{version}:{mobile}`
- QR versioning with invalidation
- Bulk QR generation (Super Admin only)
- QR scan validates token + active status + attendance conditions

### Attendance Rules (Hard Blocks)
- Attendance marking requires ALL 3 conditions:
  1. Contact person (Swamsevak) assigned
  2. Room assigned
  3. QR code generated and active
- Specific error messages for each missing condition
- No double-marking (already arrived → blocked)
- QR scan also validates these conditions

### Swamsevak Features
- "My Day" operational panel
- Dashboard with assigned guests
- Help ticket management

## API Endpoints
- Auth: POST /api/auth/login
- OTP: POST /api/otp/send, POST /api/otp/verify
- Registration: POST /api/registrations, GET /api/registration/by-mobile/{mobile}, PUT /api/registrations/{id}/public
- Admin CRUD: GET/PUT /api/admin/registrations/{id}, DELETE /api/admin/registrations/{id}/permanent
- Admin Lists: GET /api/admin/guests/pending, GET /api/admin/guests/expected, GET /api/admin/guests/arrived
- QR: POST /api/admin/qr/generate/{id}, POST /api/admin/qr/scan, PUT /api/admin/qr/invalidate/{id}
- Attendance: POST /api/admin/registrations/{id}/mark-arrival
- Exports: GET /api/admin/export-csv?bucket={pending|expected|arrived|rooms}, GET /api/admin/export-pdf
- Rooms: CRUD on /api/admin/rooms/*
- Dashboard: GET /api/admin/dashboard
- Audit: GET /api/admin/audit-logs

## Remaining Backlog
### P0
- Super Admin global edit/delete permissions across all buckets

### P1
- Manual-entry form field parity with public registration form
- Real Twilio SMS / WhatsApp Business API integration

### P2
- Push notifications for status changes
- Advanced analytics dashboard
