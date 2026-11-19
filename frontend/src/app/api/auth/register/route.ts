/**
 * Next.js Server-Side Registration API Route
 * Uses SUPABASE_SERVICE_ROLE_KEY to register users via Supabase Admin API
 * with email_confirm: true, avoiding free-tier SMTP email rate limits.
 */

import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

function adminHeaders() {
  const key = SERVICE_KEY || ANON_KEY;
  return {
    apikey: key,
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

export async function POST(req: NextRequest) {
  try {
    const { email, password, full_name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    if (!/[A-Z]/.test(password)) {
      return NextResponse.json({ error: "Password must contain at least one uppercase letter (A-Z)." }, { status: 400 });
    }

    if (!/[a-z]/.test(password)) {
      return NextResponse.json({ error: "Password must contain at least one lowercase letter (a-z)." }, { status: 400 });
    }

    if (!/[0-9]/.test(password) && !/[^A-Za-z0-9]/.test(password)) {
      return NextResponse.json({ error: "Password must contain at least one number or special symbol." }, { status: 400 });
    }

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json(
        { error: "Supabase service role credentials not configured." },
        { status: 500 }
      );
    }

    const cleanEmail = email.trim().toLowerCase();

    // Create user via Admin API with auto-confirmed email
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: full_name?.trim() || cleanEmail.split("@")[0],
          role: "developer",
        },
      }),
    });

    if (createRes.ok) {
      const user = await createRes.json();
      return NextResponse.json({
        status: "created",
        user_id: user.id,
        email: user.email,
      });
    }

    // 422: User already exists - DO NOT overwrite their password!
    if (createRes.status === 422) {
      return NextResponse.json(
        { error: "An account with this email address already exists. Please sign in with your password." },
        { status: 409 }
      );
    }

    // Other errors
    const errData = await createRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: errData.msg || `Registration failed (${createRes.status})` },
      { status: createRes.status }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error during registration." },
      { status: 500 }
    );
  }
}
