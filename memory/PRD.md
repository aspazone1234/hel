# Swamsevak Portal (V2) - Project Memory

## Original Problem Statement
> https://github.com/aspazone1234/hel/tree/new — add this github repo entirely to the project

## Action Taken
- Cloned `new` branch of `aspazone1234/hel` into `/app` (entire codebase replaced).
- Preserved existing `/app/backend/.env` and `/app/frontend/.env` protected variables (MONGO_URL, DB_NAME, REACT_APP_BACKEND_URL).
- Installed backend Python dependencies from `backend/requirements.txt`.
- Installed frontend dependencies via `yarn install` (CRA + CRACO setup).
- Restarted both services via supervisor — both running successfully.

## Tech Stack
- **Backend**: FastAPI (server.py ~200KB), MongoDB, emergentintegrations, fpdf2, qrcode, stripe, boto3, pandas, openpyxl, google-genai
- **Frontend**: React 19, react-router-dom v7, CRACO, TailwindCSS, Radix UI, sonner, recharts, html5-qrcode, lucide-react
- **Pages**: HomePage, RegisterPage, AdminPage, ThankYouPage, MyRegistrationPage, PrivacyPolicyPage
- **i18n**: LanguageContext (Hindi default)

## Verified Status
- Backend: HTTP 200 on `/api/`, startup seeded 6 relation categories + 10 message templates, admin account `superashwini` present.
- Frontend: HTTP 200, renders Hindi "प्रवेश करें" hero with dark/gold palette.

## Next Action Items
- Await user's next request (feature additions, bug fixes, or enhancements).

## Future/Backlog
- (To be populated based on user feedback.)
