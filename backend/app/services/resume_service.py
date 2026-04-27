from __future__ import annotations

from fastapi import HTTPException, status

from app.repositories.resume_repository import ResumeRepository


def _require_candidate(user: dict) -> None:
    if user.get("role") != "candidate":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only candidate users can manage resumes",
        )


class ResumeService:
    def __init__(self) -> None:
        self.resumes = ResumeRepository()

    async def list_me(self, *, current_user: dict) -> list[dict]:
        _require_candidate(current_user)
        await self.resumes.ensure_indexes()
        return await self.resumes.list_by_user(current_user["id"])

    async def create(self, *, current_user: dict, title: str, resume_json: dict, is_primary: bool) -> dict:
        _require_candidate(current_user)
        await self.resumes.ensure_indexes()

        existing = await self.resumes.list_by_user(current_user["id"])
        if not existing and is_primary is False:
            # First resume defaults to primary for convenience.
            is_primary = True

        if is_primary:
            await self.resumes.unset_primary_for_user(current_user["id"])

        return await self.resumes.create(
            user_id=current_user["id"],
            title=title,
            resume_json=resume_json,
            is_primary=is_primary,
        )

    async def get(self, *, current_user: dict, resume_id: str) -> dict:
        _require_candidate(current_user)
        resume = await self.resumes.get_by_id_and_user(resume_id, current_user["id"])
        if not resume:
            # Don't leak whether a resume exists for another user.
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
        return resume

    async def update(self, *, current_user: dict, resume_id: str, updates: dict) -> dict:
        _require_candidate(current_user)
        await self.resumes.ensure_indexes()

        if updates.get("is_primary") is True:
            await self.resumes.unset_primary_for_user(current_user["id"])

        updated = await self.resumes.update_by_id_and_user(
            resume_id=resume_id,
            user_id=current_user["id"],
            updates=updates,
        )
        if not updated:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
        return updated

    async def delete(self, *, current_user: dict, resume_id: str) -> dict:
        _require_candidate(current_user)
        deleted = await self.resumes.delete_by_id_and_user(resume_id, current_user["id"])
        if not deleted:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resume not found")
        return {"message": "Deleted"}

