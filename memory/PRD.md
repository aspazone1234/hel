# Product Requirements Document (PRD)

## Original Problem Statement
Import the entire repo `https://github.com/aspazone1234/hel/tree/new7` and make it functional.

## Stack
- Frontend: React 19 + CRA/Craco + Tailwind + shadcn/ui (port 3000)
- Backend: FastAPI monolith `/app/backend/server.py` (~6000 LOC, port 8001)
- Database: MongoDB (`test_database`, 25 collections)
- Auth: JWT HS256
- WhatsApp: Meta Cloud API v21.0 + encrypted Flows (RSA-2048 + AES-GCM)

## Core App
Shrimad Bhagavat Katha Mahotsav 2026 / Swayamsevak Portal — guest registration, room
assignments, attendance tracking, QR check-in, WhatsApp messaging (campaigns / auto-response /
flows), Help Centre tickets with SLA escalation, swayamsevak (volunteer) coordination,
custom admin accounts, audit logs.

## What's been implemented (running log)

### 2026-04-26 — Repo import
- Cloned `aspazone1234/hel@new7` into `/app`, restored `.env`, installed pip + yarn deps,
  restored MongoDB dump (1222 docs / 25 collections), restarted supervisor.
- Smoke tests: `GET /api/` 200, login `superashwini/supersebhiupper123` → JWT, frontend
  `/` 200 (Hindi entry screen renders).

### 2026-04-26 — UX iteration (this session)
- **Family tree first-load** (`ReferenceTreePicker.jsx`): initial zoom forced to 0.32 (fully
  zoomed-out), scaleExtent.min lowered to 0.2. Added a tap-to-explore overlay
  (`data-testid="ref-tree-overlay"`) with mild backdrop-blur + zoom icon + Hindi/English
  copy. Clicking anywhere on the overlay fades it out (320 ms) and reveals the live tree.
- **Family tree node typography**: unified `.rd3-node-name` to `font-weight:500` + `stroke:none`
  across root/lineage/selected/muted — eliminates the bold + text-border look on non-leaf
  branches that the user complained about.
- **Reference picker — "From X" line removed**: removed the immediate-parent line from both
  the search results and the green selected-confirmation card. Lineage trajectory line
  (`A → B → C`) is preserved.
- **OTP GIF**: moved out of the WhatsApp-number-entry stage; now only shown on the OTP-code
  entry stage (mobile-only). Removed forced 1:1 aspectRatio — image now uses
  `h-auto w-full max-w-[320px] object-contain` so its natural aspect ratio is preserved.
- **Step 2 sticky nav** (`RegisterPage.js`): the Next/Previous block is `position: sticky;
  bottom: 0` only when `step === 2` (Reference Details), with white/blur background +
  top-shadow line. Other steps keep the original non-sticky layout.
- **Super-admin Reference Management redesigned** (`ReferencePersonManager.js`):
  full family-tree editor — indented rows, HTML5 drag-and-drop re-parenting (forbids cycles),
  inline rename (English + Hindi), add child / delete subtree, single batch save via
  `PUT /api/admin/reference-tree`. Right-side detail panel for the selected node manages
  rank + relation categories via the existing `PUT /api/admin/reference-persons/{id}` flow.
- **New backend endpoints**: `GET /api/admin/reference-tree`, `PUT /api/admin/reference-tree`
  (super-admin only). PUT validates structure (single root, unique ids, valid parents,
  non-empty names, no cycles), persists to `family_tree.json`, and re-syncs the
  `reference_persons` collection (upsert + delete-not-in-payload).
- Test report: `/app/test_reports/iteration_2.json` — 13/13 backend tests + frontend DOM
  + source review = all 6 user-requested changes verified.

## Credentials
See `/app/memory/test_credentials.md`.

## Pending / Backlog
- Optional polish: silence pre-existing nested-<button> hydration warning in
  `AdminDashboard.js` `RefRelationStatsBlock` (lines ~519/527). Not introduced this iteration.
- Optional polish: in `ReferencePersonManager` `Discard` handler, ensure the dirty flag is
  cleared if user revert is triggered programmatically (current behaviour relies on
  `window.confirm`).
- WhatsApp Flow encryption private key (`/app/backend/keys/flow_private.pem`) is NOT in
  the repo — live flow encryption/decryption is non-functional until the user provides
  the key or sets `WA_FLOW_PRIVATE_KEY_B64`.

## Notes
- Login is via `username` field (not email).
- Backend has 9 pre-existing ruff lint errors (unused vars, bare except) — not introduced
  this iteration.
