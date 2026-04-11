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
- **Deadline notice**: "Registrations and application changes are open until 19 May 2026"
- **All CTAs say "Register / Update"** (nav header, sticky button, RegistrationCTA)

### Registration Form (Public)
- OTP-based WhatsApp mobile verification (format validated before OTP send)
- Multi-step: Attendees -> Stay/Travel -> Reference -> Review
- **Mandatory**: Names, Age, Additional Phone, Address, Days, Arrival Time, Departure Time, Reference Person, Relation, Group Head
- **Optional**: Email, Special Needs, Family/Group Special Request (in attendees modal), Travel mode/details
- **Removed from UI**: Family/Group Special Request (from step 0, moved to attendees edit), Preferred Language
- Post-submit: redirects to User Portal with success banner
- **Fixed (Feb 2026)**: `stateSearch is not defined` crash after OTP verification → renamed to `addrStateSearch`

### User Single-Page Portal (/my-registration)
- Collapsible sections: Attendees, Contact, Address, Stay & Travel, Reference, Allocation
- **5 Modal-based edits**: attendees (with family/group request), address, communication (WhatsApp locked), stay/travel, reference
- Edit locked after May 19, 2026 or when confirmed
- **Confirmed state**: approved + room + QR + contact -> locked edits, room/QR display, admin contact (+91 7048850050)
- Language switcher (Hindi/English)

### Thank-You Page
- **"Final Confirmation on May 21"** is FIRST and MOST PROMINENT step (large green card)
- **"Room details sent on 21 May via WhatsApp"** prominently highlighted
- "Editable until May 19" and "Locked on May 19" as secondary/tertiary steps

### Admin Portal
- **CRITICAL FIX**: Approve/Disapprove now uses dedicated `/approve` and `/reject` endpoints (was silently failing with generic PUT)
- Instant UI update on approve/reject (local state removal)
- **Super Admin edit/delete** across ALL 3 buckets (Pending, Expected, Arrived)
- **PDF + CSV exports** on ALL lists: Pending, Expected, Arrived, Rooms
- **Manual Entry form**: exact field replica of public form (reference/relation dropdowns, mandatory age/times, time slot selectors)
- **Audit log**: stores previous AND new values for every field change

### Room Management
- Floor-wise / Reference Person / Swamsevak-wise views
- **Fixed (Feb 2026)**: Room creation error toast with FastAPI validation error arrays → now parses properly
- **Fixed (Feb 2026)**: Room list display (raw list vs `.data` wrapper) fixed in both AdminRoomManagement and ExpectedGuestList
- **Fixed (Feb 2026)**: Room assignment dialog now shows ALL rooms — available (green, clickable) and occupied (red, grayed out, shows occupant name)
- **Updated (Feb 2026)**: Add Room dialog now shows labeled fields: Room Number, AC/Non-AC, Number of Beds, Floor (optional), Other Notes
- **Added (Feb 2026)**: Bulk Create tab — enter multiple room numbers (one per line), set shared AC type, beds, floor, notes
- Room cards now display: Beds, AC type, Floor, Notes, occupant info

### Swamsevak / Contact Person Assignment
- **Fixed (Feb 2026)**: Swamsevak assignment stored `username` instead of `name` → dashboard showed 0 assigned guests
- **Fixed (Feb 2026)**: swamsevak-dashboard now queries by both name AND username (backward compat)
- Todos and tickets in swamsevak dashboard now match by both name and username

### Dashboard — Reference Person & Relation Stats
- **Added (Feb 2026)**: "By Reference Person" section — clickable cards per reference person showing families/people count
- **Added (Feb 2026)**: "By Relation" section — clickable cards per relation category showing families/people count
- Both sections open drill-down popup listing guests when clicked

### QR Code System
- **Super Admin only** generation (in Expected list only)
- **Conditional button**: "Generate QR" (no QR) / "Download QR" (QR exists)
- QR permanently bound to mobile, dynamic data, versioned
- QR scan validates token + active + 3 conditions
- PNG download from Expected list and User Portal

### Attendance & Arrival Rules
- **3-condition hard block**: contact person + room + QR required
- Specific error messages for each missing condition
- **No double-marking**: already arrived -> popup with person details (name, mobile, room, status)
- **Camera preview PRIMARY**: visible by default, manual token entry secondary
- Both scan and search modes use `mark-arrival` endpoint (enforces 3-condition block)

## Remaining Backlog
### P0 - QR Scanner Auto-Detection (jsQR)
- Implement `requestAnimationFrame` loop in `QRScanner.js` using jsQR for hands-free scan

### P1
- Real Twilio SMS / WhatsApp Business API integration

### P2
- Push notifications for status changes
- Advanced analytics dashboard
- Activity Log date parsing fix (minor UI)
- Old assigned_swamsevak data stored as username (not full name) — may need data migration to display properly in Contact badges
