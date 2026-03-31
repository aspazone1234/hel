# PRD - Shrimad Bhagavat Katha Mahotsav 2026

## Original Problem Statement
Design a premium devotional event website for "Shrimad Bhagavat Katha Mahotsav 2026" in Pushkar. Sacred temple aesthetic with Krishna's divine presence. Features: multi-step registration form, admin approval panel, bilingual (Hindi + English), golden door entry animation, flute sound toggle, subtle animations.

## Architecture
- **Frontend**: React.js + Tailwind CSS + Shadcn UI (port 3000)
- **Backend**: FastAPI + Motor (async MongoDB) (port 8001)
- **Database**: MongoDB
- **Auth**: Bearer token (JWT), 4 hardcoded admin credentials in server.py
- **PDF Generation**: fpdf2

## 15-Point FINAL SPEC — ALL COMPLETE (31 Mar 2026)

### 1. Announcement Strip - Register Now button removed, correct text
### 2. Header - "Shrimad Bhagavat 2026" (no "Katha")
### 3. Quote Section - Parchment aesthetic
### 4. Loving Memory - "Alka Jiji", "Lalana"
### 5. About Section - Merged paragraphs
### 6. Section Rename - "Other Programs"
### 7. Location - Correct map & address
### 8. Organizing Family - Correct order
### 9. Registration - No "Limited accommodation"
### 10. Language Toggle - Bilingual
### 11. Zigzag Colors - Alternating sections
### 12. Registration Form - Dynamic attendees, arrival/departure dates
### 13. Admin Dashboard V3 - Multi-page system (COMPLETE)
### 14. Admin Auth - Username/password, 4 accounts
### 15. Page Structure - Correct section order

## V3 Admin Dashboard — COMPLETE (01 Apr 2026)

### Dashboard View
- Smart alerts (pending forms, missing management, low room availability)
- Summary cards (Approved Families, Total People, Arrivals/Departures range)
- Arrival Summary (Families/People Arrived, Not Coming, Rooms Available)
- Quick stats (Pending, Recycle Bin, Rejected) with click-to-navigate

### Guest List View
- Paginated table of approved guests with search, date filters
- Checkbox-based bulk actions (Mark Arrived, Mark Not Coming, Delete Selected)
- Management column with Add/Edit links for room assignment and arrival status
- Add Manual Entry, Export PDF, Export CSV buttons
- Entry type badges (Form/Manual)

### Master Control View
- **Approve Forms Tab**: Pending registrations with Accept/Reject, Bulk Approve/Reject, Action Logs sub-tab
- **Room Management Tab**: Grid/Table toggle, Add Room, Bulk Add Rooms, Export PDF, Unassign/Delete rooms

### Recycle Bin View
- Deleted entries with Restore button only (NO permanent deletion allowed)
- Shows Deleted By and Last Changed By metadata

### Audit Log View
- Paginated, complete record of all admin actions
- Color-coded action types (approve, reject, delete, restore, room ops, manual entry)

### Shared Dialogs
- **Guest Detail Dialog**: Full registration + management + permanent metadata
- **Management Edit Dialog**: Arrival status, room assignment (with conflict detection), admin notes
- **Manual Entry Dialog**: Full form with duplicate mobile detection, management details, room assignment

## API Endpoints
- `POST /api/auth/login` — Admin login
- `GET /api/auth/me` — Current admin
- `POST /api/registrations` — Public registration
- `GET /api/registrations/count` — Public count
- `GET /api/admin/registrations/check-duplicate` — Duplicate check
- `GET /api/admin/registrations` — List (paginated, filterable)
- `GET /api/admin/registrations/{id}` — Detail
- `PUT /api/admin/registrations/{id}` — Update general
- `PUT /api/admin/registrations/{id}/status` — Status change
- `PUT /api/admin/registrations/{id}/management` — Management update
- `POST /api/admin/registrations/manual` — Manual entry
- `POST /api/admin/registrations/bulk-action` — Bulk actions
- `GET /api/admin/rooms` — List rooms
- `POST /api/admin/rooms` — Create room
- `POST /api/admin/rooms/bulk` — Bulk create rooms
- `DELETE /api/admin/rooms/{code}` — Delete room
- `PUT /api/admin/rooms/{code}/assign` — Assign room
- `PUT /api/admin/rooms/{code}/unassign` — Unassign room
- `GET /api/admin/dashboard` — Dashboard stats
- `GET /api/admin/audit-logs` — Audit log (paginated)
- `GET /api/admin/export-csv` — CSV export (approved only)
- `GET /api/admin/export-pdf` — PDF export (guestlist or rooms)

## Admin Credentials
- arunpanchariya / arunlondon123
- ashokpanchariya / ashokahmedabad123
- satishpanchariya / satishmumbai123
- basantmalpani / basantjaipur123

## DB Collections
- `registrations`: approval_status, entry_type, arrival_status, room_assignment, admin_notes, approved_by, created_by, last_updated_by, deleted_by, attendees array
- `rooms`: room_code (unique), capacity, ac_type, status, occupant_id, occupant_name, created_by
- `audit_logs`: action_type, target_type, target_id, target_name, details, performed_by, performed_at

## Remaining / Future Tasks
- P2: Add "Add to Calendar" button
- P2: QR Code integration for physical invitation mapping
