# PRD - Shrimad Bhagavat Katha Mahotsav 2026

## Original Problem Statement
Premium devotional event website for "Shrimad Bhagavat Katha Mahotsav 2026" in Pushkar with multi-role admin dashboard. Sacred temple aesthetic with Krishna's divine presence. Bilingual (Hindi + English), golden door entry, multi-step registration, admin approval panel. V2 overhaul added OTP-based registration, 3-bucket guest management, QR scanning, Help Centre, Message Center, Todo, and Custom Fields.

## Architecture
- **Frontend**: React.js + Tailwind CSS + Shadcn UI (port 3000)
- **Backend**: FastAPI + Motor (async MongoDB) (port 8001)
- **Database**: MongoDB (registrations, rooms, audit_logs, custom_admins, help_tickets, message_templates, to_do_items, custom_fields, message_campaigns)
- **Auth**: JWT Bearer tokens, hardcoded admins + dynamic custom admins
- **PDF**: fpdf2
- **QR**: qrcode (Python), html5-qrcode (React)

## Terminology
- **Swamsevak**: Admin/volunteer
- **Shraddhalu**: Guest/attendee
- **Panchariya AI**: Help desk chatbot (formerly Madhav AI)

## Completed Features

### Public Website (Phase 1)
- 15-Point FINAL SPEC complete
- Section order: Hero, Quote, Memory, About, Acharya, Schedule+Other, Episodes, Family, Registration, Venue, Footer
- Family image carousel: 21-image slider, 3-sec auto-scroll, pause on hover
- In Loving Memory: Hierarchical grid layout
- Registration form: OTP-based (mocked OTP: 4132), attendee management

### Admin Portal - Swamsevak Portal (Phase 2-3)
- **Login**: Username/password JWT auth, 5 hardcoded accounts
- **Dashboard**: Stats, pending alerts, arrival summary, room summary, daily arrivals/departures
- **3-Bucket System**: Pending Form Approval, Expected Guest List, Arrived Guest List
- **Room Management**: Grid view, assignment, shift rooms
- **Audit Log**: Full trail, Super Admin clear
- **Admin Management**: Super Admin only CRUD for custom admins

### Phase 4-10 Modules (Completed 09 Apr 2026)
- **QR Code System**: Scan mode (manual entry + camera), Generate mode (bulk/single), check-in flow with attendee selection
- **Help Centre**: Ticket CRUD, stats dashboard, 11 categories, SLA timers, filter by status/priority, resolve with closing note, reassign
- **Message Center** (Super Admin): Template CRUD (system/shraddhalu/swamsevak), Send message (MOCKED WhatsApp), Campaigns tracking
- **Todo Module**: Task CRUD, priority levels (high/medium/low), assignee, due date, filter (pending/completed/all), toggle completion
- **Custom Fields Manager** (Super Admin): Flexible fields (text/number/toggle/select/date), scope (registration/room/operational), visibility control
- **Panchariya AI Chatbot**: Keyword-based auto-ticket creation, guided responses, bilingual support (EN/HI)

## API Endpoints
- Auth: POST /api/auth/login, GET /api/auth/me
- OTP: POST /api/auth/otp/send, POST /api/auth/otp/verify
- Registrations: POST /api/registrations, GET /api/registrations/count
- Admin Registrations: GET/PUT/POST /api/admin/registrations/*, DELETE /api/admin/registrations/{id}/permanent
- Admin Guests: GET /api/admin/guests/pending, /expected, /arrived
- Rooms: GET/POST/DELETE /api/admin/rooms/*, PUT /api/admin/rooms/{code}/assign|unassign|shift
- Dashboard: GET /api/admin/dashboard
- Audit: GET/DELETE /api/admin/audit-logs
- Admins: GET/POST/PUT/DELETE /api/admin/admins
- Export: GET /api/admin/export-csv, GET /api/admin/export-pdf
- QR: POST /api/admin/qr/generate/{id}, POST /api/admin/qr/generate-bulk, POST /api/admin/qr/scan
- Tickets: GET/POST /api/admin/tickets, GET /api/admin/tickets/stats, /categories, PUT resolve/assign
- Todos: GET/POST/PUT/DELETE /api/admin/todos
- Messages: GET/POST/PUT/DELETE /api/admin/messages/templates, POST /send, GET /campaigns
- Custom Fields: GET/POST/DELETE /api/admin/custom-fields
- Chatbot: POST /api/admin/chatbot/message

## DB Collections
registrations, rooms, audit_logs, custom_admins, help_tickets, message_templates, to_do_items, custom_fields, message_campaigns

## Remaining Tasks
- P1: Panchariya AI Help Desk for Shraddhalu-side (sample FAQs, guided responses, fallback replies - config-driven)
- P1: WhatsApp webhook simulation UI responsiveness
- P2: Add to Calendar functionality
- P2: Actual Twilio SMS / WhatsApp Business API integration (when credentials provided)
