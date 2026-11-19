"""
Auth API Router
Provides server-side user registration using Supabase Admin API to auto-confirm emails,
preventing free-tier SMTP email rate limits and enabling frictionless registration.
"""

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.core.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


class RegisterRequest(BaseModel):
    email: str
    password: str
    full_name: str


@router.post("/register")
async def register_user(payload: RegisterRequest):
    """
    Registers a new developer user in Supabase with auto-confirmed email.
    Uses SUPABASE_SERVICE_ROLE_KEY to bypass client-side SMTP rate limits.
    """
    if settings.NEXT_PUBLIC_AUTH_MODE == "supabase" and settings.NEXT_PUBLIC_SUPABASE_URL:
        secret_key = settings.SUPABASE_SERVICE_ROLE_KEY or settings.NEXT_PUBLIC_SUPABASE_ANON_KEY
        if not secret_key:
            raise HTTPException(status_code=500, detail="Supabase service role key not configured.")

        url = settings.NEXT_PUBLIC_SUPABASE_URL.rstrip("/")
        headers = {
            "apikey": secret_key,
            "Authorization": f"Bearer {secret_key}",
            "Content-Type": "application/json",
        }
        body = {
            "email": payload.email,
            "password": payload.password,
            "email_confirm": True,
            "user_metadata": {"full_name": payload.full_name, "role": "developer"},
        }

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.post(f"{url}/auth/v1/admin/users", headers=headers, json=body)
                if resp.status_code in (200, 201):
                    user_data = resp.json()
                    return {
                        "status": "created",
                        "user_id": user_data.get("id"),
                        "email": user_data.get("email"),
                        "message": "User registered and auto-confirmed in Supabase.",
                    }
                elif resp.status_code == 422:
                    # User already exists in Supabase: find and auto-confirm/update password
                    list_resp = await client.get(f"{url}/auth/v1/admin/users?per_page=100", headers=headers)
                    if list_resp.status_code == 200:
                        users = list_resp.json().get("users", [])
                        existing = next((u for u in users if u.get("email", "").lower() == payload.email.lower()), None)
                        if existing:
                            update_resp = await client.put(
                                f"{url}/auth/v1/admin/users/{existing['id']}",
                                headers=headers,
                                json={"password": payload.password, "email_confirm": True},
                            )
                            if update_resp.status_code in (200, 201):
                                return {
                                    "status": "updated",
                                    "user_id": existing["id"],
                                    "email": existing.get("email"),
                                    "message": "Account auto-confirmed and password updated.",
                                }
                    raise HTTPException(status_code=400, detail="Account already exists. Please sign in with your password.")
                else:
                    err_json = resp.json() if resp.text else {}
                    err_msg = err_json.get("msg") or f"Supabase admin creation failed ({resp.status_code})"
                    raise HTTPException(status_code=resp.status_code, detail=err_msg)
        except httpx.HTTPError as exc:
            raise HTTPException(status_code=500, detail=f"Failed to communicate with Supabase: {exc!s}")

    # Fallback for demo mode
    return {
        "status": "created",
        "user_id": f"user-{payload.email.split('@')[0]}",
        "email": payload.email,
        "message": "User registered in demo mode.",
    }
