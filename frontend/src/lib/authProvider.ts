/**
 * Production Supabase AuthProvider Implementation
 * Pure Supabase Authentication with JWT Session Persistence,
 * Email/Password Auth, Email OTP Auth, Google OAuth, and Password Reset.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { AuthUser, AuthManager } from "./auth";

export interface AuthResponse {
  user: AuthUser | null;
  error: string | null;
}

export interface IAuthProvider {
  signIn(email: string, pass: string): Promise<AuthResponse>;
  signUp(fullName: string, email: string, pass: string): Promise<AuthResponse>;
  signInWithOAuth(provider: "google" | "github"): Promise<AuthResponse>;
  sendOtp(email: string, phone?: string): Promise<{ success: boolean; otp?: string; sentToEmail?: boolean; error?: string }>;
  verifyOtp(email: string, token: string): Promise<AuthResponse>;
  resetPassword(email: string): Promise<{ success: boolean; otp?: string; error?: string }>;
  signOut(): Promise<void>;
  getSession(): Promise<AuthUser | null>;
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void;
  getMode(): "supabase";
}

let _globalSupabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) return null;

  if (typeof window === "undefined") {
    return createClient(url, anonKey);
  }

  if (!_globalSupabaseClient) {
    _globalSupabaseClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return _globalSupabaseClient;
}

/**
 * Production Supabase Auth Provider
 */
export class SupabaseAuthProvider implements IAuthProvider {
  private get supabase(): SupabaseClient | null {
    return getSupabaseClient();
  }

  getMode(): "supabase" {
    return "supabase";
  }

