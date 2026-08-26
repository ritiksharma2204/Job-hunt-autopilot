from fastapi import APIRouter, Depends, UploadFile, File

from app.core.auth import get_current_user
from app.core.resume_parser import extract_resume_text
from app.core.supabase_client import service_client
from app.agents.skill_extractor import extract_skill_profile

router = APIRouter(prefix="/profile", tags=["profile"])


@router.post("/resume")
async def upload_resume(
    file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """
    Accepts a PDF or DOCX resume, extracts the text, runs the skill-extraction
    agent, and saves both onto the user's profile row.
    """
    file_bytes = await file.read()
    resume_text = extract_resume_text(file.filename, file_bytes)
    skill_profile = extract_skill_profile(resume_text)

    service_client.table("profiles").upsert(
        {
            "id": user["id"],
            "resume_text": resume_text,
            "skill_profile": skill_profile,
        }
    ).execute()

    return {"skill_profile": skill_profile}