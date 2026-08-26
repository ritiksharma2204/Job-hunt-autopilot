"""
Extracts plain text from an uploaded resume. Intentionally simple —
we don't try to preserve layout/formatting, just get the text content
for the LLM to reason over.
"""
import io
from fastapi import HTTPException
from pypdf import PdfReader
from docx import Document


def extract_resume_text(filename: str, file_bytes: bytes) -> str:
    lower = filename.lower()

    if lower.endswith(".pdf"):
        reader = PdfReader(io.BytesIO(file_bytes))
        text = "\n".join(page.extract_text() or "" for page in reader.pages)

    elif lower.endswith(".docx"):
        doc = Document(io.BytesIO(file_bytes))
        text = "\n".join(paragraph.text for paragraph in doc.paragraphs)

    else:
        raise HTTPException(
            status_code=400,
            detail="Unsupported file type. Please upload a PDF or DOCX resume.",
        )

    text = text.strip()
    if not text:
        raise HTTPException(
            status_code=422,
            detail="Couldn't extract any text from this file. It may be a scanned image rather than a text-based document.",
        )

    return text