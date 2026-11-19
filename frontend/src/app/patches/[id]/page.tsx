"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  GitBranch, 
  Layers, 
  FileCheck2,
  ExternalLink
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DiffViewer } from "@/components/ui/DiffViewer";
import { fetchBugDetail, submitPatchDecision } from "@/lib/api";

export default function PatchReviewPage() {
  const params = useParams();
  const patchId = (params?.id as string) || "demo-patch-001";

  const [bug, setBug] = useState<any>(null);
  const [selectedCandidate, setSelectedCandidate] = useState(1);
  const [decisionNote, setDecisionNote] = useState("");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    fetchBugDetail("demo-bug-001").then(setBug);
  }, []);

  if (!bug) {
    return <div className="p-8 text-center text-xs text-[#57534E] dark:text-[#D6D3D1]">Loading patch review...</div>;
  }

  const patch = bug.patches?.[0] || {};
  const hunk = patch.hunks?.[0] || {};

  const handleDecision = async (action: "accept" | "reject" | "needs_review") => {
    const res = await submitPatchDecision(patchId, action, decisionNote);
    setStatusMessage(`Decision recorded: ${action.toUpperCase()}. Recorded in change history.`);
    setTimeout(() => setStatusMessage(null), 4000);
  };

  return (
    <div className="space-y-4">
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
              <Badge vLevel="V4" />
              <Badge variant="teal">Confidence: 100%</Badge>
            </div>
            <p className="text-xs text-[#57534E] dark:text-[#D6D3D1] font-mono mt-0.5">
              Target: <code className="text-[#1C1917] dark:text-[#F5F5F4]">{bug.file_path}</code> · Branch: <code className="text-[#1C1917] dark:text-[#F5F5F4]">{patch.git_branch}</code>
            </p>
          </div>
        </div>

        {/* Candidate Switcher */}
        <div className="flex items-center gap-1.5 bg-[#FAF9F6] dark:bg-[#1C1917] p-1 rounded-md border border-[#E7E5E4] dark:border-[#292524]">
          <button
            onClick={() => setSelectedCandidate(1)}
            className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
              selectedCandidate === 1
                ? "bg-[#0F766E] text-white dark:bg-[#14B8A6] dark:text-[#0C0A09]"
                : "text-[#57534E] dark:text-[#D6D3D1] hover:text-[#1C1917]"
            }`}
          >
            Candidate 1 (Rank 1 - Minimal)
          </button>
          <button
            onClick={() => setSelectedCandidate(2)}
            className={`px-2.5 py-1 text-xs rounded font-medium transition-colors ${
              selectedCandidate === 2
                ? "bg-[#0F766E] text-white dark:bg-[#14B8A6] dark:text-[#0C0A09]"
                : "text-[#57534E] dark:text-[#D6D3D1] hover:text-[#1C1917]"
            }`}
          >
            Candidate 2 (Clamping)
          </button>
        </div>
      </div>

      {statusMessage && (
        <div className="p-3 bg-[#10B981]/15 border border-[#10B981]/30 rounded-md text-xs text-[#059669] dark:text-[#10B981] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* Main Review Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left Column: Split Monaco Diff Viewer (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <DiffViewer
            originalCode={patch.original_code || ""}
            patchedCode={patch.patched_code || ""}
            originLine={bug.origin_line}
            crashLine={bug.crash_line}
            filename={bug.file_path}
          />

          {/* Explanation Tabs (Beginner / Developer / Manager) */}
          <div className="bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-lg p-4">
            <h3 className="text-xs font-semibold text-[#1C1917] dark:text-[#F5F5F4] uppercase tracking-wider mb-2">
              Three-Level Explanation
            </h3>
            <div className="space-y-3 text-xs">
              <div className="p-3 bg-[#FAF9F6] dark:bg-[#1C1917] rounded border border-[#E7E5E4] dark:border-[#292524]">
                <span className="font-semibold text-[#0F766E] dark:text-[#14B8A6] block mb-1">Developer Analysis:</span>
                <p className="text-[#57534E] dark:text-[#D6D3D1] leading-relaxed">
                  {bug.root_cause?.developer}
                </p>
              </div>
              <div className="p-3 bg-[#FAF9F6] dark:bg-[#1C1917] rounded border border-[#E7E5E4] dark:border-[#292524]">
                <span className="font-semibold text-[#B45309] dark:text-[#FBBF24] block mb-1">Beginner Analogy:</span>
                <p className="text-[#57534E] dark:text-[#D6D3D1] leading-relaxed">
                  {bug.root_cause?.beginner}
                </p>
              </div>
              <div className="p-3 bg-[#FAF9F6] dark:bg-[#1C1917] rounded border border-[#E7E5E4] dark:border-[#292524]">
                <span className="font-semibold text-[#047857] dark:text-[#34D399] block mb-1">Manager Summary:</span>
                <p className="text-[#57534E] dark:text-[#D6D3D1] leading-relaxed">
                  {bug.root_cause?.manager}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Proof Bundle & Per-Hunk "Why" Card (1 col) */}
        <div className="space-y-4">
          {/* Per-Hunk "Why" Card */}
          <div className="bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E7E5E4] dark:border-[#292524]">
              <span className="text-xs font-semibold text-[#1C1917] dark:text-[#F5F5F4] flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6]" />
                Per-Hunk Explanation Card
              </span>
              <span className="text-[10px] font-mono text-[#57534E] dark:text-[#D6D3D1]">Hunk #1</span>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#DC2626] dark:text-[#EF4444] block mb-0.5">
                Why Original Line Was Wrong:
              </span>
              <p className="text-xs text-[#57534E] dark:text-[#D6D3D1] leading-relaxed">
                {hunk.why_wrong}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#047857] dark:text-[#34D399] block mb-0.5">
                Why Replacement Fixes It:
              </span>
              <p className="text-xs text-[#57534E] dark:text-[#D6D3D1] leading-relaxed">
                {hunk.why_fix_works}
              </p>
            </div>

            <div>
              <span className="text-[11px] font-semibold text-[#B45309] dark:text-[#FBBF24] block mb-0.5">
                Consequence If Not Fixed:
              </span>
              <p className="text-xs text-[#57534E] dark:text-[#D6D3D1] leading-relaxed">
                {hunk.if_not_fixed}
              </p>
            </div>
          </div>

          {/* Proof Bundle */}
          <div className="bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-[#E7E5E4] dark:border-[#292524]">
              <span className="text-xs font-semibold text-[#1C1917] dark:text-[#F5F5F4] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#047857] dark:text-[#34D399]" />
                Proof-Carrying Bundle
              </span>
              <Badge vLevel="V4" />
            </div>

            <ul className="space-y-2 text-xs">
              <li className="flex items-center gap-2 text-[#047857] dark:text-[#34D399]">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Repro test fails before & passes after patch</span>
              </li>
              <li className="flex items-center gap-2 text-[#047857] dark:text-[#34D399]">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span>14/14 existing test suite cases pass</span>
              </li>
              <li className="flex items-center gap-2 text-[#047857] dark:text-[#34D399]">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                <span>Static scan clean (0 Semgrep / Bandit alerts)</span>
              </li>
            </ul>
          </div>

          {/* Blast Radius */}
          <div className="bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-lg p-4 space-y-2">
            <span className="text-xs font-semibold text-[#1C1917] dark:text-[#F5F5F4] flex items-center gap-1.5 mb-1">
              <Layers className="w-3.5 h-3.5 text-[#57534E] dark:text-[#D6D3D1]" />
              Blast Radius Assessment
            </span>
            <div className="text-xs text-[#57534E] dark:text-[#D6D3D1] space-y-1">
              <p>• Touches 1 file (<code className="text-[#1C1917] dark:text-[#F5F5F4]">calculator.py</code>)</p>
              <p>• Callers affected: <code className="text-[#1C1917] dark:text-[#F5F5F4]">generate_report_card</code></p>
              <p>• Risk Level: <span className="text-[#065F46] dark:text-[#34D399] font-semibold">Low (Zero breaking changes)</span></p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Action Toolbar */}
      <div className="sticky bottom-0 bg-white/95 dark:bg-[#141210]/95 backdrop-blur-sm border border-[#E7E5E4] dark:border-[#292524] rounded-lg p-3 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-sm z-30">
        <div className="w-full sm:w-1/2">
          <input
            type="text"
            placeholder="Add reviewer notes or audit rationale..."
            value={decisionNote}
            onChange={(e) => setDecisionNote(e.target.value)}
            className="w-full px-3 py-1.5 text-xs rounded bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] text-[#1C1917] dark:text-[#F5F5F4] focus:outline-none"
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
