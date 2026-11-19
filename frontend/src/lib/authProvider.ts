/**
 * Production Supabase AuthProvider Implementation
 * Pure Supabase Authentication with JWT Session Persistence,
 * Email/Password Auth, Email OTP Auth, Google OAuth, and Password Reset.
 */

import { createClient, SupabaseClient, User as SupabaseUser } from "@supabase/supabase-js";
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
  updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }>;
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
    return createClient(url, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  if (!_globalSupabaseClient) {
    _globalSupabaseClient = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "autopatch-auth-token",
      },
    });
  }
  return _globalSupabaseClient;
}

function mapSupabaseUserToAuthUser(u: SupabaseUser, fallbackEmail = ""): AuthUser {
  const email = u.email || fallbackEmail;
  const fullName =
    u.user_metadata?.full_name ||
    u.user_metadata?.name ||
    email.split("@")[0] ||
    "Developer";

  return {
    id: u.id,
    email,
    fullName,
    name: fullName,
    avatarUrl: u.user_metadata?.avatar_url || u.user_metadata?.picture || "",
    role: (u.user_metadata?.role as any) || "developer",
    authProvider: u.app_metadata?.provider || "email",
    emailVerified: Boolean(u.email_confirmed_at),
    createdAt: u.created_at,
    lastSignInAt: u.last_sign_in_at,
    isDemo: false,
  };
}

/**
 * Production Supabase Auth Provider
 */
export class SupabaseAuthProvider implements IAuthProvider {
  private inFlightRequests: Map<string, Promise<any>> = new Map();

  private get supabase(): SupabaseClient | null {
    return getSupabaseClient();
  }

  getMode(): "supabase" {
    return "supabase";
  }

