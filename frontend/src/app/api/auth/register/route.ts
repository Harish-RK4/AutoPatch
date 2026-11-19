import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, password, full_name } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ detail: "Email and password are required." }, { status: 400 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { detail: "Supabase configuration missing on server." },
        { status: 500 }
      );
    }

    const headers = {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    };

    // 1. Attempt to create the user directly with email_confirm = true
    const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers,
      body: JSON.stringify({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: full_name || email.split("@")[0], role: "developer" },
      }),
    });

    if (createRes.ok) {
      const data = await createRes.json();
      return NextResponse.json({
        status: "created",
        user_id: data.id,
        email: data.email,
        message: "User successfully registered and auto-confirmed.",
      });
    }

    // 2. If user already exists (HTTP 422), update password and auto-confirm email
    if (createRes.status === 422) {
      // Find the existing user by email
      const listRes = await fetch(`${supabaseUrl}/auth/v1/admin/users?per_page=100`, {
        method: "GET",
        headers,
      });

      if (listRes.ok) {
        const listData = await listRes.json();
        const existing = (listData.users || []).find(
          (u: any) => u.email?.toLowerCase() === email.toLowerCase()
        );

        if (existing) {
          const updateRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${existing.id}`, {
            method: "PUT",
            headers,
            body: JSON.stringify({
              password,
              email_confirm: true,
              user_metadata: {
                ...existing.user_metadata,
                full_name: full_name || existing.user_metadata?.full_name || email.split("@")[0],
                role: "developer",
              },
            }),
          });

          if (updateRes.ok) {
            return NextResponse.json({
              status: "updated",
              user_id: existing.id,
              email: existing.email,
              message: "Account updated and auto-confirmed. Proceeding to sign in.",
            });
          }
        }
      }

      return NextResponse.json(
        { detail: "This email is already registered. Please sign in with your password." },
        { status: 400 }
      );
    }

    const errData = await createRes.json().catch(() => ({}));
    return NextResponse.json(
      { detail: errData.msg || errData.message || "Registration failed." },
      { status: createRes.status }
    );
  } catch (error: any) {
    return NextResponse.json(
      { detail: error?.message || "Internal server error during registration." },
      { status: 500 }
    );
  }
}
