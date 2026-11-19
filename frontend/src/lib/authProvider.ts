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

    if (email && pass && pass.length >= 4) {
      const name = email.split("@")[0];
      const user: AuthUser = {
        id: `user-${Date.now().toString(36)}`,
        email,
        fullName: name.charAt(0).toUpperCase() + name.slice(1),
        role: "developer",
        isDemo: false,
      };
      if (typeof window !== "undefined") {
        localStorage.setItem("autopatch_session", JSON.stringify(user));
        document.cookie = `autopatch_session=active; path=/; max-age=86400; SameSite=Lax`;
      }
      return { user, error: null };
    }

    return { user: null, error: "Invalid credentials. Use demo@autopatch.dev / Demo@1234" };
  }

  async signUp(fullName: string, email: string, pass: string): Promise<AuthResponse> {
    return this.signIn(email, pass);
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
      email,
      password: pass,
    });

    if (error || !data.user) {
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
      try {
        // Pre-validate whether provider is enabled in Supabase to avoid raw 400 JSON browser error
        const probe = await fetch(data.url, { method: "GET", redirect: "manual" });
        if (probe.status === 400) {
          const body = await probe.json().catch(() => null);
          if (body?.msg?.includes("not enabled") || body?.error_code === "validation_failed") {
            return {
              user: null,
              error: `PROVIDER_DISABLED:${provider}`,
            };
          }
          if (body?.msg) {
            return { user: null, error: body.msg };
          }
        }
      } catch (probeErr) {
        // In case of CORS restriction, fallback to direct redirect
      }

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

    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    try {
      // Attempt server-side registration using admin service role to auto-confirm email
      const res = await fetch(`${apiBase}/api/v1/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass, full_name: fullName }),
      });
      if (res.ok) {
        return await this.signIn(email, pass);
      } else {
        const errJson = await res.json().catch(() => ({}));
        if (errJson.detail) {
          return { user: null, error: errJson.detail };
        }
      }
    } catch (e) {
      // Fallback to client SDK
    }

    const { data, error } = await this.supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: { full_name: fullName, role: "developer" },
      },
    });

    if (error || !data.user) {
      return { user: null, error: error?.message || "Sign up failed." };
    }

    return await this.signIn(email, pass);
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
      // Fallback to local storage
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

/**
 * Singleton AuthProvider factory
 * Controlled entirely by NEXT_PUBLIC_AUTH_MODE
 */
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
