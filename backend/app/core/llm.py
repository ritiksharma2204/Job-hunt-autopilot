"""
Single place for all Groq calls. Using `llama-3.3-70b-versatile` — good
balance of quality and speed on Groq's free tier for this kind of
structured-reasoning task.
"""
import json
from groq import Groq
from app.core.config import settings

client = Groq(api_key=settings.GROQ_API_KEY)

MODEL = "openai/gpt-oss-120b"


def call_llm_json(system_prompt: str, user_prompt: str) -> dict:
    """
    Calls the LLM and forces a JSON object back — used anywhere we need
    structured output (skill extraction, fit scoring) rather than free text.
    """
    response = client.chat.completions.create(
        model=MODEL,
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        response_format={"type": "json_object"},
        temperature=0.2,
    )
    raw = response.choices[0].message.content
    return json.loads(raw)