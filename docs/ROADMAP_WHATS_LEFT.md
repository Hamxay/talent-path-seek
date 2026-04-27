# Roadmap — Implementation Status

This document tracks the FYP build phase by phase. The system is now functionally complete for the FYP demo flow.

## Status by Phase

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | FastAPI project + JWT auth + Mongo | ✅ Done |
| 2 | Candidate resume CRUD | ✅ Done |
| 3 | Frontend ↔ real auth + resume editor (all sections) | ✅ Done |
| 4 | 4 templates + browser PDF export | ✅ Done |
| 5 | Prompt-to-prefill (Gemini) | ✅ Done |
| 6 | Recruiter PDF bulk upload + background parsing | ✅ Done |
| 7 | AI parsing → structured `profile_json` | ✅ Done |
| 8 | Screening run + ranking | ✅ Done |
| 9 | Shortlist management + CSV export | ✅ Done |
| 10 | Polish, READMEs, seed, tests, demo flow | ✅ Done |

## Demo flow (all paths reachable from the UI)

1. Candidate registers/logs in.
2. Candidate edits resume (personal, summary, education, experience, projects, skills, certifications).
3. Candidate switches templates and uses browser print-to-PDF.
4. Recruiter registers/logs in.
5. Recruiter uploads PDFs on `/recruiter/uploads`, watches batch progress poll until parsed.
6. Recruiter copies the Batch ID into `/recruiter/screening`, types an instruction prompt, runs screening.
7. Recruiter selects candidates, optionally adds notes, saves to a shortlist.
8. Recruiter views `/recruiter/shortlists` and exports CSV.

## Open / Future Work (post-FYP polish, not blocking demo)

- Move screening AI loop off the request thread into `BackgroundTasks` and expose `pending → running → done` polling.
- Cloud file storage (S3/Cloudinary) instead of local `backend/uploads`.
- OpenAI provider implementation in `AIService` (architecture is already provider-switchable).
- Real persistence for the legacy job board (`PostJob`, `CompanyJobs`, `BrowseJobs` still use mock `JobContext`). It is intentionally separated from the FYP feature set.
- Frontend Vitest smoke tests (config exists; no specs yet).
- `GET /api/v1/templates` (templates are seeded in DB but the frontend hardcodes the list of 4).
