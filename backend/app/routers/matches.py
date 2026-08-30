from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.core.supabase_client import service_client
from app.agents.matcher import run_matcher

router = APIRouter(prefix="/matches", tags=["matches"])


class GenerateMatchRequest(BaseModel):
    job_id: str
    resume_id: str | None = None


@router.post("/generate")
def generate_match(
    body: GenerateMatchRequest,
    user: dict = Depends(get_current_user),
):
    resume_id = body.resume_id
    if not resume_id:
        profile_res = (
            service_client.table("profiles")
            .select("active_resume_id")
            .eq("id", user["id"])
            .maybe_single()
            .execute()
        )
        resume_id = profile_res.data.get("active_resume_id") if profile_res.data else None

    if not resume_id:
        raise HTTPException(
            status_code=400,
            detail="No resume selected. Upload a resume first.",
        )

    try:
        result = run_matcher(user_id=user["id"], job_id=body.job_id, resume_id=resume_id)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Matcher agent failed: {str(e)}",
        )
    return result