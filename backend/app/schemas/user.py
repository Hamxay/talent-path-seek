from __future__ import annotations

from datetime import datetime
from typing import Literal, Optional

from pydantic import BaseModel, EmailStr, Field


UserRole = Literal["candidate", "recruiter"]


class UserPublic(BaseModel):
    id: str
    name: str
    email: EmailStr
    role: UserRole
    company_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime


class UserInDB(BaseModel):
    id: str
    name: str
    email: EmailStr
    password_hash: str
    role: UserRole
    company_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    # Stored server-side to support logout/rotation for refresh tokens
    refresh_jti: Optional[str] = Field(default=None)

