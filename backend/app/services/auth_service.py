from __future__ import annotations

from fastapi import HTTPException, status
from pymongo.errors import DuplicateKeyError

from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.repositories.user_repository import UserRepository


def _public_user(user: dict) -> dict:
    user = dict(user)
    user.pop("password_hash", None)
    user.pop("refresh_jti", None)
    return user


class AuthService:
    def __init__(self) -> None:
        self.users = UserRepository()

    async def register(
        self,
        *,
        name: str,
        email: str,
        password: str,
        role: str,
        company_name: str | None,
    ) -> dict:
        if role not in ("candidate", "recruiter"):
            raise HTTPException(status_code=400, detail="Invalid role")
        if role == "recruiter" and not (company_name and company_name.strip()):
            raise HTTPException(status_code=400, detail="company_name is required for recruiters")

        pw_hash = hash_password(password)
        try:
            user = await self.users.create_user(
                name=name,
                email=email,
                password_hash=pw_hash,
                role=role,
                company_name=company_name if role == "recruiter" else None,
            )
        except DuplicateKeyError:
            raise HTTPException(status_code=409, detail="Email already registered")

        access = create_access_token(subject=user["id"])
        refresh, refresh_jti = create_refresh_token(subject=user["id"])
        await self.users.set_refresh_jti(user["id"], refresh_jti)

        return {
            "access_token": access,
            "refresh_token": refresh,
            "token_type": "bearer",
            "user": _public_user(user),
        }

    async def login(self, *, email: str, password: str) -> dict:
        user = await self.users.get_by_email(email)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        if not verify_password(password, user["password_hash"]):
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

        access = create_access_token(subject=user["id"])
        refresh, refresh_jti = create_refresh_token(subject=user["id"])
        await self.users.set_refresh_jti(user["id"], refresh_jti)

        return {
            "access_token": access,
            "refresh_token": refresh,
            "token_type": "bearer",
            "user": _public_user(user),
        }

    async def refresh(self, *, refresh_token: str) -> dict:
        try:
            payload = decode_token(refresh_token)
        except Exception:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        if payload.get("type") != "refresh":
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        user_id = payload.get("sub")
        jti = payload.get("jti")
        if not user_id or not jti:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        user = await self.users.get_by_id(user_id)
        if not user:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")

        # Simple "logout" support: only the latest refresh token works.
        if user.get("refresh_jti") != jti:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token expired")

        access = create_access_token(subject=user["id"])
        new_refresh, new_refresh_jti = create_refresh_token(subject=user["id"])
        await self.users.set_refresh_jti(user["id"], new_refresh_jti)

        return {
            "access_token": access,
            "refresh_token": new_refresh,
            "token_type": "bearer",
            "user": _public_user(user),
        }

    async def logout(self, *, user_id: str) -> dict:
        await self.users.set_refresh_jti(user_id, None)
        return {"message": "Logged out"}

