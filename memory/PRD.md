# PRD - Shrimad Bhagavat Katha Mahotsav 2026

## Original Problem Statement
Design a premium devotional event website for "Shrimad Bhagavat Katha Mahotsav 2026" in Pushkar. Sacred temple aesthetic with Krishna's divine presence. Features: multi-step registration form, admin approval panel, bilingual (Hindi + English), golden door entry animation, flute sound toggle, subtle animations.

## Architecture
- **Frontend**: React.js + Tailwind CSS + Shadcn UI (port 3000)
- **Backend**: FastAPI + Motor (async MongoDB) (port 8001)
- **Database**: MongoDB
- **Auth**: Bearer token (JWT), hardcoded admin credentials in server.py

## What's Been Implemented

### Core Features (DONE)
- Golden door entry animation
- Hero section with countdown, Krishna imagery
- Bilingual LanguageContext (Hindi + English) with full translations
- Animated Hindi announcement strip
- Sticky language toggle + register button
- Flute audio toggle (.opus with .mp3 fallback)

### Landing Page Sections (DONE)
- Quote (Shloka) section — Skanda Purana verse
- Loving Memory — 4 elders with photos
- About — 4-paragraph family offering description
- Vyas Peeth — Acharya Shri Janak Ji with guru info
- Schedule — Opening day + daily sessions
- Other Programs — Kalash Yatra, Bhajan, Havan (reordered)
- Katha Episodes — 7 days with individual images
- Venue — Slideshow + map (Navy background for zigzag)
- Family — 3 members + Timeline UI (1996→2000→2006→2010→2026)
- Registration CTA
- Contact strip
- Footer

### Zigzag Color Scheme (DONE)
Alternating Navy (#0B1C3D) and Peach (#F8F1E5) across consecutive sections.

### Registration Form (DONE)
- 3-step form: Contact Info → Attendance & Travel → Attendee Details
- Dynamic attendee fields generated from "Number of People" input
- Required arrival/departure dates
- No WhatsApp redirect — redirects to /thank-you page
- No accommodation toggle

### Admin Dashboard (DONE)
- Username/Password login (4 hardcoded accounts)
- 3-bucket dashboard: Approval Center, Final Guest List, Recycle Bin
- Activity Logs tab (read-only)
- CSV export (approved guests only)
- Summary cards with counts by status

### Admin Credentials
- arunpanchariya / arunlondon123
- ashokpanchariya / ashokahmedabad123
- satishpanchariya / satishmumbai123
- basantmalpani / basantjaipur123

## API Endpoints
- `POST /api/auth/login` — Admin login (username/password)
- `GET /api/auth/me` — Get current admin user
- `POST /api/registrations` — Create registration
- `GET /api/registrations/count` — Public count
- `GET /api/admin/registrations` — List all (auth required, optional ?status= filter)
- `PUT /api/admin/registrations/{id}/status` — Approve/Delete/Restore
- `GET /api/admin/activity-logs` — Activity log
- `GET /api/admin/summary` — Counts by status
- `GET /api/admin/export-csv` — CSV export (approved only)

## Database Schema
### registrations collection
```json
{
  "id": "uuid",
  "full_name": "string",
  "mobile": "string",
  "email": "string",
  "city": "string",
  "country": "string",
  "attendance_intent": "Yes|Most Probably|Maybe",
  "arrival_date": "YYYY-MM-DD",
  "departure_date": "YYYY-MM-DD",
  "days_attending": ["28 May", ...],
  "num_people": 3,
  "attendees": [{"name": "", "category": "Adult", "special_needs": ""}],
  "message": "string",
  "consent": true,
  "approval_status": "pending|approved|deleted",
  "created_at": "ISO datetime"
}
```

### activity_logs collection
```json
{
  "id": "uuid",
  "registration_id": "uuid",
  "guest_name": "string",
  "action": "approved|deleted|pending",
  "old_status": "string",
  "performed_by": "Admin Name",
  "performed_at": "ISO datetime"
}
```

## Remaining / Future Tasks
- P2: Add "Add to Calendar" button
- P2: QR Code integration for physical invitation mapping
