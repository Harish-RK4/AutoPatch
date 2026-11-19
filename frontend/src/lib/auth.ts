/**
 * Client Session and Authentication Manager
 * Secure JWT session synchronization and inspection for Supabase Auth.
 */

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  name?: string;
  avatarUrl?: string;
  role: "developer" | "owner" | "viewer";
  authProvider?: string;
  isDemo?: boolean;
}

const SESSION_KEY = "autopatch_session";

export class AuthManager {
  static getSession(): AuthUser | null {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) return JSON.parse(stored);
    } catch (e) {}
    return null;
  }

  static setSession(user: AuthUser): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_KEY, JSON.stringify(user));
      document.cookie = `autopatch_session=active; path=/; max-age=86400; SameSite=Lax`;
    }
  }

  static signOut(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem(SESSION_KEY);
      document.cookie = `autopatch_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
  }

  static clearSession(): void {
    this.signOut();
  }

  static isAuthenticated(): boolean {
    return this.getSession() !== null;
  }
}
