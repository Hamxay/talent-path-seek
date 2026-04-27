# Requirements (FYP)

## Modules

### Candidate Module

- **Account**
  - Register / login / logout
  - Candidate profile (basic info)
- **Resume data**
  - CRUD for sections:
    - Personal info
    - Summary/objective
    - Education (multiple)
    - Experience (multiple)
    - Projects (multiple)
    - Skills (multiple + categories)
    - Certifications (optional)
    - Links (GitHub/LinkedIn/Portfolio)
- **Template selection**
  - Select from **4 templates**: Modern, Classic, Tech, Minimal
  - Preview template instantly with current data
- **PDF**
  - Live preview (browser)
  - Download **high-quality PDF** preserving layout
- **Prompt-based CV creation (optional but in proposal)**
  - Natural language prompt to prefill sections
  - User can edit extracted fields before saving

### Recruiter/Business Module

- **Account**
  - Register / login / logout
  - Company profile (optional)
- **Bulk upload**
  - Upload many resume PDFs (target: **200+**)
  - Track upload status and parsing status
- **Instruction-based screening**
  - Recruiter enters a prompt like:
    - “Find BSCS candidates with 2 years React + Next.js”
    - “Shortlist people with Python + FastAPI + Docker”
  - System outputs:
    - Ranked list with match score + rationale
    - Extracted structured profile (skills/education/experience)
- **Shortlist management**
  - Save/unsave shortlisted candidates
  - Export shortlisted list (CSV/PDF)

## Non-functional requirements

- **Responsiveness**: mobile + desktop support
- **Performance**:
  - Fast UI interactions
  - Background processing for bulk parsing
- **Security**:
  - JWT auth (access + refresh)
  - Password hashing (bcrypt/argon2)
  - Role-based access (candidate vs recruiter)
  - File upload validation (type/size limits)
- **Reliability**:
  - Retries for AI provider calls
  - Fail-safe parsing (store raw text + error states)
- **Auditability**:
  - Store AI prompts and model outputs for recruiter actions (minimal logs)
- **Maintainability**:
  - Clear module boundaries + typed DTOs/schemas

## Success criteria (mapped to build checks)

- **Auth works end-to-end** (frontend ↔ backend ↔ DB)
- **Resume CRUD + templates work** (save + preview + export)
- **AI parsing produces structured data** (fields extracted correctly)
- **Bulk upload + screening works** (200+ PDFs, ranked output)
- **PDF export matches preview** (layout preserved)

