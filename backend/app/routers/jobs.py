from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.core.supabase_client import service_client
from app.agents.scout import search_jobs

router = APIRouter(prefix="/jobs", tags=["jobs"])


class SearchJobsRequest(BaseModel):
    what: str
    where: str = ""
    country: str = ""


@router.post("/search")
async def trigger_job_search(
    body: SearchJobsRequest,
    user: dict = Depends(get_current_user),
):
    try:
        jobs = search_jobs(what=body.what, where=body.where, country=body.country)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scout agent failed: {str(e)}")
    return {"count": len(jobs), "jobs": jobs}


@router.get("")
async def list_cached_jobs(user: dict = Depends(get_current_user)):
    result = (
        service_client.table("jobs")
        .select("*")
        .order("fetched_at", desc=True)
        .limit(50)
        .execute()
    )
    return {"jobs": result.data}