/**
 * User Profile Management API Route
 * Handles user profile retrieval and synchronization in Supabase PostgreSQL.
 * Synchronizes with the `public.profiles` table and Supabase Auth `user_metadata`.
 */

import { NextRequest, NextResponse } from "next/server";

const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function adminHeaders() {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
    "Content-Type": "application/json",
    Prefer: "return=representation",
  };
}

export async function GET(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !ANON_KEY) {
      return NextResponse.json({ error: "Supabase configuration missing." }, { status: 500 });
    }

    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return NextResponse.json({ error: "Missing authorization token." }, { status: 401 });
    }

    // Validate token with Supabase Auth
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!userRes.ok) {
      return NextResponse.json({ error: "Unauthorized or invalid session token." }, { status: 401 });
    }

    const user = await userRes.json();
    if (!user?.id) {
      return NextResponse.json({ error: "Invalid user session." }, { status: 401 });
    }

    // Query profiles table
    let profileData = null;
    try {
      const profileRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?id=eq.${user.id}&select=*`,
        { headers: adminHeaders() }
      );
      if (profileRes.ok) {
        const rows = await profileRes.json();
        if (Array.isArray(rows) && rows.length > 0) {
          profileData = rows[0];
        }
      }
    } catch (e) {
      console.warn("Profiles query error:", e);
    }

    // Fallback to auth.user metadata if table query was empty
    if (!profileData) {
      profileData = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Developer",
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || "",
        auth_provider: user.app_metadata?.provider || "email",
        email_verified: Boolean(user.email_confirmed_at),
        created_at: user.created_at,
        updated_at: user.updated_at,
      };
    }

    return NextResponse.json(
      { profile: profileData },
      { headers: { "Cache-Control": "private, max-age=60" } }
    );
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    if (!SUPABASE_URL || !SERVICE_KEY) {
      return NextResponse.json(
        { error: "Supabase service role credentials not configured." },
        { status: 500 }
      );
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid request payload." }, { status: 400 });
    }

    const { id, email, full_name, avatar_url, auth_provider, email_verified } = body;

    if (!id || typeof id !== "string" || !UUID_REGEX.test(id)) {
      return NextResponse.json({ error: "A valid UUID user ID is required." }, { status: 400 });
    }

    if (!email || typeof email !== "string" || !EMAIL_REGEX.test(email.trim().toLowerCase())) {
      return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();
    const sanitizedName = typeof full_name === "string"
      ? full_name.trim().replace(/[<>]/g, "").slice(0, 100)
      : cleanEmail.split("@")[0];

    const sanitizedAvatar = typeof avatar_url === "string" ? avatar_url.slice(0, 500) : "";
    const sanitizedProvider = typeof auth_provider === "string" ? auth_provider.slice(0, 30) : "email";

    const payload = {
      id,
      email: cleanEmail,
      full_name: sanitizedName,
      avatar_url: sanitizedAvatar,
      auth_provider: sanitizedProvider,
      email_verified: Boolean(email_verified),
      updated_at: new Date().toISOString(),
    };

    // 1. Upsert into public.profiles table
    let dbSuccess = false;
    try {
      const upsertRes = await fetch(`${SUPABASE_URL}/rest/v1/profiles`, {
        method: "POST",
        headers: {
          ...adminHeaders(),
          Prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify(payload),
      });

      if (upsertRes.ok) {
        dbSuccess = true;
      } else {
        const errJson = await upsertRes.json().catch(() => ({}));
        console.warn("Profiles upsert returned non-200:", upsertRes.status, errJson);
      }
    } catch (e) {
      console.warn("Profiles upsert network error:", e);
    }

    // 2. Also ensure auth.users user_metadata is synchronized
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${id}`, {
        method: "PUT",
        headers: adminHeaders(),
        body: JSON.stringify({
          user_metadata: {
            full_name: payload.full_name,
            avatar_url: payload.avatar_url,
          },
        }),
      });
    } catch (e) {
      console.warn("Admin metadata sync warning:", e);
    }

    return NextResponse.json({
      status: "synced",
      profile: payload,
      db_persisted: dbSuccess,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error." }, { status: 500 });
  }
}
