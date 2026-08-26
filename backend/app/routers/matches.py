from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.agents.matcher import run_matcher

router = APIRouter(prefix="/matches", tags=["matches"])


class GenerateMatchRequest(BaseModel):
    job_id: str


@router.post("/generate")
async def generate_match(
    body: GenerateMatchRequest,
    user: dict = Depends(get_current_user),
):
    """
    Runs the Matcher agent (LangGraph: fetch_context -> score_fit -> save_result)
    for the current user against the given job. Requires the user to have
    uploaded a resume first.
    """
    try:
        result = run_matcher(user_id=user["id"], job_id=body.job_id)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Matcher agent failed: {str(e)}",
        )
    return result