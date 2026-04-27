from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class JobBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=10000)
    location: Optional[str] = Field(default=None, max_length=200)
    salary_range: Optional[str] = Field(default=None, max_length=120)
    experience: Optional[str] = Field(default=None, max_length=120)
    type: str = Field(default="Full-time", max_length=40)


class JobCreate(JobBase):
    pass


class JobUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=10000)
    location: Optional[str] = Field(default=None, max_length=200)
    salary_range: Optional[str] = Field(default=None, max_length=120)
    experience: Optional[str] = Field(default=None, max_length=120)
    type: Optional[str] = Field(default=None, max_length=40)
    is_active: Optional[bool] = None


class JobPublic(BaseModel):
    id: str
    recruiter_user_id: str
    company_name: str
    title: str
    description: str
    location: Optional[str] = None
    salary_range: Optional[str] = None
    experience: Optional[str] = None
    type: str
    is_active: bool
    created_at: datetime
    updated_at: datetime


class JobApplicationCreate(BaseModel):
    cover_letter: Optional[str] = Field(default=None, max_length=4000)
    # Optional: candidate may pick a specific resume; otherwise their primary resume is snapshotted.
    resume_id: Optional[str] = None


class JobApplicationStatusUpdate(BaseModel):
    status: str = Field(pattern=r"^(Pending|Shortlisted|Rejected)$")


class JobApplicationPublic(BaseModel):
    id: str
    job_id: str
    candidate_user_id: str
    resume_id: Optional[str] = None
    profile_json: dict[str, Any]
    cover_letter: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime


class CandidateApplicationListItem(JobApplicationPublic):
    job_title: str
    company_name: str
