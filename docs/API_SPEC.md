# API Spec (FastAPI) — Draft

Base URL: `/api/v1`

## Auth

### POST `/auth/register`

- **Body**: `{ name, email, password, role, company_name? }`
- **Returns**: `{ user, access_token, refresh_token }`

### POST `/auth/login`

- **Body**: `{ email, password }`
- **Returns**: `{ user, access_token, refresh_token }`

### POST `/auth/refresh`

- **Body**: `{ refresh_token }`
- **Returns**: `{ access_token }`

### POST `/auth/logout`

- **Returns**: 204

## Candidate: Resume

### GET `/me`

- **Returns**: current user profile

### GET `/resumes/me`

- **Returns**: list of candidate resumes (or single “primary” resume)

### POST `/resumes`

- **Body**: normalized resume JSON (see `docs/DB_SCHEMA.md`)
- **Returns**: created resume

### PUT `/resumes/{resume_id}`

- **Body**: normalized resume JSON
- **Returns**: updated resume

### GET `/resumes/{resume_id}`

- **Returns**: resume JSON

### POST `/resumes/{resume_id}/prefill-from-prompt`

- **Body**: `{ prompt: string }`
- **Returns**: `{ extracted_fields, suggested_resume_patch, provider_metadata }`

## Templates

### GET `/templates`

- **Returns**: list of templates (id, name, preview image url, tags)

### GET `/templates/{template_id}`

- **Returns**: template metadata (and optional constraints)

## Recruiter: Bulk Upload + Parsing

### POST `/recruiter/uploads/batches`

- **Body**: `multipart/form-data` with files[] (PDF)
- **Returns**: `{ batch_id, total_files }`

### GET `/recruiter/uploads/batches/{batch_id}`

- **Returns**: status summary:
  - total, parsed_ok, parsed_failed, pending

### GET `/recruiter/uploads/batches/{batch_id}/items`

- **Returns**: per-file status + extracted preview fields

## Recruiter: Screening

### POST `/recruiter/screening/runs`

- **Body**: `{ batch_id, instruction_prompt, filters? }`
- **Returns**: `{ run_id, status }`

### GET `/recruiter/screening/runs/{run_id}`

- **Returns**:
  - status (pending/running/done/failed)
  - results array:
    - candidate reference (upload item id)
    - match score
    - extracted structured profile
    - rationale/explanation

## Recruiter: Shortlist

### POST `/recruiter/shortlists`

- **Body**: `{ run_id, items: [upload_item_id...] }`
- **Returns**: shortlist record

### GET `/recruiter/shortlists`

- **Returns**: all shortlists

### GET `/recruiter/shortlists/{shortlist_id}`

- **Returns**: shortlist details + items

## Notes / open points

- Decide file storage:
  - local `uploads/` (prototype) vs S3/Cloudinary (production)
- Decide background jobs:
  - `BackgroundTasks` (prototype) vs Celery/RQ/Arq (production)
- Decide AI provider + model:
  - Gemini vs OpenAI; store provider metadata per run

