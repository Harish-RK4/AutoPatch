"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getAuthProvider } from "@/lib/authProvider";
import { createClient } from "@supabase/supabase-js";
import { ShieldCheck, Loader2 } from "lucide-react";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = async () => {
      const code = searchParams.get("code");
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (code && url && key) {
        try {
          const supabase = createClient(url, key);
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) {
            console.error("Exchange code error:", exchangeError);
          } else if (data.session?.user) {
            const u = data.session.user;
            // Sync user profile
            fetch("/api/auth/profile", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                id: u.id,
                email: u.email,
                full_name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split("@")[0],
                avatar_url: u.user_metadata?.avatar_url || u.user_metadata?.picture || "",
                auth_provider: u.app_metadata?.provider || "google",
                email_verified: Boolean(u.email_confirmed_at),
              }),
            }).catch(() => {});
            router.replace("/dashboard");
            return;
          }
        } catch (err: any) {
          console.error("Auth callback error:", err);
        }
      }

      // Check active session
      const auth = getAuthProvider();
      const session = await auth.getSession();
      if (session) {
        // Sync profile
        fetch("/api/auth/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: session.id,
            email: session.email,
            full_name: session.fullName,
            auth_provider: "google",
            email_verified: true,
          }),
        }).catch(() => {});
        router.replace("/dashboard");
      } else {
        const unsubscribe = auth.onAuthStateChange((newUser) => {
          if (newUser) {
            unsubscribe();
            router.replace("/dashboard");
          }
        });
        setTimeout(() => {
          unsubscribe();
          router.replace("/dashboard");
        }, 3000);
      }
    };

    handleAuth().catch((err) => {
      setError(err?.message || "Failed to complete authentication.");
    });
  }, [router, searchParams]);

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

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[50vh] flex items-center justify-center text-xs font-mono text-[#71717A]">
        Authenticating...
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
