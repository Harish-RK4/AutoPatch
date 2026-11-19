"use client";

import React from "react";
import Link from "next/navigation";
import { usePathname } from "next/navigation";
import { 
  FolderGit2, 
  Bug, 
  GitPullRequest, 
  History, 
  BarChart3, 
  Settings, 
  ShieldCheck
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/projects/demo-proj-001", label: "Projects", icon: FolderGit2 },
  { href: "/bugs/demo-bug-001", label: "Bugs", icon: Bug },
  { href: "/patches/demo-patch-001", label: "Patch Review", icon: GitPullRequest },
  { href: "/settings", label: "LLM & Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 flex-shrink-0 bg-white dark:bg-[#141210] border-r border-[#E7E5E4] dark:border-[#292524] flex flex-col justify-between p-3 select-none">
      <div>
        {/* Brand logo */}
        <div className="flex items-center gap-2.5 px-3 py-3 mb-4">
          <div className="w-7 h-7 rounded-md bg-[#0F766E] dark:bg-[#14B8A6] flex items-center justify-center text-white dark:text-[#0C0A09]">
            <ShieldCheck className="w-4 h-4 stroke-[2]" />
          </div>
          <div>
            <span className="font-semibold text-sm tracking-tight text-[#1C1917] dark:text-[#F5F5F4]">
              AutoPatch
            </span>
            <span className="block text-[10px] text-[#A8A29E] leading-none font-mono">
              Build for Trust
            </span>
          </div>
        </div>

        {/* Navigation items */}
        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

            return (
              <a
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? "bg-[#0F766E]/10 dark:bg-[#14B8A6]/15 text-[#0F766E] dark:text-[#14B8A6]"
                    : "text-[#78716C] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F5F5F4] hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{item.label}</span>
              </a>
            );
          })}
        </nav>
      </div>

      {/* Account Info footer */}
      <div className="border-t border-[#E7E5E4] dark:border-[#292524] pt-3 px-2">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-full bg-[#E7E5E4] dark:bg-[#292524] flex items-center justify-center text-[10px] font-mono font-bold text-[#78716C]">
            DP
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-medium truncate text-[#1C1917] dark:text-[#F5F5F4]">demo@autopatch.dev</p>
            <p className="text-[10px] text-[#A8A29E] truncate">Developer Mode</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
