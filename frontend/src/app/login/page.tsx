"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, ArrowRight, CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("demo@autopatch.dev");
  const [password, setPassword] = useState("Demo@1234");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email === "demo@autopatch.dev" && password === "Demo@1234") {
      router.push("/dashboard");
    } else {
      setError("Invalid credentials. For demo access, use demo@autopatch.dev / Demo@1234");
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4">
      <div className="w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-xl overflow-hidden shadow-sm">
        {/* Left: Sign-In Form */}
        <div className="p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6">
              <div className="w-7 h-7 rounded-md bg-[#0F766E] dark:bg-[#14B8A6] flex items-center justify-center text-white dark:text-[#0C0A09]">
                <ShieldCheck className="w-4 h-4 stroke-[2]" />
              </div>
              <span className="font-semibold text-base tracking-tight text-[#1C1917] dark:text-[#F5F5F4]">
                AutoPatch
              </span>
            </div>

            <h1 className="text-xl font-bold tracking-tight text-[#1C1917] dark:text-[#F5F5F4] mb-2">
              Sign In to AutoPatch
            </h1>
            <p className="text-xs text-[#78716C] dark:text-[#A8A29E] mb-6">
              Autonomous software bug detection, repair, and sandboxed verification.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-md text-xs text-[#EF4444]">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F5F4] mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] text-[#1C1917] dark:text-[#F5F5F4] focus:outline-none focus:ring-1 focus:ring-[#0F766E] dark:focus:ring-[#14B8A6]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F5F4] mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-md bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] text-[#1C1917] dark:text-[#F5F5F4] focus:outline-none focus:ring-1 focus:ring-[#0F766E] dark:focus:ring-[#14B8A6]"
                  required
                />
              </div>

              <Button type="submit" variant="primary" className="w-full py-2">
                Continue with Demo Account
                <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
              </Button>
            </form>
          </div>

          <div className="mt-8 pt-4 border-t border-[#E7E5E4] dark:border-[#292524] text-[11px] text-[#78716C] dark:text-[#A8A29E]">
            <p className="font-semibold text-[#F59E0B] mb-1">Demo Mode Credentials:</p>
            <p>Email: <code className="text-[#1C1917] dark:text-[#F5F5F4]">demo@autopatch.dev</code></p>
            <p>Password: <code className="text-[#1C1917] dark:text-[#F5F5F4]">Demo@1234</code></p>
          </div>
        </div>

        {/* Right: Live Interactive Mini-Example */}
        <div className="bg-[#FAF9F6] dark:bg-[#1C1917] p-8 border-t md:border-t-0 md:border-l border-[#E7E5E4] dark:border-[#292524] flex flex-col justify-between font-mono text-xs">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#E7E5E4] dark:border-[#292524]">
              <span className="font-bold text-[#1C1917] dark:text-[#F5F5F4]">Real Pipeline Example</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-[#10B981]/10 text-[#10B981] border border-[#10B981]/20">
                V4 Proven
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-white dark:bg-[#141210] rounded border border-[#E7E5E4] dark:border-[#292524]">
                <div className="flex items-center gap-1.5 text-[#DC2626] dark:text-[#EF4444] mb-1 font-semibold text-[11px]">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  Bug Detected: calculate_percentage(-5, 100)
                </div>
                <div className="text-[11px] text-[#78716C] dark:text-[#A8A29E]">
                  Accepts negative input without precondition check. Produces -5.0%.
                </div>
              </div>

              <div className="p-3 bg-white dark:bg-[#141210] rounded border border-[#E7E5E4] dark:border-[#292524]">
                <div className="text-[11px] font-semibold text-[#059669] dark:text-[#10B981] mb-1">
                  Synthesized Minimal Patch:
                </div>
                <pre className="text-[10px] text-[#1C1917] dark:text-[#F5F5F4] overflow-x-auto leading-relaxed">
{`+ if not (0.0 <= marks <= total):
+     raise ValueError("Marks out of bounds")`}
                </pre>
              </div>

              <div className="p-3 bg-[#10B981]/10 border border-[#10B981]/20 rounded text-[#059669] dark:text-[#10B981] text-[11px] flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                <span>14/14 Sandbox tests passed. Regression test generated.</span>
              </div>
            </div>
          </div>

          <div className="pt-6 text-[10px] text-[#A8A29E] font-sans">
            Every bug explained · Every change shown · Tested before developer approval
          </div>
        </div>
      </div>
    </div>
  );
}
