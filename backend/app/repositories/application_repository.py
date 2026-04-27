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


def _serialize(a: JobApplication) -> dict[str, Any]:
    return {
        "id": str(a.id),
        "job_id": str(a.job_id),
        "candidate_user_id": str(a.candidate_user_id),
        "resume_id": str(a.resume_id) if a.resume_id is not None else None,
        "profile_json": a.profile_json or {},
        "cover_letter": a.cover_letter,
        "status": a.status,
        "created_at": a.created_at,
        "updated_at": a.updated_at,
    }


class ApplicationRepository:
    async def create(
        self,
        *,
        job_id: str,
        candidate_user_id: str,
        resume_id: Optional[str],
        profile_json: dict[str, Any],
        cover_letter: Optional[str],
    ) -> dict[str, Any]:
        jid = _to_int(job_id)
        cid = _to_int(candidate_user_id)
        if jid is None or cid is None:
            raise ValueError("Invalid job_id or candidate_user_id")
        rid: Optional[int] = _to_int(resume_id) if resume_id is not None else None
        with get_session() as session:
            a = JobApplication(
                job_id=jid,
                candidate_user_id=cid,
                resume_id=rid,
                profile_json=profile_json or {},
                cover_letter=(cover_letter or None),
                status="Pending",
            )
            session.add(a)
            session.flush()
            session.refresh(a)
            return _serialize(a)

    async def get_existing(
        self, *, job_id: str, candidate_user_id: str
    ) -> Optional[dict[str, Any]]:
        jid = _to_int(job_id)
        cid = _to_int(candidate_user_id)
        if jid is None or cid is None:
            return None
        with get_session() as session:
            a = session.execute(
                select(JobApplication).where(
                    JobApplication.job_id == jid,
                    JobApplication.candidate_user_id == cid,
                )
            ).scalar_one_or_none()
            return _serialize(a) if a else None

    async def list_for_job(self, *, job_id: str) -> list[dict[str, Any]]:
        jid = _to_int(job_id)
        if jid is None:
            return []
        with get_session() as session:
            rows = session.execute(
                select(JobApplication)
                .where(JobApplication.job_id == jid)
                .order_by(JobApplication.created_at.desc())
            ).scalars().all()
            return [_serialize(a) for a in rows]

    async def list_for_candidate(self, *, candidate_user_id: str) -> list[dict[str, Any]]:
        cid = _to_int(candidate_user_id)
        if cid is None:
            return []
        with get_session() as session:
            stmt = (
                select(JobApplication, Job.title, Job.company_name)
                .join(Job, Job.id == JobApplication.job_id)
                .where(JobApplication.candidate_user_id == cid)
                .order_by(JobApplication.created_at.desc())
            )
            rows = session.execute(stmt).all()
            out: list[dict[str, Any]] = []
            for app, job_title, company_name in rows:
                d = _serialize(app)
                d["job_title"] = job_title
                d["company_name"] = company_name
                out.append(d)
            return out

    async def update_status(
        self, *, application_id: str, status: str
    ) -> Optional[dict[str, Any]]:
        aid = _to_int(application_id)
        if aid is None:
            return None
        with get_session() as session:
            a = session.get(JobApplication, aid)
            if a is None:
                return None
            a.status = status
            session.flush()
            session.refresh(a)
            return _serialize(a)

    async def get_by_id(self, *, application_id: str) -> Optional[dict[str, Any]]:
        aid = _to_int(application_id)
        if aid is None:
            return None
        with get_session() as session:
            a = session.get(JobApplication, aid)
            return _serialize(a) if a else None
