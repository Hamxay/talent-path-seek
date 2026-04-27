"""
AIService — wraps Google's Gemini API via the official `google-genai` SDK.

We pass Pydantic classes as `response_schema` so the model returns objects that
deserialize directly into typed Python — no manual JSON parsing, no markdown
fences to strip, no risk of the model expanding `4` into `4.0000000…` and
exhausting maxOutputTokens.

Three operations are exposed (signatures unchanged from the previous httpx
implementation, so services don't need to be touched):

- prefill_resume_from_prompt    → suggested resume_json patch from a candidate's prose
- parse_cv_text_to_profile      → structured profile_json from raw CV text
- score_candidate_for_screening → 0-100 fit score + rationale + matched skills
"""

from __future__ import annotations

import time
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field

from app.core.config import settings


AIProvider = Literal["gemini"]


class AIServiceError(RuntimeError):
    pass


# ---------------------------------------------------------------------------
# Structured-output schemas (Pydantic)
# ---------------------------------------------------------------------------

class _EducationItem(BaseModel):
    institution: str = ""
    degree: Optional[str] = None
    field_of_study: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    grade: Optional[str] = None
    description: Optional[str] = None


class _ExperienceItem(BaseModel):
    company: str = ""
    title: str = ""
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    location: Optional[str] = None
    description: Optional[str] = None
    bullets: list[str] = Field(default_factory=list)


class _ProjectItem(BaseModel):
    name: str = ""
    link: Optional[str] = None
    tech_stack: list[str] = Field(default_factory=list)
    description: Optional[str] = None


class _CertificationItem(BaseModel):
    name: str = ""
    issuer: Optional[str] = None
    date: Optional[str] = None
    credential_url: Optional[str] = None


