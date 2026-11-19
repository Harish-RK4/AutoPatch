"use client";

import React from "react";
import { Bell, Command, Search } from "lucide-react";

export function TopNav() {
  return (
    <header className="h-12 border-b border-[#E7E5E4] dark:border-[#292524] bg-white dark:bg-[#141210] px-4 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-xs font-mono text-[#78716C] dark:text-[#A8A29E] bg-[#FAF9F6] dark:bg-[#1C1917] px-2.5 py-1 rounded border border-[#E7E5E4] dark:border-[#292524]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          <span>Project: Python Marks Calculator</span>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Quick search and command palette"
          className="flex items-center gap-2 text-xs text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F5F5F4] bg-[#FAF9F6] dark:bg-[#1C1917] px-3 py-1.5 rounded border border-[#E7E5E4] dark:border-[#292524]"
        >
          <Search className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Search codebase or bugs...</span>
          <kbd className="hidden sm:inline text-[10px] bg-black/5 dark:bg-white/10 px-1 rounded font-mono">⌘K</kbd>
        </button>

        <button
          type="button"
          aria-label="View notifications"
          className="w-8 h-8 rounded flex items-center justify-center text-[#78716C] dark:text-[#A8A29E] hover:bg-black/5 dark:hover:bg-white/5 relative"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#0F766E] dark:bg-[#14B8A6]" />
        </button>
      </div>
    </header>
  );
}
