"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  CheckCircle2, 
  ShieldCheck, 
  GitBranch, 
  Layers, 
  FileCheck2,
  Sparkles,
  AlertCircle,
  FileCode,
  Gauge
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DiffViewer } from "@/components/ui/DiffViewer";
import { fetchBugDetail, submitPatchDecision } from "@/lib/api";

export default function PatchReviewPage() {
  const params = useParams();
  const patchId = (params?.id as string) || "demo-patch-001";

  const [bug, setBug] = useState<any>(null);
  const [selectedCandidateIndex, setSelectedCandidateIndex] = useState(0);
  const [decisionNote, setDecisionNote] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchBugDetail("demo-bug-001").then((b) => {
      setBug(b);
      // Select index based on patchId if specified
      if (b?.patches) {
        const idx = b.patches.findIndex((p: any) => p.id === patchId);
        if (idx !== -1) setSelectedCandidateIndex(idx);
      }
    });
  }, [patchId]);

  if (!bug) {
    return <div className="p-8 text-center text-xs text-[#57534E] dark:text-[#D6D3D1]">Loading patch review...</div>;
  }

  const patches = bug.patches || [];
  const currentPatch = patches[selectedCandidateIndex] || patches[0] || {};
  const hunk = currentPatch.hunks?.[0] || {};
  const critic = currentPatch.critic_verdict;
  const blast = currentPatch.blast_radius_report;

  const handleDecision = async (action: "accept" | "reject" | "needs_review") => {
    await submitPatchDecision(currentPatch.id || patchId, action, decisionNote);
    setStatusMessage(`Decision recorded: ${action.toUpperCase()} for Candidate #${currentPatch.candidate_no || (selectedCandidateIndex + 1)}. Recorded in audit trail.`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E7E5E4] dark:border-[#292524]">
        <div className="flex items-center gap-3">
          <Link
            href="/projects/demo-proj-001"
            aria-label="Back to project workspace"
            className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 text-[#57534E] dark:text-[#D6D3D1]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-[#1C1917] dark:text-[#F5F5F4]">
                Patch Review: {bug.title}
              </h1>
              <Badge vLevel={currentPatch.verification_level || "V4"} />
              <Badge variant="teal">Confidence: {currentPatch.critic_verdict?.composite_score ? Math.round(currentPatch.critic_verdict.composite_score) : 100}%</Badge>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#0F766E]/10 text-[#0F766E] dark:text-[#14B8A6] font-semibold">
                Rank #{currentPatch.rank || selectedCandidateIndex + 1}
              </span>
            </div>
            <p className="text-xs text-[#57534E] dark:text-[#D6D3D1] font-mono mt-0.5">
              Target: <code className="text-[#1C1917] dark:text-[#F5F5F4]">{bug.file_path}</code> · Branch: <code className="text-[#1C1917] dark:text-[#F5F5F4]">{currentPatch.git_branch}</code>
            </p>
          </div>
        </div>

        {/* Candidate Switcher Tabs */}
        <div className="flex items-center gap-1 bg-[#FAF9F6] dark:bg-[#1C1917] p-1 rounded-xl border border-[#E7E5E4] dark:border-[#292524] overflow-x-auto">
          {patches.map((p: any, idx: number) => {
            const isSelected = selectedCandidateIndex === idx;
            const rankLabel = idx === 0 ? "Minimal Diff" : idx === 1 ? "Clamping" : "Comprehensive";
            return (
              <button
                key={p.id || idx}
                onClick={() => setSelectedCandidateIndex(idx)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-all whitespace-nowrap ${
                  isSelected
                    ? "bg-[#0F766E] text-white dark:bg-[#14B8A6] dark:text-[#0C0A09] shadow-sm font-semibold"
                    : "text-[#57534E] dark:text-[#D6D3D1] hover:text-[#1C1917] hover:bg-black/5 dark:hover:bg-white/5"
                }`}
              >
                Candidate {idx + 1} ({rankLabel})
              </button>
            );
          })}
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-[#10B981]/15 border border-[#10B981]/30 rounded-xl text-xs text-[#065F46] dark:text-[#34D399] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Split Monaco Diff Viewer (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bento-frosted-card p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-black/5 dark:border-white/5 pb-2">
              <span className="text-xs font-semibold text-[#1C1917] dark:text-[#F5F5F4] flex items-center gap-1.5">
                <FileCode className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6]" />
                Interactive Diff Viewer ({currentPatch.reason || "Minimal Guard"})
              </span>
              <span className="text-[11px] font-mono text-[#57534E] dark:text-[#D6D3D1]">
                Candidate #{currentPatch.candidate_no || selectedCandidateIndex + 1} of {patches.length}
              </span>
            </div>
            <DiffViewer
              originalCode={currentPatch.original_code || ""}
              patchedCode={currentPatch.patched_code || ""}
              originLine={bug.origin_line}
              crashLine={bug.crash_line}
              filename={bug.file_path}
            />
          </div>

          {/* Explanation Tabs (Beginner / Developer / Manager) */}
          <div className="bento-frosted-card p-4 space-y-3">
            <h3 className="text-xs font-semibold text-[#1C1917] dark:text-[#F5F5F4] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6]" />
              Three-Level Explanation Architecture
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#FAF9F6] dark:bg-[#1C1917] rounded-xl border border-[#E7E5E4] dark:border-[#292524]">
                <span className="font-semibold text-[#0F766E] dark:text-[#14B8A6] block mb-1">Developer Analysis:</span>
                <p className="text-[#57534E] dark:text-[#D6D3D1] leading-relaxed">
                  {bug.root_cause?.developer}
                </p>
              </div>
              <div className="p-3 bg-[#FAF9F6] dark:bg-[#1C1917] rounded-xl border border-[#E7E5E4] dark:border-[#292524]">
                <span className="font-semibold text-[#92400E] dark:text-[#FBBF24] block mb-1">Beginner Analogy:</span>
                <p className="text-[#57534E] dark:text-[#D6D3D1] leading-relaxed">
                  {bug.root_cause?.beginner}
                </p>
              </div>
              <div className="p-3 bg-[#FAF9F6] dark:bg-[#1C1917] rounded-xl border border-[#E7E5E4] dark:border-[#292524]">
                <span className="font-semibold text-[#065F46] dark:text-[#34D399] block mb-1">Manager Summary:</span>
                <p className="text-[#57534E] dark:text-[#D6D3D1] leading-relaxed">
                  {bug.root_cause?.manager}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Proof Bundle & Per-Hunk "Why" Card & Critic & Blast Radius (1 col) */}
        <div className="space-y-4">
          {/* Per-Hunk "Why" Card */}
          <div className="bento-frosted-card p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E7E5E4] dark:border-[#292524]">
              <span className="text-xs font-semibold text-[#1C1917] dark:text-[#F5F5F4] flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6]" />
                Per-Hunk "Why" Card
              </span>
              <span className="text-[10px] font-mono text-[#57534E] dark:text-[#D6D3D1]">Hunk #1</span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#B91C1C] dark:text-[#EF4444] block mb-0.5">
                Why Original Line Was Defective:
              </span>
              <p className="text-xs text-[#57534E] dark:text-[#D6D3D1] leading-relaxed">
                {hunk.why_wrong || "The original function allowed any numerical value for marks without boundary validation."}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#065F46] dark:text-[#34D399] block mb-0.5">
                Why Replacement Fixes It:
              </span>
              <p className="text-xs text-[#57534E] dark:text-[#D6D3D1] leading-relaxed">
                {hunk.why_fix_works || "Adding an immediate validation guard ensures invalid numbers raise ValueError before corrupting calculations."}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#92400E] dark:text-[#FBBF24] block mb-0.5">
                Consequence If Not Fixed:
              </span>
              <p className="text-xs text-[#57534E] dark:text-[#D6D3D1] leading-relaxed">
                {hunk.if_not_fixed || "Negative marks produce negative percentages; marks > total produce percentages above 100%."}
              </p>
            </div>
          </div>

          {/* Critic Agent Evaluation Card */}
          {critic && (
            <div className="bento-frosted-card p-4 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-[#E7E5E4] dark:border-[#292524]">
                <span className="text-xs font-semibold text-[#1C1917] dark:text-[#F5F5F4] flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6]" />
                  Critic Agent Evaluation
                </span>
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#065F46]/10 text-[#065F46] dark:text-[#34D399]">
                  {critic.recommendation?.toUpperCase() || "ACCEPT"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="p-2 rounded bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                  <span className="text-[10px] text-[#78716C] dark:text-[#A8A29E] block">Correctness</span>
                  <span className="font-bold text-[#1C1917] dark:text-[#F5F5F4]">{critic.correctness_score}/100</span>
                </div>
                <div className="p-2 rounded bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                  <span className="text-[10px] text-[#78716C] dark:text-[#A8A29E] block">Safety</span>
                  <span className="font-bold text-[#1C1917] dark:text-[#F5F5F4]">{critic.safety_score}/100</span>
                </div>
                <div className="p-2 rounded bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                  <span className="text-[10px] text-[#78716C] dark:text-[#A8A29E] block">Minimality</span>
                  <span className="font-bold text-[#1C1917] dark:text-[#F5F5F4]">{critic.minimality_score}/100</span>
                </div>
                <div className="p-2 rounded bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5">
                  <span className="text-[10px] text-[#78716C] dark:text-[#A8A29E] block">Side-Effects</span>
                  <span className="font-bold text-[#1C1917] dark:text-[#F5F5F4]">{critic.side_effect_score}/100</span>
                </div>
              </div>

              <p className="text-[11px] text-[#57534E] dark:text-[#D6D3D1] italic leading-tight">
                "{critic.rationale}"
              </p>
            </div>
          )}

          {/* Proof-Carrying Bundle */}
          <div className="bento-frosted-card p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E7E5E4] dark:border-[#292524]">
              <span className="text-xs font-semibold text-[#1C1917] dark:text-[#F5F5F4] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#065F46] dark:text-[#34D399]" />
                Proof-Carrying Bundle
              </span>
              <Badge vLevel={currentPatch.verification_level || "V4"} />
            </div>

            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2 text-[#065F46] dark:text-[#34D399]">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Dual Sandbox: Repro test failed pre-patch, passes post-patch</span>
              </li>
              <li className="flex items-center gap-2 text-[#065F46] dark:text-[#34D399]">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span>14/14 existing test suite cases pass (0 regressions)</span>
              </li>
              <li className="flex items-center gap-2 text-[#065F46] dark:text-[#34D399]">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Static scan clean (0 AST syntax/security flaws)</span>
              </li>
            </ul>
          </div>

          {/* Blast Radius Assessment */}
          <div className="bento-frosted-card p-4 space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-black/5 dark:border-white/5">
              <span className="text-xs font-semibold text-[#1C1917] dark:text-[#F5F5F4] flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6]" />
                Blast Radius Impact
              </span>
              <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-[#065F46]/10 text-[#065F46] dark:text-[#34D399]">
                {blast?.risk_level || "Low"} Risk
              </span>
            </div>
            <div className="text-xs text-[#57534E] dark:text-[#D6D3D1] space-y-1">
              <p>• Touches {blast?.files_impacted?.length || 1} file(s) (<code className="text-[#1C1917] dark:text-[#F5F5F4]">{blast?.target_file || bug.file_path}</code>)</p>
              <p>• Callers affected: <code className="text-[#1C1917] dark:text-[#F5F5F4]">{blast?.direct_callers?.join(", ") || "generate_report_card"}</code></p>
              <p>• Cyclomatic delta: <span className="font-mono font-semibold">{blast?.cyclomatic_delta ?? 1}</span></p>
              <p>• Blast Score: <span className="font-mono font-semibold text-[#065F46] dark:text-[#34D399]">{blast?.blast_score ?? 18}/100</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Toolbar */}
      <div className="sticky bottom-0 bg-white/90 dark:bg-[#141210]/90 backdrop-blur-md border border-[#E7E5E4] dark:border-[#292524] rounded-2xl p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-lg z-30">
        <div className="w-full sm:w-1/2">
          <input
            type="text"
            placeholder="Add reviewer notes or audit rationale..."
            value={decisionNote}
            onChange={(e) => setDecisionNote(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] text-[#1C1917] dark:text-[#F5F5F4] focus:outline-none focus:border-[#0F766E]"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <Button
            variant="secondary"
            onClick={() => handleDecision("needs_review")}
            className="text-[#92400E] dark:text-[#FBBF24] border-[#D97706]/30"
          >
            Needs Review
          </Button>

          <Button
            variant="danger"
            onClick={() => handleDecision("reject")}
          >
            Reject Patch
          </Button>

          <Button
            variant="primary"
            onClick={() => handleDecision("accept")}
          >
            <GitBranch className="w-3.5 h-3.5 mr-1.5" />
            Accept & Branch
          </Button>
        </div>
      </div>
    </div>
  );
}
