from __future__ import annotations

from typing import Any, Optional

from sqlalchemy import select

from app.db.models import ParsedProfile, UploadBatch, UploadItem
from app.db.postgres import get_session


def _to_int(s: str) -> Optional[int]:
    try:
        return int(s)
    except (ValueError, TypeError):
        return None


def _serialize_batch(b: UploadBatch) -> dict[str, Any]:
    return {
        "id": str(b.id),
        "user_id": str(b.user_id),
        "total_items": b.total_items,
        "processed_items": b.processed_items,
        "failed_items": b.failed_items,
        "status": b.status,
        "created_at": b.created_at,
        "updated_at": b.updated_at,
    }


def _serialize_item(it: UploadItem) -> dict[str, Any]:
    return {
        "id": str(it.id),
        "batch_id": str(it.batch_id),
        "user_id": str(it.user_id),
        "filename": it.filename,
        "content_type": it.content_type,
        "size_bytes": it.size_bytes,
        "file_path": it.file_path,
        "status": it.status,
        "raw_text": it.raw_text,
        "error_message": it.error_message,
        "created_at": it.created_at,
        "updated_at": it.updated_at,
    }


class UploadRepository:
    async def ensure_indexes(self) -> None:
        return None

    # ---- Batches ----

    async def create_batch(self, *, user_id: str, total_items: int) -> dict[str, Any]:
        uid = _to_int(user_id)
        if uid is None:
            raise ValueError("Invalid user_id")
        with get_session() as session:
            b = UploadBatch(user_id=uid, total_items=total_items, status="processing")
            session.add(b)
            session.flush()
            session.refresh(b)
            return _serialize_batch(b)

    async def get_batch_by_id(self, *, batch_id: str) -> Optional[dict[str, Any]]:
        bid = _to_int(batch_id)
        if bid is None:
            return None
        with get_session() as session:
            b = session.get(UploadBatch, bid)
            return _serialize_batch(b) if b else None

    async def get_batch_by_id_and_user(self, *, batch_id: str, user_id: str) -> Optional[dict[str, Any]]:
        bid = _to_int(batch_id)
        uid = _to_int(user_id)
        if bid is None or uid is None:
            return None
        with get_session() as session:
            b = session.execute(
                select(UploadBatch).where(UploadBatch.id == bid, UploadBatch.user_id == uid)
            ).scalar_one_or_none()
            return _serialize_batch(b) if b else None

    # ---- Items ----

    async def create_item(
        self,
        *,
        batch_id: str,
        user_id: str,
        filename: str,
        content_type: str,
        size_bytes: int,
        file_path: str,
    ) -> dict[str, Any]:
        bid = _to_int(batch_id)
        uid = _to_int(user_id)
        if bid is None or uid is None:
            raise ValueError("Invalid batch_id or user_id")
        with get_session() as session:
            it = UploadItem(
                batch_id=bid,
                user_id=uid,
                filename=filename,
                content_type=content_type,
                size_bytes=size_bytes,
                file_path=file_path,
                status="pending",
            )
            session.add(it)
            session.flush()
            session.refresh(it)
            return _serialize_item(it)

    async def list_items_for_batch(self, *, batch_id: str, user_id: str) -> list[dict[str, Any]]:
        bid = _to_int(batch_id)
        uid = _to_int(user_id)
        if bid is None or uid is None:
            return []
        with get_session() as session:
            rows = session.execute(
                select(UploadItem)
                .where(UploadItem.batch_id == bid, UploadItem.user_id == uid)
                .order_by(UploadItem.created_at.asc())
            ).scalars().all()
            return [_serialize_item(i) for i in rows]

    async def set_item_status(
        self,
        *,
        item_id: str,
        status: str,
        raw_text: Optional[str] = None,
        error_message: Optional[str] = None,
    ) -> None:
        iid = _to_int(item_id)
        if iid is None:
            return
        with get_session() as session:
            it = session.get(UploadItem, iid)
            if it is None:
                return
            it.status = status
            if raw_text is not None:
                it.raw_text = raw_text
            if error_message is not None:
                it.error_message = error_message

    async def set_item_file_path(self, *, item_id: str, file_path: str) -> None:
        iid = _to_int(item_id)
        if iid is None:
            return
        with get_session() as session:
            it = session.get(UploadItem, iid)
            if it is None:
                return
            it.file_path = file_path

    async def increment_batch_progress(self, *, batch_id: str, failed: bool) -> None:
        bid = _to_int(batch_id)
        if bid is None:
            return
        with get_session() as session:
            b = session.get(UploadBatch, bid)
            if b is None:
                return
            b.processed_items = (b.processed_items or 0) + 1
            if failed:
                b.failed_items = (b.failed_items or 0) + 1
            if b.processed_items >= (b.total_items or 0):
                b.status = "completed"

    # ---- Parsed profiles ----

    async def upsert_parsed_profile(
        self,
        *,
        upload_item_id: str,
        raw_text: str,
        profile_json: dict[str, Any],
        parser_provider: str,
        parser_model: str,
        parser_prompt_version: str,
    ) -> None:
        iid = _to_int(upload_item_id)
        if iid is None:
            return
        with get_session() as session:
            existing = session.execute(
                select(ParsedProfile).where(ParsedProfile.upload_item_id == iid)
            ).scalar_one_or_none()
            if existing is None:
                session.add(
                    ParsedProfile(
                        upload_item_id=iid,
                        raw_text=raw_text,
                        profile_json=profile_json or {},
                        parser_provider=parser_provider,
                        parser_model=parser_model,
                        parser_prompt_version=parser_prompt_version,
                    )
                )
            else:
                existing.raw_text = raw_text
                existing.profile_json = profile_json or {}
                existing.parser_provider = parser_provider
                existing.parser_model = parser_model
                existing.parser_prompt_version = parser_prompt_version
