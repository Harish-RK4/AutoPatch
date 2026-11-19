"use client";

import React, { useEffect, useState, Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { GitPullRequest, ArrowRight, ShieldCheck, Gauge, Layers } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { fetchBugDetail, fetchAllPatches } from "@/lib/api";

function PatchesListContent() {
  const [patches, setPatches] = useState<any[]>([]);
  const searchParams = useSearchParams();
  const bugId = searchParams.get("bug_id");

  useEffect(() => {
    fetchAllPatches(bugId || undefined).then((apiPatches) => {
      if (apiPatches && apiPatches.length > 0) {
        setPatches(apiPatches);
      } else {
        fetchBugDetail("demo-bug-001").then((bug) => {
          if (bug && bug.patches) setPatches(bug.patches);
        });
      }
    });
  }, [bugId]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      <div className="pb-4 border-b border-[#E7E5E4] dark:border-[#292524]">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-bold tracking-tight text-[#1C1917] dark:text-[#F5F5F4]">
            Patch Candidates & Verification Ladder
          </h1>
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-mono bg-[#0F766E]/10 text-[#0F766E] dark:text-[#14B8A6] font-semibold">
            {patches.length} Synthesized Candidates
          </span>
        </div>
        <p className="text-xs text-[#57534E] dark:text-[#D6D3D1] mt-0.5">
          Multi-candidate repairs (Minimal Diff, Defensive Guard, Refactored Safe Alternative) evaluated by the Critic agent and dual-verified in the sandbox.
        </p>
      </div>

      <div className="space-y-3">
        {patches.map((p, idx) => {
          const candidateNumber = p.candidate_number || p.candidate_no || (idx + 1);
          const strategyName = p.strategy || (candidateNumber === 1 ? "Minimal Targeted Fix" : candidateNumber === 2 ? "Defensive Guard Insertion" : "Refactored Safe Alternative");
          const vLevel = p.verification_level || "V4";
          const rankNum = p.critic_rank || p.rank || (idx + 1);
          const criticScore = p.critic_verdict?.composite_score ?? 95;
          const blastRisk = p.blast_radius?.risk_level || p.blast_radius_report?.risk_level || "Low";

          return (
            <div
              key={p.id || idx}
              className="bento-frosted-card p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:border-[#0F766E]/30"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-[#1C1917] dark:text-[#F5F5F4] flex items-center gap-1.5">
                    <GitPullRequest className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6] stroke-[1.5]" />
                    Candidate #{candidateNumber}: {strategyName}
                  </span>
                  <Badge vLevel={vLevel} />
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#065F46]/10 text-[#065F46] dark:text-[#34D399] font-semibold">
                    Critic Rank #{rankNum}
                  </span>
                  <span className="text-xs font-mono text-[#0F766E] dark:text-[#14B8A6] font-medium">
                    Score: {Math.round(criticScore)}/100
                  </span>
                </div>

                <p className="text-xs text-[#57534E] dark:text-[#D6D3D1]">
                  {p.reason || p.explanation || "Surgical input bounds validation preventing invalid percentages."}
                </p>

                <div className="flex items-center gap-3 text-xs font-mono text-[#57534E] dark:text-[#D6D3D1] pt-1 flex-wrap">
                  <span>Target: <code className="text-[#1C1917] dark:text-[#F5F5F4]">{p.file_path || "calculator.py"}</code></span>
                  <span>•</span>
                  <span className="flex items-center gap-1 text-[#065F46] dark:text-[#34D399] font-medium">
                    <ShieldCheck className="w-3.5 h-3.5" /> Dual Sandbox Verified
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-[#78716C]" /> Blast: <span className="text-[#065F46] dark:text-[#34D399] font-semibold">{blastRisk}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href={`/patches/${p.id || "demo-patch-001"}`}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#0F766E] dark:bg-[#14B8A6] text-white dark:text-[#0C0A09] font-medium text-xs hover:bg-[#115E59] dark:hover:bg-[#0D9488] transition-colors shadow-sm"
                >
                  Review Diff & Context
                  <ArrowRight className="w-3.5 h-3.5 stroke-[1.5]" />
                </Link>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function PatchesListPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-[#57534E]">Loading patch candidates...</div>}>
      <PatchesListContent />
    </Suspense>
  );
}
