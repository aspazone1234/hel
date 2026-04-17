# Shrimad Bhagavat Katha Mahotsav 2026 — Swamsevak Portal (PRD)

## Original Problem Statement
Import the GitHub repository `aspazone1234/hel` (branch `new2`) completely into `/app`, replacing existing scaffold, install all dependencies, and get the app running end-to-end.

## Architecture
- **Backend**: FastAPI (single monolith: `/app/backend/server.py`, ~4500 lines)
- **Frontend**: React 19 + CRA via CRACO, Tailwind + shadcn/ui, React Router v7
- **DB**: MongoDB (via `motor` async driver), DB name `test_database`
- **Auth**: JWT (HS256); super admin: `superashwini` / `supersebhiupper123`
- **Event window**: 2026-05-28 → 2026-06-03

## What's Been Implemented (already in repo, now running)
- Date: 2026-04-17 — Repo imported from `aspazone1234/hel@new2`, deps installed, services running
- Full Swamsevak portal: Home page, Registration flow, Admin dashboard, Address selector, Event sections, Registrations CRUD, Thank-you page
- Admin features: Audit log, Dialogs, Arrived Guest List, Room Management, Custom Fields Manager, QR Scanner, Notification Management, Help Centre, Reference Person Manager
- Backend seeds on startup: 6 relation categories, 10 message templates, 15 ticket categories
- WhatsApp integration scaffolding (OTP send, webhook verify, conversations bundle send, Auto Response engine, WA Flow encryption) — requires Meta credentials to go live
- Static file serving (`/app/backend/static/uploads/*`, `e-nimantran.pdf`)

## Core Requirements (static)
- Registration workflow for attendees (Shraddhalus) of the Katha event
- Admin portal for Swamsevaks (volunteers) and Super Admin
- Arrival/room management, QR check-in
- WhatsApp-based notifications, OTP, Help Centre with flow-driven ticketing

## Environment Setup Done
- Backend `.env`: `MONGO_URL`, `DB_NAME`, `CORS_ORIGINS`, `JWT_SECRET`
- Frontend `.env`: `REACT_APP_BACKEND_URL` (preserved)
- WA/APP_URL env keys are optional (server uses `.get()` with fallbacks); add to enable WhatsApp features

## Backlog / Not Started (per HANDOFF.md)
- P0: None (app is functional)
- P1: Session 4B — HC system messages, POC WA notify on auto-assign, Keyword→Template-with-Flow-CTA
- P2: Session 5 — Split System Messages into User vs Admin/Swayamsevak triggers with curated defaults

## Next Tasks
- User to validate app in preview; WhatsApp credentials required to continue WA sessions 4B/5
