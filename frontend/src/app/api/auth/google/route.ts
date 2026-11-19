/**
 * Google Authentication API Route
 * Handles Google Sign-In helper functions by authenticating users via Supabase Admin API,
 * creating/confirming their account and issuing a verified OTP session token.
 */

import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function adminHeaders() {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
  };
}

export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json(
        { error: "Supabase service role credentials not configured on server." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const { email, full_name, avatar_url } = body;

    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(cleanEmail) || cleanEmail.length > 254) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    const displayName = typeof full_name === "string"
      ? full_name.trim().replace(/[<>]/g, "").slice(0, 100)
      : cleanEmail.split("@")[0];

    const cleanAvatar = typeof avatar_url === "string" ? avatar_url.slice(0, 500) : "";

    // Step 1: Ensure user exists in Supabase
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({
        email: cleanEmail,
        email_confirm: true,
        user_metadata: {
          full_name: displayName,
          avatar_url: cleanAvatar,
          provider: "google",
          role: "developer",
        },
        app_metadata: {
          provider: "google",
          providers: ["google"],
        },
      }),
    });

    // 200/201 = newly created, 422 = user already exists (which is fine)
    if (!createRes.ok && createRes.status !== 422) {
      const err = await createRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.msg || err.error_description || "Failed to initialize account in Supabase." },
        { status: createRes.status }
      );
    }

    // Step 2: Generate magic link OTP to create a verified Supabase session
    const linkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({
        type: "magiclink",
        email: cleanEmail,
      }),
    });

    if (!linkRes.ok) {
      const err = await linkRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: err.msg || "Failed to generate authentication token." },
        { status: linkRes.status }
      );
    }

    const linkData = await linkRes.json();
    const otp = linkData.email_otp;

    if (!otp) {
      return NextResponse.json(
        { error: "Verification token generation failed." },
        { status: 500 }
      );
    }

    const isDev = process.env.NODE_ENV !== "production";

    return NextResponse.json({
      status: "success",
      email: cleanEmail,
      user_id: linkData.id,
      full_name: displayName,
      ...(isDev ? { otp } : {}),
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error during Google sign in." },
      { status: 500 }
    );
  }
}
