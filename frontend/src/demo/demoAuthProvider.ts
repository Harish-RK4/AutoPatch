/**
 * Isolated Demo Authentication Provider
 * Simulates authentication sessions locally using credentials demo@autopatch.dev / Demo@1234
 */

export interface DemoUser {
  id: string;
  email: string;
  fullName: string;
  role: "developer" | "owner" | "viewer";
}

export const DEMO_USER: DemoUser = {
  id: "demo-user-001",
  email: "demo@autopatch.dev",
  fullName: "Demo Developer",
  role: "developer"
};

export class DemoAuthProvider {
  static getSession(): DemoUser | null {
    if (typeof window === "undefined") return DEMO_USER;
    const stored = localStorage.getItem("autopatch_demo_session");
    if (!stored) {
      // Default to logged-in demo user for seamless test walkthroughs
      localStorage.setItem("autopatch_demo_session", JSON.stringify(DEMO_USER));
      return DEMO_USER;
    }
    return JSON.parse(stored);
  }

  static signIn(email: string, pass: string): boolean {
    if (email === "demo@autopatch.dev" && pass === "Demo@1234") {
      if (typeof window !== "undefined") {
        localStorage.setItem("autopatch_demo_session", JSON.stringify(DEMO_USER));
      }
      return true;
    }
    return false;
  }

  static signOut(): void {
    if (typeof window !== "undefined") {
      localStorage.removeItem("autopatch_demo_session");
    }
  }
}
