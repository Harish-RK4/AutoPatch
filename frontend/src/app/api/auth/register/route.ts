/**
 * Next.js Server-Side Registration API Route
 * Uses SUPABASE_SERVICE_ROLE_KEY (server-only env var) to register users
 * via the Supabase Admin API with auto-confirmed email.
 * This completely bypasses the free-tier SMTP email rate limit.
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

    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json(
        { error: "Supabase service role key not configured on server." },
        { status: 500 }
      );
    }

    // Step 1: Try to create the user via Admin API with auto-confirm
    const createRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
      method: "POST",
      headers: adminHeaders(),
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || email.split("@")[0], role: "developer" },
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

    // Step 2: If user already exists (422), find and update them
    if (createRes.status === 422) {
      // List users to find existing one
      const listRes = await fetch(
        `${SUPABASE_URL}/auth/v1/admin/users?page=1&per_page=50`,
        { method: "GET", headers: adminHeaders() }
      );

      if (listRes.ok) {
        const listData = await listRes.json();
        const users = listData.users || listData || [];
        const existing = users.find(
          (u: any) => u.email?.toLowerCase() === email.toLowerCase()
        );

        if (existing) {
          // Update password and auto-confirm
          const updateRes = await fetch(
            `${SUPABASE_URL}/auth/v1/admin/users/${existing.id}`,
            {
              method: "PUT",
              headers: adminHeaders(),
              body: JSON.stringify({
                password,
                email_confirm: true,
                user_metadata: {
                  ...existing.user_metadata,
                  full_name: full_name || existing.user_metadata?.full_name || email.split("@")[0],
                },
              }),
            }
          );

          if (updateRes.ok) {
            return NextResponse.json({
              status: "confirmed",
              user_id: existing.id,
              email: existing.email,
            });
          }
        }
      }

      // Even if we can't find/update, tell the user the account exists
      return NextResponse.json({
        status: "exists",
        email,
        message: "Account already exists. Please sign in.",
      });
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