  /**
   * Helper to deduplicate identical concurrent operations
   */
  private deduplicate<T>(key: string, fn: () => Promise<T>): Promise<T> {
    if (this.inFlightRequests.has(key)) {
      return this.inFlightRequests.get(key) as Promise<T>;
    }
    const promise = fn().finally(() => {
      this.inFlightRequests.delete(key);
    });
    this.inFlightRequests.set(key, promise);
    return promise;
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
          email_verified: user.emailVerified ?? true,
        }),
      });
    } catch (err) {
      console.warn("Non-fatal profile sync error:", err);
    }
  }

  /**
   * Translates Supabase auth errors to user-friendly text
   */
  private formatAuthError(error: any): string {
    const msg = (error?.message || "").toLowerCase();
    if (msg.includes("invalid login credentials") || msg.includes("invalid_grant") || msg.includes("invalid username or password")) {
      return "Invalid email or password. Please verify your credentials and try again.";
    }
    if (msg.includes("email not confirmed")) {
      return "Your email address is not yet confirmed. Please verify your email or sign in with OTP.";
    }
    if (msg.includes("rate limit") || msg.includes("too many requests")) {
      return "Too many attempts. Please wait a minute before trying again.";
    }
    if (msg.includes("user already registered") || msg.includes("already exists")) {
      return "An account with this email already exists. Please sign in with your password.";
    }
    if (msg.includes("password should be at least")) {
      return "Password must be at least 8 characters with uppercase, lowercase, and numbers/symbols.";
    }
    return error?.message || "Authentication failed. Please try again.";
  }

  /**
   * Email and Password Sign In
   */
  async signIn(email: string, pass: string): Promise<AuthResponse> {
    const cleanEmail = email.trim().toLowerCase();
    const reqKey = `signIn:${cleanEmail}`;

    return this.deduplicate(reqKey, async () => {
      if (!this.supabase) {
        return { user: null, error: "Supabase configuration missing in environment." };
      }

      if (!cleanEmail || !pass) {
        return { user: null, error: "Please provide both email and password." };
      }

      const { data, error } = await this.supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: pass,
      });

      if (error || !data.user) {
        return { user: null, error: this.formatAuthError(error) };
      }

      const user = mapSupabaseUserToAuthUser(data.user, cleanEmail);
      AuthManager.setSession(user);

      // Asynchronously ensure profile is saved in DB
      this.syncProfile(user, user.authProvider);

      return { user, error: null };
    });
  }

  /**
   * Real Registration in Supabase Auth
   */
  async signUp(fullName: string, email: string, pass: string): Promise<AuthResponse> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanName = fullName.trim();
    const reqKey = `signUp:${cleanEmail}`;

    return this.deduplicate(reqKey, async () => {
      if (!cleanEmail || !pass || !cleanName) {
        return { user: null, error: "Please provide full name, email, and password." };
      }

      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: cleanEmail, password: pass, full_name: cleanName }),
        });

        const data = await res.json().catch(() => ({}));
        if (!res.ok) {
          return { user: null, error: data.error || "Registration failed. Please try again." };
        }

        // Auto sign in with the newly confirmed credentials
        return await this.signIn(cleanEmail, pass);
      } catch (err: any) {
        return {
          user: null,
          error: "Registration service currently unavailable. Please try again shortly.",
        };
      }
    });
  }

  /**
   * Request Email OTP Code (Real Supabase Email Delivery with Server Fallback)
   */
  async sendOtp(email: string, phone?: string): Promise<{ success: boolean; otp?: string; sentToEmail?: boolean; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const reqKey = `sendOtp:${cleanEmail}`;

    return this.deduplicate(reqKey, async () => {
      if (!cleanEmail || !cleanEmail.includes("@")) {
        return { success: false, error: "Please enter a valid email address." };
      }

      const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:3000";

      // 1. Try real Supabase direct email OTP delivery with explicit redirect URL
      if (this.supabase) {
        try {
          const { error } = await this.supabase.auth.signInWithOtp({
            email: cleanEmail,
            options: {
              shouldCreateUser: true,
              emailRedirectTo: `${origin}/auth/callback`,
            },
          });

          if (!error) {
            // Direct email OTP delivery succeeded. DO NOT call generateLink which would invalidate this token!
            return { success: true, sentToEmail: true };
          }
          console.warn("Supabase direct signInWithOtp warning:", error.message);
        } catch (err) {
          console.warn("Direct Supabase OTP call failed:", err);
        }
      }

      // 2. Server API fallback only if direct call failed
      try {
        const res = await fetch("/api/auth/otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "send", email: cleanEmail, phone }),
        });

        const data = await res.json();
        if (!res.ok) {
          return { success: false, error: data.error || "Failed to send verification code." };
        }

        return {
          success: true,
          sentToEmail: true,
        };
      } catch (err: any) {
        return { success: false, error: err?.message || "OTP service unavailable." };
      }
    });
  }

  /**
   * Verify Real Supabase OTP (Supports both 'email' and 'magiclink' verification)
   */
  async verifyOtp(email: string, token: string): Promise<AuthResponse> {
    const cleanEmail = email.trim().toLowerCase();
    const cleanToken = token.trim();
    const reqKey = `verifyOtp:${cleanEmail}:${cleanToken}`;

    return this.deduplicate(reqKey, async () => {
      if (!this.supabase) {
        return { user: null, error: "Supabase credentials missing." };
      }

      if (!cleanToken) {
        return { user: null, error: "Please enter the verification code." };
      }

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
        return { user: null, error: this.formatAuthError(error) || "Invalid or expired verification code." };
      }

      const user = mapSupabaseUserToAuthUser(data.user, cleanEmail);
      user.authProvider = "email_otp";

      AuthManager.setSession(user);
      this.syncProfile(user, "email_otp");

      return { user, error: null };
    });
  }

  /**
   * Request Password Reset
   */
  async resetPassword(email: string): Promise<{ success: boolean; otp?: string; error?: string }> {
    const cleanEmail = email.trim().toLowerCase();
    const reqKey = `resetPassword:${cleanEmail}`;

    return this.deduplicate(reqKey, async () => {
      if (!cleanEmail || !cleanEmail.includes("@")) {
        return { success: false, error: "Please provide a valid email address." };
      }

      try {
        const res = await fetch("/api/auth/reset-password", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "request", email: cleanEmail }),
        });

        const data = await res.json();
        if (!res.ok) {
          return { success: false, error: data.error || "Failed to request password reset." };
        }

        return { success: true, otp: data.otp };
      } catch (err: any) {
        return { success: false, error: err?.message || "Reset service unavailable." };
      }
    });
  }

  /**
   * Update User Password (for logged-in users or during reset)
   */
  async updatePassword(newPassword: string): Promise<{ success: boolean; error?: string }> {
    if (!this.supabase) {
      return { success: false, error: "Supabase client not initialized." };
    }

    if (!newPassword || newPassword.length < 8) {
      return { success: false, error: "Password must be at least 8 characters long." };
    }

    const { error } = await this.supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      return { success: false, error: this.formatAuthError(error) };
    }

    return { success: true };
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
      return { user: null, error: this.formatAuthError(error) };
    }

    if (data?.url && typeof window !== "undefined") {
      window.location.assign(data.url);
    }

    return { user: null, error: null };
  }

  /**
   * Sign Out
   */
  async signOut(): Promise<void> {
    if (this.supabase) {
      try {
        await this.supabase.auth.signOut();
      } catch (err) {
        console.warn("Supabase signOut error:", err);
      }
    }
    AuthManager.clearSession();
  }

  /**
   * Get Active Session
   */
  async getSession(): Promise<AuthUser | null> {
    const localUser = AuthManager.getSession();

    if (!this.supabase) {
      return localUser;
    }

    try {
      const { data, error } = await this.supabase.auth.getSession();
      if (!error && data.session?.user) {
        const user = mapSupabaseUserToAuthUser(data.session.user);
        AuthManager.setSession(user);
        return user;
      }

      // Fallback to active local session if Supabase is still loading
      return localUser;
    } catch {
      return localUser;
    }
  }

  /**
   * Auth State Change Listener
   */
  onAuthStateChange(callback: (user: AuthUser | null) => void): () => void {
    if (!this.supabase) return () => {};

    const { data } = this.supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const user = mapSupabaseUserToAuthUser(session.user);
        AuthManager.setSession(user);

        if (event === "SIGNED_IN") {
          this.syncProfile(user, user.authProvider);
        }

        callback(user);
      } else if (event === "SIGNED_OUT") {
        AuthManager.clearSession();
        callback(null);
      }
    });

    return () => {
      data.subscription.unsubscribe();
    };
  }
}

let _supabaseAuthProviderInstance: SupabaseAuthProvider | null = null;

export function getAuthProvider(): IAuthProvider {
  if (!_supabaseAuthProviderInstance) {
    _supabaseAuthProviderInstance = new SupabaseAuthProvider();
  }
  return _supabaseAuthProviderInstance;
}
