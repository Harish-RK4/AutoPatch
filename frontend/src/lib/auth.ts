/**
 * Client Session and Authentication Manager
 * Secure session synchronization and inspection for Supabase Auth.
 */

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  name?: string;
  avatarUrl?: string;
  role: "developer" | "owner" | "viewer";
  authProvider?: string;
  emailVerified?: boolean;
  isDemo?: boolean;
  createdAt?: string;
  lastSignInAt?: string;
}

const SESSION_KEY = "autopatch_session";
const SESSION_TIMESTAMP_KEY = "autopatch_session_time";
// 24 hours in milliseconds
const SESSION_TTL_MS = 24 * 60 * 60 * 1000;

export class AuthManager {
  /**
   * Retrieves the current user session if valid and not expired.
   */
  static getSession(): AuthUser | null {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      const storedTime = localStorage.getItem(SESSION_TIMESTAMP_KEY);

      if (!stored) return null;

      // Check session age if timestamp is present
      if (storedTime) {
        const age = Date.now() - parseInt(storedTime, 10);
        if (age > SESSION_TTL_MS) {
          // Session expired
          this.clearSession();
          return null;
        }
      }

      const parsed = JSON.parse(stored) as AuthUser;
      if (!parsed || !parsed.id || !parsed.email) {
        this.clearSession();
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  /**
   * Persists an active user session to localStorage and session cookie.
   */
  static setSession(user: AuthUser): void {
    if (typeof window === "undefined") return;
    try {
      const userToStore: AuthUser = {
        ...user,
        name: user.fullName || user.name || user.email.split("@")[0],
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(userToStore));
      localStorage.setItem(SESSION_TIMESTAMP_KEY, Date.now().toString());

      // Set cookie for middleware and server-side route visibility
      const secureFlag = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie = `autopatch_session=active; path=/; max-age=86400; SameSite=Lax${secureFlag}`;
    } catch (e) {
      console.error("Failed to persist auth session:", e);
    }
  }

  /**
   * Partially updates the stored session.
   */
  static updateSession(updates: Partial<AuthUser>): AuthUser | null {
    const current = this.getSession();
    if (!current) return null;
    const updated = { ...current, ...updates };
    this.setSession(updated);
    return updated;
  }

  /**
   * Clears the current user session and session cookies.
   */
  static signOut(): void {
    if (typeof window === "undefined") return;
    try {
      localStorage.removeItem(SESSION_KEY);
      localStorage.removeItem(SESSION_TIMESTAMP_KEY);
      document.cookie = "autopatch_session=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax";
    } catch {}
  }

  static clearSession(): void {
    this.signOut();
  }

  /**
   * Check if user is currently authenticated with a valid session.
   */
  static isAuthenticated(): boolean {
    return this.getSession() !== null;
  }
}
