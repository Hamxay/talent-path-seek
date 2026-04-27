from __future__ import annotations

from fastapi import APIRouter, BackgroundTasks, Depends, File, UploadFile

from app.core.security import get_current_user
from app.services.upload_service import UploadService


router = APIRouter(prefix="/recruiter/uploads")


@router.post("/batches")
async def create_upload_batch(
    background_tasks: BackgroundTasks,
    files: list[UploadFile] = File(...),
    current_user: dict = Depends(get_current_user),
):
    return await UploadService().create_batch(current_user=current_user, files=files, background_tasks=background_tasks)


@router.get("/batches/{batch_id}")
async def get_upload_batch(batch_id: str, current_user: dict = Depends(get_current_user)):
    return await UploadService().get_batch(current_user=current_user, batch_id=batch_id)


@router.get("/batches/{batch_id}/items")
async def list_upload_items(batch_id: str, current_user: dict = Depends(get_current_user)):
    return await UploadService().list_items(current_user=current_user, batch_id=batch_id)


@router.post("/items/{item_id}/reparse")
async def reparse_upload_item(item_id: str, current_user: dict = Depends(get_current_user)):
    return await UploadService().reparse_item(current_user=current_user, item_id=item_id)

