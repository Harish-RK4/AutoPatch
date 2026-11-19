/**
 * AuthProvider Interface & Implementations
 * Pluggable architecture supporting DemoAuthProvider and SupabaseAuthProvider.
 * Switched solely via NEXT_PUBLIC_AUTH_MODE=demo|supabase without code modifications.
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { AuthUser, DEMO_USER } from "./auth";

export interface AuthResponse {
  user: AuthUser | null;
  error: string | null;
}

export interface IAuthProvider {
  signIn(email: string, pass: string): Promise<AuthResponse>;
  signUp(fullName: string, email: string, pass: string): Promise<AuthResponse>;
  signInWithOAuth(provider: "google" | "github"): Promise<AuthResponse>;
  signInWithGoogle?(email: string, fullName?: string): Promise<AuthResponse>;
  signOut(): Promise<void>;
  getSession(): Promise<AuthUser | null>;
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void;
  getMode(): "demo" | "supabase";
}

/**
 * Demo Auth Provider (Isolated Mock Testing)
 */
export class DemoAuthProvider implements IAuthProvider {
  getMode(): "demo" {
    return "demo";
  }

  async signIn(email: string, pass: string): Promise<AuthResponse> {
    if (email === "demo@autopatch.dev" && pass === "Demo@1234") {
      if (typeof window !== "undefined") {
        localStorage.setItem("autopatch_session", JSON.stringify(DEMO_USER));
        document.cookie = `autopatch_session=active; path=/; max-age=86400; SameSite=Lax`;
      }
      return { user: DEMO_USER, error: null };
    }

    return { user: null, error: "Invalid email or password. Use demo@autopatch.dev / Demo@1234" };
  }

  async signUp(fullName: string, email: string, pass: string): Promise<AuthResponse> {
    const user: AuthUser = {
      id: `user-${Date.now().toString(36)}`,
      email,
      fullName: fullName || email.split("@")[0],
      role: "developer",
      isDemo: true,
    };
    if (typeof window !== "undefined") {
      localStorage.setItem("autopatch_session", JSON.stringify(user));
      document.cookie = `autopatch_session=active; path=/; max-age=86400; SameSite=Lax`;
    }
    return { user, error: null };
  }

  async signInWithOAuth(provider: "google" | "github"): Promise<AuthResponse> {
    const user: AuthUser = {
      id: `oauth-${Date.now().toString(36)}`,
      email: `${provider}.developer@autopatch.dev`,
      fullName: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Developer`,
      role: "developer",
      isDemo: true,
    };
    if (typeof window !== "undefined") {
      localStorage.setItem("autopatch_session", JSON.stringify(user));
      document.cookie = `autopatch_session=active; path=/; max-age=86400; SameSite=Lax`;
    }
    return { user, error: null };
  }

  async signInWithGoogle(email: string = "developer@gmail.com", fullName: string = "Google Developer"): Promise<AuthResponse> {
    const user: AuthUser = {
      id: `google-${Date.now().toString(36)}`,
      email,
      fullName,
      role: "developer",
      isDemo: true,
    };
    if (typeof window !== "undefined") {
      localStorage.setItem("autopatch_session", JSON.stringify(user));
      document.cookie = `autopatch_session=active; path=/; max-age=86400; SameSite=Lax`;
    }
    return { user, error: null };
  }

  async signOut(): Promise<void> {
    if (typeof window !== "undefined") {
      localStorage.removeItem("autopatch_session");
      document.cookie = `autopatch_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  }

  async getSession(): Promise<AuthUser | null> {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem("autopatch_session");
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return null;
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    const handleStorage = () => {
      this.getSession().then(callback);
    };
    if (typeof window !== "undefined") {
      window.addEventListener("storage", handleStorage);
      return () => window.removeEventListener("storage", handleStorage);
    }
    return () => {};
  }
}

let _globalSupabaseClient: SupabaseClient | null = null;

function getSupabaseClient(): SupabaseClient | null {
  if (typeof window === "undefined") {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && anonKey) {
      return createClient(url, anonKey);
    }
    return null;
  }

  if (!_globalSupabaseClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (url && anonKey) {
      _globalSupabaseClient = createClient(url, anonKey);
    }
  }
  return _globalSupabaseClient;
}

/**
 * Supabase Auth Provider (Production Live Cutover)
 */
export class SupabaseAuthProvider implements IAuthProvider {
  private get supabase(): SupabaseClient | null {
    return getSupabaseClient();
  }

  getMode(): "supabase" {
    return "supabase";
  }

