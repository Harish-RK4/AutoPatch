"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Bug, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldCheck, 
  FileCode, 
  ArrowRight,
  Layers,
  History
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DiffViewer } from "@/components/ui/DiffViewer";
import { fetchBugDetail } from "@/lib/api";

export default function BugDetailPage() {
  const params = useParams();
  const bugId = (params?.id as string) || "demo-bug-001";

  const [bug, setBug] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"dev" | "beg" | "mgr">("dev");

  useEffect(() => {
    fetchBugDetail(bugId).then(setBug);
  }, [bugId]);

  if (!bug) {
    return <div className="p-8 text-center text-xs text-[#78716C] dark:text-[#A8A29E]">Loading bug details...</div>;
  }

  const patch = bug.patches?.[0] || {};

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E7E5E4] dark:border-[#292524]">
        <div className="flex items-center gap-3">
          <Link
            href="/bugs"
            className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 text-[#78716C] dark:text-[#A8A29E]"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base font-bold text-[#1C1917] dark:text-[#F5F5F4]">
                {bug.title}
              </h1>
              <Badge variant="rose">High</Badge>
              <Badge vLevel={bug.verification_level || "V4"} />
            </div>
            <p className="text-xs text-[#78716C] dark:text-[#A8A29E] font-mono mt-0.5">
              File: <code className="text-[#1C1917] dark:text-[#F5F5F4]">{bug.file_path}:L{bug.line_start}-L{bug.line_end}</code> · Category: <span className="capitalize">{bug.category}</span>
            </p>
          </div>
        </div>

        <div>
          <Link href={`/patches/demo-patch-001`}>
            <Button variant="primary">
              Review Proposed Fix
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
            </Button>
          </Link>
        </div>
      </div>

      {/* 6 Mandatory Report Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Section 1: Bug Details */}
        <div className="p-4 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-lg space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#78716C] dark:text-[#A8A29E] flex items-center gap-1.5">
            <Bug className="w-3.5 h-3.5 text-[#EF4444]" />
            1. Bug Details
          </h2>
          <p className="text-xs text-[#1C1917] dark:text-[#F5F5F4] leading-relaxed">
            {bug.description}
          </p>
          <div className="pt-2 text-xs font-mono text-[#78716C] dark:text-[#A8A29E] space-y-1">
            <p>• Origin Line: <span className="text-[#F59E0B]">Line {bug.origin_line || 5}</span> (raw input ingestion)</p>
            <p>• Crash Line: <span className="text-[#EF4444]">Line {bug.crash_line || 12}</span> (unbounded formula execution)</p>
            <p>• Trigger Input: <code className="text-[#1C1917] dark:text-[#F5F5F4]">{JSON.stringify(bug.trigger_input)}</code></p>
          </div>
        </div>

        {/* Section 2: Root Cause with 3 Explanation Levels */}
        <div className="p-4 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#78716C] dark:text-[#A8A29E] flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6]" />
              2. Root Cause & Explanation
            </h2>
            <div className="flex items-center gap-1 bg-[#FAF9F6] dark:bg-[#1C1917] p-0.5 rounded border border-[#E7E5E4] dark:border-[#292524] text-[10px]">
              <button
                onClick={() => setActiveTab("dev")}
                className={`px-2 py-0.5 rounded ${activeTab === "dev" ? "bg-[#0F766E] text-white dark:bg-[#14B8A6] dark:text-[#0C0A09]" : "text-[#78716C]"}`}
              >
                Developer
              </button>
              <button
                onClick={() => setActiveTab("beg")}
                className={`px-2 py-0.5 rounded ${activeTab === "beg" ? "bg-[#0F766E] text-white dark:bg-[#14B8A6] dark:text-[#0C0A09]" : "text-[#78716C]"}`}
              >
                Beginner
              </button>
              <button
                onClick={() => setActiveTab("mgr")}
                className={`px-2 py-0.5 rounded ${activeTab === "mgr" ? "bg-[#0F766E] text-white dark:bg-[#14B8A6] dark:text-[#0C0A09]" : "text-[#78716C]"}`}
              >
                Manager
              </button>
            </div>
          </div>

          <div className="p-3 bg-[#FAF9F6] dark:bg-[#1C1917] rounded border border-[#E7E5E4] dark:border-[#292524] text-xs text-[#78716C] dark:text-[#A8A29E] leading-relaxed">
            {activeTab === "dev" && bug.root_cause?.developer}
            {activeTab === "beg" && bug.root_cause?.beginner}
            {activeTab === "mgr" && bug.root_cause?.manager}
          </div>
        </div>

        {/* Section 3: Suggested Patch Diff */}
        <div className="md:col-span-2 p-4 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-lg space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#78716C] dark:text-[#A8A29E] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
            3. Suggested Patch (Minimal Diff)
          </h2>
          <DiffViewer
            originalCode={patch.original_code || ""}
            patchedCode={patch.patched_code || ""}
            originLine={bug.origin_line}
            crashLine={bug.crash_line}
            filename={bug.file_path}
          />
        </div>

        {/* Section 4: Test Results */}
        <div className="p-4 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-lg space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#78716C] dark:text-[#A8A29E] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
            4. Test Results & Proof Bundle
          </h2>
          <ul className="space-y-1.5 text-xs text-[#059669] dark:text-[#10B981]">
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Reproduction test fails before and passes after patch</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>14/14 existing test suite cases pass cleanly</span>
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Semgrep static analysis clean (0 alerts)</span>
            </li>
          </ul>
        </div>

        {/* Section 5 & 6: Severity/Confidence & Change History */}
        <div className="p-4 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-lg space-y-3">
          <div>
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#78716C] dark:text-[#A8A29E] mb-1.5">
              5. Severity & Confidence
            </h2>
            <div className="flex items-center gap-3 text-xs font-mono">
              <span>Severity: <span className="text-[#EF4444] font-semibold">8.0 / 10 (High)</span></span>
              <span>•</span>
              <span>Confidence: <span className="text-[#10B981] font-semibold">100% (V4 Proven)</span></span>
            </div>
          </div>

          <div className="pt-2 border-t border-[#E7E5E4] dark:border-[#292524]">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#78716C] dark:text-[#A8A29E] mb-1 flex items-center gap-1.5">
              <History className="w-3.5 h-3.5" />
              6. Change History
            </h2>
            <p className="text-xs text-[#78716C] dark:text-[#A8A29E]">
              Detected during automated pipeline run. State: <span className="text-[#10B981] font-medium uppercase font-mono">Confirmed</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
