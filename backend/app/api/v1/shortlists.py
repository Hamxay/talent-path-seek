from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends
from fastapi.responses import Response
from pydantic import BaseModel, Field

from app.core.security import get_current_user
from app.services.shortlist_service import ShortlistService


router = APIRouter(prefix="/recruiter/shortlists")


class CreateShortlistRequest(BaseModel):
    run_id: str = Field(min_length=1)
    name: Optional[str] = None
    selected_upload_item_ids: Optional[list[str]] = None
    notes: Optional[dict[str, str]] = None


@router.post("")
async def create_shortlist(payload: CreateShortlistRequest, current_user: dict = Depends(get_current_user)):
    return await ShortlistService().create_shortlist(
        current_user=current_user,
        run_id=payload.run_id,
        name=payload.name,
        selected_upload_item_ids=payload.selected_upload_item_ids,
        notes=payload.notes,
    )


@router.get("")
async def list_shortlists(current_user: dict = Depends(get_current_user)):
    return await ShortlistService().list_shortlists(current_user=current_user)


@router.get("/{shortlist_id}")
async def get_shortlist(shortlist_id: str, current_user: dict = Depends(get_current_user)):
    return await ShortlistService().get_shortlist(current_user=current_user, shortlist_id=shortlist_id)


@router.delete("/{shortlist_id}/items/{item_id}")
async def delete_shortlist_item(shortlist_id: str, item_id: str, current_user: dict = Depends(get_current_user)):
    return await ShortlistService().remove_shortlist_item(
        current_user=current_user,
        shortlist_id=shortlist_id,
        item_id=item_id,
    )


@router.get("/{shortlist_id}/export-csv")
async def export_shortlist_csv(shortlist_id: str, current_user: dict = Depends(get_current_user)):
    csv_text = await ShortlistService().export_shortlist_csv(current_user=current_user, shortlist_id=shortlist_id)
    return Response(
        content=csv_text,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="shortlist-{shortlist_id}.csv"'},
    )

