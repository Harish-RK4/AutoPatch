"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FolderGit2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { fetchProjects } from "@/lib/api";

export default function ProjectsListPage() {
  const [projects, setProjects] = useState<any[]>([]);

  useEffect(() => {
    fetchProjects().then(setProjects);
  }, []);

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-[#E7E5E4] dark:border-[#292524]">
        <h1 className="text-xl font-bold tracking-tight text-[#1C1917] dark:text-[#F5F5F4]">
          Workspaces & Projects
        </h1>
        <p className="text-xs text-[#78716C] dark:text-[#A8A29E] mt-0.5">
          Select an active workspace to view its 5-stage pipeline, file index, and detected defects.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {projects.map((proj) => (
          <Link
            key={proj.id}
            href={`/projects/${proj.id}`}
            className="block p-4 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] hover:border-[#0F766E] dark:hover:border-[#14B8A6] rounded-lg transition-colors group"
          >
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex items-center gap-2">
                <FolderGit2 className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6] stroke-[1.5]" />
                <span className="font-semibold text-sm text-[#1C1917] dark:text-[#F5F5F4] group-hover:text-[#0F766E] dark:group-hover:text-[#14B8A6]">
                  {proj.name}
                </span>
              </div>
              <Badge variant="teal">{proj.language || "Polyglot"}</Badge>
            </div>

            <p className="text-xs text-[#78716C] dark:text-[#A8A29E] line-clamp-2 mb-4 leading-relaxed">
              {proj.description || "Active source project indexed for autonomous bug detection and repair."}
            </p>

            <div className="flex items-center justify-between text-xs pt-3 border-t border-[#E7E5E4] dark:border-[#292524] font-mono">
              <span className="text-[#A8A29E]">Status: <span className="text-[#10B981] font-medium">Ready</span></span>
              <span className="flex items-center gap-1 text-[#0F766E] dark:text-[#14B8A6] font-sans font-medium text-xs">
                Open Workspace <ArrowRight className="w-3.5 h-3.5 stroke-[1.5]" />
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
