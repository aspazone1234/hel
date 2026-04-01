# PRD - Shrimad Bhagavat Katha Mahotsav 2026

## Original Problem Statement
Premium devotional event website for "Shrimad Bhagavat Katha Mahotsav 2026" in Pushkar with multi-role admin dashboard. Sacred temple aesthetic with Krishna's divine presence. Bilingual (Hindi + English), golden door entry, multi-step registration, admin approval panel.

## Architecture
- **Frontend**: React.js + Tailwind CSS + Shadcn UI (port 3000)
- **Backend**: FastAPI + Motor (async MongoDB) (port 8001)
- **Database**: MongoDB (registrations, rooms, audit_logs, custom_admins)
- **Auth**: JWT Bearer tokens, hardcoded admins + dynamic custom admins
- **PDF**: fpdf2

## Completed Features (01 Apr 2026)

### Public Website
- 15-Point FINAL SPEC complete
- Section order: Hero → Quote → Memory → About → Acharya → Schedule+Other (merged, peach) → Episodes (dark blue) → Family (peach) → Registration (dark blue) → Venue (dark blue) → Footer
- Family image carousel (auto-sliding)
- Timeline mobile center alignment fix
- Registration form: Additional phone, Address (mandatory), num_people mandatory with attendee validation, language toggle below heading

### Admin Portal ("Shrimad Bhagavat Management Portal 2026")
- **Two-tier roles**: Admin (4 system accounts) + Super Admin (superashwini)
- **Sidebar**: Dashboard → Final Guest List → Website Form Approval → Room Management → Bulk Guest Messaging → Audit Log → Admin Management (super admin only)
- **Dashboard**: Full word labels (no abbreviations), Pending notification alert with "Review Now", Arrival Summary (Arrived/Not Arrived/Not Coming with families+people), Single rooms block (available + occupied/total), Daily Arrivals/Departures vertical layout (28 May - 3 Jun)
- **Final Guest List**: Embedded Recycle Bin (red), 3 simplified filters (Arriving Date, Departure Date, Arrival Status), Action labels ("View", "Edit", "Delete" text), Arrival→Room assignment modal (search rooms, greyed out if booked, "Mark Arrived Without Room"), Row coloring (green=Arrived, red=Not Coming), Edit with Internal Notes, Manual Entry (simplified), CSV/PDF export
- **Website Form Approval**: Per-form Accept/Reject (NO bulk approve/reject all), Disapproved section with View + Super Admin Delete
- **Room Management**: Grid view, popup assignment with guest search, shift rooms, Super Admin exclusive CRUD
- **Bulk Guest Messaging**: UI scaffold (SMS/WhatsApp pending)
- **Audit Log**: Full trail, Super Admin clear button
- **Admin Management**: (Super Admin only) System admins read-only, Custom admin CRUD (create/edit/delete/password change)
- **Mobile UX**: Pulsing golden dot + "Tap for all settings" near hamburger

## API Endpoints
- Auth: POST /api/auth/login, GET /api/auth/me
- Registrations: POST /api/registrations, GET /api/registrations/count
- Admin Registrations: GET/PUT/POST /api/admin/registrations/*, DELETE /api/admin/registrations/{id}/permanent (superadmin)
- Rooms: GET/POST/DELETE /api/admin/rooms/*, PUT /api/admin/rooms/{code}/assign|unassign|shift
- Dashboard: GET /api/admin/dashboard
- Audit: GET/DELETE /api/admin/audit-logs
- Admins: GET/POST/PUT/DELETE /api/admin/admins (superadmin)
- Export: GET /api/admin/export-csv, GET /api/admin/export-pdf

## DB Collections
- registrations, rooms, audit_logs, custom_admins

## Remaining
- P1: Bulk Guest Messaging SMS/WhatsApp integration
- P2: Add to Calendar button
- P2: QR Code for invitations
