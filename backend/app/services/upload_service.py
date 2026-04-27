from __future__ import annotations

from pathlib import Path
from typing import Any

from fastapi import BackgroundTasks, HTTPException, UploadFile, status

from app.repositories.upload_repository import UploadRepository
from app.services.ai_service import AIService, AIServiceError
from app.services.pdf_extraction_service import PdfExtractionService


UPLOADS_DIR = Path(__file__).resolve().parents[2] / "uploads"
MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10MB (prototype-friendly)


def _require_recruiter(user: dict) -> None:
    if user.get("role") != "recruiter":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Recruiter access required")


class UploadService:
    def __init__(self) -> None:
        self.repo = UploadRepository()
        self.pdf = PdfExtractionService()
        self.ai = AIService()

    async def create_batch(
        self,
        *,
        current_user: dict,
        files: list[UploadFile],
        background_tasks: BackgroundTasks,
    ) -> dict[str, Any]:
        _require_recruiter(current_user)
        await self.repo.ensure_indexes()

        if not files:
            raise HTTPException(status_code=400, detail="No files uploaded")

        batch = await self.repo.create_batch(user_id=current_user["id"], total_items=len(files))
        batch_id = batch["id"]

        batch_dir = UPLOADS_DIR / batch_id
        batch_dir.mkdir(parents=True, exist_ok=True)

        items: list[dict[str, Any]] = []

        for f in files:
            filename = (f.filename or "resume.pdf").strip()
            content_type = (f.content_type or "").lower()

            # Validate PDF
            if content_type not in ("application/pdf", "application/x-pdf") and not filename.lower().endswith(".pdf"):
                raise HTTPException(status_code=400, detail=f"Only PDF files are allowed. Got: {filename}")

            data = await f.read()
            size_bytes = len(data)
            if size_bytes == 0:
                raise HTTPException(status_code=400, detail=f"Empty file: {filename}")
            if size_bytes > MAX_FILE_SIZE_BYTES:
                raise HTTPException(status_code=400, detail=f"File too large (max 10MB): {filename}")

            # Create DB item first to get item_id
            placeholder_path = str((batch_dir / "pending").resolve())
            item = await self.repo.create_item(
                batch_id=batch_id,
                user_id=current_user["id"],
                filename=filename,
                content_type=content_type or "application/pdf",
                size_bytes=size_bytes,
                file_path=placeholder_path,
            )
            item_id = item["id"]

            safe_name = f"{item_id}.pdf"
            file_path = batch_dir / safe_name
            with open(file_path, "wb") as out:
                out.write(data)

            # Persist the real on-disk path now that the file is written.
            await self.repo.set_item_status(item_id=item_id, status="pending")
            await self.repo.set_item_file_path(item_id=item_id, file_path=str(file_path.resolve()))

            items.append(item)

            background_tasks.add_task(self._process_item, batch_id, item_id, str(file_path))

        return {"batch": batch, "items": items}

    async def get_batch(self, *, current_user: dict, batch_id: str) -> dict[str, Any]:
        _require_recruiter(current_user)
        batch = await self.repo.get_batch_by_id_and_user(batch_id=batch_id, user_id=current_user["id"])
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        return batch

    async def reparse_item(self, *, current_user: dict, item_id: str) -> dict[str, Any]:
        """
        Run the AI parsing pass again for a single upload item. Useful when the
        first attempt failed (e.g. AI returned malformed JSON or rate-limited).
        The PDF on disk is reused; no re-upload required.
        """
        _require_recruiter(current_user)

        # Locate the item and verify ownership via its parent batch.
        item_doc = await self.repo.items_get_by_id(item_id=item_id) if hasattr(self.repo, "items_get_by_id") else None
        if not item_doc:
            # Fallback: list items for each of the user's batches isn't efficient,
            # so just look up directly by id with a session.
            from sqlalchemy import select
            from app.db.models import UploadItem
            from app.db.postgres import get_session

            with get_session() as session:
                row = session.execute(
                    select(UploadItem).where(UploadItem.id == int(item_id))
                ).scalar_one_or_none()
                if row is None:
                    raise HTTPException(status_code=404, detail="Item not found")
                if str(row.user_id) != str(current_user["id"]):
                    raise HTTPException(status_code=404, detail="Item not found")
                file_path = row.file_path
                batch_id = str(row.batch_id)
                raw_text_existing = row.raw_text or ""

        # Reset status to pending and clear any previous error.
        await self.repo.set_item_status(item_id=item_id, status="pending", error_message=None)

        try:
            text = raw_text_existing or self.pdf.extract_text(file_path)
            if not text:
                await self.repo.set_item_status(
                    item_id=item_id,
                    status="parsed_failed",
                    raw_text="",
                    error_message="No extractable text found in PDF",
                )
                return await self._fresh_item(item_id=item_id)

            await self.repo.set_item_status(item_id=item_id, status="text_extracted", raw_text=text, error_message=None)

            try:
                parsed = await self.ai.parse_cv_text_to_profile(raw_text=text)
                profile_json = parsed["profile_json"]
                meta = parsed["provider_metadata"]
                await self.repo.upsert_parsed_profile(
                    upload_item_id=item_id,
                    raw_text=text,
                    profile_json=profile_json,
                    parser_provider=meta.get("provider", "unknown"),
                    parser_model=meta.get("model", "unknown"),
                    parser_prompt_version=meta.get("prompt_version", "unknown"),
                )
                await self.repo.set_item_status(item_id=item_id, status="parsed_ok", error_message=None)
            except (AIServiceError, Exception) as e:
                await self.repo.set_item_status(item_id=item_id, status="parsed_failed", error_message=str(e))
        except Exception as e:
            await self.repo.set_item_status(item_id=item_id, status="parsed_failed", raw_text="", error_message=str(e))

        return await self._fresh_item(item_id=item_id)

    async def _fresh_item(self, *, item_id: str) -> dict[str, Any]:
        from sqlalchemy import select
        from app.db.models import UploadItem
        from app.db.postgres import get_session

        with get_session() as session:
            row = session.execute(select(UploadItem).where(UploadItem.id == int(item_id))).scalar_one_or_none()
            if row is None:
                raise HTTPException(status_code=404, detail="Item not found")
            return {
                "id": str(row.id),
                "batch_id": str(row.batch_id),
                "filename": row.filename,
                "status": row.status,
                "error_message": row.error_message,
            }

    async def list_items(self, *, current_user: dict, batch_id: str) -> list[dict[str, Any]]:
        _require_recruiter(current_user)
        # Ensure batch exists and belongs to user
        batch = await self.repo.get_batch_by_id_and_user(batch_id=batch_id, user_id=current_user["id"])
        if not batch:
            raise HTTPException(status_code=404, detail="Batch not found")
        return await self.repo.list_items_for_batch(batch_id=batch_id, user_id=current_user["id"])

    async def _process_item(self, batch_id: str, item_id: str, file_path: str) -> None:
        try:
            text = self.pdf.extract_text(file_path)
            if not text:
                await self.repo.set_item_status(
                    item_id=item_id,
                    status="parsed_failed",
                    raw_text="",
                    error_message="No extractable text found in PDF",
                )
                await self.repo.increment_batch_progress(batch_id=batch_id, failed=True)
                return

            await self.repo.set_item_status(item_id=item_id, status="text_extracted", raw_text=text, error_message=None)

            try:
                parsed = await self.ai.parse_cv_text_to_profile(raw_text=text)
                profile_json = parsed["profile_json"]
                meta = parsed["provider_metadata"]

                await self.repo.upsert_parsed_profile(
                    upload_item_id=item_id,
                    raw_text=text,
                    profile_json=profile_json,
                    parser_provider=meta.get("provider", "unknown"),
                    parser_model=meta.get("model", "unknown"),
                    parser_prompt_version=meta.get("prompt_version", "unknown"),
                )

                await self.repo.set_item_status(item_id=item_id, status="parsed_ok", error_message=None)
                await self.repo.increment_batch_progress(batch_id=batch_id, failed=False)
            except (AIServiceError, Exception) as e:
                await self.repo.set_item_status(item_id=item_id, status="parsed_failed", error_message=str(e))
                await self.repo.increment_batch_progress(batch_id=batch_id, failed=True)
        except Exception as e:
            await self.repo.set_item_status(item_id=item_id, status="parsed_failed", raw_text="", error_message=str(e))
            await self.repo.increment_batch_progress(batch_id=batch_id, failed=True)

