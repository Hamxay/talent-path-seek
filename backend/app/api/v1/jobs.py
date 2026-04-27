from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile

from app.core.security import get_current_user
from app.schemas.job import (
    CandidateApplicationListItem,
    JobApplicationPublic,
    JobApplicationStatusUpdate,
    JobCreate,
    JobPublic,
    JobUpdate,
)
from app.services.application_service import ApplicationService
from app.services.job_service import JobService


MAX_RESUME_BYTES = 10 * 1024 * 1024  # 10 MB


router = APIRouter()


# ---- Public job board ----

@router.get("/jobs", response_model=list[JobPublic])
async def list_public_jobs():
    return await JobService().list_public()


@router.get("/jobs/{job_id}", response_model=JobPublic)
async def get_job(job_id: str):
    return await JobService().get(job_id=job_id)


# ---- Recruiter-owned jobs ----

@router.get("/recruiter/jobs", response_model=list[JobPublic])
async def list_my_jobs(current_user: dict = Depends(get_current_user)):
    return await JobService().list_mine(current_user=current_user)


@router.post("/recruiter/jobs", response_model=JobPublic, status_code=201)
async def create_job(payload: JobCreate, current_user: dict = Depends(get_current_user)):
    return await JobService().create(current_user=current_user, payload=payload.model_dump())


@router.put("/recruiter/jobs/{job_id}", response_model=JobPublic)
async def update_job(
    job_id: str,
    payload: JobUpdate,
    current_user: dict = Depends(get_current_user),
):
    return await JobService().update(
        current_user=current_user,
        job_id=job_id,
        updates=payload.model_dump(exclude_unset=True),
    )


@router.delete("/recruiter/jobs/{job_id}")
async def delete_job(job_id: str, current_user: dict = Depends(get_current_user)):
    return await JobService().delete(current_user=current_user, job_id=job_id)


# ---- Applications ----

@router.post(
    "/jobs/{job_id}/apply",
    response_model=JobApplicationPublic,
    status_code=201,
)
async def apply_to_job(
    job_id: str,
    cover_letter: Optional[str] = Form(default=None),
    resume_id: Optional[str] = Form(default=None),
    file: Optional[UploadFile] = File(default=None),
    current_user: dict = Depends(get_current_user),
):
    """
    Apply to a job. Three ways to attach a resume, in priority order:
      1. Upload a PDF in the `file` field (parsed via AI into profile_json).
      2. Pass `resume_id` to use one of the candidate's saved resumes.
      3. No resume → the candidate's primary saved resume is used; if none
         exists either, we fall back to a minimal name+email profile so the
         application can still go through.
    """
    pdf_bytes: Optional[bytes] = None
    pdf_filename: Optional[str] = None

    if file is not None and (file.filename or file.content_type):
        ct = (file.content_type or "").lower()
        fn = (file.filename or "").lower()
        if ct not in ("application/pdf", "application/x-pdf") and not fn.endswith(".pdf"):
            raise HTTPException(status_code=400, detail="Only PDF resumes are accepted")
        pdf_bytes = await file.read()
        if not pdf_bytes:
            raise HTTPException(status_code=400, detail="Uploaded file is empty")
        if len(pdf_bytes) > MAX_RESUME_BYTES:
            raise HTTPException(status_code=400, detail="PDF too large (max 10MB)")
        pdf_filename = file.filename or "resume.pdf"

    return await ApplicationService().apply_to_job(
        current_user=current_user,
        job_id=job_id,
        cover_letter=cover_letter,
        resume_id=resume_id,
        pdf_bytes=pdf_bytes,
        pdf_filename=pdf_filename,
    )


@router.get("/applications/me", response_model=list[CandidateApplicationListItem])
async def list_my_applications(current_user: dict = Depends(get_current_user)):
    return await ApplicationService().list_my_applications(current_user=current_user)


@router.get(
    "/recruiter/jobs/{job_id}/applications",
    response_model=list[JobApplicationPublic],
)
async def list_applications_for_job(
    job_id: str,
    current_user: dict = Depends(get_current_user),
):
    return await ApplicationService().list_applications_for_job(
        current_user=current_user, job_id=job_id
    )


@router.put(
    "/recruiter/applications/{application_id}/status",
    response_model=JobApplicationPublic,
)
async def update_application_status(
    application_id: str,
    payload: JobApplicationStatusUpdate,
    current_user: dict = Depends(get_current_user),
):
    return await ApplicationService().update_status(
        current_user=current_user,
        application_id=application_id,
        new_status=payload.status,
    )
