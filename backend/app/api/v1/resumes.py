from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status

from app.core.security import get_current_user
from app.schemas.resume import (
    PromptPrefillRequest,
    PromptPrefillResponse,
    ResumeCreate,
    ResumePublic,
    ResumeUpdate,
)
from app.services.resume_service import ResumeService
from app.services.ai_service import AIService, AIServiceError


router = APIRouter(prefix="/resumes")


@router.get("/me", response_model=list[ResumePublic])
async def list_my_resumes(current_user: dict = Depends(get_current_user)):
    return await ResumeService().list_me(current_user=current_user)


@router.post("", response_model=ResumePublic, status_code=status.HTTP_201_CREATED)
async def create_resume(payload: ResumeCreate, current_user: dict = Depends(get_current_user)):
    return await ResumeService().create(
        current_user=current_user,
        title=payload.title,
        resume_json=payload.resume_json.model_dump(),
        is_primary=payload.is_primary,
    )


@router.get("/{resume_id}", response_model=ResumePublic)
async def get_resume(resume_id: str, current_user: dict = Depends(get_current_user)):
    return await ResumeService().get(current_user=current_user, resume_id=resume_id)


@router.put("/{resume_id}", response_model=ResumePublic)
async def update_resume(resume_id: str, payload: ResumeUpdate, current_user: dict = Depends(get_current_user)):
    updates = {}
    if payload.title is not None:
        updates["title"] = payload.title
    if payload.resume_json is not None:
        updates["resume_json"] = payload.resume_json.model_dump()
    if payload.is_primary is not None:
        updates["is_primary"] = payload.is_primary

    return await ResumeService().update(current_user=current_user, resume_id=resume_id, updates=updates)


@router.delete("/{resume_id}")
async def delete_resume(resume_id: str, current_user: dict = Depends(get_current_user)):
    return await ResumeService().delete(current_user=current_user, resume_id=resume_id)


@router.post("/{resume_id}/prefill-from-prompt", response_model=PromptPrefillResponse)
async def prefill_from_prompt(
    resume_id: str,
    payload: PromptPrefillRequest,
    current_user: dict = Depends(get_current_user),
):
    # Validate ownership using existing service (candidate-only + no-leak 404)
    resume = await ResumeService().get(current_user=current_user, resume_id=resume_id)
    try:
        result = await AIService().prefill_resume_from_prompt(
            prompt=payload.prompt,
            current_resume_json=resume.get("resume_json") or {},
        )
        return result
    except AIServiceError as e:
        msg = str(e)
        if "API_KEY is missing" in msg:
            raise HTTPException(status_code=400, detail=msg)
        raise HTTPException(status_code=502, detail=msg)

