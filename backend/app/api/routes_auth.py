"""
Auth API Router
Provides server-side user registration using Supabase Admin API to auto-confirm emails,
preventing free-tier SMTP email rate limits and enabling frictionless registration.
"""

import re
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
    Enforces enterprise password criteria: 8+ chars, uppercase, lowercase, number/symbol.
    """
    clean_email = payload.email.strip().lower()
    password = payload.password

    if not clean_email or "@" not in clean_email:
        raise HTTPException(status_code=400, detail="A valid email address is required.")

    if len(password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters long.")

    if not re.search(r"[A-Z]", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one uppercase letter (A-Z).")

    if not re.search(r"[a-z]", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one lowercase letter (a-z).")

    if not re.search(r"[0-9]", password) and not re.search(r"[^A-Za-z0-9]", password):
        raise HTTPException(status_code=400, detail="Password must contain at least one number or special symbol.")

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
                    raise HTTPException(
                        status_code=400,
                        detail="An account with this email address already exists. Please sign in with your password.",
                    )
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
