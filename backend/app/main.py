from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.auth import get_current_user

app = FastAPI(title="Job-Hunt Autopilot API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    """Unauthenticated — used by Render/uptime checks and to confirm the server is alive."""
    return {"status": "ok"}


@app.get("/me")
async def me(user: dict = Depends(get_current_user)):
    """
    Authenticated — confirms the full chain works:
    frontend login -> Supabase JWT -> this backend verifying it -> per-user identity.
    Every other route in this app should follow this exact pattern.
    """
    return {"user": user}
