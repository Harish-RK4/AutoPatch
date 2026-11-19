"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { FolderGit2, ArrowRight, Plus, Upload, Database, FileTerminal } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { fetchProjects, ProjectData } from "@/lib/api";

export default function ProjectsListPage() {
  const [filterMode, setFilterMode] = useState<"all" | "user" | "demo">("all");
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetchProjects(filterMode).then((data) => {
      setProjects(data);
      setLoading(false);
    });
  }, [filterMode]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E7E5E4] dark:border-[#292524]">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#1C1917] dark:text-[#F5F5F4]">
            Workspaces & Projects
          </h1>
          <p className="text-xs text-[#57534E] dark:text-[#D6D3D1] mt-0.5">
            Active code repositories, datasets, and snippet ingestion targets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/projects/new">
            <Button variant="primary" size="sm">
              <Plus className="w-3.5 h-3.5 mr-1" />
              New Ingestion Workspace
            </Button>
          </Link>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 p-1 bg-[#F5F5F4] dark:bg-[#1C1917] rounded-xl border border-[#E7E5E4] dark:border-[#292524] max-w-fit">
        <button
          type="button"
          onClick={() => setFilterMode("all")}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
            filterMode === "all"
              ? "bg-white dark:bg-[#292524] text-[#0F766E] dark:text-[#14B8A6] shadow-sm"
              : "text-[#57534E] dark:text-[#D6D3D1] hover:text-[#1C1917] dark:hover:text-[#F5F5F4]"
          }`}
        >
          All Targets
        </button>
        <button
          type="button"
          onClick={() => setFilterMode("user")}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
            filterMode === "user"
              ? "bg-white dark:bg-[#292524] text-[#0F766E] dark:text-[#14B8A6] shadow-sm"
              : "text-[#57534E] dark:text-[#D6D3D1] hover:text-[#1C1917] dark:hover:text-[#F5F5F4]"
          }`}
        >
          My Ingestions
        </button>
        <button
          type="button"
          onClick={() => setFilterMode("demo")}
          className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
            filterMode === "demo"
              ? "bg-white dark:bg-[#292524] text-[#0F766E] dark:text-[#14B8A6] shadow-sm"
              : "text-[#57534E] dark:text-[#D6D3D1] hover:text-[#1C1917] dark:hover:text-[#F5F5F4]"
          }`}
        >
          Demo Fixtures (Seed)
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs font-mono text-[#57534E] dark:text-[#D6D3D1]">
          Loading active workspaces...
        </div>
      ) : projects.length === 0 ? (
        <div className="bento-card p-12 text-center space-y-4">
          <FolderGit2 className="w-10 h-10 text-[#57534E] dark:text-[#D6D3D1] mx-auto stroke-[1.5]" />
          <div>
            <h3 className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F5F4]">
              No Ingested Workspaces Found
            </h3>
            <p className="text-xs text-[#57534E] dark:text-[#D6D3D1] max-w-sm mx-auto mt-1">
              {filterMode === "user"
                ? "You haven't uploaded any code or datasets yet. Ingest your first file to begin."
                : "No active targets found."}
            </p>
          </div>
          <Link href="/projects/new">
            <Button variant="primary" size="sm">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Upload Code or Dataset
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {projects.map((proj) => {
            const isDemo = proj.source_type === "demo" || proj.id.startsWith("demo-");
            return (
              <Link
                key={proj.id}
                href={`/projects/${proj.id}`}
                className="bento-card p-5 hover:border-[#0F766E] dark:hover:border-[#14B8A6] transition-all group block"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <FolderGit2 className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6] stroke-[1.5]" />
                      <span className="font-semibold text-sm text-[#1C1917] dark:text-[#F5F5F4] group-hover:text-[#0F766E] dark:group-hover:text-[#14B8A6] transition-colors">
                        {proj.name}
                      </span>
                      {isDemo ? (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#D97706]/10 text-[#D97706] dark:text-[#F59E0B] border border-[#D97706]/20 font-semibold">
                          Demo Seed
                        </span>
                      ) : (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0F766E]/10 text-[#0F766E] dark:text-[#14B8A6] border border-[#0F766E]/20 font-semibold">
                          User Ingestion
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#57534E] dark:text-[#D6D3D1] font-mono">
                      File: {proj.filename || "source_file"}
                    </p>
                  </div>
                  <Badge variant="teal">{proj.language || "Polyglot"}</Badge>
                </div>

                <div className="flex items-center justify-between text-xs pt-4 border-t border-[#E7E5E4] dark:border-[#292524] font-mono">
                  <span className="text-[#57534E] dark:text-[#D6D3D1]">
                    Status: <span className="text-[#10B981] capitalize">{proj.status || "ready"}</span>
                  </span>
                  <span className="flex items-center gap-1 text-[#0F766E] dark:text-[#14B8A6] font-sans font-medium text-xs">
                    Inspect Workspace <ArrowRight className="w-3.5 h-3.5 stroke-[1.5]" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
