from __future__ import annotations

import csv
import io
from datetime import datetime
from typing import Any, Optional

from fastapi import HTTPException, status

from app.repositories.application_repository import ApplicationRepository
from app.repositories.shortlist_repository import ShortlistRepository


def _require_recruiter(user: dict) -> None:
    if user.get("role") != "recruiter":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recruiter access required")


class ShortlistService:
    def __init__(self) -> None:
        self.repo = ShortlistRepository()
        self.applications = ApplicationRepository()

    async def create_shortlist(
        self,
        *,
        current_user: dict,
        run_id: str,
        name: Optional[str],
        selected_upload_item_ids: Optional[list[str]],
        notes: Optional[dict[str, str]],
    ) -> dict[str, Any]:
        _require_recruiter(current_user)
        await self.repo.ensure_indexes()

        run = await self.repo.get_run_for_user(run_id=run_id, user_id=current_user["id"])
        if not run:
            raise HTTPException(status_code=404, detail="Screening run not found")

        all_results = await self.repo.list_results_for_run(run_id=run_id)
        if not all_results:
            raise HTTPException(status_code=400, detail="No screening results found for this run")

        selected_set = set(selected_upload_item_ids or [])
        picked = [r for r in all_results if (not selected_set or r["upload_item_id"] in selected_set)]
        if not picked:
            raise HTTPException(status_code=400, detail="No matching results selected")

        shortlist_name = (name or f"Shortlist {datetime.utcnow().strftime('%Y-%m-%d %H:%M')}").strip()
        shortlist = await self.repo.create_shortlist(
            user_id=current_user["id"],
            run_id=run_id,
            name=shortlist_name,
        )

        items: list[dict[str, Any]] = []
        notes = notes or {}
        for r in picked:
            it = await self.repo.add_shortlist_item(
                shortlist_id=shortlist["id"],
                upload_item_id=r["upload_item_id"],
                score=r.get("score", 0),
                rationale=r.get("rationale", ""),
                matched_skills=r.get("matched_skills", []),
                highlights=r.get("highlights", {}),
                profile_json=r.get("profile_json", {}),
                note=notes.get(r["upload_item_id"]),
            )
            items.append(it)

        # When the run came from a job posting, the "upload_item_id" on each
        # screening result is actually the JobApplication.id. Auto-flip those
        # applications to Shortlisted so the candidate sees the status change
        # in their My Applications tab and the recruiter's job detail page.
        if run.get("job_id"):
            for r in picked:
                try:
                    await self.applications.update_status(
                        application_id=r["upload_item_id"],
                        status="Shortlisted",
                    )
                except Exception:
                    # A failed sync shouldn't undo the shortlist creation.
                    pass

        return {"shortlist": shortlist, "items": items}

    async def list_shortlists(self, *, current_user: dict) -> list[dict[str, Any]]:
        _require_recruiter(current_user)
        shortlists = await self.repo.list_shortlists_for_user(user_id=current_user["id"])
        return shortlists

    async def get_shortlist(self, *, current_user: dict, shortlist_id: str) -> dict[str, Any]:
        _require_recruiter(current_user)
        shortlist = await self.repo.get_shortlist_for_user(shortlist_id=shortlist_id, user_id=current_user["id"])
        if not shortlist:
            raise HTTPException(status_code=404, detail="Shortlist not found")
        items = await self.repo.list_shortlist_items(shortlist_id=shortlist_id)
        return {"shortlist": shortlist, "items": items}

    async def remove_shortlist_item(self, *, current_user: dict, shortlist_id: str, item_id: str) -> dict[str, str]:
        _require_recruiter(current_user)
        ok = await self.repo.delete_shortlist_item_for_user(
            shortlist_id=shortlist_id,
            item_id=item_id,
            user_id=current_user["id"],
        )
        if not ok:
            raise HTTPException(status_code=404, detail="Shortlist item not found")
        return {"message": "Deleted"}

    async def export_shortlist_csv(self, *, current_user: dict, shortlist_id: str) -> str:
        _require_recruiter(current_user)
        shortlist = await self.repo.get_shortlist_for_user(shortlist_id=shortlist_id, user_id=current_user["id"])
        if not shortlist:
            raise HTTPException(status_code=404, detail="Shortlist not found")
        items = await self.repo.list_shortlist_items(shortlist_id=shortlist_id)

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["name", "email", "phone", "score", "skills", "rationale"])
        for it in items:
            profile = it.get("profile_json") or {}
            skills = profile.get("skills") or []
            if isinstance(skills, list):
                skills_val = ", ".join(str(s) for s in skills)
            else:
                skills_val = ""
            writer.writerow(
                [
                    profile.get("name", ""),
                    profile.get("email", ""),
                    profile.get("phone", ""),
                    it.get("score", 0),
                    skills_val,
                    it.get("rationale", ""),
                ]
            )
        return output.getvalue()

