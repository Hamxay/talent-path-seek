# AI Pipeline (CV Parsing + Screening)

## Goals

- Convert unstructured CV PDFs into a **structured profile JSON**
- Support recruiter prompts like “Find candidates with 2 years React”
- Return **ranked** candidates with brief **rationales**

## Pipeline stages

### 1) PDF → Text extraction

Recommended tools (backend):

- `pypdf` for text extraction (fast, basic)
- `pdfplumber` for more robust extraction when layout is complex

Store:

- raw extracted text per upload item
- extraction errors per file (don’t fail the whole batch)

### 2) Text → Structured profile (AI)

Use Gemini/OpenAI with a strict JSON schema (Pydantic model) to extract:

- name, email, phone (if present)
- education entries
- experience entries (job titles + companies + date ranges if available)
- skills list (and/or categories)
- projects + tech stack (optional)

Implementation notes:

- Use **JSON-only** responses (tool/function calling if available)
- Validate with Pydantic; if validation fails:
  - retry with “fix JSON to match schema”
  - otherwise store failure + raw response for debugging

### 3) Screening prompt → scoring and ranking (AI + rules)

Two recommended approaches:

#### A) AI-first (simpler prototype)

- Prompt includes recruiter instruction + the structured profile JSON
- AI returns:
  - score 0–100
  - short rationale (1–3 lines)
  - highlights (matched skills/keywords)

#### B) Hybrid (more stable)

- Rule-based prefilter:
  - keyword match on skills/roles/degree
  - optional years-of-experience heuristics
- AI scoring on the reduced set (top N)

## Prompt safety and consistency

- Always log:
  - instruction prompt
  - model
  - timestamp
  - response
- Add guardrails:
  - do not expose private data in logs
  - basic injection resistance by using system prompts + JSON schema

## Output contract (per candidate)

- `score`: number
- `rationale`: short text
- `highlights`:
  - `matched_skills`: string[]
  - `matched_roles`: string[]
  - `education_match`: string (optional)

