"use client";

import React, { useEffect, useState } from "react";
import { FolderGit2, Bug, CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { fetchProjects } from "@/lib/api";

export default function DashboardPage() {
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    fetchProjects().then(setProjects);
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E7E5E4] dark:border-[#292524]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1C1917] dark:text-[#F5F5F4]">
            Engineering Dashboard
          </h1>
          <p className="text-xs text-[#57534E] dark:text-[#D6D3D1] mt-0.5">
            Real-time defect tracking, automated test verification, and patch governance.
          </p>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-lg">
          <div className="flex items-center justify-between text-xs text-[#57534E] dark:text-[#D6D3D1] mb-2 font-medium">
            <span>Active Workspaces</span>
            <FolderGit2 className="w-4 h-4" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-[#1C1917] dark:text-[#F5F5F4]">
            {projects.length || 4}
          </div>
          <p className="text-[10px] text-[#57534E] dark:text-[#D6D3D1] mt-1">Multi-language & dataset testbeds</p>
        </div>

        <div className="p-4 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-lg">
          <div className="flex items-center justify-between text-xs text-[#57534E] dark:text-[#D6D3D1] mb-2 font-medium">
            <span>Bugs Detected</span>
            <Bug className="w-4 h-4 text-[#EF4444]" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-[#1C1917] dark:text-[#F5F5F4]">
            6
          </div>
          <p className="text-[10px] text-[#57534E] dark:text-[#D6D3D1] mt-1">All with reproducible inputs</p>
        </div>

        <div className="p-4 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-lg">
          <div className="flex items-center justify-between text-xs text-[#57534E] dark:text-[#D6D3D1] mb-2 font-medium">
            <span>Verified Patches</span>
            <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-[#1C1917] dark:text-[#F5F5F4]">
            4
          </div>
          <p className="text-[10px] text-[#57534E] dark:text-[#D6D3D1] mt-1">Backed by sandboxed tests</p>
        </div>

        <div className="p-4 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-lg">
          <div className="flex items-center justify-between text-xs text-[#57534E] dark:text-[#D6D3D1] mb-2 font-medium">
            <span>Acceptance Rate</span>
            <ShieldCheck className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6]" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-[#1C1917] dark:text-[#F5F5F4]">
            100%
          </div>
          <p className="text-[10px] text-[#57534E] dark:text-[#D6D3D1] mt-1">Proof bundle on every patch</p>
        </div>
      </div>

      {/* Projects List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F5F4]">
            Projects & Analysis Targets
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((proj) => (
            <a
              key={proj.id}
              href={`/projects/${proj.id}`}
              className="block p-4 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] hover:border-[#0F766E] dark:hover:border-[#14B8A6] rounded-lg transition-colors group"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm text-[#1C1917] dark:text-[#F5F5F4] group-hover:text-[#0F766E] dark:group-hover:text-[#14B8A6]">
                      {proj.name}
                    </span>
                    <Badge variant="teal">{proj.language || "Polyglot"}</Badge>
                  </div>
                  <p className="text-xs text-[#57534E] dark:text-[#D6D3D1] line-clamp-1 mb-3">
                    {proj.description || "Source project loaded with reproducible bugs and verified fixes."}
                  </p>
                </div>
                <Badge vLevel="V4" />
              </div>

              <div className="flex items-center justify-between text-[11px] text-[#57534E] dark:text-[#D6D3D1] pt-3 border-t border-[#E7E5E4] dark:border-[#292524] font-mono">
                <span>Status: <span className="text-[#10B981] font-medium">Ready for Review</span></span>
                <span className="flex items-center gap-1 text-[#0F766E] dark:text-[#14B8A6] font-sans font-medium">
                  Inspect Bugs <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
