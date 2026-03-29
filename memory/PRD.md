# PRD - Shrimad Bhagavat Katha Mahotsav 2026 Website

## Original Problem Statement
Premium devotional event website for Shrimad Bhagavat Katha Mahotsav 2026, Pushkar, Rajasthan (28 May - 3 June 2026). Temple-inspired design with Krishna's divine presence, spiritual animations, bilingual Hindi+English content.

## User Personas
1. **Devotees/Attendees** - Families wanting to register for the Katha event
2. **Organizers (Panchariya Family)** - Admin users managing registrations, accommodation, food, transport logistics
3. **Visitors** - People learning about the event, viewing schedule, venue details

## Core Requirements
- Landing page with 11+ sections (Hero, About, Acharya, Schedule, Katha Themes, Venue, Registration CTA, Family, Dedication, Contact, Footer)
- Multi-step 8-step registration form (Contact, Attendance, People Count, Attendee Details, Accommodation, Food, Travel, Final)
- Admin panel with login, registrations table, summary cards, CSV export
- Countdown timer, sticky register button, sound toggle (visual placeholder)
- Google Maps embed for venue
- Mobile-first responsive design

## Architecture
- **Frontend**: React + Tailwind CSS + Shadcn/UI components
- **Backend**: FastAPI + MongoDB (Motor async driver)
- **Auth**: JWT cookie-based admin authentication with bcrypt password hashing
- **Fonts**: Cormorant Garamond (headings) + Outfit (body)
- **Colors**: Royal Blue (#0B1C3D), Gold (#D4AF37), Cream (#F8F1E5), Saffron (#E67E22), Lotus Pink (#F1948A)

## What's Been Implemented (March 29, 2026)
- Full landing page with all 11+ sections
- Glassmorphism sticky navbar with smooth scroll navigation
- Hero section with countdown timer, floating particles, Krishna image, CTAs
- About, Acharya, Schedule, Katha Themes (7-day cards), Venue sections
- Venue with Google Maps embed
- Organizing Family, Dedication, Contact sections
- 8-step registration form with Calendar, Select, Checkbox, Switch, RadioGroup, Progress components
- Admin panel: login, summary dashboard, registrations table, CSV export
- JWT cookie auth with admin seeding
- Fade-in scroll animations, glow effects, gold accents
- Sound toggle (visual-only placeholder)
- Add to Calendar (Google Calendar link)
- Sticky register button with scroll-to-top

## P0 - Completed
- [x] Landing page with all sections
- [x] Multi-step registration form
- [x] Admin dashboard
- [x] Backend APIs (auth, registrations, admin)
- [x] Countdown timer
- [x] Responsive design
- [x] Actual flute audio toggle (Web Audio API synthesized Indian pentatonic melody)
- [x] WhatsApp notification to +917229900422 on registration
- [x] Temple doors opening animation in hero section
- [x] Individual registration detail view in admin (Dialog)

## P1 - Backlog
- [ ] Photo gallery section
- [ ] Real-time attendee counter on homepage
- [ ] Print-friendly registration confirmation

## P2 - Future
- [ ] Multi-language toggle (full Hindi/English)
- [ ] QR code for each registration
- [ ] Push notifications for event updates
