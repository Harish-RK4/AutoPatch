"use client";

import React, { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { getSupabaseClient } from "@/lib/authProvider";
import { AuthManager, AuthUser } from "@/lib/auth";
import { ShieldCheck, Loader2, AlertTriangle, ArrowRight } from "lucide-react";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("Verifying credentials with Supabase...");
  const processedRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    const handleOAuthCallback = async () => {
      if (processedRef.current) return;

      // 1. Capture hash and search parameters before any client wiping
      const rawHash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
      const hashParams = new URLSearchParams(rawHash);

      // Check for OAuth error parameters
      const oauthError = searchParams.get("error") || hashParams.get("error");
      const oauthDesc = searchParams.get("error_description") || hashParams.get("error_description");
      if (oauthError || oauthDesc) {
        if (isMounted) {
          setError(oauthDesc || oauthError || "Authentication was cancelled or failed.");
        }
        return;
      }

      const supabase = getSupabaseClient();
      if (!supabase) {
        if (isMounted) setError("Supabase configuration missing in client.");
        return;
      }

      const code = searchParams.get("code") || hashParams.get("code");
      const accessToken = hashParams.get("access_token") || searchParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token") || searchParams.get("refresh_token") || "";
      const redirectUrl = searchParams.get("redirect") || searchParams.get("next") || hashParams.get("redirect") || "/dashboard";

      const handleUserSuccess = (u: any) => {
        if (processedRef.current) return;
        processedRef.current = true;

        const user: AuthUser = {
          id: u.id,
          email: u.email || "",
          fullName: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split("@")[0] || "Developer",
          name: u.user_metadata?.full_name || u.user_metadata?.name || u.email?.split("@")[0] || "Developer",
          avatarUrl: u.user_metadata?.avatar_url || u.user_metadata?.picture || "",
          role: (u.user_metadata?.role as any) || "developer",
          authProvider: u.app_metadata?.provider || "google",
          emailVerified: Boolean(u.email_confirmed_at),
          createdAt: u.created_at,
          isDemo: false,
        };

        AuthManager.setSession(user);

        // Sync user profile non-blockingly
        fetch("/api/auth/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: user.id,
            email: user.email,
            full_name: user.fullName,
            avatar_url: user.avatarUrl,
            auth_provider: user.authProvider,
            email_verified: true,
          }),
        }).catch((syncErr) => console.warn("OAuth profile sync warning:", syncErr));

        if (isMounted) {
          setStatus("Session verified! Entering workspace...");
        }

        // Full window replacement to purge code/hash params and enter dashboard immediately
        window.location.replace(redirectUrl);
      };

      // Helper to check Supabase storage directly
      const checkLocalStorageSession = () => {
        if (typeof window === "undefined") return null;
        try {
          const raw = localStorage.getItem("autopatch-auth-token");
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.user?.id) return parsed.user;
          }
        } catch {}
        return null;
      };

      try {
        // Step A: Immediate check in localStorage (Supabase background client may have already written it)
        const localUser = checkLocalStorageSession();
        if (localUser) {
          handleUserSuccess(localUser);
          return;
        }

        // Step B: If accessToken is present in hash fragment, validate and establish session
        if (accessToken) {
          if (isMounted) setStatus("Token received! Establishing secure session...");
          try {
            if (refreshToken) {
              const { data, error: setSessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (!setSessionError && data.session?.user) {
                handleUserSuccess(data.session.user);
                return;
              }
            }

            // Fallback: Validate access token directly via getUser
            const { data: userData } = await supabase.auth.getUser(accessToken);
            if (userData?.user) {
              handleUserSuccess(userData.user);
              return;
            }
          } catch (e) {
            console.warn("Token processing error:", e);
          }
        }

        // Step C: Check getSession()
        const { data: initialSession } = await supabase.auth.getSession();
        if (initialSession.session?.user) {
          handleUserSuccess(initialSession.session.user);
          return;
        }

        // Step D: Listen to auth state changes
        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
          if (session?.user && !processedRef.current) {
            authListener.subscription.unsubscribe();
            handleUserSuccess(session.user);
          }
        });

        // Step E: If code is present in query or hash (PKCE flow), exchange it
        if (code) {
          if (isMounted) setStatus("Exchanging authorization code for secure session...");
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

          if (!exchangeError && data.session?.user) {
            authListener.subscription.unsubscribe();
            handleUserSuccess(data.session.user);
            return;
          }

          // If exchangeCodeForSession failed, re-check getSession() and localStorage
          const { data: verifySession } = await supabase.auth.getSession();
          if (verifySession.session?.user) {
            authListener.subscription.unsubscribe();
            handleUserSuccess(verifySession.session.user);
            return;
          }
        }

        // Step F: Polling loop for 4 seconds (checking every 150ms for localStorage or getSession)
        const startTime = Date.now();
        const pollInterval = setInterval(async () => {
          if (processedRef.current || !isMounted) {
            clearInterval(pollInterval);
            return;
          }

          const storedUser = checkLocalStorageSession();
          if (storedUser) {
            clearInterval(pollInterval);
            authListener.subscription.unsubscribe();
            handleUserSuccess(storedUser);
            return;
          }

          const { data: pollSession } = await supabase.auth.getSession();
          if (pollSession.session?.user) {
            clearInterval(pollInterval);
            authListener.subscription.unsubscribe();
            handleUserSuccess(pollSession.session.user);
            return;
          }

          if (Date.now() - startTime > 4000) {
            clearInterval(pollInterval);
            authListener.subscription.unsubscribe();
            if (isMounted && !processedRef.current && !AuthManager.isAuthenticated()) {
              setError("No active authentication session could be verified. Please try signing in again.");
            }
          }
        }, 150);

      } catch (err: any) {
        if (isMounted && !processedRef.current) {
          setError(err?.message || "An unexpected error occurred during authentication.");
        }
      }
    };

    handleOAuthCallback();

    return () => {
      isMounted = false;
    };
  }, [router, searchParams]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="text-center space-y-5 max-w-md w-full bg-white dark:bg-[#121214] border border-[#E4E4E7] dark:border-[#27272A] rounded-2xl p-8 shadow-2xl">
        <div className="w-12 h-12 rounded-xl bg-[#0F766E]/10 dark:bg-[#14B8A6]/10 text-[#0F766E] dark:text-[#14B8A6] flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6 stroke-[1.5]" />
        </div>

        {error ? (
          <div className="space-y-4">
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-600 dark:text-red-400 flex items-start gap-2.5 text-left">
              <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold mb-0.5">Authentication Failed</div>
                <p className="leading-relaxed">{error}</p>
              </div>
            </div>

            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl bg-[#0F766E] dark:bg-[#14B8A6] text-white dark:text-[#0C0A09] text-xs font-semibold shadow-sm hover:opacity-90 transition-opacity"
            >
              Return to Sign In <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F5F4] flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-[#0F766E] dark:text-[#14B8A6]" />
              Completing Secure Authentication...
            </h2>
            <p className="text-xs text-[#71717A] dark:text-[#A1A1AA] leading-relaxed">
              {status}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center text-xs font-mono text-[#71717A]">
          Authenticating with Supabase...
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