  /**
   * Helper to sync profile data to backend / profiles table
   */
  private async syncProfile(user: AuthUser, provider: string = "email"): Promise<void> {
    try {
      await fetch("/api/auth/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: user.id,
          email: user.email,
          full_name: user.fullName,
          avatar_url: user.avatarUrl || "",
          auth_provider: provider,
          email_verified: true,
        }),
      });
    } catch (_) {}
  }

  /**
   * Email and Password Sign In
   */
  async signIn(email: string, pass: string): Promise<AuthResponse> {
    if (!this.supabase) {
      return { user: null, error: "Supabase configuration missing in environment." };
    }

    const cleanEmail = email.trim().toLowerCase();
    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: cleanEmail,
      password: pass,
    });

    if (error || !data.user) {
      const msg = error?.message?.toLowerCase() || "";
      if (msg.includes("invalid login credentials") || msg.includes("invalid_grant")) {
        return { user: null, error: "Invalid email or password. Please verify your credentials and try again." };
      }
      if (msg.includes("email not confirmed")) {
        return { user: null, error: "Your email address is not yet confirmed. Please verify your email or sign in with OTP." };
      }
      return { user: null, error: error?.message || "Authentication failed." };
    }

    const u = data.user;
    const user: AuthUser = {
      id: u.id,
      email: u.email || cleanEmail,
      fullName: u.user_metadata?.full_name || u.user_metadata?.name || cleanEmail.split("@")[0],
      avatarUrl: u.user_metadata?.avatar_url || "",
      role: (u.user_metadata?.role as any) || "developer",
      authProvider: u.app_metadata?.provider || "email",
      isDemo: false,
    };

    AuthManager.setSession(user);
    this.syncProfile(user, user.authProvider);

    return { user, error: null };
  }

  /**
   * Real Registration via Server Admin API (Zero rate limit errors)
   */
  async signUp(fullName: string, email: string, pass: string): Promise<AuthResponse> {
    const cleanEmail = email.trim().toLowerCase();

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password: pass, full_name: fullName }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { user: null, error: data.error || "Registration failed. Please try again." };
      }

      // Auto sign in with the verified credentials
      return await this.signIn(cleanEmail, pass);
    } catch (err: any) {
      return {
        user: null,
        error: "Registration service currently unavailable. Please try again shortly.",
      };
    }
  }

  /**
   * Request Email OTP Code (Real Supabase Email Delivery with Server Fallback)
   */
  async sendOtp(email: string, phone?: string): Promise<{ success: boolean; otp?: string; sentToEmail?: boolean; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Try real Supabase direct email OTP delivery
    if (this.supabase) {
      try {
        const { error } = await this.supabase.auth.signInWithOtp({
          email: cleanEmail,
          options: { shouldCreateUser: true },
        });

        if (!error) {
          return { success: true, sentToEmail: true };
        }
      } catch (_) {}
    }

    // 2. Fallback to Server Admin API (e.g. if SMTP rate limited)
    try {
      const res = await fetch("/api/auth/otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "send", email: cleanEmail, phone }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Failed to generate verification code." };
      }

      return { success: true, otp: data.otp, sentToEmail: false };
    } catch (err: any) {
      return { success: false, error: err?.message || "OTP service unavailable." };
    }
  }

  /**
   * Verify Real Supabase OTP (Supports both 'email' and 'magiclink' verification)
   */
  async verifyOtp(email: string, token: string): Promise<AuthResponse> {
    if (!this.supabase) {
      return { user: null, error: "Supabase credentials missing." };
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();

    // Try primary Supabase email OTP verification
    let { data, error } = await this.supabase.auth.verifyOtp({
      email: cleanEmail,
      token: cleanToken,
      type: "email",
    });

    // If 'email' type fails, try 'magiclink' type
    if (error || !data.user) {
      const retry = await this.supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: "magiclink",
      });
      if (retry.data?.user) {
        data = retry.data;
        error = null;
      }
    }

    // If 'magiclink' type fails, try 'signup' type
    if (error || !data.user) {
      const retry = await this.supabase.auth.verifyOtp({
        email: cleanEmail,
        token: cleanToken,
        type: "signup",
      });
      if (retry.data?.user) {
        data = retry.data;
        error = null;
      }
    }

    if (error || !data.user) {
      return { user: null, error: error?.message || "Invalid or expired verification code." };
    }

    const u = data.user;
    const user: AuthUser = {
      id: u.id,
      email: u.email || cleanEmail,
      fullName: u.user_metadata?.full_name || cleanEmail.split("@")[0],
      avatarUrl: u.user_metadata?.avatar_url || "",
      role: (u.user_metadata?.role as any) || "developer",
      authProvider: "email_otp",
      isDemo: false,
    };

    AuthManager.setSession(user);
    this.syncProfile(user, "email_otp");

    return { user, error: null };
  }

  /**
   * Request Password Reset
   */
  async resetPassword(email: string): Promise<{ success: boolean; otp?: string; error?: string }> {
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "request", email: email.trim().toLowerCase() }),
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || "Failed to request password reset." };
      }

      return { success: true, otp: data.otp };
    } catch (err: any) {
      return { success: false, error: err?.message || "Reset service unavailable." };
    }
  }

  /**
   * Google & GitHub OAuth Sign In
   */
  async signInWithOAuth(provider: "google" | "github"): Promise<AuthResponse> {
    if (!this.supabase) {
      return { user: null, error: "Supabase credentials missing in environment." };
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });

    if (error) {
      return { user: null, error: error.message };
    }

    if (data?.url) {
      if (typeof window !== "undefined") {
        window.location.assign(data.url);
      }
    }

    return { user: null, error: null };
  }

  /**
   * Sign Out
   */
  async signOut(): Promise<void> {
    if (this.supabase) {
      await this.supabase.auth.signOut().catch(() => {});
    }
    AuthManager.clearSession();
  }

  /**
   * Get Active Session
   */
  async getSession(): Promise<AuthUser | null> {
    if (!this.supabase) {
      return AuthManager.getSession();
    }

    const { data } = await this.supabase.auth.getSession();
    if (!data.session?.user) {
      return AuthManager.getSession();
    }

    const u = data.session.user;
    const user: AuthUser = {
      id: u.id,
      email: u.email || "",
      fullName: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split("@")[0] || "Developer",
      avatarUrl: u.user_metadata?.avatar_url || u.user_metadata?.picture || "",
      role: (u.user_metadata?.role as any) || "developer",
      authProvider: u.app_metadata?.provider || "supabase",
      isDemo: false,
    };

    AuthManager.setSession(user);
    return user;
  }

  /**
   * Auth State Change Listener
   */
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    if (!this.supabase) return () => {};
    const { data } = this.supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user;
        const user: AuthUser = {
          id: u.id,
          email: u.email || "",
          fullName: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split("@")[0] || "Developer",
          avatarUrl: u.user_metadata?.avatar_url || u.user_metadata?.picture || "",
          role: (u.user_metadata?.role as any) || "developer",
          authProvider: u.app_metadata?.provider || "supabase",
          isDemo: false,
        };
        AuthManager.setSession(user);
        callback(user);
      } else {
        AuthManager.clearSession();
        callback(null);
      }
    });
    return () => data.subscription.unsubscribe();
  }
}

let _supabaseAuthProviderInstance: SupabaseAuthProvider | null = null;

export function getAuthProvider(): IAuthProvider {
  if (!_supabaseAuthProviderInstance) {
    _supabaseAuthProviderInstance = new SupabaseAuthProvider();
  }
  return _supabaseAuthProviderInstance;
}
