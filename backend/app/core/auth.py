"""
Every protected route depends on `get_current_user`. It:
1. Pulls the JWT via FastAPI's HTTPBearer security scheme (this is what makes
   the "Authorize" button show up in /docs).
2. Asks Supabase to verify it and return the user.
3. Raises 401 if invalid/missing.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.supabase_client import anon_client

bearer_scheme = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(bearer_scheme),
) -> dict:
    token = credentials.credentials

    try:
        response = anon_client.auth.get_user(token)
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    if response is None or response.user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
        )

    return {"id": response.user.id, "email": response.user.email}