# PRD - Shrimad Bhagavat Katha Mahotsav 2026

## Original Problem Statement
Design a premium devotional event website for "Shrimad Bhagavat Katha Mahotsav 2026" in Pushkar. Sacred temple aesthetic with Krishna's divine presence. Features: multi-step registration form, admin approval panel, bilingual (Hindi + English), golden door entry animation, flute sound toggle, subtle animations.

## Architecture
- **Frontend**: React.js + Tailwind CSS + Shadcn UI (port 3000)
- **Backend**: FastAPI + Motor (async MongoDB) (port 8001)
- **Database**: MongoDB
- **Auth**: Bearer token (JWT), 4 hardcoded admin credentials in server.py

## 15-Point FINAL SPEC — ALL COMPLETE (31 Mar 2026)

### 1. Announcement Strip ✅
- Register Now button removed
- Text: "Please Register Your Attendance • Help us prepare accommodation..."

### 2. Header ✅
- Logo: "Shrimad Bhagavat 2026" (no "Katha")

### 3. Quote Section ✅
- Ancient parchment aesthetic with textured brown bg, golden corner accents, large quotation marks

### 4. Loving Memory ✅
- "Alka Jiji" (not Ji), "Lalana/लालाणा" (not Lalona)

### 5. About Section ✅
- First 3 paragraphs merged into one, 4th (invite) separate in orange italic

### 6. Section Rename ✅
- "Other Programs" / "अन्य कार्यक्रम"

### 7. Location ✅
- Map: https://maps.app.goo.gl/j7XgU5MSCiScR21w6
- Address: "Near Nayi Bus Stand"

### 8. Organizing Family ✅
- Order: Title → 3 organizers → Family description (Panchariya parivar history) → Timeline (1996-2026) → Contact block (Ashok)

### 9. Registration ✅
- No "Limited accommodation" text
- Audio: flute.opus with mp3 fallback

### 10. Language Toggle ✅
- "Change Language / भाषा बदलें" sublabel on form + sticky toggle

### 11. Zigzag Colors ✅
- Alternating Navy/Peach backgrounds across all sections

### 12. Registration Form ✅
- Dynamic attendee fields from num_people, required arrival/departure, no accommodation, Thank You page

### 13. Admin Dashboard ✅
- 3 tabs: Approval Center, Guest List, Recycle Bin + Activity Log

### 14. Admin Auth ✅
- Username/password login, 4 hardcoded accounts

### 15. Page Structure ✅
- Ends: Family(+contact) → Registration CTA → Footer

## API Endpoints
- `POST /api/auth/login` — Admin login (username/password)
- `GET /api/auth/me` — Current admin
- `POST /api/registrations` — Create registration
- `GET /api/registrations/count` — Public count
- `GET /api/admin/registrations` — List all (auth, optional ?status=)
- `PUT /api/admin/registrations/{id}/status` — Approve/Delete/Restore
- `GET /api/admin/activity-logs` — Activity log
- `GET /api/admin/summary` — Counts by status
- `GET /api/admin/export-csv` — CSV export (approved only)

## Admin Credentials
- arunpanchariya / arunlondon123
- ashokpanchariya / ashokahmedabad123
- satishpanchariya / satishmumbai123
- basantmalpani / basantjaipur123

## Remaining / Future Tasks
- P2: Add "Add to Calendar" button
- P2: QR Code integration for physical invitation mapping
