"""
Runs once when a user uploads their resume. Turns messy resume text into
a structured skill profile the Matcher agent can reason over consistently,
instead of re-reading the raw resume text on every single job comparison.
"""
from app.core.llm import call_llm_json

SYSTEM_PROMPT = """You are a resume analysis assistant. Extract a structured
skill profile from the resume text. Respond ONLY with a JSON object in this
exact shape:

{
  "skills": ["list", "of", "technical and soft skills"],
  "experience_summary": "2-3 sentence summary of their work experience",
  "years_of_experience": <number, best estimate, 0 if a student/fresher>,
  "education": "highest degree + field",
  "notable_projects": ["short project names or descriptions"]
}
"""


def extract_skill_profile(resume_text: str) -> dict:
    return call_llm_json(
        system_prompt=SYSTEM_PROMPT,
        user_prompt=f"Resume text:\n\n{resume_text}",
    )