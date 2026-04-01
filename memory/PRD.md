# PRD - Shrimad Bhagavat Katha Mahotsav 2026

## Original Problem Statement
Design a premium devotional event website for "Shrimad Bhagavat Katha Mahotsav 2026" in Pushkar with multi-role admin dashboard. Sacred temple aesthetic with Krishna's divine presence. Features: multi-step registration form, admin approval panel, bilingual (Hindi + English), golden door entry animation.

## Architecture
- **Frontend**: React.js + Tailwind CSS + Shadcn UI (port 3000)
- **Backend**: FastAPI + Motor (async MongoDB) (port 8001)
- **Database**: MongoDB
- **Auth**: Bearer token (JWT), hardcoded admin accounts + dynamic custom admins
- **PDF Generation**: fpdf2

## Completed Features (01 Apr 2026)

### Public Website
- 15-Point FINAL SPEC (header, quote, loving memory, about, sections, zigzag, etc.)
- Section reorder: Registration CTA → Family → Venue (bottom)
- Family image carousel (auto-sliding between heading and member cards)
- Ram Swarupji image replaced with new photo
- Timeline mobile center alignment fix
- Registration form: Additional phone, Address (mandatory, merged city+country), num_people mandatory with attendee validation, language toggle below heading

### Admin Portal (Shrimad Bhagavat Management Portal 2026)
- **Two-tier role system**: Admin (4 accounts) + Super Admin (superashwini)
- **Sidebar**: Dashboard → Final Guest List → Website Form Management → Room Management → Bulk Guest Messaging → Audit Log
- **Dashboard**: Renamed blocks (Final Guest List Families/People), Daily Arrivals/Departures (28 May - 3 Jun per date), Arrival Summary (Arrived/Not Arrived/Not Coming with families+people), Rooms Available
- **Final Guest List**: Embedded Recycle Bin (red, restore-to-approved-only), Arrival status toggles with confirmation, Row coloring (green=Arrived, red=Not Coming), Split filter rows (search + date ranges + arrival status + Clear Filters), Edit capability with Internal Notes, Manual Entry (simplified - no management/room fields), CSV/PDF export
- **Website Form Management**: Pending forms with Accept/Reject, Disapproved entries (view-only, no restore), Bulk approve/reject
- **Room Management**: Grid view only, Popup assignment with guest search (faded for already-assigned), Shift room (unoccupied only), Super Admin exclusive: Add/Delete/Bulk Add rooms, Confirmation dialogs, CSV/PDF export
- **Bulk Guest Messaging**: UI scaffold with guest selection + message compose (SMS/WhatsApp integration pending)
- **Audit Log**: Full action trail, Super Admin: Clear All button
- **Super Admin Exclusive**: Room CRUD, Permanent delete, Clear audit logs, Admin CRUD (create/modify/delete custom admins)

## API Endpoints
- `POST /api/auth/login` — Login (returns role)
- `GET /api/auth/me` — Current admin (returns role)
- `POST /api/registrations` — Public registration
- `GET /api/registrations/count` — Public count
- `GET /api/admin/dashboard` — Dashboard (daily_schedule, arrival_summary)
- `GET /api/admin/registrations` — List (filterable: arrival_from/to, departure_from/to, arrival_status)
- `GET /api/admin/registrations/check-duplicate` — Duplicate check
- `GET /api/admin/registrations/{id}` — Detail
- `PUT /api/admin/registrations/{id}` — Update (with admin_notes)
- `PUT /api/admin/registrations/{id}/status` — Status change
- `PUT /api/admin/registrations/{id}/management` — Arrival status, room, notes
- `POST /api/admin/registrations/manual` — Manual entry (auto-approved)
- `POST /api/admin/registrations/bulk-action` — Bulk actions
- `DELETE /api/admin/registrations/{id}/permanent` — Permanent delete (superadmin)
- `GET /api/admin/rooms` — List rooms
- `POST /api/admin/rooms` — Create (superadmin)
- `POST /api/admin/rooms/bulk` — Bulk create (superadmin)
- `DELETE /api/admin/rooms/{code}` — Delete (superadmin)
- `PUT /api/admin/rooms/{code}/assign` — Assign guest
- `PUT /api/admin/rooms/{code}/unassign` — Unassign
- `PUT /api/admin/rooms/{code}/shift` — Shift occupant
- `GET /api/admin/audit-logs` — Audit log
- `DELETE /api/admin/audit-logs` — Clear (superadmin)
- `GET/POST/PUT/DELETE /api/admin/admins` — Admin CRUD (superadmin)
- `GET /api/admin/export-csv` — CSV export
- `GET /api/admin/export-pdf` — PDF export

## DB Collections
- `registrations`: full_name, mobile, additional_phone, email, address, arrival_date, departure_date, num_people, attendees[], approval_status, entry_type, arrival_status, room_assignment, admin_notes, approved_by, created_by, last_updated_by, deleted_by
- `rooms`: room_code (unique), capacity, ac_type, status, occupant_id, occupant_name, notes, created_by
- `audit_logs`: action_type, target_type, target_id, target_name, details, performed_by, performed_at
- `custom_admins`: username, password, name, city, role, created_at

## Remaining / Future Tasks
- P1: Bulk Guest Messaging - SMS/WhatsApp integration
- P2: Add "Add to Calendar" button
- P2: QR Code integration for physical invitation mapping
