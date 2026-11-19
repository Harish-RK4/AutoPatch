"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { getAuthProvider } from "@/lib/authProvider";
import { AuthManager } from "@/lib/auth";

interface AuthGuardProps {
  children: React.ReactNode;
}

const PUBLIC_PREFIXES = [
  "/auth/",
  "/api/",
  "/_next/",
];

const PUBLIC_EXACT = new Set([
  "/",
  "/login",
  "/register",
  "/icon",
  "/favicon.ico",
]);

function isPublicRoute(pathname: string): boolean {
  if (PUBLIC_EXACT.has(pathname)) return true;
  for (const prefix of PUBLIC_PREFIXES) {
    if (pathname.startsWith(prefix)) return true;
  }
  return false;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const auth = getAuthProvider();

    const evaluateRouteAccess = async () => {
      const session = await auth.getSession();
      if (!isMounted) return;

      const isPublic = isPublicRoute(pathname);

      // If user is already authenticated and visits login/register, redirect to dashboard
      if (session && (pathname === "/login" || pathname === "/register")) {
        router.replace("/dashboard");
        return;
      }

      // If route is protected and no session exists, redirect to login
      if (!isPublic && !session && !AuthManager.isAuthenticated()) {
        const redirectParam = encodeURIComponent(pathname);
        router.replace(`/login?redirect=${redirectParam}`);
        return;
      }

      setChecked(true);
    };

    evaluateRouteAccess();

    // Subscribe to auth state changes for multi-tab synchronization
    const unsubscribe = auth.onAuthStateChange((user) => {
      if (!isMounted) return;
      const isPublic = isPublicRoute(pathname);

      if (!user && !isPublic) {
        // Only redirect to login if there is TRULY no local authenticated session
        if (!AuthManager.isAuthenticated()) {
          router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
        }
      } else if (user && (pathname === "/login" || pathname === "/register")) {
        // Logged in: redirect away from login
        router.replace("/dashboard");
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [pathname, router]);

  // If on a public route, render immediately
  if (isPublicRoute(pathname)) {
    return <>{children}</>;
  }

  // While verifying access on protected routes, show a calm branded loader
  if (!checked) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0F766E]/10 dark:bg-[#14B8A6]/10 text-[#0F766E] dark:text-[#14B8A6] flex items-center justify-center animate-pulse">
            <span className="w-3.5 h-3.5 rounded-full bg-[#0F766E] dark:bg-[#14B8A6]" />
          </div>
          <div className="text-xs font-mono text-[#71717A] dark:text-[#A1A1AA] flex items-center gap-1.5">
            <span>Verifying session security...</span>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
