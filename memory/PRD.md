# PRD - Shrimad Bhagwat Katha Gyan Yajna 2026 | Pushkar, Rajasthan

## Original Problem Statement
Design a premium devotional event website for "Shrimad Bhagavat Katha Mahotsav 2026" in Pushkar.
The website should feel like entering a sacred temple space blended with Krishna's divine presence.
Features include a multi-step registration form stored in a database with an admin panel,
subtle animations, flute sound toggle, and bilingual (Hindi + English) text.

## User Personas
- **Guests/Devotees**: Families who receive the invitation and want to register attendance
- **Organizers (Admin)**: Panchariya family members who manage registrations and logistics

## Core Requirements
- Bilingual UI (English + Hindi) with prominent language toggle
- Grand golden temple door entrance animation with flute audio trigger
- Multi-step registration form stored in MongoDB
- Admin panel for viewing/exporting registrations
- WhatsApp notification on registration completion
- Event countdown timer
- Google Maps embed for venue

## Architecture
- **Frontend**: React.js + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (Motor async driver)
- **Auth**: JWT + httpOnly cookies

## Section Order (Home Page)
1. Hero (with golden door overlay on first visit)
2. Loving Memory (elders dedication)
3. About the Event
4. Vyas Peeth (Acharya section)
5. Schedule (Katha timings)
6. Special Programs (Kalash Yatra, Bhajan, Havan)
7. Sacred Episodes (7-day Katha themes)
8. Venue (with Google Maps)
9. Registration CTA
10. Family (Panchariya Parivar)
11. Contact Strip
12. Footer

## What's Been Implemented

### V1 (Previous Session)
- [x] FastAPI backend with MongoDB
- [x] React frontend with Tailwind + Shadcn UI
- [x] Complex 8-step registration form
- [x] Admin panel with login, table, detail dialog, CSV export
- [x] Basic temple door animation (auto-open)
- [x] Flute audio toggle via Web Audio API
- [x] WhatsApp redirect on registration

### V2 (Current Session - 29 March 2026)
- [x] **Grand Golden Temple Door**: Full-screen click-to-enter overlay with mandala ornaments
- [x] **Audio Autoplay Fix**: Flute audio triggers on door click (bypasses browser autoplay policy)
- [x] **Bilingual Language Toggle**: Prominent EN/HI toggle in navbar, switches ALL content
- [x] **Hindi Content**: Extracted from 4 physical invitation card images
- [x] **Simplified Registration Form**: 3 steps (Contact → Attendance → Attendees + Accommodation)
- [x] **Removed food preferences** entirely from form and backend
- [x] **Backend Schema Refactored**: Simplified RegistrationCreate model (17 fields)
- [x] **Section Reordering**: New order matching user request
- [x] **Vyas Peeth**: Large image of Acharya Shri Janak Ji, smaller Guru section
- [x] **Sacred Episodes**: Image-heavy with invitation card reference
- [x] **Premium Countdown**: Gold-accented timer with Hindi numerals
- [x] **Admin Dashboard Updated**: New schema fields, attendance intent breakdown
- [x] **Add to Calendar**: Google Calendar link in hero section
- [x] **Contact Strip**: Dedicated contact section with Call + WhatsApp buttons

## Prioritized Backlog

### P1 - Next
- [ ] Hindi content for "About" section when user provides it
- [ ] Family description text when user provides it

### P2 - Future
- [ ] "Share Event" WhatsApp generator button
- [ ] Push notifications for event updates
- [ ] Photo gallery of past events
- [ ] Testimonials / blessings section

## API Endpoints
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/registrations | Submit registration |
| GET | /api/registrations/count | Get total count |
| POST | /api/auth/login | Admin login |
| GET | /api/auth/me | Get current user |
| POST | /api/auth/logout | Admin logout |
| GET | /api/admin/registrations | List all registrations |
| GET | /api/admin/summary | Dashboard summary stats |
| GET | /api/admin/export-csv | Export registrations CSV |

## DB Schema (registrations collection)
```json
{
  "id": "uuid",
  "full_name": "string",
  "mobile": "string",
  "email": "string (optional)",
  "city": "string (optional)",
  "country": "string (optional)",
  "attendance_intent": "Yes|Most Probably|Maybe",
  "arrival_date": "string",
  "departure_date": "string",
  "arrival_time": "string",
  "days_attending": ["28 May", "29 May", ...],
  "num_people": "int",
  "attendees": [{"name": "", "category": "Adult|Child|Senior", "special_needs": ""}],
  "need_accommodation": "bool",
  "room_type": "string",
  "num_rooms": "int",
  "message": "string",
  "consent": "bool",
  "created_at": "ISO datetime"
}
```
