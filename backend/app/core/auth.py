"""
Every protected route depends on `get_current_user`. It:
1. Pulls the JWT from the Authorization header (frontend gets this from Supabase Auth after login).
2. Asks Supabase to verify it and return the user.
3. Raises 401 if invalid/missing.

This is what makes "user_id" trustworthy everywhere else in the app —
never trust a user_id sent in a request body, always derive it from this.
"""
from fastapi import Header, HTTPException, status
from app.core.supabase_client import anon_client


async def get_current_user(authorization: str = Header(None)) -> dict:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing or malformed Authorization header",
        )

    token = authorization.removeprefix("Bearer ").strip()

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
