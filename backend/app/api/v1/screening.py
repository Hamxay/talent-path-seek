from __future__ import annotations

from typing import Any, Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field, model_validator

from app.core.security import get_current_user
from app.services.screening_service import ScreeningService


router = APIRouter(prefix="/recruiter/screening")


class ScreeningRunCreateRequest(BaseModel):
    # Provide exactly one of batch_id or job_id.
    batch_id: Optional[str] = Field(default=None, min_length=1)
    job_id: Optional[str] = Field(default=None, min_length=1)
    # Free-text recruiter notes. Optional in job mode (the JD becomes the basis);
    # required in batch mode (no other context for the AI).
    instruction_prompt: str = Field(default="", max_length=4000)
    filters: Optional[dict[str, Any]] = None

    @model_validator(mode="after")
    def _validate(self) -> "ScreeningRunCreateRequest":
        if bool(self.batch_id) == bool(self.job_id):
            raise ValueError("Provide exactly one of batch_id or job_id")
        if self.batch_id and not (self.instruction_prompt or "").strip():
            raise ValueError("instruction_prompt is required when sourcing from a batch")
        return self


@router.post("/runs")
async def create_screening_run(
    payload: ScreeningRunCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    return await ScreeningService().create_run(
        current_user=current_user,
        batch_id=payload.batch_id,
        job_id=payload.job_id,
        instruction_prompt=payload.instruction_prompt,
        filters=payload.filters,
    )


@router.get("/runs")
async def list_screening_runs(current_user: dict = Depends(get_current_user)):
    return await ScreeningService().list_runs(current_user=current_user)


@router.get("/runs/{run_id}")
async def get_screening_run(run_id: str, current_user: dict = Depends(get_current_user)):
    return await ScreeningService().get_run(current_user=current_user, run_id=run_id)
