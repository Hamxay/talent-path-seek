from __future__ import annotations

import logging
import uuid
from pathlib import Path
from typing import Any, Optional

from fastapi import HTTPException, status

from app.repositories.application_repository import ApplicationRepository
from app.repositories.job_repository import JobRepository
from app.repositories.resume_repository import ResumeRepository
from app.services.ai_service import AIService, AIServiceError
from app.services.pdf_extraction_service import PdfExtractionService


logger = logging.getLogger(__name__)

UPLOADS_DIR = Path(__file__).resolve().parents[2] / "uploads" / "applications"


def _profile_from_resume_doc(resume_doc: dict[str, Any], current_user: dict) -> dict[str, Any]:
    rj = dict(resume_doc.get("resume_json") or {})
    personal = dict(rj.get("personal") or {})
    if not personal.get("full_name"):
        personal["full_name"] = current_user.get("name") or ""
    if not personal.get("email"):
        personal["email"] = current_user.get("email") or ""
    rj["personal"] = personal

    skills = rj.get("skills") or {}
    skills_items = (
        skills.get("items") if isinstance(skills, dict) else (skills if isinstance(skills, list) else [])
    )
    return {
        "name": personal.get("full_name", ""),
        "email": personal.get("email", ""),
        "phone": personal.get("phone", ""),
        "skills": skills_items or [],
        "education": rj.get("education", []),
        "experience": rj.get("experience", []),
        "projects": rj.get("projects", []),
        "certifications": rj.get("certifications", []),
        "summary": rj.get("summary", ""),
        "links": {
            "linkedin": personal.get("linkedin"),
            "github": personal.get("github"),
            "website": personal.get("website"),
        },
    }


def _minimal_profile_from_account(current_user: dict) -> dict[str, Any]:
    return {
        "name": current_user.get("name") or "",
        "email": current_user.get("email") or "",
        "phone": "",
        "skills": [],
        "education": [],
        "experience": [],
        "projects": [],
        "certifications": [],
        "summary": "",
        "links": {},
    }


