from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.concurrency import run_in_threadpool

from app.core.auth import get_current_user
from app.core.resume_parser import extract_resume_text
from app.core.supabase_client import service_client
from app.agents.skill_extractor import extract_skill_profile

router = APIRouter(prefix="/profile", tags=["profile"])


@router.get("")
def get_profile(user: dict = Depends(get_current_user)):
    result = (
        service_client.table("profiles")
        .select("active_resume_id")
        .eq("id", user["id"])
        .maybe_single()
        .execute()
    )
    active_id = result.data.get("active_resume_id") if result.data else None
    return {"active_resume_id": active_id}


@router.get("/resumes")
def list_resumes(user: dict = Depends(get_current_user)):
    result = (
        service_client.table("resumes")
        .select("id, label, skill_profile, created_at")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .execute()
    )
    return {"resumes": result.data}


def _process_and_save_resume(user_id: str, filename: str, file_bytes: bytes, label: str | None) -> dict:
    resume_text = extract_resume_text(filename, file_bytes)
    skill_profile = extract_skill_profile(resume_text)
    resume_label = label or filename

    result = (
        service_client.table("resumes")
        .insert(
            {
                "user_id": user_id,
                "label": resume_label,
                "resume_text": resume_text,
                "skill_profile": skill_profile,
            }
        )
        .execute()
    )
    new_resume = result.data[0]

    profile_res = (
        service_client.table("profiles")
        .select("active_resume_id")
        .eq("id", user_id)
        .maybe_single()
        .execute()
    )
    has_active = profile_res.data and profile_res.data.get("active_resume_id")
    if not has_active:
        service_client.table("profiles").upsert(
            {"id": user_id, "active_resume_id": new_resume["id"]}
        ).execute()

    return new_resume


@router.post("/resumes")
async def upload_resume(
    file: UploadFile = File(...),
    label: str = Form(None),
    user: dict = Depends(get_current_user),
):
    file_bytes = await file.read()
    return await run_in_threadpool(
        _process_and_save_resume, user["id"], file.filename, file_bytes, label
    )


@router.patch("/resumes/{resume_id}/activate")
def activate_resume(resume_id: str, user: dict = Depends(get_current_user)):
    owned = (
        service_client.table("resumes")
        .select("id")
        .eq("id", resume_id)
        .eq("user_id", user["id"])
        .maybe_single()
        .execute()
    )
    if not owned.data:
        raise HTTPException(status_code=404, detail="Resume not found")

    service_client.table("profiles").upsert(
        {"id": user["id"], "active_resume_id": resume_id}
    ).execute()
    return {"active_resume_id": resume_id}


@router.delete("/resumes/{resume_id}")
def delete_resume(resume_id: str, user: dict = Depends(get_current_user)):
    result = (
        service_client.table("resumes")
        .delete()
        .eq("id", resume_id)
        .eq("user_id", user["id"])
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Resume not found")
    return {"deleted": resume_id}