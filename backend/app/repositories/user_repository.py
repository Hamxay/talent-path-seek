from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import select

from app.db.models import User
from app.db.postgres import get_session


def _to_int_id(s: str) -> Optional[int]:
    try:
        return int(s)
    except (ValueError, TypeError):
        return None


def _serialize(u: User) -> dict[str, Any]:
    return {
        "id": str(u.id),
        "name": u.name,
        "email": u.email,
        "password_hash": u.password_hash,
        "role": u.role,
        "company_name": u.company_name,
        "refresh_jti": u.refresh_jti,
        "created_at": u.created_at,
        "updated_at": u.updated_at,
    }


class UserRepository:
    async def get_by_email(self, email: str) -> Optional[dict[str, Any]]:
        with get_session() as session:
            user = session.execute(
                select(User).where(User.email == email.lower().strip())
            ).scalar_one_or_none()
            return _serialize(user) if user else None

    async def get_by_id(self, user_id: str) -> Optional[dict[str, Any]]:
        uid = _to_int_id(user_id)
        if uid is None:
            return None
        with get_session() as session:
            user = session.get(User, uid)
            return _serialize(user) if user else None

    async def create_user(
        self,
        *,
        name: str,
        email: str,
        password_hash: str,
        role: str,
        company_name: Optional[str],
    ) -> dict[str, Any]:
        with get_session() as session:
            user = User(
                name=name.strip(),
                email=email.lower().strip(),
                password_hash=password_hash,
                role=role,
                company_name=company_name.strip() if company_name else None,
                refresh_jti=None,
            )
            session.add(user)
            session.flush()
            session.refresh(user)
            return _serialize(user)

    async def set_refresh_jti(self, user_id: str, refresh_jti: Optional[str]) -> None:
        uid = _to_int_id(user_id)
        if uid is None:
            return
        with get_session() as session:
            user = session.get(User, uid)
            if user is None:
                return
            user.refresh_jti = refresh_jti
