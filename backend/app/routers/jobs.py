from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.core.supabase_client import anon_client
from app.agents.scout import search_jobs

router = APIRouter(prefix="/jobs", tags=["jobs"])


class SearchJobsRequest(BaseModel):
    what: str          # e.g. "backend engineer"
    where: str = ""    # e.g. "Delhi" — optional


@router.post("/search")
async def trigger_job_search(
    body: SearchJobsRequest,
    user: dict = Depends(get_current_user),
):
    """
    Runs the Scout agent: searches Adzuna and caches results in the shared
    `jobs` table. Any logged-in user can trigger a search — results benefit
    everyone since jobs aren't per-user data.
    """
    try:
        jobs = search_jobs(what=body.what, where=body.where)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Scout agent failed: {str(e)}")
    return {"count": len(jobs), "jobs": jobs}


@router.get("")
async def list_cached_jobs(user: dict = Depends(get_current_user)):
    """
    Returns whatever's already cached in the jobs table, most recent first —
    this is what a 'browse jobs' screen in the frontend will call, without
    triggering a fresh (rate-limited) Adzuna call every time.
    """
    result = (
        anon_client.table("jobs")
        .select("*")
        .order("fetched_at", desc=True)
        .limit(50)
        .execute()
    )
    return {"jobs": result.data}