class _ParsedProfile(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    summary: Optional[str] = None
    # int, NOT float — guards against Gemini's pathological "4.0000…" expansion
    # which previously truncated the response.
    years_of_experience: Optional[int] = None
    skills: list[str] = Field(default_factory=list)
    education: list[_EducationItem] = Field(default_factory=list)
    experience: list[_ExperienceItem] = Field(default_factory=list)
    projects: list[_ProjectItem] = Field(default_factory=list)
    certifications: list[_CertificationItem] = Field(default_factory=list)


class _CVParseResponse(BaseModel):
    profile_json: _ParsedProfile = Field(default_factory=_ParsedProfile)


class _Highlights(BaseModel):
    matched_roles: list[str] = Field(default_factory=list)
    education_match: Optional[str] = None
    notable_points: list[str] = Field(default_factory=list)


class _ScoreResponse(BaseModel):
    score: float = 0.0
    rationale: str = ""
    matched_skills: list[str] = Field(default_factory=list)
    highlights: _Highlights = Field(default_factory=_Highlights)


class _PersonalPatch(BaseModel):
    full_name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin: Optional[str] = None
    github: Optional[str] = None
    website: Optional[str] = None


class _SkillsPatch(BaseModel):
    items: list[str] = Field(default_factory=list)


class _ResumePatch(BaseModel):
    personal: Optional[_PersonalPatch] = None
    summary: Optional[str] = None
    skills: Optional[_SkillsPatch] = None
    education: list[_EducationItem] = Field(default_factory=list)
    experience: list[_ExperienceItem] = Field(default_factory=list)
    projects: list[_ProjectItem] = Field(default_factory=list)
    certifications: list[_CertificationItem] = Field(default_factory=list)


class _ExtractedFields(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    summary: Optional[str] = None
    skills: list[str] = Field(default_factory=list)


class _PrefillResponse(BaseModel):
    extracted_fields: _ExtractedFields = Field(default_factory=_ExtractedFields)
    suggested_resume_patch: _ResumePatch = Field(default_factory=_ResumePatch)


# ---------------------------------------------------------------------------
# Service
# ---------------------------------------------------------------------------

class AIService:
    def __init__(self) -> None:
        provider = (settings.AI_PROVIDER or "gemini").strip().lower()
        if provider != "gemini":
            raise AIServiceError(f"Unsupported AI_PROVIDER: {provider}")
        self.provider: AIProvider = "gemini"
        # Lazy: only construct the SDK client on first use, so a missing
        # API key only fails the AI route — not unrelated startup paths.
        self._client = None
        self._model_name = (settings.GEMINI_MODEL or "gemini-2.5-flash").strip()

    @property
    def client(self):
        if self._client is None:
            try:
                from google import genai  # local import keeps cold-start cheap
            except ImportError as e:  # pragma: no cover
                raise AIServiceError(
                    "google-genai is not installed. Run `pip install -r requirements.txt`."
                ) from e
            api_key = (settings.GEMINI_API_KEY or "").strip()
            if not api_key:
                raise AIServiceError(
                    "GEMINI_API_KEY is missing. Add it to your .env file to use AI features."
                )
            self._client = genai.Client(api_key=api_key)
        return self._client

    # ---- public API (unchanged signatures) -------------------------------

    async def prefill_resume_from_prompt(
        self,
        *,
        prompt: str,
        current_resume_json: Optional[dict[str, Any]] = None,
    ) -> dict[str, Any]:
        instructions = (
            "You convert a candidate's natural-language self-description into a "
            "PARTIAL resume_json patch. Only fill fields you can ground in the "
            "user's text. Never invent degrees, companies, or certifications."
        )
        user_text = (
            f"USER PROMPT:\n{prompt}\n\n"
            f"CURRENT RESUME_JSON (may be empty):\n{(current_resume_json or {})}\n"
        )
        result, latency_ms = await self._generate(
            schema=_PrefillResponse,
            instructions=instructions,
            user_text=user_text,
            temperature=0.2,
            max_output_tokens=2048,
        )
        return {
            "extracted_fields": result.extracted_fields.model_dump(exclude_none=False),
            "suggested_resume_patch": result.suggested_resume_patch.model_dump(exclude_none=True),
            "provider_metadata": {
                "provider": "gemini",
                "model": self._model_name,
                "latency_ms": latency_ms,
            },
        }

    async def parse_cv_text_to_profile(
        self,
        *,
        raw_text: str,
    ) -> dict[str, Any]:
        instructions = (
            "You extract a structured profile from raw CV text. "
            "Skills should be a flat list of short strings (one technology / soft-skill per item). "
            "Do not invent details that are not present. "
            "If years_of_experience is unclear, omit it."
        )
        user_text = f"RAW CV TEXT:\n{raw_text[:14000]}\n"
        result, latency_ms = await self._generate(
            schema=_CVParseResponse,
            instructions=instructions,
            user_text=user_text,
            temperature=0.1,
            max_output_tokens=4096,
        )
        return {
            "profile_json": result.profile_json.model_dump(exclude_none=False),
            "provider_metadata": {
                "provider": "gemini",
                "model": self._model_name,
                "prompt_version": "cv_parser_v2_pydantic",
                "latency_ms": latency_ms,
            },
        }

    async def score_candidate_for_screening(
        self,
        *,
        instruction_prompt: str,
        profile_json: dict[str, Any],
    ) -> dict[str, Any]:
        instructions = (
            "Score how well the candidate matches the recruiter's instruction or "
            "job description. Score 0-100 (integers preferred). Be conservative; "
            "do not invent profile details. Return matched_skills as a deduplicated list."
        )
        user_text = (
            f"RECRUITER INSTRUCTION / JOB DESCRIPTION:\n{instruction_prompt}\n\n"
            f"CANDIDATE PROFILE JSON:\n{profile_json}\n"
        )
        result, latency_ms = await self._generate(
            schema=_ScoreResponse,
            instructions=instructions,
            user_text=user_text,
            temperature=0.1,
            max_output_tokens=2048,
        )
        score = max(0.0, min(100.0, float(result.score)))
        return {
            "score": score,
            "rationale": result.rationale or "No rationale provided.",
            "matched_skills": list(result.matched_skills or []),
            "highlights": result.highlights.model_dump(exclude_none=False),
            "provider_metadata": {
                "provider": "gemini",
                "model": self._model_name,
                "latency_ms": latency_ms,
            },
        }

    # ---- internals --------------------------------------------------------

    async def _generate(
        self,
        *,
        schema: type[BaseModel],
        instructions: str,
        user_text: str,
        temperature: float,
        max_output_tokens: int,
    ):
        """
        Run a structured-output Gemini call. Returns (parsed_pydantic, latency_ms).
        Uses the SDK's response_schema=<PydanticClass> so the SDK handles JSON
        decoding into a typed object — no manual json.loads in our code.
        """
        from google.genai import types  # local import

        config = types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema=schema,
            temperature=temperature,
            max_output_tokens=max_output_tokens,
            system_instruction=instructions,
        )

        started = time.time()
        try:
            response = await self.client.aio.models.generate_content(
                model=self._model_name,
                contents=user_text,
                config=config,
            )
        except Exception as e:
            raise AIServiceError(f"Gemini request failed: {e}") from e
        latency_ms = int((time.time() - started) * 1000)

        # SDK populates `response.parsed` with an instance of `schema` when
        # structured output succeeds. Fall back to manually validating
        # `response.text` if not — covers older SDK versions and odd cases.
        parsed = getattr(response, "parsed", None)
        if isinstance(parsed, schema):
            return parsed, latency_ms

        text = (getattr(response, "text", None) or "").strip()
        if not text:
            finish = self._finish_reason(response)
            if finish and finish != "STOP":
                raise AIServiceError(
                    f"Gemini stopped before producing output (finishReason={finish}). "
                    f"Try increasing max_output_tokens or shortening the input."
                )
            raise AIServiceError("Gemini returned an empty response")

        try:
            return schema.model_validate_json(text), latency_ms
        except Exception as e:
            preview = text[:200].replace("\n", " ")
            raise AIServiceError(
                f"Gemini response did not match {schema.__name__}: {e}. Got: {preview!r}"
            ) from e

    @staticmethod
    def _finish_reason(response: Any) -> Optional[str]:
        try:
            cand = (response.candidates or [None])[0]
            if cand is None:
                return None
            fr = getattr(cand, "finish_reason", None)
            if fr is None:
                return None
            return getattr(fr, "name", str(fr))
        except Exception:
            return None
