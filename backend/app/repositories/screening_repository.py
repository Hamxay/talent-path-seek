from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import select

from app.db.models import (
    Job,
    JobApplication,
    ParsedProfile,
    ScreeningResult,
    ScreeningRun,
    UploadBatch,
    UploadItem,
)
from app.db.postgres import get_session


def _to_int(s: str) -> Optional[int]:
    try:
        return int(s)
    except (ValueError, TypeError):
        return None


def _serialize_run(r: ScreeningRun) -> dict[str, Any]:
    return {
        "id": str(r.id),
        "user_id": str(r.user_id),
        "batch_id": str(r.batch_id) if r.batch_id is not None else None,
        "job_id": str(r.job_id) if r.job_id is not None else None,
        "instruction_prompt": r.instruction_prompt,
        "filters": r.filters or {},
        "status": r.status,
        "candidate_count": r.candidate_count,
        "error_message": r.error_message,
        "created_at": r.created_at,
        "updated_at": r.updated_at,
    }


def _serialize_result(r: ScreeningResult) -> dict[str, Any]:
    return {
        "id": str(r.id),
        "run_id": str(r.run_id),
        "upload_item_id": str(r.upload_item_id),
        "score": r.score,
        "rationale": r.rationale,
        "matched_skills": r.matched_skills or [],
        "highlights": r.highlights or {},
        "profile_json": r.profile_json or {},
        "created_at": r.created_at,
    }


def _serialize_batch(b: UploadBatch) -> dict[str, Any]:
    return {
        "id": str(b.id),
        "user_id": str(b.user_id),
        "total_items": b.total_items,
        "processed_items": b.processed_items,
        "failed_items": b.failed_items,
        "status": b.status,
        "created_at": b.created_at,
        "updated_at": b.updated_at,
    }


