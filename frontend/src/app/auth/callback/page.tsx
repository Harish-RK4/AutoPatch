"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthProvider } from "@/lib/authProvider";
import { ShieldCheck, Loader2 } from "lucide-react";

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const auth = getAuthProvider();
    auth
      .getSession()
      .then((user) => {
        if (user) {
          router.replace("/dashboard");
        } else {
          // Listen for auth state change
          const unsubscribe = auth.onAuthStateChange((newUser) => {
            if (newUser) {
              unsubscribe();
              router.replace("/dashboard");
            }
          });
          setTimeout(() => {
            unsubscribe();
            router.replace("/dashboard");
          }, 2500);
        }
      })
      .catch((err) => {
        setError(err?.message || "Failed to complete authentication.");
      });
  }, [router]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="text-center space-y-4 max-w-sm">
        <div className="w-12 h-12 rounded-xl bg-[#0F766E]/10 dark:bg-[#14B8A6]/10 text-[#0F766E] dark:text-[#14B8A6] flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6 stroke-[1.5]" />
        </div>
        <div className="space-y-1">
          <h2 className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F5F4] flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin text-[#0F766E] dark:text-[#14B8A6]" />
            Completing Secure Sign In...
          </h2>
          <p className="text-xs text-[#57534E] dark:text-[#D6D3D1]">
            Validating authentication credentials and establishing session.
          </p>
        </div>
        {error && (
          <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-md text-xs text-[#DC2626] dark:text-[#F87171]">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
