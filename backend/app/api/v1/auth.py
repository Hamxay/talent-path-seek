from __future__ import annotations

from fastapi import APIRouter, Depends

from app.core.security import get_current_user
from app.schemas.auth import (
    LoginRequest,
    MessageResponse,
    RefreshRequest,
    RegisterRequest,
    TokenResponse,
)
from app.schemas.user import UserPublic
from app.services.auth_service import AuthService


router = APIRouter()
me_router = APIRouter()


@router.post("/register", response_model=TokenResponse)
async def register(payload: RegisterRequest):
    return await AuthService().register(
        name=payload.name,
        email=payload.email,
        password=payload.password,
        role=payload.role,
        company_name=payload.company_name,
    )


@router.post("/login", response_model=TokenResponse)
async def login(payload: LoginRequest):
    return await AuthService().login(email=payload.email, password=payload.password)


@router.post("/refresh", response_model=TokenResponse)
async def refresh(payload: RefreshRequest):
    return await AuthService().refresh(refresh_token=payload.refresh_token)


@router.post("/logout", response_model=MessageResponse)
async def logout(current_user: dict = Depends(get_current_user)):
    return await AuthService().logout(user_id=current_user["id"])


@me_router.get("/me", response_model=UserPublic)
async def me(current_user: dict = Depends(get_current_user)):
    # current_user is already sanitized in the schema layer
    return current_user

