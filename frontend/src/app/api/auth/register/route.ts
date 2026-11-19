/**
 * Next.js Server-Side Registration API Route
 * Uses SUPABASE_SERVICE_ROLE_KEY to register users securely via Supabase Admin API
 * with email_confirm: true, guaranteeing immediate account activation.
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

    const { email, password, full_name } = body;

    // Validate email
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(cleanEmail) || cleanEmail.length > 254) {
      return NextResponse.json({ error: "Please provide a valid email address." }, { status: 400 });
    }

    // Validate password
    if (!password || typeof password !== "string") {
      return NextResponse.json({ error: "Password is required." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    if (password.length > 128) {
      return NextResponse.json({ error: "Password cannot exceed 128 characters." }, { status: 400 });
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

    // Sanitize full_name
    const sanitizedName = typeof full_name === "string"
      ? full_name.trim().replace(/[<>]/g, "").slice(0, 100)
      : cleanEmail.split("@")[0];

    // Create user via Admin API with auto-confirmed email
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: sanitizedName,
          role: "developer",
        },
      }),
    });

    if (createRes.ok) {
      const user = await createRes.json();
      return NextResponse.json(
        {
          status: "created",
          user_id: user.id,
          email: user.email,
        },
        {
          status: 200,
          headers: { "Cache-Control": "no-store, max-age=0" },
        }
      );
    }

    // 422: User already exists in Supabase - update password so user can sign in with password
    if (createRes.status === 422) {
      try {
        const listRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
          headers: adminHeaders(),
        });
        if (listRes.ok) {
          const listData = await listRes.json();
          const existingUser = (listData.users || []).find(
            (u: any) => u.email?.toLowerCase() === cleanEmail
          );

          if (existingUser?.id) {
            const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${existingUser.id}`, {
              method: "PUT",
              headers: adminHeaders(),
              body: JSON.stringify({
                password,
                email_confirm: true,
                user_metadata: {
                  ...existingUser.user_metadata,
                  full_name: sanitizedName,
                },
              }),
            });

            if (updateRes.ok) {
              const updatedUser = await updateRes.json();
              return NextResponse.json(
                {
                  status: "updated",
                  user_id: updatedUser.id,
                  email: updatedUser.email,
                },
                { status: 200 }
              );
            }
          }
        }
      } catch (err) {
        console.warn("User update fallback error:", err);
      }

      return NextResponse.json(
        { error: "An account with this email address already exists. Please sign in with your password." },
        { status: 409 }
      );
    }

    // Other errors
    const errData = await createRes.json().catch(() => ({}));
    return NextResponse.json(
      { error: errData.msg || errData.error_description || `Registration failed (${createRes.status}).` },
      { status: createRes.status }
    );
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error during registration." },
      { status: 500 }
    );
  }
}
