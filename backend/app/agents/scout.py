"""
The Scout agent: searches Adzuna for jobs matching a query and caches
results in the `jobs` table (shared across all users, not per-user data).

Caching matters here specifically because Adzuna's free tier caps out
around 1,000 calls/month, shared across every user of this app — so we
never call Adzuna on a user's behalf without saving what we get back.
"""
import httpx
from app.core.config import settings
from app.core.supabase_client import service_client

ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api/jobs"


def search_jobs(what: str, where: str = "", results_per_page: int = 10) -> list[dict]:
    """
    Calls Adzuna's search endpoint, upserts each result into the `jobs`
    table (deduped by external_id so re-running the same search doesn't
    create duplicates), and returns the normalized list.
    """
    url = f"{ADZUNA_BASE_URL}/{settings.ADZUNA_COUNTRY}/search/1"
    params = {
        "app_id": settings.ADZUNA_APP_ID,
        "app_key": settings.ADZUNA_APP_KEY,
        "what": what,
        "results_per_page": results_per_page,
        "content-type": "application/json",
    }
    if where:
        params["where"] = where

    response = httpx.get(url, params=params, timeout=15.0)
    response.raise_for_status()
    results = response.json().get("results", [])

    saved_jobs = []
    for job in results:
        record = {
            "external_id": str(job.get("id")),
            "title": job.get("title", "").strip(),
            "company": (job.get("company") or {}).get("display_name", ""),
            "location": (job.get("location") or {}).get("display_name", ""),
            "description": job.get("description", ""),
            "url": job.get("redirect_url", ""),
        }
        # Upsert so re-searching the same jobs updates rather than duplicates them.
        result = (
            service_client.table("jobs")
            .upsert(record, on_conflict="external_id")
            .execute()
        )
        saved_jobs.append(result.data[0])

    return saved_jobs