"use client";

import React, { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { AuthManager, AuthUser } from "@/lib/auth";

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Public routes that don't require session
    if (pathname === "/" || pathname === "/login" || pathname === "/icon") {
      setChecked(true);
      return;
    }

    const session = AuthManager.getSession();
    if (!session) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    } else {
      setUser(session);
      setChecked(true);
    }
  }, [pathname, router]);

  // While checking, render a calm loading skeleton
  if (!checked && pathname !== "/" && pathname !== "/login" && pathname !== "/icon") {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="flex items-center gap-2 text-xs font-mono text-[#57534E] dark:text-[#D6D3D1]">
          <span className="w-2 h-2 rounded-full bg-[#0F766E] dark:bg-[#14B8A6] animate-pulse" />
          <span>Verifying session security...</span>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
