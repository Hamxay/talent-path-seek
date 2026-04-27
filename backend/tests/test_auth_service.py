import pytest
from fastapi import HTTPException

from app.services.auth_service import AuthService


class FakeUsers:
    async def create_user(self, **kwargs):
        return {
            "id": "u1",
            "name": kwargs["name"],
            "email": kwargs["email"],
            "password_hash": "hash",
            "role": kwargs["role"],
            "company_name": kwargs.get("company_name"),
            "refresh_jti": None,
        }

    async def set_refresh_jti(self, user_id, refresh_jti):
        return None

    async def get_by_email(self, email):
        return None


@pytest.mark.asyncio
async def test_register_recruiter_requires_company_name():
    svc = AuthService()
    svc.users = FakeUsers()

    with pytest.raises(HTTPException) as exc:
        await svc.register(
            name="HR",
            email="hr@test.com",
            password="secret123",
            role="recruiter",
            company_name=None,
        )
    assert exc.value.status_code == 400
    assert "company_name" in exc.value.detail

