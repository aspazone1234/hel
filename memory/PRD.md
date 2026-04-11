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
### P0 - None remaining

### P1
- Real Twilio SMS / WhatsApp Business API integration

### P2
- Push notifications for status changes
- Advanced analytics dashboard
- Activity Log date parsing fix (minor UI)
