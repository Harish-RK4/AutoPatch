/**
 * Password Reset API Route (Supabase Recovery)
 * Implements password reset request and password update using Supabase Auth.
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
    const { action, email, otp, new_password } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. Request Password Reset Link / Code
    if (action === "request") {
      const linkRes = await fetch(`${SUPABASE_URL}/auth/v1/admin/generate_link`, {
        method: "POST",
        headers: adminHeaders(),
        body: JSON.stringify({
          type: "recovery",
          email: cleanEmail,
        }),
      });

      if (!linkRes.ok) {
        const err = await linkRes.json().catch(() => ({}));
        return NextResponse.json(
          { error: err.msg || "Failed to generate password reset request." },
          { status: linkRes.status }
        );
      }

      const linkData = await linkRes.json();
      const code = linkData.email_otp;

      return NextResponse.json({
        status: "sent",
        email: cleanEmail,
        otp: code,
        message: `Password reset code generated for ${cleanEmail}.`,
      });
    }

    // 2. Perform Password Reset with OTP & New Password
    if (action === "reset") {
      if (!otp) {
        return NextResponse.json({ error: "Reset verification code is required." }, { status: 400 });
      }

      if (!new_password || new_password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters long." },
          { status: 400 }
        );
      }

      // Step A: Verify recovery token
      const verifyRes = await fetch(`${SUPABASE_URL}/auth/v1/verify`, {
        method: "POST",
        headers: {
          apikey: ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: "recovery",
          email: cleanEmail,
          token: otp.trim(),
        }),
      });

      if (!verifyRes.ok) {
        const err = await verifyRes.json().catch(() => ({}));
        return NextResponse.json(
          { error: err.msg || "Invalid or expired reset code." },
          { status: 400 }
        );
      }

      const verifyData = await verifyRes.json();
      const accessToken = verifyData.access_token;
      const userId = verifyData.user?.id;

      // Step B: Update user's password
      if (accessToken) {
        const updateRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
          method: "PUT",
          headers: {
            apikey: ANON_KEY,
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ password: new_password }),
        });

        if (updateRes.ok) {
          return NextResponse.json({
            status: "success",
            message: "Your password has been reset successfully. Please sign in with your new password.",
          });
        }
      }

      // Fallback: update via Admin API
      if (userId) {
        const adminUpdate = await fetch(`${SUPABASE_URL}/auth/v1/admin/users/${userId}`, {
          method: "PUT",
          headers: adminHeaders(),
          body: JSON.stringify({ password: new_password }),
        });

        if (adminUpdate.ok) {
          return NextResponse.json({
            status: "success",
            message: "Your password has been reset successfully. Please sign in with your new password.",
          });
        }
      }

      return NextResponse.json({ error: "Failed to update password. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ error: "Invalid action." }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Internal server error during password reset." },
      { status: 500 }
    );
  }
}
