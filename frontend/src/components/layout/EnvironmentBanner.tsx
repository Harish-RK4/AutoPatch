"use client";

import React from "react";

export function EnvironmentBanner() {
  const isDemo = process.env.NEXT_PUBLIC_AUTH_MODE === "demo";

  if (!isDemo) return null;

  return (
    <aside
      aria-label="Demo environment notification"
      className="w-full bg-[#1C1917] text-[#FAF9F6] text-xs font-mono py-1.5 px-4 flex items-center justify-between border-b border-[#292524] z-50 select-none"
    >
      <div className="flex items-center gap-2">
        <span className="w-2 h-2 rounded-full bg-[#F59E0B] animate-pulse" />
        <span className="font-semibold uppercase tracking-wider text-[#F59E0B]">Demo Mode Active:</span>
        <span className="text-[#57534E] dark:text-[#D6D3D1]">Seeded fixtures loaded. Sandboxed offline Mock Provider active.</span>
      </div>
      <div className="flex items-center gap-3 text-xs">
        <span className="hidden sm:inline text-[#57534E] dark:text-[#D6D3D1]">Demo Account: <code className="text-[#FAF9F6]">demo@autopatch.dev</code></span>
        <span className="bg-[#292524] px-2 py-0.5 rounded text-[#F59E0B] font-medium">Zero Keys Needed</span>
      </div>
    </aside>
  );
}
