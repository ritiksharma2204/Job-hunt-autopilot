from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.auth import get_current_user
from app.core.supabase_client import service_client

router = APIRouter(prefix="/applications", tags=["applications"])

VALID_STATUSES = {"saved", "applied", "interviewing", "offer", "rejected"}


class CreateApplicationRequest(BaseModel):
    job_id: str
    status: str = "saved"


class UpdateApplicationRequest(BaseModel):
    status: str


@router.post("")
def create_application(
    body: CreateApplicationRequest,
    user: dict = Depends(get_current_user),
):
    if body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of {VALID_STATUSES}")

    result = (
        service_client.table("applications")
        .upsert(
            {"user_id": user["id"], "job_id": body.job_id, "status": body.status},
            on_conflict="user_id,job_id",
        )
        .execute()
    )
    return result.data[0]


@router.get("")
def list_applications(user: dict = Depends(get_current_user)):
    result = (
        service_client.table("applications")
        .select("*, jobs(*)")
        .eq("user_id", user["id"])
        .order("updated_at", desc=True)
        .execute()
    )
    return {"applications": result.data}


@router.patch("/{application_id}")
def update_application_status(
    application_id: str,
    body: UpdateApplicationRequest,
    user: dict = Depends(get_current_user),
):
    if body.status not in VALID_STATUSES:
        raise HTTPException(status_code=400, detail=f"status must be one of {VALID_STATUSES}")

    result = (
        service_client.table("applications")
        .update({"status": body.status})
        .eq("id", application_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Application not found")
    return result.data[0]