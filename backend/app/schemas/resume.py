from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, Field


class ResumePersonal(BaseModel):
    full_name: str = Field(min_length=1, max_length=120)
    email: Optional[str] = Field(default=None, max_length=200)
    phone: Optional[str] = Field(default=None, max_length=50)
    location: Optional[str] = Field(default=None, max_length=120)
    linkedin: Optional[str] = Field(default=None, max_length=200)
    github: Optional[str] = Field(default=None, max_length=200)
    website: Optional[str] = Field(default=None, max_length=200)


class ResumeEducationItem(BaseModel):
    institution: str = Field(min_length=1, max_length=200)
    degree: Optional[str] = Field(default=None, max_length=200)
    field_of_study: Optional[str] = Field(default=None, max_length=200)
    start_date: Optional[str] = Field(default=None, max_length=30)
    end_date: Optional[str] = Field(default=None, max_length=30)
    grade: Optional[str] = Field(default=None, max_length=50)
    description: Optional[str] = Field(default=None, max_length=1000)


class ResumeExperienceItem(BaseModel):
    company: str = Field(min_length=1, max_length=200)
    title: str = Field(min_length=1, max_length=200)
    start_date: Optional[str] = Field(default=None, max_length=30)
    end_date: Optional[str] = Field(default=None, max_length=30)
    location: Optional[str] = Field(default=None, max_length=120)
    description: Optional[str] = Field(default=None, max_length=2000)
    bullets: list[str] = Field(default_factory=list, max_length=30)


class ResumeProjectItem(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    link: Optional[str] = Field(default=None, max_length=200)
    tech_stack: list[str] = Field(default_factory=list, max_length=50)
    description: Optional[str] = Field(default=None, max_length=2000)


class ResumeCertificationItem(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    issuer: Optional[str] = Field(default=None, max_length=200)
    date: Optional[str] = Field(default=None, max_length=30)
    credential_url: Optional[str] = Field(default=None, max_length=200)


class ResumeSkills(BaseModel):
    # Keep it flexible and simple for FYP: frontend can decide categories later.
    items: list[str] = Field(default_factory=list, max_length=200)


class ResumeJSON(BaseModel):
    personal: ResumePersonal
    summary: Optional[str] = Field(default=None, max_length=2000)
    education: list[ResumeEducationItem] = Field(default_factory=list)
    experience: list[ResumeExperienceItem] = Field(default_factory=list)
    projects: list[ResumeProjectItem] = Field(default_factory=list)
    skills: ResumeSkills = Field(default_factory=ResumeSkills)
    certifications: list[ResumeCertificationItem] = Field(default_factory=list)


class ResumeBase(BaseModel):
    title: str = Field(min_length=1, max_length=120)
    resume_json: ResumeJSON
    is_primary: bool = False


class ResumeCreate(ResumeBase):
    pass


class ResumeUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=120)
    resume_json: Optional[ResumeJSON] = None
    is_primary: Optional[bool] = None


class ResumePublic(BaseModel):
    id: str
    user_id: str
    title: str
    resume_json: dict[str, Any]
    is_primary: bool
    created_at: datetime
    updated_at: datetime


class PromptPrefillRequest(BaseModel):
    prompt: str = Field(min_length=5, max_length=2000)


class PromptPrefillResponse(BaseModel):
    extracted_fields: dict[str, Any]
    suggested_resume_patch: dict[str, Any]
    provider_metadata: dict[str, Any]