class ApplicationService:
    def __init__(self) -> None:
        self.apps = ApplicationRepository()
        self.jobs = JobRepository()
        self.resumes = ResumeRepository()
        self.pdf = PdfExtractionService()

    async def apply_to_job(
        self,
        *,
        current_user: dict,
        job_id: str,
        cover_letter: Optional[str],
        resume_id: Optional[str],
        pdf_bytes: Optional[bytes] = None,
        pdf_filename: Optional[str] = None,
    ) -> dict[str, Any]:
        if current_user.get("role") != "candidate":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Candidate access required")

        job = await self.jobs.get_by_id(job_id=job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        if not job.get("is_active", True):
            raise HTTPException(status_code=400, detail="Job is closed")

        existing = await self.apps.get_existing(
            job_id=job_id, candidate_user_id=current_user["id"]
        )
        if existing:
            raise HTTPException(status_code=409, detail="You have already applied to this job")

        snapshot: Optional[dict[str, Any]] = None
        used_resume_id: Optional[str] = None

        # 1) Uploaded PDF takes priority
        if pdf_bytes:
            snapshot = await self._build_profile_from_pdf(
                pdf_bytes=pdf_bytes, pdf_filename=pdf_filename or "resume.pdf"
            )

        # 2) Explicit resume_id selection
        if snapshot is None and resume_id:
            resume_doc = await self.resumes.get_by_id_and_user(
                resume_id=resume_id, user_id=current_user["id"]
            )
            if not resume_doc:
                raise HTTPException(status_code=404, detail="Resume not found")
            snapshot = _profile_from_resume_doc(resume_doc, current_user)
            used_resume_id = resume_doc.get("id")

        # 3) Primary / first saved resume
        if snapshot is None:
            mine = await self.resumes.list_by_user(user_id=current_user["id"])
            primary = next((r for r in mine if r.get("is_primary")), None) or (mine[0] if mine else None)
            if primary:
                snapshot = _profile_from_resume_doc(primary, current_user)
                used_resume_id = primary.get("id")

        # 4) Final fallback — minimal profile from account info, so applying
        #    never blocks even if the candidate hasn't built a resume yet.
        if snapshot is None:
            snapshot = _minimal_profile_from_account(current_user)

        return await self.apps.create(
            job_id=job_id,
            candidate_user_id=current_user["id"],
            resume_id=used_resume_id,
            profile_json=snapshot,
            cover_letter=cover_letter,
        )

    async def _build_profile_from_pdf(
        self, *, pdf_bytes: bytes, pdf_filename: str
    ) -> dict[str, Any]:
        UPLOADS_DIR.mkdir(parents=True, exist_ok=True)
        path = UPLOADS_DIR / f"{uuid.uuid4().hex}.pdf"
        with open(path, "wb") as out:
            out.write(pdf_bytes)

        try:
            raw_text = self.pdf.extract_text(str(path))
        except Exception:
            logger.exception("PDF extraction failed for application resume %s", pdf_filename)
            raw_text = ""

        if not raw_text:
            # PDF unreadable — keep the application going with an empty-but-tagged profile.
            return {
                "name": "",
                "email": "",
                "phone": "",
                "skills": [],
                "education": [],
                "experience": [],
                "projects": [],
                "certifications": [],
                "summary": f"(Unable to extract text from {pdf_filename})",
                "links": {},
                "uploaded_filename": pdf_filename,
            }

        try:
            ai = AIService()
            parsed = await ai.parse_cv_text_to_profile(raw_text=raw_text)
            profile = parsed.get("profile_json") or {}
            # Normalise into the same shape the rest of the app expects.
            return {
                "name": profile.get("name") or "",
                "email": profile.get("email") or "",
                "phone": profile.get("phone") or "",
                "skills": profile.get("skills") or [],
                "education": profile.get("education") or [],
                "experience": profile.get("experience") or [],
                "projects": profile.get("projects") or [],
                "certifications": profile.get("certifications") or [],
                "summary": profile.get("summary") or "",
                "years_of_experience": profile.get("years_of_experience"),
                "links": {},
                "uploaded_filename": pdf_filename,
            }
        except AIServiceError as e:
            # Missing API key or AI provider failure: keep the raw text so the
            # recruiter still has *something* to read; don't block the apply.
            logger.warning("AI parse skipped for application resume: %s", e)
            return {
                "name": "",
                "email": "",
                "phone": "",
                "skills": [],
                "education": [],
                "experience": [],
                "projects": [],
                "certifications": [],
                "summary": raw_text[:1500],
                "links": {},
                "uploaded_filename": pdf_filename,
            }
        except Exception:
            logger.exception("Unexpected AI failure parsing application resume")
            return {
                "name": "",
                "email": "",
                "phone": "",
                "skills": [],
                "education": [],
                "experience": [],
                "projects": [],
                "certifications": [],
                "summary": raw_text[:1500],
                "links": {},
                "uploaded_filename": pdf_filename,
            }

    async def list_my_applications(self, *, current_user: dict) -> list[dict[str, Any]]:
        if current_user.get("role") != "candidate":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Candidate access required")
        return await self.apps.list_for_candidate(candidate_user_id=current_user["id"])

    async def list_applications_for_job(
        self, *, current_user: dict, job_id: str
    ) -> list[dict[str, Any]]:
        if current_user.get("role") != "recruiter":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recruiter access required")
        job = await self.jobs.get_by_id_and_owner(
            job_id=job_id, recruiter_user_id=current_user["id"]
        )
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return await self.apps.list_for_job(job_id=job_id)

    async def update_status(
        self, *, current_user: dict, application_id: str, new_status: str
    ) -> dict[str, Any]:
        if current_user.get("role") != "recruiter":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recruiter access required")

        existing = await self.apps.get_by_id(application_id=application_id)
        if not existing:
            raise HTTPException(status_code=404, detail="Application not found")
        job = await self.jobs.get_by_id_and_owner(
            job_id=existing["job_id"], recruiter_user_id=current_user["id"]
        )
        if not job:
            raise HTTPException(status_code=404, detail="Application not found")

        updated = await self.apps.update_status(application_id=application_id, status=new_status)
        if not updated:
            raise HTTPException(status_code=404, detail="Application not found")
        return updated
