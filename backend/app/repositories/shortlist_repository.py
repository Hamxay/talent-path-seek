from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import select

from app.db.models import ScreeningResult, ScreeningRun, Shortlist, ShortlistItem
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
    }


def _serialize_shortlist(s: Shortlist) -> dict[str, Any]:
    return {
        "id": str(s.id),
        "user_id": str(s.user_id),
        "run_id": str(s.run_id),
        "name": s.name,
        "created_at": s.created_at,
        "updated_at": s.updated_at,
    }


def _serialize_item(it: ShortlistItem) -> dict[str, Any]:
    return {
        "id": str(it.id),
        "shortlist_id": str(it.shortlist_id),
        "upload_item_id": str(it.upload_item_id),
        "score": it.score,
        "rationale": it.rationale,
        "matched_skills": it.matched_skills or [],
        "highlights": it.highlights or {},
        "profile_json": it.profile_json or {},
        "note": it.note,
        "created_at": it.created_at,
        "updated_at": it.updated_at,
    }


class ShortlistRepository:
    async def ensure_indexes(self) -> None:
        return None

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

    async def create_shortlist(self, *, user_id: str, run_id: str, name: str) -> dict[str, Any]:
        uid = _to_int(user_id)
        rid = _to_int(run_id)
        if uid is None or rid is None:
            raise ValueError("Invalid user_id or run_id")
        with get_session() as session:
            sl = Shortlist(user_id=uid, run_id=rid, name=name)
            session.add(sl)
            session.flush()
            session.refresh(sl)
            return _serialize_shortlist(sl)

    async def add_shortlist_item(
        self,
        *,
        shortlist_id: str,
        upload_item_id: str,
        score: float,
        rationale: str,
        matched_skills: list[str],
        highlights: dict[str, Any],
        profile_json: dict[str, Any],
        note: Optional[str],
    ) -> dict[str, Any]:
        sid = _to_int(shortlist_id)
        iid = _to_int(upload_item_id)
        if sid is None or iid is None:
            raise ValueError("Invalid shortlist_id or upload_item_id")
        with get_session() as session:
            it = ShortlistItem(
                shortlist_id=sid,
                upload_item_id=iid,
                score=float(score),
                rationale=rationale,
                matched_skills=matched_skills or [],
                highlights=highlights or {},
                profile_json=profile_json or {},
                note=note or None,
            )
            session.add(it)
            session.flush()
            session.refresh(it)
            return _serialize_item(it)

    async def list_shortlists_for_user(self, *, user_id: str) -> list[dict[str, Any]]:
        uid = _to_int(user_id)
        if uid is None:
            return []
        with get_session() as session:
            rows = session.execute(
                select(Shortlist).where(Shortlist.user_id == uid).order_by(Shortlist.created_at.desc())
            ).scalars().all()
            return [_serialize_shortlist(s) for s in rows]

    async def get_shortlist_for_user(
        self, *, shortlist_id: str, user_id: str
    ) -> Optional[dict[str, Any]]:
        sid = _to_int(shortlist_id)
        uid = _to_int(user_id)
        if sid is None or uid is None:
            return None
        with get_session() as session:
            sl = session.execute(
                select(Shortlist).where(Shortlist.id == sid, Shortlist.user_id == uid)
            ).scalar_one_or_none()
            return _serialize_shortlist(sl) if sl else None

    async def list_shortlist_items(self, *, shortlist_id: str) -> list[dict[str, Any]]:
        sid = _to_int(shortlist_id)
        if sid is None:
            return []
        with get_session() as session:
            rows = session.execute(
                select(ShortlistItem)
                .where(ShortlistItem.shortlist_id == sid)
                .order_by(ShortlistItem.score.desc())
            ).scalars().all()
            return [_serialize_item(i) for i in rows]

    async def delete_shortlist_item_for_user(
        self, *, shortlist_id: str, item_id: str, user_id: str
    ) -> bool:
        sid = _to_int(shortlist_id)
        iid = _to_int(item_id)
        uid = _to_int(user_id)
        if sid is None or iid is None or uid is None:
            return False
        with get_session() as session:
            sl = session.execute(
                select(Shortlist).where(Shortlist.id == sid, Shortlist.user_id == uid)
            ).scalar_one_or_none()
            if sl is None:
                return False
            it = session.execute(
                select(ShortlistItem).where(
                    ShortlistItem.id == iid, ShortlistItem.shortlist_id == sid
                )
            ).scalar_one_or_none()
            if it is None:
                return False
            session.delete(it)
            return True