  async signIn(email: string, pass: string): Promise<AuthResponse> {
    if (!this.supabase) {
      return { user: null, error: "Supabase credentials missing in .env (NEXT_PUBLIC_SUPABASE_URL)." };
    }

    const { data, error } = await this.supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: pass,
    });

    if (error || !data.user) {
      const msg = error?.message?.toLowerCase() || "";
      if (msg.includes("invalid login credentials") || msg.includes("invalid_grant")) {
        return { user: null, error: "Invalid email or password. Please verify your credentials and try again." };
      }
      if (msg.includes("email not confirmed")) {
        return { user: null, error: "Your email address has not been confirmed yet." };
      }
      return { user: null, error: error?.message || "Authentication failed." };
    }

    const user: AuthUser = {
      id: data.user.id,
      email: data.user.email || email,
      fullName: data.user.user_metadata?.full_name || email.split("@")[0],
      role: (data.user.user_metadata?.role as any) || "developer",
      isDemo: false,
    };

    if (typeof window !== "undefined") {
      localStorage.setItem("autopatch_session", JSON.stringify(user));
      document.cookie = `autopatch_session=active; path=/; max-age=86400; SameSite=Lax`;
    }

    return { user, error: null };
  }

  /**
   * Google Sign-In via Supabase Admin Verified OTP Session
   */
  async signInWithGoogle(email: string, fullName?: string): Promise<AuthResponse> {
    if (!this.supabase) {
      return { user: null, error: "Supabase credentials missing." };
    }

    try {
      const res = await fetch("/api/auth/google", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), full_name: fullName }),
      });

      const data = await res.json();
      if (!res.ok || !data.otp) {
        return { user: null, error: data.error || "Failed to initiate Google sign-in." };
      }

      // Verify OTP with Supabase client to establish real JWT session
      const verifyRes = await this.supabase.auth.verifyOtp({
        email: data.email,
        token: data.otp,
        type: "magiclink",
      });

      if (verifyRes.error || !verifyRes.data.user) {
        return { user: null, error: verifyRes.error?.message || "Failed to verify Google session." };
      }

      const u = verifyRes.data.user;
      const user: AuthUser = {
        id: u.id,
        email: u.email || data.email,
        fullName: u.user_metadata?.full_name || fullName || data.email.split("@")[0],
        role: (u.user_metadata?.role as any) || "developer",
        isDemo: false,
      };

      if (typeof window !== "undefined") {
        localStorage.setItem("autopatch_session", JSON.stringify(user));
        document.cookie = `autopatch_session=active; path=/; max-age=86400; SameSite=Lax`;
      }

      return { user, error: null };
    } catch (err: any) {
      return { user: null, error: err?.message || "Google sign-in failed." };
    }
  }

  async signInWithOAuth(provider: "google" | "github"): Promise<AuthResponse> {
    if (!this.supabase) {
      return { user: null, error: "Supabase credentials missing in .env." };
    }

    const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${origin}/auth/callback`,
        skipBrowserRedirect: true,
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

  async signUp(fullName: string, email: string, pass: string): Promise<AuthResponse> {
    if (!this.supabase) {
      return { user: null, error: "Supabase credentials missing in .env." };
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password: pass, full_name: fullName }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return { user: null, error: data.error || "Registration failed. Please try again." };
      }

      // Auto sign in with the newly created verified credentials
      return await this.signIn(email, pass);
    } catch (err: any) {
      return {
        user: null,
        error: "Registration service currently unavailable. Please try again shortly.",
      };
    }
  }

  async signOut(): Promise<void> {
    if (this.supabase) {
      await this.supabase.auth.signOut().catch(() => {});
    }
    if (typeof window !== "undefined") {
      localStorage.removeItem("autopatch_session");
      document.cookie = `autopatch_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  }

  async getSession(): Promise<AuthUser | null> {
    if (!this.supabase) {
      if (typeof window === "undefined") return null;
      try {
        const stored = localStorage.getItem("autopatch_session");
        if (stored) return JSON.parse(stored);
      } catch (e) {}
      return null;
    }

    const { data } = await this.supabase.auth.getSession();
    if (!data.session?.user) return null;

    const u = data.session.user;
    return {
      id: u.id,
      email: u.email || "",
      fullName: u.user_metadata?.full_name || u.email?.split("@")[0] || "Developer",
      role: (u.user_metadata?.role as any) || "developer",
      isDemo: false,
    };
  }

  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    if (!this.supabase) return () => {};
    const { data } = this.supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const u = session.user;
        callback({
          id: u.id,
          email: u.email || "",
          fullName: u.user_metadata?.full_name || u.email?.split("@")[0] || "Developer",
          role: (u.user_metadata?.role as any) || "developer",
          isDemo: false,
        });
      } else {
        callback(null);
      }
    });
    return () => data.subscription.unsubscribe();
  }
}

let _demoAuthProviderInstance: DemoAuthProvider | null = null;
let _supabaseAuthProviderInstance: SupabaseAuthProvider | null = null;

export function getAuthProvider(): IAuthProvider {
  const mode = process.env.NEXT_PUBLIC_AUTH_MODE;
  if (mode === "supabase") {
    if (!_supabaseAuthProviderInstance) {
      _supabaseAuthProviderInstance = new SupabaseAuthProvider();
    }
    return _supabaseAuthProviderInstance;
  }
  if (!_demoAuthProviderInstance) {
    _demoAuthProviderInstance = new DemoAuthProvider();
  }
  return _demoAuthProviderInstance;
}
