from fastapi import APIRouter

from app.api.v1.auth import me_router, router as auth_router
from app.api.v1.jobs import router as jobs_router
from app.api.v1.recruiter_uploads import router as recruiter_uploads_router
from app.api.v1.resumes import router as resumes_router
from app.api.v1.screening import router as screening_router
from app.api.v1.shortlists import router as shortlists_router

api_router = APIRouter()

api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(me_router, tags=["users"])
api_router.include_router(resumes_router, tags=["resumes"])
api_router.include_router(jobs_router, tags=["jobs"])
api_router.include_router(recruiter_uploads_router, tags=["recruiter-uploads"])
api_router.include_router(screening_router, tags=["screening"])
api_router.include_router(shortlists_router, tags=["shortlists"])

