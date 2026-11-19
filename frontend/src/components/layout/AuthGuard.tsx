"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { getAuthProvider } from "@/lib/authProvider";
import { AuthUser } from "@/lib/auth";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Public routes that don't require session
    if (
      pathname === "/" ||
      pathname === "/login" ||
      pathname === "/register" ||
      pathname.startsWith("/auth/") ||
      pathname === "/icon"
    ) {
      setChecked(true);
      return;
    }

    const auth = getAuthProvider();
    auth.getSession().then((session) => {
      if (!session) {
        router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
      } else {
        setChecked(true);
      }
    });
  }, [pathname, router]);

  // While checking on protected routes, render a calm loading skeleton
  if (
    !checked &&
    pathname !== "/" &&
    pathname !== "/login" &&
    pathname !== "/register" &&
    !pathname.startsWith("/auth/") &&
    pathname !== "/icon"
  ) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex items-center gap-2 text-xs font-mono text-[#57534E] dark:text-[#D6D3D1]">
          <span className="w-2 h-2 rounded-full bg-[#0F766E] dark:bg-[#14B8A6] animate-pulse" />
          <span>Verifying authentication security...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
