import io

import pytest
from fastapi import BackgroundTasks, HTTPException, UploadFile

from app.services.upload_service import UploadService


class FakeRepo:
    async def ensure_indexes(self):
        return None


@pytest.mark.asyncio
async def test_upload_validation_rejects_non_pdf(monkeypatch):
    monkeypatch.setattr("app.services.upload_service.AIService", lambda: object())

    svc = UploadService()
    svc.repo = FakeRepo()

    file_obj = io.BytesIO(b"hello")
    upload = UploadFile(filename="notes.txt", file=file_obj, headers={"content-type": "text/plain"})

    with pytest.raises(HTTPException) as exc:
        await svc.create_batch(
            current_user={"id": "u1", "role": "recruiter"},
            files=[upload],
            background_tasks=BackgroundTasks(),
        )

    assert exc.value.status_code == 400
    assert "PDF" in exc.value.detail

