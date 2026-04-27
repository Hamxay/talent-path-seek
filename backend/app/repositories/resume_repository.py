from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import select, update

from app.db.models import Resume
from app.db.postgres import get_session


def _to_int(s: str) -> Optional[int]:
    try:
        return int(s)
    except (ValueError, TypeError):
        return None


def _serialize(r: Resume) -> dict[str, Any]:
    return {
        "id": str(r.id),
        "user_id": str(r.user_id),
        "title": r.title,
        "resume_json": r.resume_json or {},
        "is_primary": r.is_primary,
        "created_at": r.created_at,
        "updated_at": r.updated_at,
    }


class ResumeRepository:
    async def ensure_indexes(self) -> None:
        # Indexes are declared on the model. Method kept for service compatibility.
        return None

    async def list_by_user(self, user_id: str) -> list[dict[str, Any]]:
        uid = _to_int(user_id)
        if uid is None:
            return []
        with get_session() as session:
            rows = session.execute(
                select(Resume).where(Resume.user_id == uid).order_by(Resume.updated_at.desc())
            ).scalars().all()
            return [_serialize(r) for r in rows]

    async def get_by_id(self, resume_id: str) -> Optional[dict[str, Any]]:
        rid = _to_int(resume_id)
        if rid is None:
            return None
        with get_session() as session:
            r = session.get(Resume, rid)
            return _serialize(r) if r else None

    async def get_by_id_and_user(self, resume_id: str, user_id: str) -> Optional[dict[str, Any]]:
        rid = _to_int(resume_id)
        uid = _to_int(user_id)
        if rid is None or uid is None:
            return None
        with get_session() as session:
            r = session.execute(
                select(Resume).where(Resume.id == rid, Resume.user_id == uid)
            ).scalar_one_or_none()
            return _serialize(r) if r else None

    async def create(
        self,
        *,
        user_id: str,
        title: str,
        resume_json: dict[str, Any],
        is_primary: bool,
    ) -> dict[str, Any]:
        uid = _to_int(user_id)
        if uid is None:
            raise ValueError("Invalid user_id")
        with get_session() as session:
            r = Resume(
                user_id=uid,
                title=title.strip(),
                resume_json=resume_json or {},
                is_primary=is_primary,
            )
            session.add(r)
            session.flush()
            session.refresh(r)
            return _serialize(r)

    async def update_by_id_and_user(
        self,
        *,
        resume_id: str,
        user_id: str,
        updates: dict[str, Any],
    ) -> Optional[dict[str, Any]]:
        rid = _to_int(resume_id)
        uid = _to_int(user_id)
        if rid is None or uid is None:
            return None
        with get_session() as session:
            r = session.execute(
                select(Resume).where(Resume.id == rid, Resume.user_id == uid)
            ).scalar_one_or_none()
            if r is None:
                return None
            for k, v in updates.items():
                if hasattr(r, k):
                    setattr(r, k, v)
            session.flush()
            session.refresh(r)
            return _serialize(r)

    async def delete_by_id_and_user(self, resume_id: str, user_id: str) -> bool:
        rid = _to_int(resume_id)
        uid = _to_int(user_id)
        if rid is None or uid is None:
            return False
        with get_session() as session:
            r = session.execute(
                select(Resume).where(Resume.id == rid, Resume.user_id == uid)
            ).scalar_one_or_none()
            if r is None:
                return False
            session.delete(r)
            return True

    async def unset_primary_for_user(self, user_id: str) -> None:
        uid = _to_int(user_id)
        if uid is None:
            return
        with get_session() as session:
            session.execute(
                update(Resume).where(Resume.user_id == uid).values(is_primary=False)
            )
