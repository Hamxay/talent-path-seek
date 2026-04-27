from __future__ import annotations

from typing import Any

from fastapi import HTTPException, status

from app.repositories.job_repository import JobRepository


def _require_recruiter(user: dict) -> None:
    if user.get("role") != "recruiter":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recruiter access required")


class JobService:
    def __init__(self) -> None:
        self.repo = JobRepository()

    async def create(self, *, current_user: dict, payload: dict[str, Any]) -> dict[str, Any]:
        _require_recruiter(current_user)
        company_name = (current_user.get("company_name") or current_user.get("name") or "").strip()
        if not company_name:
            company_name = "Company"
        return await self.repo.create(
            recruiter_user_id=current_user["id"],
            company_name=company_name,
            title=payload["title"].strip(),
            description=(payload.get("description") or "").strip(),
            location=(payload.get("location") or None),
            salary_range=(payload.get("salary_range") or None),
            experience=(payload.get("experience") or None),
            type=(payload.get("type") or "Full-time"),
        )

    async def list_public(self) -> list[dict[str, Any]]:
        return await self.repo.list_active()

    async def list_mine(self, *, current_user: dict) -> list[dict[str, Any]]:
        _require_recruiter(current_user)
        return await self.repo.list_for_recruiter(recruiter_user_id=current_user["id"])

    async def get(self, *, job_id: str) -> dict[str, Any]:
        job = await self.repo.get_by_id(job_id=job_id)
        if not job:
            raise HTTPException(status_code=404, detail="Job not found")
        return job

    async def update(
        self, *, current_user: dict, job_id: str, updates: dict[str, Any]
    ) -> dict[str, Any]:
        _require_recruiter(current_user)
        existing = await self.repo.get_by_id_and_owner(
            job_id=job_id, recruiter_user_id=current_user["id"]
        )
        if not existing:
            raise HTTPException(status_code=404, detail="Job not found")
        clean = {k: v for k, v in updates.items() if v is not None}
        if not clean:
            return existing
        updated = await self.repo.update_by_id_and_owner(
            job_id=job_id, recruiter_user_id=current_user["id"], updates=clean
        )
        if not updated:
            raise HTTPException(status_code=404, detail="Job not found")
        return updated

    async def delete(self, *, current_user: dict, job_id: str) -> dict[str, str]:
        _require_recruiter(current_user)
        ok = await self.repo.delete_by_id_and_owner(
            job_id=job_id, recruiter_user_id=current_user["id"]
        )
        if not ok:
            raise HTTPException(status_code=404, detail="Job not found")
        return {"message": "Deleted"}

    async def applicant_count(self, *, job_id: str) -> int:
        return await self.repo.applicant_count(job_id=job_id)
