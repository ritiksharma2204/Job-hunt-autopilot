"""
Every protected route depends on `get_current_user`. It:
1. Pulls the JWT via FastAPI's HTTPBearer security scheme.
2. Asks Supabase to verify it and return the user.
3. Raises 401 if invalid/missing.

Plain `def` (not `async def`) is deliberate: the Supabase call inside is
synchronous/blocking. FastAPI runs sync route/dependency functions in a
thread pool automatically, so multiple requests can genuinely run in
parallel. An `async def` wrapping a blocking call would instead freeze
the single event loop for the whole request - which is exactly the bug
a load test caught here.
"""
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from app.core.supabase_client import anon_client

bearer_scheme = HTTPBearer()


def get_current_user(
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