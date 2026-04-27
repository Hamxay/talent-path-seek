import pytest

from app.services.resume_service import ResumeService


class FakeResumeRepo:
    def __init__(self):
        self.created = None
        self.unset_called = False

    async def ensure_indexes(self):
        return None

    async def list_by_user(self, user_id):
        return []

    async def unset_primary_for_user(self, user_id):
        self.unset_called = True

    async def create(self, **kwargs):
        self.created = kwargs
        return {"id": "r1", **kwargs}


@pytest.mark.asyncio
async def test_first_resume_for_candidate_becomes_primary():
    svc = ResumeService()
    repo = FakeResumeRepo()
    svc.resumes = repo

    result = await svc.create(
        current_user={"id": "u1", "role": "candidate"},
        title="My Resume",
        resume_json={"personal": {"full_name": "Ali"}},
        is_primary=False,
    )

    assert result["is_primary"] is True
    assert repo.unset_called is True

