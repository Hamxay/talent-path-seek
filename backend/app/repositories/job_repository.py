from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import select

from app.db.models import Job, JobApplication
from app.db.postgres import get_session


def _to_int(s: str) -> Optional[int]:
    try:
        return int(s)
    except (ValueError, TypeError):
        return None


def _serialize(j: Job) -> dict[str, Any]:
    return {
        "id": str(j.id),
        "recruiter_user_id": str(j.recruiter_user_id),
        "company_name": j.company_name,
        "title": j.title,
        "description": j.description or "",
        "location": j.location,
        "salary_range": j.salary_range,
        "experience": j.experience,
        "type": j.type,
        "is_active": j.is_active,
        "created_at": j.created_at,
        "updated_at": j.updated_at,
    }


class JobRepository:
    async def create(
        self,
        *,
        recruiter_user_id: str,
        company_name: str,
        title: str,
        description: str,
        location: Optional[str],
        salary_range: Optional[str],
        experience: Optional[str],
        type: str,
    ) -> dict[str, Any]:
        rid = _to_int(recruiter_user_id)
        if rid is None:
            raise ValueError("Invalid recruiter_user_id")
        with get_session() as session:
            j = Job(
                recruiter_user_id=rid,
                company_name=company_name,
                title=title,
                description=description or "",
                location=location,
                salary_range=salary_range,
                experience=experience,
                type=type or "Full-time",
                is_active=True,
            )
            session.add(j)
            session.flush()
            session.refresh(j)
            return _serialize(j)

    async def list_active(self) -> list[dict[str, Any]]:
        with get_session() as session:
            rows = session.execute(
                select(Job).where(Job.is_active == True).order_by(Job.created_at.desc())  # noqa: E712
            ).scalars().all()
            return [_serialize(j) for j in rows]

    async def list_for_recruiter(self, *, recruiter_user_id: str) -> list[dict[str, Any]]:
        rid = _to_int(recruiter_user_id)
        if rid is None:
            return []
        with get_session() as session:
            rows = session.execute(
                select(Job).where(Job.recruiter_user_id == rid).order_by(Job.created_at.desc())
            ).scalars().all()
            return [_serialize(j) for j in rows]

    async def get_by_id(self, *, job_id: str) -> Optional[dict[str, Any]]:
        jid = _to_int(job_id)
        if jid is None:
            return None
        with get_session() as session:
            j = session.get(Job, jid)
            return _serialize(j) if j else None

    async def get_by_id_and_owner(
        self, *, job_id: str, recruiter_user_id: str
    ) -> Optional[dict[str, Any]]:
        jid = _to_int(job_id)
        rid = _to_int(recruiter_user_id)
        if jid is None or rid is None:
            return None
        with get_session() as session:
            j = session.execute(
                select(Job).where(Job.id == jid, Job.recruiter_user_id == rid)
            ).scalar_one_or_none()
            return _serialize(j) if j else None

    async def update_by_id_and_owner(
        self,
        *,
        job_id: str,
        recruiter_user_id: str,
        updates: dict[str, Any],
    ) -> Optional[dict[str, Any]]:
        jid = _to_int(job_id)
        rid = _to_int(recruiter_user_id)
        if jid is None or rid is None:
            return None
        with get_session() as session:
            j = session.execute(
                select(Job).where(Job.id == jid, Job.recruiter_user_id == rid)
            ).scalar_one_or_none()
            if j is None:
                return None
            for k, v in updates.items():
                if hasattr(j, k):
                    setattr(j, k, v)
            session.flush()
            session.refresh(j)
            return _serialize(j)

    async def delete_by_id_and_owner(
        self, *, job_id: str, recruiter_user_id: str
    ) -> bool:
        jid = _to_int(job_id)
        rid = _to_int(recruiter_user_id)
        if jid is None or rid is None:
            return False
        with get_session() as session:
            j = session.execute(
                select(Job).where(Job.id == jid, Job.recruiter_user_id == rid)
            ).scalar_one_or_none()
            if j is None:
                return False
            session.delete(j)
            return True

    async def applicant_count(self, *, job_id: str) -> int:
        jid = _to_int(job_id)
        if jid is None:
            return 0
        with get_session() as session:
            rows = session.execute(
                select(JobApplication.id).where(JobApplication.job_id == jid)
            ).all()
            return len(rows)
