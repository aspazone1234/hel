# PRD - Shrimad Bhagwat Katha Gyan Yajna 2026 | Pushkar, Rajasthan

## Original Problem Statement
Design a premium devotional event website for "Shrimad Bhagavat Katha Mahotsav 2026" in Pushkar.
The website should feel like entering a sacred temple space blended with Krishna's divine presence.
Features include a multi-step registration form stored in a database with an admin panel,
subtle animations, flute sound toggle, and bilingual (Hindi + English) text.

## User Personas
- **Guests/Devotees**: Families who receive the invitation and want to register attendance
- **Organizers (Admin)**: Panchariya family members who manage registrations and logistics (admin accessible only via direct link)

## Architecture
- **Frontend**: React.js + Tailwind CSS + Shadcn UI
- **Backend**: FastAPI (Python)
- **Database**: MongoDB (Motor async driver)
- **Auth**: JWT + httpOnly cookies

## Section Order (Home Page)
1. Hero (with golden door overlay on first visit, new Krishna deity image, visible on mobile)
2. Quote (Skanda Purana shloka - compact horizontal)
3. Loving Memory (4 individual photos in grid)
4. About the Event
5. Vyas Peeth (single center column, guru inline bar with Rambhadracharya image)
6. Schedule (Katha timings)
7. Special Programs (Bhajan→Kalash→Havan)
8. Sacred Episodes (7 individual day images)
9. Venue (slideshow carousel with 3 images + Google Maps)
10. Family (Panchariya Parivar)
11. Registration CTA (strong visible button)
12. Contact Strip
13. Footer (no admin link)

## What's Been Implemented

### V1 (Session 1)
- [x] FastAPI backend with MongoDB, admin auth, CRUD endpoints
- [x] React frontend skeleton, 8-step registration form
- [x] Basic door animation, flute audio toggle

### V2 (Session 2 - 29 March 2026)
- [x] Golden temple door overlay, bilingual language toggle
- [x] Simplified 3-step registration form, backend schema refactored
- [x] Hindi content from invitation images, section reordering

### V3 (Session 3 - 30 March 2026)
- [x] **Audio**: Replaced Web Audio API with actual MP3 flute file (/flute.mp3)
- [x] **Header**: Text-only (no Om symbol, no peacock feather, no logo)
- [x] **Hero**: Title "Shrimad Bhagavat Katha 2026" + smaller "Gyan Yajna", no separate year, new Krishna deity image, VISIBLE ON MOBILE
- [x] **Quote**: Moved from Schedule to above Loving Memory, compact horizontal format
- [x] **Loving Memory**: 4 individual circular photos in grid (Durga Baisa, Alka Ji, Ramswaroop Ji, Shanta Devi)
- [x] **Vyas Peeth**: Single center column, Acharya Ji large photo, guru as small horizontal inline bar with Rambhadracharya actual image
- [x] **Special Programs**: Reordered to Bhajan→Kalash→Havan
- [x] **Episodes**: 7 individual day images (user-provided), removed large single image
- [x] **Venue**: Image slideshow/carousel with 3 user-provided images, auto-slide + navigation
- [x] **Registration CTA**: Button visibility improved (strong gold, bold, shadow)
- [x] **Registration Form Part 2**: Removed "Expected Arrival Time" and "Number of People"
- [x] **Registration Form Part 3**: "Number of People" is FIRST field, accommodation default ON, removed Room Type/Number of Rooms, full detailed summary of all inputs
- [x] **WhatsApp**: Updated to +91 9825423650
- [x] **Footer**: Admin link removed (admin only via direct /admin URL)

### V3.1 (Session 4 - 30 March 2026)
- [x] **Mobile hero opacity**: Increased Krishna image visibility (opacity 0.30, lighter gradient overlay)
- [x] **Sticky language toggle**: Globe + EN/हिंदी button above sticky Register button at bottom-right
- [x] **Announcement strip**: Animated golden marquee below navbar with scrolling registration message + CTA button
- [x] **Form language toggle**: Globe toggle at top-right of registration form page
- [x] **Section reorder**: Registration CTA moved below Family, above Contact Strip

### P1 - Next
- [ ] Hindi content for "About" section when user provides it
- [ ] Family description text when user provides it

### P2 - Future
- [ ] "Share Event" WhatsApp generator button
- [ ] QR Code for physical invitation → registration page bridge

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
  "email": "string (opt)",
  "city": "string (opt)",
  "country": "string (opt)",
  "attendance_intent": "Yes|Most Probably|Maybe",
  "arrival_date": "string",
  "departure_date": "string",
  "arrival_time": "string",
  "days_attending": ["28 May", ...],
  "num_people": "int",
  "attendees": [{"name":"","category":"Adult|Child|Senior","special_needs":""}],
  "need_accommodation": "bool",
  "room_type": "string",
  "num_rooms": "int",
  "message": "string",
  "consent": "bool",
  "created_at": "ISO datetime"
}
```
