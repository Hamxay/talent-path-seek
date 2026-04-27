# Architecture (React + FastAPI)

## High-level components

- **Frontend (React)**
  - Candidate portal:
    - Resume editor (forms + prompt-to-prefill)
    - Template preview + PDF download
  - Recruiter portal:
    - Bulk upload dashboard
    - Screening prompt UI + shortlist management
- **Backend (FastAPI)**
  - Auth (JWT, roles)
  - Resume CRUD and template metadata
  - File upload + storage pointers
  - CV text extraction + AI orchestration
  - Screening + ranking + shortlist endpoints
- **Database**
  - Users, resumes, templates, uploads, parsed profiles, screening runs, shortlists
- **AI Provider**
  - Gemini (or OpenAI) used for:
    - Resume parsing → structured profile
    - Instruction-based matching and scoring

## Data flow

### Candidate: build CV → export

1. Candidate logs in
2. Candidate edits resume sections (frontend)
3. Frontend saves resume JSON to FastAPI
4. Frontend renders selected template with resume JSON
5. PDF generated:
   - Option A (recommended first): **client-side** (DOM → PDF)
   - Option B (later): server-side rendering for consistent PDFs

### Recruiter: upload → parse → screen

1. Recruiter uploads many PDFs
2. FastAPI stores file + creates `upload_batch` record
3. Background workers extract text from each PDF
4. AI parses each CV into structured profile
5. Recruiter submits screening prompt
6. AI scores each profile (or hybrid: rules + AI)
7. FastAPI returns ranked results + explanation and lets recruiter shortlist

## Key design decisions

- **Async/background processing**: bulk parsing must not block HTTP requests.
  - Start with `BackgroundTasks` for a prototype
  - Move to a queue (Celery/RQ/Arq) when scaling
- **Store both raw and structured**:
  - Store raw extracted CV text
  - Store structured profile JSON (versioned)
  - Store AI prompt + response metadata for traceability
- **Schema-first contracts**:
  - Define request/response models (Pydantic) matching frontend types
- **Template strategy**:
  - Templates are React components fed by a normalized resume JSON model
  - Templates should be “print-safe” CSS (consistent margins/page breaks)

## Folder conventions (recommended)

This repo is currently frontend-only. Recommended structure when adding backend:

- `frontend/` (move current Vite app here) or keep at root
- `backend/`
  - `app/main.py`
  - `app/api/` (routers)
  - `app/models/` (DB models)
  - `app/schemas/` (Pydantic DTOs)
  - `app/services/` (AI, PDF text extraction, ranking)
  - `app/workers/` (background jobs)
  - `tests/`

