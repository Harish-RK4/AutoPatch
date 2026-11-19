"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { GitPullRequest, ArrowRight, ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { fetchBugDetail } from "@/lib/api";

export default function PatchesListPage() {
  const [patches, setPatches] = useState<any[]>([]);

  useEffect(() => {
    fetchBugDetail("demo-bug-001").then((bug) => {
      if (bug && bug.patches) setPatches(bug.patches);
    });
  }, []);

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-[#E7E5E4] dark:border-[#292524]">
        <h1 className="text-xl font-bold tracking-tight text-[#1C1917] dark:text-[#F5F5F4]">
          Patch Candidates & Proof Bundles
        </h1>
        <p className="text-xs text-[#57534E] dark:text-[#D6D3D1] mt-0.5">
          Review minimal code repairs evaluated by the Critic agent and verified by the test harness.
        </p>
      </div>

      <div className="space-y-3">
        {patches.map((p) => (
          <div
            key={p.id}
            className="p-4 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-sm text-[#1C1917] dark:text-[#F5F5F4] flex items-center gap-1.5">
                  <GitPullRequest className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6] stroke-[1.5]" />
                  Candidate #{p.candidate_no} ({p.risk_level === "low" ? "Minimal Diff" : "Clamped"})
                </span>
                <Badge vLevel={p.verification_level || "V4"} />
                <span className="text-xs font-mono text-[#059669] dark:text-[#10B981] font-semibold">
                  Rank #{p.rank}
                </span>
              </div>

              <p className="text-xs text-[#57534E] dark:text-[#D6D3D1]">
                {p.reason}
              </p>

              <div className="flex items-center gap-3 text-xs font-mono text-[#57534E] dark:text-[#D6D3D1] pt-1">
                <span>Branch: <code className="text-[#1C1917] dark:text-[#F5F5F4]">{p.git_branch}</code></span>
                <span>•</span>
                <span>Proof: <span className="text-[#10B981]">14/14 tests pass</span></span>
              </div>
            </div>

            <div>
              <Link
                href={`/patches/${p.id}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0F766E] dark:bg-[#14B8A6] text-white dark:text-[#0C0A09] font-medium text-xs hover:bg-[#115E59] dark:hover:bg-[#0D9488] transition-colors"
              >
                Review Diff & Sign Off
                <ArrowRight className="w-3.5 h-3.5 stroke-[1.5]" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