class ScreeningRepository:
    async def ensure_indexes(self) -> None:
        return None

    async def get_batch_for_user(self, *, batch_id: str, user_id: str) -> Optional[dict[str, Any]]:
        bid = _to_int(batch_id)
        uid = _to_int(user_id)
        if bid is None or uid is None:
            return None
        with get_session() as session:
            b = session.execute(
                select(UploadBatch).where(UploadBatch.id == bid, UploadBatch.user_id == uid)
            ).scalar_one_or_none()
            return _serialize_batch(b) if b else None

    async def create_run(
        self,
        *,
        user_id: str,
        batch_id: Optional[str] = None,
        job_id: Optional[str] = None,
        instruction_prompt: str,
        filters: Optional[dict[str, Any]],
    ) -> dict[str, Any]:
        uid = _to_int(user_id)
        bid = _to_int(batch_id) if batch_id is not None else None
        jid = _to_int(job_id) if job_id is not None else None
        if uid is None:
            raise ValueError("Invalid user_id")
        if (bid is None) == (jid is None):
            raise ValueError("Provide exactly one of batch_id or job_id")
        with get_session() as session:
            run = ScreeningRun(
                user_id=uid,
                batch_id=bid,
                job_id=jid,
                instruction_prompt=instruction_prompt,
                filters=filters or {},
                status="pending",
                candidate_count=0,
            )
            session.add(run)
            session.flush()
            session.refresh(run)
            return _serialize_run(run)

    # ---- Job-based screening source ----

    async def get_job_for_user(self, *, job_id: str, user_id: str) -> Optional[dict[str, Any]]:
        jid = _to_int(job_id)
        uid = _to_int(user_id)
        if jid is None or uid is None:
            return None
        with get_session() as session:
            j = session.execute(
                select(Job).where(Job.id == jid, Job.recruiter_user_id == uid)
            ).scalar_one_or_none()
            if j is None:
                return None
            return {
                "id": str(j.id),
                "title": j.title,
                "company_name": j.company_name,
                "description": j.description or "",
                "location": j.location,
                "salary_range": j.salary_range,
                "experience": j.experience,
                "type": j.type,
            }

    async def get_applicants_with_profile_for_job(
        self, *, job_id: str
    ) -> list[dict[str, Any]]:
        """
        Returns applicants for a job in the same shape consumed by ScreeningService:
          [{ upload_item_id, profile_json }]
        Note: for job-applications mode the "upload_item_id" key is the
        application_id — keeps the screening loop unchanged.
        """
        jid = _to_int(job_id)
        if jid is None:
            return []
        with get_session() as session:
            rows = session.execute(
                select(JobApplication.id, JobApplication.profile_json).where(
                    JobApplication.job_id == jid
                )
            ).all()
            return [
                {"upload_item_id": str(app_id), "profile_json": profile_json or {}}
                for app_id, profile_json in rows
            ]

    async def set_run_status(
        self,
        *,
        run_id: str,
        status: str,
        candidate_count: Optional[int] = None,
        error_message: Optional[str] = None,
    ) -> None:
        rid = _to_int(run_id)
        if rid is None:
            return
        with get_session() as session:
            run = session.get(ScreeningRun, rid)
            if run is None:
                return
            run.status = status
            if candidate_count is not None:
                run.candidate_count = candidate_count
            if error_message is not None:
                run.error_message = error_message

    async def add_result(
        self,
        *,
        run_id: str,
        upload_item_id: str,
        score: float,
        rationale: str,
        matched_skills: list[str],
        highlights: dict[str, Any],
        profile_json: dict[str, Any],
    ) -> None:
        rid = _to_int(run_id)
        iid = _to_int(upload_item_id)
        if rid is None or iid is None:
            return
        with get_session() as session:
            session.add(
                ScreeningResult(
                    run_id=rid,
                    upload_item_id=iid,
                    score=float(score),
                    rationale=rationale,
                    matched_skills=matched_skills or [],
                    highlights=highlights or {},
                    profile_json=profile_json or {},
                )
            )

    async def list_runs_for_user(self, *, user_id: str) -> list[dict[str, Any]]:
        uid = _to_int(user_id)
        if uid is None:
            return []
        with get_session() as session:
            stmt = (
                select(ScreeningRun, Job.title)
                .outerjoin(Job, Job.id == ScreeningRun.job_id)
                .where(ScreeningRun.user_id == uid)
                .order_by(ScreeningRun.created_at.desc())
            )
            rows = session.execute(stmt).all()
            out: list[dict[str, Any]] = []
            for run, job_title in rows:
                d = _serialize_run(run)
                d["job_title"] = job_title
                out.append(d)
            return out

    async def get_run_for_user(self, *, run_id: str, user_id: str) -> Optional[dict[str, Any]]:
        rid = _to_int(run_id)
        uid = _to_int(user_id)
        if rid is None or uid is None:
            return None
        with get_session() as session:
            run = session.execute(
                select(ScreeningRun).where(ScreeningRun.id == rid, ScreeningRun.user_id == uid)
            ).scalar_one_or_none()
            return _serialize_run(run) if run else None

    async def list_results_for_run(self, *, run_id: str) -> list[dict[str, Any]]:
        rid = _to_int(run_id)
        if rid is None:
            return []
        with get_session() as session:
            rows = session.execute(
                select(ScreeningResult)
                .where(ScreeningResult.run_id == rid)
                .order_by(ScreeningResult.score.desc())
            ).scalars().all()
            return [_serialize_result(r) for r in rows]

    async def get_parsed_candidates_for_batch(
        self, *, batch_id: str, user_id: str
    ) -> list[dict[str, Any]]:
        bid = _to_int(batch_id)
        uid = _to_int(user_id)
        if bid is None or uid is None:
            return []
        with get_session() as session:
            stmt = (
                select(UploadItem.id, ParsedProfile.profile_json)
                .join(ParsedProfile, ParsedProfile.upload_item_id == UploadItem.id)
                .where(
                    UploadItem.batch_id == bid,
                    UploadItem.user_id == uid,
                    UploadItem.status == "parsed_ok",
                )
            )
            rows = session.execute(stmt).all()
            return [
                {"upload_item_id": str(item_id), "profile_json": profile_json or {}}
                for item_id, profile_json in rows
            ]
