# Calculate GPA Plus

**Calculate GPA Plus** is a fast, responsive web application for calculating semester GPA and overall Cumulative GPA (CGPA).

## Features
- **Normal GPA Calculator**: Instant standalone calculator without account creation.
- **Shared GPA Profiles**: Create reusable academic profiles with fixed course modules & credit values.
- **Academic Honors Classification**: Automatically computes First Class, Second Class Upper, Second Class Lower, and Pass standings.
- **Minimalist PDF Transcript Export**: Clean one-page academic results export.
- **Supabase Cloud Database**: Permanent online storage for public shared profiles.

## Developer & Creator
Created by **K.Kabeesan**
- Instagram: [@K_KABEESAN](https://www.instagram.com/K_KABEESAN)
- Facebook: [K.Kabeesan](https://www.facebook.com/share/1CTH7Bg4ri/)
- LinkedIn: [K.Kabeesan](https://www.linkedin.com/in/k-kabeesan-9b1917394/)

## Tech Stack
- **Frontend**: React 19, Vite, TypeScript, Tailwind CSS, Lucide Icons, jsPDF
- **Database & Cloud**: Supabase PostgreSQL (`@supabase/supabase-js`)
- **Local Fallback**: Node.js Express API + SQLite (`better-sqlite3`)

## License
MIT License © 2026 Calculate GPA Plus - Created by K.Kabeesan.


## Local development

Install Node.js and run:

```sh
npm install
npm run dev
```

The frontend runs on port 5173 and proxies API requests to Express on port 5000.
Without Supabase configuration, the local Express server uses SQLite. Shared
profile creation, editing, deletion, and passcode verification require a working
API. Browser storage is only a read cache; failed writes are reported as errors.
Static-only hosting needs a separately hosted API configured with `VITE_API_URL`.

Run `npm test` for calculation and regression checks, and `npm run build` for the production build.
The regression suite mocks cloud requests and does not modify the live database.

## Supabase setup and upgrade

1. Run the entire [supabase_schema.sql](supabase_schema.sql) in the Supabase SQL Editor.
   The script works for fresh databases and the existing project schema. It keeps
   existing profiles, removes the old unrestricted policies, and installs the
   `save_gpa_profile` transactional function. Run it before deploying the updated server.
2. Configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the server environment
   (for example, Vercel project environment variables), then redeploy the app.
   The service-role key must never use a `VITE_` or `NEXT_PUBLIC_` prefix or be included
   in browser code. Anonymous/publishable keys are no longer used for server writes.
3. Verify that creating, editing, and deleting a test profile works, and that an
   incorrect owner passcode is rejected.

Cloud saves replace the profile and its subjects in a single database transaction.
Any failure rolls back the entire save. A configured cloud backend is authoritative
for writes: database errors are not converted into successful local saves.
Serverless deployments require Supabase for profile creation.

The SQL migration requires access to your Supabase project and is not applied by
`npm run build` or `npm test`.
