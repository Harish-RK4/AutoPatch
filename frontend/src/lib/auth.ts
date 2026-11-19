/**
 * Client Session and Authentication Manager
 * Supports regular accounts and demo accounts with session persistence.
 */

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  name?: string;
  role: "developer" | "owner" | "viewer";
  isDemo: boolean;
}

export const DEMO_USER: AuthUser = {
  id: "demo-user-001",
  email: "demo@autopatch.dev",
  fullName: "Aisha Sharma",
  name: "Aisha Sharma",
  role: "developer",
  isDemo: true
};

const SESSION_KEY = "autopatch_session";

export class AuthManager {
  static getSession(): AuthUser | null {
    if (typeof window === "undefined") return null;
    try {
      const stored = localStorage.getItem(SESSION_KEY);
      if (stored) {
        const u = JSON.parse(stored);
        if (!u.name && u.fullName) u.name = u.fullName;
        return u;
      }
    } catch (e) {}
    return null;
  }

  static signIn(email: string, pass: string): AuthUser | null {
    if (email === "demo@autopatch.dev" && pass === "Demo@1234") {
      return this.loginDemo();
    }
    // Simple client authentication for testing phase
    if (email && pass && pass.length >= 4) {
      const name = email.split("@")[0];
      const capitalized = name.charAt(0).toUpperCase() + name.slice(1);
      const user: AuthUser = {
        id: `user-${Date.now().toString(36)}`,
        email,
        fullName: capitalized,
        name: capitalized,
        role: "developer",
        isDemo: false
      };
      if (typeof window !== "undefined") {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        document.cookie = `autopatch_session=active; path=/; max-age=86400; SameSite=Lax`;
      }
      return user;
    }
    return null;
  }

  static signUp(fullName: string, email: string, pass: string): AuthUser | null {
    if (email && pass && pass.length >= 4) {
      const display = fullName || email.split("@")[0];
      const user: AuthUser = {
        id: `user-${Date.now().toString(36)}`,
        email,
        fullName: display,
        name: display,
        role: "developer",
        isDemo: false
      };
      if (typeof window !== "undefined") {
        localStorage.setItem(SESSION_KEY, JSON.stringify(user));
        document.cookie = `autopatch_session=active; path=/; max-age=86400; SameSite=Lax`;
      }
      return user;
    }
    return null;
  }

  static loginDemo(): AuthUser {
    if (typeof window !== "undefined") {
      localStorage.setItem(SESSION_KEY, JSON.stringify(DEMO_USER));
      document.cookie = `autopatch_session=active; path=/; max-age=86400; SameSite=Lax`;
    }
    return DEMO_USER;
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
