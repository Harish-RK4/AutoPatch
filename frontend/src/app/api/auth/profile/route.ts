/**
 * User Profile Management API Route
 * Handles user profile retrieval and synchronization in Supabase.
 * Synchronizes with the `profiles` table and Supabase `user_metadata`.
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
    Prefer: "return=representation",
  };
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "");

    if (!token) {
      return NextResponse.json({ error: "Missing authorization token." }, { status: 401 });
    }

    // Validate token with Supabase
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        apikey: ANON_KEY,
        Authorization: `Bearer ${token}`,
      },
    });

    if (!userRes.ok) {
      return NextResponse.json({ error: "Unauthorized / invalid token." }, { status: 401 });
    }

    const user = await userRes.json();

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
    } catch (_) {}

    // Fallback to auth.user data
    if (!profileData) {
      profileData = {
        id: user.id,
        email: user.email,
        full_name: user.user_metadata?.full_name || user.email?.split("@")[0] || "Developer",
        avatar_url: user.user_metadata?.avatar_url || "",
        auth_provider: user.app_metadata?.provider || "email",
        email_verified: Boolean(user.email_confirmed_at),
        created_at: user.created_at,
        updated_at: user.updated_at,
      };
    }

    return NextResponse.json({ profile: profileData });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error." }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, email, full_name, avatar_url, auth_provider, email_verified } = body;

    if (!id || !email) {
      return NextResponse.json({ error: "User ID and email are required." }, { status: 400 });
    }

    const payload = {
      id,
      email: email.trim().toLowerCase(),
      full_name: full_name?.trim() || email.split("@")[0],
      avatar_url: avatar_url || "",
      auth_provider: auth_provider || "email",
      email_verified: Boolean(email_verified),
      updated_at: new Date().toISOString(),
    };

    // 1. Upsert into public.profiles table (if table exists)
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
      }
    } catch (_) {}

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
    } catch (_) {}

    return NextResponse.json({
      status: "synced",
      profile: payload,
      db_persisted: dbSuccess,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Internal server error." }, { status: 500 });
  }
}
