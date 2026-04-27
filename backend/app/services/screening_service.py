from __future__ import annotations

import logging
from typing import Any, Optional

from fastapi import HTTPException, status

from app.repositories.screening_repository import ScreeningRepository
from app.services.ai_service import AIService, AIServiceError


logger = logging.getLogger(__name__)


def _require_recruiter(user: dict) -> None:
    if user.get("role") != "recruiter":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recruiter access required")


class ScreeningService:
    def __init__(self) -> None:
        self.repo = ScreeningRepository()
        self.ai = AIService()

    def _build_job_scoring_prompt(self, *, job: dict[str, Any], recruiter_notes: str) -> str:
        """
        Compose the AI scoring prompt for a job-based screening run.
        The job description is the primary matching basis; the recruiter's
        free-text notes are an OPTIONAL extra signal.
        """
        lines: list[str] = []
        lines.append("You are scoring how well this candidate matches a specific job posting.")
        lines.append("Score 0-100 based primarily on how well the candidate's resume matches the JOB DESCRIPTION below.")
        lines.append("")
        lines.append("=== JOB DETAILS ===")
        if job.get("title"):
            lines.append(f"Title: {job['title']}")
        if job.get("company_name"):
            lines.append(f"Company: {job['company_name']}")
        if job.get("type"):
            lines.append(f"Type: {job['type']}")
        if job.get("location"):
            lines.append(f"Location: {job['location']}")
        if job.get("experience"):
            lines.append(f"Experience required: {job['experience']}")
        if job.get("salary_range"):
            lines.append(f"Salary range: {job['salary_range']}")
        lines.append("")
        lines.append("=== JOB DESCRIPTION ===")
        lines.append((job.get("description") or "").strip() or "(no description provided)")
        notes = (recruiter_notes or "").strip()
        if notes:
            lines.append("")
            lines.append("=== ADDITIONAL RECRUITER NOTES ===")
            lines.append(notes)
        lines.append("")
        lines.append(
            "Match the candidate's skills, experience years, projects, and education "
            "against the JOB DESCRIPTION. Reward direct skill / responsibility overlap. "
            "Penalise missing must-haves. Do not invent profile details."
        )
        return "\n".join(lines)

    def _passes_filters(self, profile: dict[str, Any], filters: dict[str, Any]) -> bool:
        if not filters:
            return True

        min_years = filters.get("min_years_experience")
        if min_years is not None:
            try:
                min_years_val = float(min_years)
                yoe = profile.get("years_of_experience")
                yoe_val = float(yoe) if yoe is not None else 0.0
                if yoe_val < min_years_val:
                    return False
            except Exception:
                pass

        required_skills = filters.get("required_skills")
        if isinstance(required_skills, list) and required_skills:
            profile_skills = [str(s).lower().strip() for s in (profile.get("skills") or [])]
            req = [str(s).lower().strip() for s in required_skills]
            for skill in req:
                if skill and skill not in profile_skills:
                    return False
        return True

    async def create_run(
        self,
        *,
        current_user: dict,
        batch_id: Optional[str] = None,
        job_id: Optional[str] = None,
        instruction_prompt: str,
        filters: dict[str, Any] | None,
    ) -> dict[str, Any]:
        _require_recruiter(current_user)
        await self.repo.ensure_indexes()

        if bool(batch_id) == bool(job_id):
            raise HTTPException(
                status_code=400,
                detail="Provide exactly one of batch_id or job_id",
            )

        if batch_id:
            # Recruiter-typed instruction is required for the PDF-batch flow,
            # because there is no other context for the AI.
            if not instruction_prompt.strip():
                raise HTTPException(status_code=400, detail="instruction_prompt is required")
            source = await self.repo.get_batch_for_user(batch_id=batch_id, user_id=current_user["id"])
            if not source:
                raise HTTPException(status_code=404, detail="Batch not found")
            scoring_prompt = instruction_prompt.strip()
        else:
            source = await self.repo.get_job_for_user(job_id=job_id, user_id=current_user["id"])
            if not source:
                raise HTTPException(status_code=404, detail="Job not found")
            # The job description IS the matching basis. Recruiter's free-text
            # prompt is appended as extra notes (and may be empty).
            scoring_prompt = self._build_job_scoring_prompt(
                job=source, recruiter_notes=instruction_prompt
            )

        run = await self.repo.create_run(
            user_id=current_user["id"],
            batch_id=batch_id,
            job_id=job_id,
            instruction_prompt=scoring_prompt,
            filters=filters or {},
        )
        run_id = run["id"]

        try:
            await self.repo.set_run_status(run_id=run_id, status="running")
            if batch_id:
                parsed_candidates = await self.repo.get_parsed_candidates_for_batch(
                    batch_id=batch_id,
                    user_id=current_user["id"],
                )
            else:
                parsed_candidates = await self.repo.get_applicants_with_profile_for_job(
                    job_id=job_id,
                )

            count = 0
            for c in parsed_candidates:
                upload_item_id = c["upload_item_id"]
                profile_json = c.get("profile_json") or {}
                if not isinstance(profile_json, dict):
                    continue
                if not self._passes_filters(profile_json, filters or {}):
                    continue

                ai_result = await self.ai.score_candidate_for_screening(
                    instruction_prompt=scoring_prompt,
                    profile_json=profile_json,
                )
                await self.repo.add_result(
                    run_id=run_id,
                    upload_item_id=upload_item_id,
                    score=ai_result["score"],
                    rationale=ai_result["rationale"],
                    matched_skills=ai_result["matched_skills"],
                    highlights=ai_result["highlights"],
                    profile_json=profile_json,
                )
                count += 1

            await self.repo.set_run_status(run_id=run_id, status="done", candidate_count=count, error_message=None)
        except Exception as e:
            # Persist full reason in DB for debugging; don't leak provider error text to the client.
            logger.exception("Screening run %s failed", run_id)
            await self.repo.set_run_status(run_id=run_id, status="failed", error_message=str(e))
            raise HTTPException(
                status_code=502,
                detail="Screening failed. Please try again or check the AI service status.",
            )

        run = await self.repo.get_run_for_user(run_id=run_id, user_id=current_user["id"])
        results = await self.repo.list_results_for_run(run_id=run_id)
        return {"run": run, "candidates": results}

    async def get_run(self, *, current_user: dict, run_id: str) -> dict[str, Any]:
        _require_recruiter(current_user)
        run = await self.repo.get_run_for_user(run_id=run_id, user_id=current_user["id"])
        if not run:
            raise HTTPException(status_code=404, detail="Run not found")
        results = await self.repo.list_results_for_run(run_id=run_id)
        return {"run": run, "candidates": results}

    async def list_runs(self, *, current_user: dict) -> list[dict[str, Any]]:
        _require_recruiter(current_user)
        return await self.repo.list_runs_for_user(user_id=current_user["id"])

