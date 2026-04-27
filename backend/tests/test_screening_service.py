import pytest

from app.services.screening_service import ScreeningService


class FakeRepo:
    async def ensure_indexes(self):
        return None

    async def get_batch_for_user(self, **kwargs):
        return {"id": kwargs["batch_id"]}

    async def create_run(self, **kwargs):
        return {"id": "run1", "status": "pending"}

    async def set_run_status(self, **kwargs):
        return None

    async def get_parsed_candidates_for_batch(self, **kwargs):
        return [
            {"upload_item_id": "u1", "profile_json": {"skills": ["react", "fastapi"], "years_of_experience": 2}},
            {"upload_item_id": "u2", "profile_json": {"skills": ["python"], "years_of_experience": 1}},
        ]

    async def add_result(self, **kwargs):
        return None

    async def get_run_for_user(self, **kwargs):
        return {"id": "run1", "status": "done", "candidate_count": 1}

    async def list_results_for_run(self, **kwargs):
        return [{"upload_item_id": "u1", "score": 88}]


class FakeAI:
    async def score_candidate_for_screening(self, **kwargs):
        return {
            "score": 88,
            "rationale": "Good fit",
            "matched_skills": ["react", "fastapi"],
            "highlights": {"matched_roles": ["backend"], "education_match": "", "notable_points": []},
        }


@pytest.mark.asyncio
async def test_screening_service_with_mock_ai():
    svc = ScreeningService()
    svc.repo = FakeRepo()
    svc.ai = FakeAI()

    res = await svc.create_run(
        current_user={"id": "r1", "role": "recruiter"},
        batch_id="batch1",
        instruction_prompt="Need React + FastAPI",
        filters={"required_skills": ["react", "fastapi"]},
    )
    assert res["run"]["status"] == "done"
    assert len(res["candidates"]) == 1

