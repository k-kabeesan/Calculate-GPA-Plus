# Calculate GPA Plus

**Calculate GPA Plus** is a fast, responsive web application for calculating semester GPA and overall Cumulative GPA (CGPA).

## Features

- **Normal GPA Calculator:** Calculate a semester GPA instantly without creating an account. Credits and grade points use an editable grading scale.
- **Shared GPA Profiles:** Create reusable public academic profiles with fixed course modules and credit values across multiple semesters; calculate CGPA from them.
- **Academic Honors Classification:** Automatically show First Class (≥ 3.70), Second Class Upper (≥ 3.30), Second Class Lower (≥ 3.00), or Pass.
- **PDF Transcript Export:** Download a clean academic results report. Short reports fit on one page; longer reports continue onto additional pages.
- **Supabase Cloud Database:** Store public shared profiles online.
- Grade insights and a target GPA planner for future credits.
- Public profiles with university, faculty, optional department, degree, semesters, module codes, credits, and optional saved grades.
- Server verified owner passcodes for editing and deletion.
- Search by profile, university, faculty, department, degree, academic year, semester, or module text, with paging.
- Pasted text, PDF, and image module import with editable credits and grade review. Credits are never inferred from module codes.

The Auto Profile Generator extracts modules in the browser using PDF text extraction and local OCR. It does not require an AI API key.

## Developer & Creator

Created by **K.Kabeesan**.

- Instagram: [@K_KABEESAN](https://www.instagram.com/K_KABEESAN)
- Facebook: [K.Kabeesan](https://www.facebook.com/share/1CTH7Bg4ri/)
- LinkedIn: [K.Kabeesan](https://www.linkedin.com/in/k-kabeesan-9b1917394/)

## Tech Stack

- **Frontend:** React 19, Vite, TypeScript, CSS, Lucide Icons, jsPDF.
- **Database & Cloud:** Supabase PostgreSQL (`@supabase/supabase-js`).
- **API:** Node.js and Express, hosted as Vercel Functions in production. The standalone calculator works without database access.

## Architecture

`src/domain` contains pure GPA and import rules. `src/pages` and `src/components` render the React interface. `src/services/api.ts` calls the Express API. `server/validation.ts` validates writes; `server/security.ts` handles passcode hashes; `server/repository.ts` is the sole Supabase adapter. `server/app.ts` exposes a consistent JSON API. `api/` forwards Vercel functions to the same Express app.

Set the optional server-only `ADMIN_PASSCODE_HASH` environment variable to let an administrator edit or delete any profile with one passcode. Store only a scrypt hash, never the administrator passcode itself.

Supabase PostgreSQL is the only profile database. Profile saves call `save_gpa_profile`, which writes a profile and all child rows in one PostgreSQL transaction. The browser never receives the service role key or a passcode hash. A temporary calculator/import draft may be held in session storage until the user creates a profile.

## Local setup

Use a current Node.js version, then:

```sh
npm install
cp .env.example .env
npm run dev
```

On PowerShell, use `Copy-Item .env.example .env` and `npm.cmd` if `npm` script execution is disabled. The client runs at `http://localhost:5173`, with API proxying to Express on port 5000. The standalone calculator runs without Supabase; profile features require both environment variables below and the SQL migration.

| Variable | Scope | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | Server only | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | A Supabase secret key (`sb_secret_...`) or legacy `service_role` key for database access |
| `VITE_API_URL` | Browser, optional | API origin when hosted separately |
| `CLIENT_ORIGIN` | Server, optional | Allowed browser origin for a separately hosted frontend |

Keep `.env` out of version control. Set the first two variables in Vercel's server environment. Do not use `VITE_` for private credentials.

## Supabase migration

Run [supabase_schema.sql](supabase_schema.sql) in the Supabase SQL editor. On an existing project, back up the database first, then run the script to update existing tables and the transactional save function. It backfills searchable text for existing profiles and removes anonymous table permissions. Existing profiles with no stored owner hash remain readable but require administrator help to manage. Existing SHA-256 owner hashes remain verifiable; new profiles use scrypt.

## API

All endpoints respond with `{ success: true, data }` or `{ success: false, error: { code, message } }`.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/health` | Server and configuration status |
| GET | `/api/profiles` | Paged search |
| GET | `/api/profiles/filters` | Search filter options |
| GET | `/api/profiles/:id` | Public profile |
| POST | `/api/profiles` | Create with owner passcode |
| POST | `/api/profiles/:id/verify` | Verify owner passcode |
| PUT | `/api/profiles/:id` | Update with owner passcode |
| DELETE | `/api/profiles/:id` | Delete with owner passcode |

## Checks and deployment

```sh
npm test
npm run typecheck
npm run build
```

Tests cover GPA/CGPA, class thresholds, validation, import, PDF pagination, multi-profile search, API CRUD, incorrect passcodes, and a simulated failed write. These use an in-memory repository and do not prove a live Supabase deployment.

Deploy as a Vite project on Vercel with build command `npm run build` and output directory `dist`. [`vercel.json`](vercel.json) sends application routes to `index.html` while preserving `/api` routes. Apply the SQL migration and set server environment variables before deployment. Then run a real create, search, edit, wrong-passcode, delete, and PDF check in the deployed environment.

If the API reports `DATABASE_UNAVAILABLE`, configure the two Supabase variables and restart. If it reports `DATABASE_ERROR`, check that the SQL migration ran and inspect server logs for the underlying database error.

## License

MIT License © 2026 Calculate GPA Plus — Created by K.Kabeesan. See [LICENSE](LICENSE).
