"use client";

import React, { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ShieldCheck, ArrowRight, CheckCircle2, AlertTriangle, KeyRound, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { AuthManager } from "@/lib/auth";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect") || "/dashboard";

  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("demo@autopatch.dev");
  const [password, setPassword] = useState("Demo@1234");
  const [fullName, setFullName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const user = AuthManager.signIn(email, password);
    if (user) {
      router.push(redirectUrl);
    } else {
      setError("Invalid credentials. Enter any valid email & 4+ char password, or use Quick Demo Login.");
    }
  };

  const handleSignUp = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!fullName) {
      setError("Please enter your full name.");
      return;
    }
    const user = AuthManager.signUp(fullName, email, password);
    if (user) {
      router.push(redirectUrl);
    } else {
      setError("Please provide a valid email and password (min 4 characters).");
    }
  };

  const handleDemoLogin = () => {
    AuthManager.loginDemo();
    router.push(redirectUrl);
  };

  return (
    <div className="min-h-[85vh] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 bg-white/90 dark:bg-[#141210]/90 backdrop-blur-md border border-[#E7E5E4] dark:border-[#292524] rounded-2xl overflow-hidden shadow-sm">
        {/* Left: Sign-In / Sign-Up Form */}
        <div className="p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-6">
              <Link href="/" className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-md bg-[#0F766E] dark:bg-[#14B8A6] flex items-center justify-center text-white dark:text-[#0C0A09]">
                  <ShieldCheck className="w-4 h-4 stroke-[1.5]" />
                </div>
                <span className="font-semibold text-base tracking-tight text-[#1C1917] dark:text-[#F5F5F4]">
                  AutoPatch
                </span>
              </Link>
              <ThemeToggle />
            </div>

            {/* Auth Mode Tabs (Sign In / Sign Up) */}
            <div className="flex items-center border-b border-[#E7E5E4] dark:border-[#292524] mb-6">
              <button
                type="button"
                onClick={() => { setTab("signin"); setError(null); }}
                className={`flex-1 pb-2.5 text-xs font-semibold transition-colors border-b-2 ${
                  tab === "signin"
                    ? "border-[#0F766E] text-[#0F766E] dark:border-[#14B8A6] dark:text-[#14B8A6]"
                    : "border-transparent text-[#57534E] dark:text-[#D6D3D1] hover:text-[#1C1917]"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setTab("signup"); setError(null); }}
                className={`flex-1 pb-2.5 text-xs font-semibold transition-colors border-b-2 ${
                  tab === "signup"
                    ? "border-[#0F766E] text-[#0F766E] dark:border-[#14B8A6] dark:text-[#14B8A6]"
                    : "border-transparent text-[#57534E] dark:text-[#D6D3D1] hover:text-[#1C1917]"
                }`}
              >
                Create Account
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-md text-xs text-[#DC2626] dark:text-[#F87171]">
                {error}
              </div>
            )}

            {tab === "signin" ? (
              <form onSubmit={handleSignIn} className="space-y-4">
                <div>
                  <label htmlFor="signin-email" className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F5F4] mb-1">
                    Email Address
                  </label>
                  <input
                    id="signin-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full px-3 py-2 text-xs rounded-md bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] text-[#1C1917] dark:text-[#F5F5F4] focus:outline-none focus:ring-1 focus:ring-[#0F766E] dark:focus:ring-[#14B8A6]"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="signin-password" className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F5F4] mb-1">
                    Password
                  </label>
                  <input
                    id="signin-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs rounded-md bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] text-[#1C1917] dark:text-[#F5F5F4] focus:outline-none focus:ring-1 focus:ring-[#0F766E] dark:focus:ring-[#14B8A6]"
                    required
                  />
                </div>

                <div className="space-y-2 pt-2">
                  <Button type="submit" variant="primary" className="w-full py-2">
                    Sign In
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5 stroke-[1.5]" />
                  </Button>

                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleDemoLogin}
                    className="w-full py-2 text-[#0F766E] dark:text-[#14B8A6] border-[#0F766E]/30"
                  >
                    <KeyRound className="w-3.5 h-3.5 mr-1.5 stroke-[1.5]" />
                    Quick Demo Sign In (1-Click)
                  </Button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSignUp} className="space-y-4">
                <div>
                  <label htmlFor="signup-name" className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F5F4] mb-1">
                    Full Name
                  </label>
                  <input
                    id="signup-name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-3 py-2 text-xs rounded-md bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] text-[#1C1917] dark:text-[#F5F5F4] focus:outline-none focus:ring-1 focus:ring-[#0F766E] dark:focus:ring-[#14B8A6]"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="signup-email" className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F5F4] mb-1">
                    Work Email
                  </label>
                  <input
                    id="signup-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full px-3 py-2 text-xs rounded-md bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] text-[#1C1917] dark:text-[#F5F5F4] focus:outline-none focus:ring-1 focus:ring-[#0F766E] dark:focus:ring-[#14B8A6]"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="signup-password" className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F5F4] mb-1">
                    Choose Password (min 4 chars)
                  </label>
                  <input
                    id="signup-password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3 py-2 text-xs rounded-md bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] text-[#1C1917] dark:text-[#F5F5F4] focus:outline-none focus:ring-1 focus:ring-[#0F766E] dark:focus:ring-[#14B8A6]"
                    required
                  />
                </div>

                <Button type="submit" variant="primary" className="w-full py-2">
                  <UserPlus className="w-3.5 h-3.5 mr-1.5 stroke-[1.5]" />
                  Create Developer Account
                </Button>
              </form>
            )}
          </div>

          <div className="mt-8 pt-4 border-t border-[#E7E5E4] dark:border-[#292524] text-[11px] text-[#57534E] dark:text-[#D6D3D1]">
            <p className="font-semibold text-[#B45309] dark:text-[#FBBF24] mb-1">Demo Access Credentials:</p>
            <p>Email: <code className="text-[#1C1917] dark:text-[#F5F5F4]">demo@autopatch.dev</code> · Password: <code className="text-[#1C1917] dark:text-[#F5F5F4]">Demo@1234</code></p>
          </div>
        </div>

        {/* Right: Live Interactive Mini-Example */}
        <div className="bg-[#FAF9F6]/80 dark:bg-[#1C1917]/80 p-8 border-t md:border-t-0 md:border-l border-[#E7E5E4] dark:border-[#292524] flex flex-col justify-between font-mono text-xs">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E7E5E4] dark:border-[#292524]">
              <span className="font-bold text-[#1C1917] dark:text-[#F5F5F4]">Live Verification Example</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] border border-[#10B981]/30">
                V4 Proven
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-white dark:bg-[#141210] rounded-lg border border-[#E7E5E4] dark:border-[#292524]">
                <div className="flex items-center gap-1.5 text-[#B91C1C] dark:text-[#F87171] mb-1 font-semibold text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5 stroke-[1.5]" />
                  Defect: calculate_percentage(-5, 100)
                </div>
                <div className="text-[11px] text-[#57534E] dark:text-[#D6D3D1] font-sans">
                  Negative marks accepted without assertion, yielding -5.0%.
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-[#141210] rounded-lg border border-[#E7E5E4] dark:border-[#292524]">
                <div className="text-[11px] font-semibold text-[#047857] dark:text-[#34D399] mb-1">
                  Synthesized Minimal Patch:
                </div>
                <pre className="text-[10px] text-[#1C1917] dark:text-[#F5F5F4] overflow-x-auto leading-relaxed">
{`+ if not (0.0 <= marks <= total):
+     raise ValueError("Invalid score")`}
                </pre>
              </div>

              <div className="p-3 bg-[#10B981]/10 border border-[#10B981]/20 rounded-lg text-[#047857] dark:text-[#34D399] text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 stroke-[1.5]" />
                <span className="font-sans">14/14 Sandbox tests passed. Proof carrying bundle verified.</span>
              </div>
            </div>
          </div>

          <div className="pt-6 text-[10px] text-[#57534E] dark:text-[#D6D3D1] font-sans">
            Every bug explained · Every change shown · Tested before developer approval
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center text-xs font-mono text-[#57534E] dark:text-[#D6D3D1]">
          Loading sign-in...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
