# AI-Powered Recruitment System & Multi-Template CV Generator

> Final Year Project (Session 2022–2026) — BSCS
> Department of Computer Science, Government Graduate College Jhang

A full-stack recruitment platform that lets candidates build resumes from
structured fields (with optional AI prefill) and lets recruiters post jobs,
review applicants, and rank them with an LLM that scores each resume against
the job description. Top candidates can be saved into shortlists and exported
as CSV.

---

## Table of Contents

1. [Tech stack](#tech-stack)
2. [Features](#features)
3. [Prerequisites](#prerequisites)
4. [Quick start](#quick-start)
5. [Backend setup](#backend-setup)
6. [Frontend setup](#frontend-setup)
7. [Demo flow](#demo-flow)
8. [Project structure](#project-structure)
9. [Environment variables](#environment-variables)
10. [API endpoints](#api-endpoints)
11. [Troubleshooting](#troubleshooting)

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Frontend | React + TypeScript + Vite + Tailwind CSS + shadcn/ui |
| Backend | FastAPI (Python 3.13) |
| Database | PostgreSQL 16 via SQLAlchemy 2 (sync) + psycopg2 |
| Auth | JWT (access + refresh) with `bcrypt` password hashing |
| AI | Google Gemini via the official `google-genai` SDK (structured output with Pydantic schemas) |
| PDF parsing | `pypdf` |
| PDF export | Browser native print-to-PDF (A4 print CSS) |

---

## Features

### Candidate

- Register / log in with role `candidate`.
- Build a resume with structured sections: personal info, summary, education,
  experience, projects, skills, certifications.
- "Load Sample" button to populate the editor with realistic example data.
- Live preview in 4 templates (**Modern**, **Classic**, **Tech**, **Minimal**).
- Browser-based PDF export (A4 print CSS, page-break safe).
- Prompt-to-prefill: type a paragraph about yourself → Gemini returns a
  suggested resume patch you can review and apply.
- Browse jobs, apply with one click. Optionally upload a different PDF resume
  per application — backend extracts the text and AI-parses it into a profile.
- "My Applications" tab tracks status (Pending / Shortlisted / Rejected).

### Recruiter

- Post jobs (title, description, location, salary, experience, type).
- See applicants per job with their structured profile, cover letter, and
  external links (LinkedIn / GitHub / Website).
- **Bulk PDF upload** flow — drop a stack of CVs and the backend parses them
  into structured profiles in the background.
- **Screen Applicants by Job** — Gemini scores every applicant's resume
  against the job description and returns a ranked list with score, rationale,
  and matched skills.
- **Screen by PDF Batch** — same scoring, but on the recruiter-uploaded PDFs.
- Save selected candidates to a Shortlist (auto-flips application status to
  "Shortlisted" so the candidate sees it).
- Export shortlist as CSV (name, email, phone, score, skills, rationale).
- Past Screening Runs panel — every screening you've run is listed and
  one-clickable to load.

### Security

- Role-based access (candidate routes vs recruiter routes).
- DB-level ownership checks on every mutation.
- File upload validates PDF type and 10 MB size cap.
- AI errors don't crash the app; failures surface in the UI.

---

## Prerequisites

- **Python** 3.13 (3.11+ also works)
- **Node.js** 18+ and **npm**
- **PostgreSQL** 16 — local install OR Docker
- A **Google Gemini API key** ([Get one here](https://aistudio.google.com/app/apikey))

---

## Quick start

```bash
# 1. Clone
git clone <repo-url>
cd talent-path-seek

# 2. Start Postgres (Docker example)
docker run --name talent-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=talent_path_seek -p 5432:5432 -d postgres:16

# 3. Backend
cd backend
python -m venv venv
.\venv\Scripts\activate            # Windows PowerShell
# source venv/bin/activate         # macOS / Linux
pip install -r requirements.txt
copy .env.example .env             # cp on macOS/Linux
# Edit backend/.env: set DATABASE_URL, GEMINI_API_KEY
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# 4. Frontend (new terminal)
cd ..                               # back to repo root
npm install
copy .env.example .env              # cp on macOS/Linux
npm run dev
```

Open <http://localhost:5173>. Register a candidate to start.

---

## Backend setup

### 1. PostgreSQL

Either run Postgres locally or via Docker:

```bash
docker run --name talent-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=talent_path_seek \
  -p 5432:5432 \
  -d postgres:16
```

The backend creates all tables automatically on startup
(`Base.metadata.create_all`) — no separate migration step is needed for the
FYP prototype.

### 2. Python environment

```bash
cd backend
python -m venv venv
.\venv\Scripts\activate          # Windows
# source venv/bin/activate       # macOS / Linux
pip install -r requirements.txt
```

### 3. Environment file

```bash
copy .env.example .env           # Windows
# cp .env.example .env           # macOS / Linux
```

Edit `backend/.env` and set at minimum:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/talent_path_seek
JWT_SECRET_KEY=please-rotate-this-to-a-long-random-string
GEMINI_API_KEY=your-real-gemini-key
GEMINI_MODEL=gemini-2.5-flash
```

> ⚠️ `backend/.env` is gitignored. **Never commit it.** If you accidentally
> push real secrets, rotate the database password and the Gemini key
> immediately.

### 4. Seed resume templates (optional)

```bash
python -m scripts.seed_templates
```

Inserts the four template keys (`modern`, `classic`, `tech`, `minimal`).

### 5. Run the server

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

- API base: <http://127.0.0.1:8000/api/v1>
- Auto-generated docs: <http://127.0.0.1:8000/docs>

### 6. Run tests

```bash
pytest
```

Covers auth, resume CRUD, upload validation, and screening (with mocked AI).

---

## Frontend setup

```bash
cd talent-path-seek          # repo root
npm install
copy .env.example .env       # Windows
# cp .env.example .env       # macOS / Linux
```

Edit `.env`:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Run the dev server:

```bash
npm run dev
```

Vite serves at <http://localhost:5173>. Hot reload is enabled.

Build for production:

```bash
npm run build
npm run preview
```

---

## Demo flow

A complete end-to-end run, suitable for a viva demonstration:

1. **Register a candidate** at `/register`.
2. Open **Resume Builder** → click **Load Sample** → tweak a couple of fields → **Save Resume**.
3. Switch through templates in the live preview → **Download PDF**.
4. Open **Browse Jobs** (a recruiter must have posted at least one — see steps 5–6 in another browser).
5. **Register a recruiter** in a different browser / incognito tab.
6. **Post Job** with a meaningful description (e.g. "React + FastAPI engineer with PostgreSQL experience").
7. Back as the candidate, **Apply** to that job. Optionally upload a PDF resume in the apply dialog.
8. As the recruiter, open the job → click **Screen Applicants** → leave the instruction prompt empty (the JD drives the match) → **Run Screening**.
9. Tick top candidates → **Save to Shortlist**.
10. As the candidate again, refresh **My Applications** — status now shows **Shortlisted**.
11. As the recruiter, open **Shortlists** → **Export CSV**.

Optional: also try the recruiter PDF bulk-upload flow (`/recruiter/uploads`)
to screen CVs that came in by email rather than via the portal.

---

## Project structure

```
talent-path-seek/
├── backend/
│   ├── app/
│   │   ├── api/v1/             # FastAPI routers (auth, resumes, jobs, screening, …)
│   │   ├── core/               # config + JWT/bcrypt helpers
│   │   ├── db/                 # SQLAlchemy engine, session, ORM models, migrations
│   │   ├── repositories/       # DB access layer (one file per aggregate)
│   │   ├── schemas/            # Pydantic request/response models
│   │   ├── services/           # Business logic (auth, resumes, uploads, screening, …)
│   │   └── main.py             # FastAPI app factory + lifespan
│   ├── scripts/seed_templates.py
│   ├── tests/                  # pytest suite
│   ├── uploads/                # local PDF storage (gitignored)
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md               # backend-specific quick reference
├── src/
│   ├── components/
│   │   ├── resume/             # 4 templates + ResumePreview + TemplateSelector
│   │   ├── ui/                 # shadcn/ui primitives
│   │   ├── DashboardLayout.tsx
│   │   └── NavLink.tsx
│   ├── contexts/               # AuthContext, JobContext
│   ├── lib/api.ts              # centralized fetch wrapper + token refresh
│   ├── pages/                  # one page per route
│   ├── App.tsx                 # routes + role-based guards
│   └── main.tsx
├── docs/                       # FYP design docs (REQUIREMENTS, ARCHITECTURE, …)
├── public/
├── package.json
├── vite.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── .env.example                # frontend env template
└── README.md                   # this file
```

---

## Environment variables

### Backend (`backend/.env`)

| Variable | Default | Purpose |
| --- | --- | --- |
| `ENV` | `local` | Free-text environment label |
| `DATABASE_URL` | `postgresql://postgres:postgres@localhost:5432/talent_path_seek` | Postgres connection string. `postgresql+asyncpg://…` is auto-rewritten to psycopg2. |
| `DB_ECHO` | `false` | Set `true` to log every SQL statement |
| `JWT_SECRET_KEY` | `change-me` | **Must rotate before deploying.** |
| `JWT_ALGORITHM` | `HS256` | |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | `30` | |
| `REFRESH_TOKEN_EXPIRE_DAYS` | `7` | |
| `CORS_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated allow-list |
| `AI_PROVIDER` | `gemini` | Currently only `gemini` is implemented |
| `GEMINI_API_KEY` | _(empty)_ | Required for AI features. App still runs without it; AI calls return a clean error. |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Override if Google retires the default (e.g. `gemini-2.0-flash`) |

### Frontend (`.env`)

| Variable | Default | Purpose |
| --- | --- | --- |
| `VITE_API_URL` | `http://127.0.0.1:8000` | Backend base URL |

---

## API endpoints

All paths prefixed with `/api/v1`. Auth-required endpoints expect
`Authorization: Bearer <access_token>`.

### Auth

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/auth/register` | Create user (candidate or recruiter) |
| `POST` | `/auth/login` | Issue access + refresh tokens |
| `POST` | `/auth/refresh` | Rotate tokens |
| `POST` | `/auth/logout` | Invalidate refresh token |
| `GET` | `/me` | Current user |

### Resumes (candidate)

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/resumes/me` | List my resumes |
| `POST` | `/resumes` | Create |
| `GET` | `/resumes/{id}` | Read (owner only) |
| `PUT` | `/resumes/{id}` | Update (owner only) |
| `DELETE` | `/resumes/{id}` | Delete (owner only) |
| `POST` | `/resumes/{id}/prefill-from-prompt` | AI suggestion patch |

### Jobs (public + recruiter-owned)

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/jobs` | Public job board |
| `GET` | `/jobs/{id}` | Public job detail |
| `GET` | `/recruiter/jobs` | My posted jobs (recruiter) |
| `POST` | `/recruiter/jobs` | Post a job |
| `PUT` | `/recruiter/jobs/{id}` | Edit (owner) |
| `DELETE` | `/recruiter/jobs/{id}` | Delete (owner) |

### Applications

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/jobs/{id}/apply` | **Multipart**: optional PDF + cover_letter + resume_id (candidate) |
| `GET` | `/applications/me` | My applications (candidate) |
| `GET` | `/recruiter/jobs/{id}/applications` | List applicants for a job (owner) |
| `PUT` | `/recruiter/applications/{id}/status` | Set Pending / Shortlisted / Rejected |

### Recruiter PDF uploads

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/recruiter/uploads/batches` | Multipart upload N PDFs |
| `GET` | `/recruiter/uploads/batches/{id}` | Batch status |
| `GET` | `/recruiter/uploads/batches/{id}/items` | Per-file parse status |
| `POST` | `/recruiter/uploads/items/{id}/reparse` | Re-run AI parse on one item |

### Screening

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/recruiter/screening/runs` | Create a run (`{batch_id OR job_id, instruction_prompt, filters?}`) |
| `GET` | `/recruiter/screening/runs` | All my past runs |
| `GET` | `/recruiter/screening/runs/{id}` | Run detail + ranked candidates |

### Shortlists

| Method | Path | Purpose |
| --- | --- | --- |
| `POST` | `/recruiter/shortlists` | Create from a screening run |
| `GET` | `/recruiter/shortlists` | List mine |
| `GET` | `/recruiter/shortlists/{id}` | Detail + items |
| `DELETE` | `/recruiter/shortlists/{id}/items/{itemId}` | Remove one item |
| `GET` | `/recruiter/shortlists/{id}/export-csv` | CSV download |

---

## Troubleshooting

### `psycopg2.errors.UndefinedColumn` on startup

You have an older DB schema. The backend ships a lightweight on-startup
migration in [backend/app/db/postgres.py](backend/app/db/postgres.py) that
patches in missing columns. If you still hit issues, drop the tables and
restart — `create_all` will rebuild them:

```bash
docker exec -it talent-postgres psql -U postgres -d talent_path_seek -c \
  "DROP TABLE IF EXISTS shortlist_items, shortlists, screening_results, screening_runs, parsed_profiles, upload_items, upload_batches, job_applications, jobs, resumes, resume_templates, users CASCADE;"
```

### `pymongo.errors.InvalidURI`

You're on the old MongoDB version. The current build uses PostgreSQL —
update `backend/.env` to use `DATABASE_URL=postgresql://…` and reinstall:

```bash
pip install -r requirements.txt
```

### `Gemini request failed (404)` / `models/<x> is not found`

Google retired the default model. Pick a current one and set
`GEMINI_MODEL` in `backend/.env`:

```bash
curl "https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_KEY"
```

### `password cannot be longer than 72 bytes`

You upgraded an older clone. Pull the latest `app/core/security.py` —
passlib was replaced with direct `bcrypt` calls and the 72-byte limit is now
handled transparently.

### Form data error on upload

```
Form data requires "python-multipart" to be installed.
```

```bash
pip install python-multipart   # already in requirements.txt
```

### Microsoft Visual C++ Build Tools error

You're trying to build a wheel from source. The pinned
`psycopg2-binary==2.9.10` ships prebuilt cp313 wheels, so a plain
`pip install -r requirements.txt` should not need a C compiler.

### Frontend can't reach the API

- Make sure `uvicorn` is running on port 8000.
- Check `VITE_API_URL` in the frontend `.env`.
- Confirm `CORS_ORIGINS` in the backend `.env` includes your dev URL.

---

## Documentation

Design docs live under [docs/](docs/):

- [docs/REQUIREMENTS.md](docs/REQUIREMENTS.md) — SRS draft
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — system architecture
- [docs/API_SPEC.md](docs/API_SPEC.md) — endpoint contracts
- [docs/DB_SCHEMA.md](docs/DB_SCHEMA.md) — logical schema
- [docs/AI_PIPELINE.md](docs/AI_PIPELINE.md) — AI extraction / scoring pipeline
- [docs/ROADMAP_WHATS_LEFT.md](docs/ROADMAP_WHATS_LEFT.md) — phase status

---

## License

Project authored as a Final Year Project — free to read and adapt for academic use.
