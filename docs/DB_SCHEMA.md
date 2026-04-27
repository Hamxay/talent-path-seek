# Database Schema (Draft)

This is a logical schema. Implement with **MongoDB** (collections) or **PostgreSQL** (tables + JSON columns) depending on supervisor preference.

## Users

- `_id`
- `name`
- `email` (unique)
- `password_hash`
- `role`: `"candidate" | "recruiter"` (or `"company"`)
- `company_name` (optional)
- `created_at`, `updated_at`

## Resumes

- `_id`
- `user_id` (candidate)
- `title` (e.g., “Primary Resume”)
- `resume_json` (normalized)
- `is_primary` (bool)
- `created_at`, `updated_at`

### Normalized `resume_json` shape (recommended)

- `personal`:
  - `full_name`
  - `email`
  - `phone`
  - `address` (optional)
  - `links`: `{ label, url }[]`
- `summary` (string)
- `education`: `{ institution, degree, field, start_date, end_date, grade?, details? }[]`
- `experience`: `{ company, title, start_date, end_date, location?, bullets: string[] }[]`
- `projects`: `{ name, tech_stack?: string[], link?: string, bullets: string[] }[]`
- `skills`:
  - `{ category: string, items: string[] }[]`
- `certifications`: `{ name, issuer?, date?, link? }[]`

## Templates

- `_id`
- `key`: `"modern" | "classic" | "tech" | "minimal"`
- `name`
- `description`
- `preview_image_url` (optional)
- `created_at`, `updated_at`

## Upload Batches (Recruiter)

- `_id`
- `recruiter_user_id`
- `created_at`
- `status`: `pending|processing|done|failed`
- `total_files`

## Upload Items

- `_id`
- `batch_id`
- `original_filename`
- `content_type`
- `size_bytes`
- `storage_path` (or `storage_url`)
- `status`: `pending|text_extracted|parsed_ok|parsed_failed`
- `error_message` (optional)
- `created_at`, `updated_at`

## Parsed Profiles (from CV PDFs)

- `_id`
- `upload_item_id`
- `raw_text` (extracted from PDF)
- `profile_json` (structured extraction, versioned)
- `parser_provider`: `gemini|openai|other`
- `parser_model` (string)
- `parser_prompt_version` (string)
- `created_at`, `updated_at`

## Screening Runs

- `_id`
- `recruiter_user_id`
- `batch_id`
- `instruction_prompt`
- `filters_json` (optional)
- `status`: `pending|running|done|failed`
- `provider`: `gemini|openai|other`
- `model`
- `created_at`, `updated_at`

## Screening Results

- `_id`
- `run_id`
- `upload_item_id`
- `score` (number)
- `rationale` (string)
- `highlights_json` (optional: matched skills/years/etc.)

## Shortlists

- `_id`
- `recruiter_user_id`
- `name`
- `source_run_id` (optional)
- `created_at`, `updated_at`

## Shortlist Items

- `_id`
- `shortlist_id`
- `upload_item_id`
- `note` (optional)

