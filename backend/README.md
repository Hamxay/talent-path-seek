# Backend (FastAPI + PostgreSQL)

This backend powers auth, resume management, recruiter CV upload/parsing, screening, and shortlist management.

Persistence: **PostgreSQL** via SQLAlchemy 2.x (synchronous) + psycopg2.

## Setup

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Run PostgreSQL (example using Docker):

```bash
docker run --name talent-postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=talent_path_seek -p 5432:5432 -d postgres:16
```

Start API (tables are auto-created on startup via `Base.metadata.create_all`):

```bash
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

## Environment

See `backend/.env.example` for all values.

> ⚠️ Never commit `backend/.env`. It is gitignored. Rotate any credentials
> that may have been pushed previously.

Important keys:

- `DATABASE_URL` — `postgresql://USER:PASSWORD@HOST:PORT/DBNAME`
- `JWT_SECRET_KEY`
- `AI_PROVIDER=gemini`
- `GEMINI_API_KEY=<your-key>`

## Seed resume template keys

```bash
python -m scripts.seed_templates
```

## API testing examples

### Register recruiter

```bash
curl.exe -X POST http://127.0.0.1:8000/api/v1/auth/register ^
  -H "Content-Type: application/json" ^
  -d "{\"name\":\"Recruiter\",\"email\":\"hr@test.com\",\"password\":\"secret123\",\"role\":\"recruiter\",\"company_name\":\"Acme\"}"
```

### Upload recruiter PDF batch

```bash
curl.exe -X POST "http://127.0.0.1:8000/api/v1/recruiter/uploads/batches" ^
  -H "Authorization: Bearer <ACCESS_TOKEN>" ^
  -F "files=@C:\cv1.pdf;type=application/pdf" ^
  -F "files=@C:\cv2.pdf;type=application/pdf"
```

### Create screening run

```bash
curl.exe -X POST "http://127.0.0.1:8000/api/v1/recruiter/screening/runs" ^
  -H "Authorization: Bearer <ACCESS_TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{\"batch_id\":\"<BATCH_ID>\",\"instruction_prompt\":\"Find React + FastAPI candidates\"}"
```

### Save shortlist from screening run

```bash
curl.exe -X POST "http://127.0.0.1:8000/api/v1/recruiter/shortlists" ^
  -H "Authorization: Bearer <ACCESS_TOKEN>" ^
  -H "Content-Type: application/json" ^
  -d "{\"run_id\":\"<RUN_ID>\",\"name\":\"Top Candidates\"}"
```

### Export shortlist CSV

```bash
curl.exe "http://127.0.0.1:8000/api/v1/recruiter/shortlists/<SHORTLIST_ID>/export-csv" ^
  -H "Authorization: Bearer <ACCESS_TOKEN>" -o shortlist.csv
```
