"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function RegisterRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/login?tab=signup");
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center text-xs font-mono text-[#57534E] dark:text-[#D6D3D1]">
      Redirecting to registration portal...
    </div>
  );
}
