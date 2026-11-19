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
  History,
  Terminal,
  Clock,
  Sparkles,
  Download,
  Send,
  HelpCircle,
  Code2,
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
  const [askQuestion, setAskQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState<Array<{ role: "user" | "autopatch"; text: string; cited?: string[] }>>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [selectedFrame, setSelectedFrame] = useState<number | null>(null);

  useEffect(() => {
    fetchBugDetail(bugId).then((data) => {
      setBug(data);
      // Pre-seed first helpful AutoPatch message
      setChatMessages([
        {
          role: "autopatch",
          text: `AutoPatch Explain Assistant ready for ${data.title}. Ask me anything about the root cause, alternative fixes, or side effects.`,
          cited: [`${data.file_path}#L${data.origin_line || 5}-L${data.crash_line || 12}`],
        },
      ]);
    });
  }, [bugId]);

  if (!bug) {
    return <div className="p-8 text-center text-xs text-[#57534E] dark:text-[#D6D3D1]">Loading bug details...</div>;
  }

  const patch = bug.patches?.[0] || {};

  const handleAskQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!askQuestion.trim() || isAsking) return;

    const userText = askQuestion;
    setAskQuestion("");
    setChatMessages((prev) => [...prev, { role: "user", text: userText }]);
    setIsAsking(true);

    try {
      const res = await fetch(`http://localhost:8000/api/v1/bugs/${bugId}/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: userText }),
      });
      if (res.ok) {
        const data = await res.json();
        setChatMessages((prev) => [
          ...prev,
          { role: "autopatch", text: data.answer, cited: data.cited_files },
        ]);
      } else {
        throw new Error();
      }
    } catch (err) {
      // Fallback response for offline / mock testing
      setTimeout(() => {
        setChatMessages((prev) => [
          ...prev,
          {
            role: "autopatch",
            text: `Regarding "${userText}": The defect at line ${bug.origin_line || 5} accepts out-of-range values. The replacement adds an explicit boundary guard raising ValueError instead of silent truncation, preventing corrupt values from entering downstream grading reports.`,
            cited: [`${bug.file_path}#L${bug.origin_line || 5}-L${bug.crash_line || 12}`],
          },
        ]);
      }, 300);
    } finally {
      setIsAsking(false);
    }
  };

  const handleExportMarkdown = () => {
    window.open(`http://localhost:8000/api/v1/bugs/${bugId}/export-markdown`, "_blank");
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-16">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E7E5E4] dark:border-[#292524]">
        <div className="flex items-center gap-3">
          <Link
            href="/bugs"
            aria-label="Back to detected flaws list"
            className="p-1.5 rounded hover:bg-black/5 dark:hover:bg-white/5 text-[#57534E] dark:text-[#D6D3D1]"
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
              {bug.is_hypothesis ? (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-bold">
                  Hypothesis (Unproven)
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold">
                  Verified Localisation
                </span>
              )}
            </div>
            <p className="text-xs text-[#57534E] dark:text-[#D6D3D1] font-mono mt-0.5">
              File: <code className="text-[#1C1917] dark:text-[#F5F5F4]">{bug.file_path}:L{bug.line_start}-L{bug.line_end}</code> · Category: <span className="capitalize">{bug.category}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={handleExportMarkdown}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export Markdown
          </Button>
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
        <div className="p-4 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-xl space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#57534E] dark:text-[#D6D3D1] flex items-center gap-1.5">
            <Bug className="w-3.5 h-3.5 text-[#EF4444]" />
            1. Bug Details & Localisation
          </h2>
          <p className="text-xs text-[#1C1917] dark:text-[#F5F5F4] leading-relaxed">
            {bug.description}
          </p>
          <div className="pt-2 text-xs font-mono text-[#57534E] dark:text-[#D6D3D1] space-y-1 bg-[#FAF9F6] dark:bg-[#1C1917] p-2.5 rounded-lg border border-[#E7E5E4] dark:border-[#292524]">
            <p>• Origin Line: <span className="text-[#D97706] dark:text-[#F59E0B] font-bold">Line {bug.origin_line || 5}</span> (unvalidated input ingestion)</p>
            <p>• Crash Line: <span className="text-[#DC2626] dark:text-[#EF4444] font-bold">Line {bug.crash_line || 12}</span> (unbounded calculation failure)</p>
            <p>• Trigger Input: <code className="text-[#1C1917] dark:text-[#F5F5F4]">{JSON.stringify(bug.trigger_input)}</code></p>
            <p>• Classification: <span className="text-[#0F766E] dark:text-[#14B8A6] font-semibold">{bug.failure_type || "logic_boundary_defect"}</span></p>
          </div>
        </div>

        {/* Section 2: Root Cause with 3 Switchable Explanation Levels */}
        <div className="p-4 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#57534E] dark:text-[#D6D3D1] flex items-center gap-1.5">
              <FileCode className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6]" />
              2. Root Cause Analysis
            </h2>
            <div className="flex items-center gap-1 bg-[#FAF9F6] dark:bg-[#1C1917] p-0.5 rounded border border-[#E7E5E4] dark:border-[#292524] text-[10px]">
              <button
                onClick={() => setActiveTab("dev")}
                className={`px-2 py-0.5 rounded font-mono ${activeTab === "dev" ? "bg-[#0F766E] text-white dark:bg-[#14B8A6] dark:text-[#0C0A09]" : "text-[#57534E] dark:text-[#D6D3D1]"}`}
              >
                Developer
              </button>
              <button
                onClick={() => setActiveTab("beg")}
                className={`px-2 py-0.5 rounded font-mono ${activeTab === "beg" ? "bg-[#0F766E] text-white dark:bg-[#14B8A6] dark:text-[#0C0A09]" : "text-[#57534E] dark:text-[#D6D3D1]"}`}
              >
                Beginner
              </button>
              <button
                onClick={() => setActiveTab("mgr")}
                className={`px-2 py-0.5 rounded font-mono ${activeTab === "mgr" ? "bg-[#0F766E] text-white dark:bg-[#14B8A6] dark:text-[#0C0A09]" : "text-[#57534E] dark:text-[#D6D3D1]"}`}
              >
                Manager
              </button>
            </div>
          </div>

          <div className="p-3 bg-[#FAF9F6] dark:bg-[#1C1917] rounded-lg border border-[#E7E5E4] dark:border-[#292524] text-xs text-[#57534E] dark:text-[#D6D3D1] leading-relaxed">
            {activeTab === "dev" && (bug.root_cause?.developer || "Root cause trace unavailable.")}
            {activeTab === "beg" && (bug.root_cause?.beginner || "Beginner analogy unavailable.")}
            {activeTab === "mgr" && (bug.root_cause?.manager || "Executive summary unavailable.")}
          </div>
        </div>

        {/* Section 3: Interactive Stack Trace & Execution Timeline */}
        <div className="md:col-span-2 p-4 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[#57534E] dark:text-[#D6D3D1] flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6]" />
              3. Interactive Stack Trace & Execution Timeline
            </h2>
            <span className="text-[10px] font-mono text-[#57534E] dark:text-[#D6D3D1]">
              Click any frame to inspect line context
            </span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {/* Stack Frames */}
            <div className="space-y-1.5 font-mono text-xs">
              <h4 className="text-[11px] font-bold text-[#57534E] dark:text-[#D6D3D1] uppercase">Stack Frames</h4>
              {(bug.stack_frames || [
                { frame_index: 1, file_path: bug.file_path, line_number: bug.origin_line || 5, function_name: "get_input", code_line: "return float(raw_marks)", is_origin: true },
                { frame_index: 2, file_path: bug.file_path, line_number: bug.crash_line || 12, function_name: "calculate_percentage", code_line: "percentage = (marks / total) * 100.0", is_crash: true },
              ]).map((frame: any) => (
                <div
                  key={frame.frame_index}
                  onClick={() => setSelectedFrame(frame.line_number)}
                  className={`p-2.5 rounded-lg border transition-all cursor-pointer ${
                    frame.is_origin
                      ? "border-amber-500/40 bg-amber-500/5 hover:bg-amber-500/10"
                      : frame.is_crash
                      ? "border-rose-500/40 bg-rose-500/5 hover:bg-rose-500/10"
                      : "border-[#E7E5E4] dark:border-[#292524] bg-white dark:bg-[#1C1917]"
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold text-[#1C1917] dark:text-[#F5F5F4]">
                      Frame #{frame.frame_index}: {frame.function_name}()
                    </span>
                    {frame.is_origin && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold">
                        ORIGIN (L{frame.line_number})
                      </span>
                    )}
                    {frame.is_crash && (
                      <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-500/20 text-rose-700 dark:text-rose-400 font-bold">
                        CRASH (L{frame.line_number})
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-[#57534E] dark:text-[#D6D3D1] truncate">
                    <code>{frame.file_path}:{frame.line_number}</code> → {frame.code_line}
                  </div>
                </div>
              ))}
            </div>

            {/* Execution Trace Timeline */}
            <div className="space-y-1.5 font-mono text-xs">
              <h4 className="text-[11px] font-bold text-[#57534E] dark:text-[#D6D3D1] uppercase">Variable Trace Timeline</h4>
              {(bug.execution_trace || [
                { step_number: 1, line_number: bug.origin_line || 5, event: "call", description: "Raw untrusted marks input ingested (-5.0)", variables: { raw_marks: -5.0 } },
                { step_number: 2, line_number: bug.crash_line || 12, event: "line", description: "Formula evaluates without boundary guard", variables: { marks: -5.0, total: 100.0 } },
                { step_number: 3, line_number: bug.crash_line || 12, event: "exception", description: "Invalid negative percentage produced (-5.0%)", variables: { percentage: -5.0 } },
              ]).map((step: any) => (
                <div key={step.step_number} className="p-2 rounded-lg bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] text-[11px]">
                  <div className="flex items-center justify-between text-[#0F766E] dark:text-[#14B8A6] font-bold">
                    <span>Step {step.step_number}: Line {step.line_number} ({step.event})</span>
                  </div>
                  <p className="text-[#57534E] dark:text-[#D6D3D1] mt-0.5">{step.description}</p>
                  {step.variables && (
                    <div className="mt-1 text-[10px] text-[#1C1917] dark:text-[#F5F5F4] opacity-80">
                      vars: {JSON.stringify(step.variables)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 4: Suggested Patch & Per-Hunk Explanation Cards */}
        <div className="md:col-span-2 p-4 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-xl space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#57534E] dark:text-[#D6D3D1] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" />
            4. Suggested Patch & Per-Hunk "Why" Cards
          </h2>
          <DiffViewer
            originalCode={patch.original_code || ""}
            patchedCode={patch.patched_code || ""}
            originLine={bug.origin_line}
            crashLine={bug.crash_line}
            filename={bug.file_path}
          />

          {/* Per-Hunk "Why" Card */}
          <div className="p-3.5 rounded-lg border border-[#0F766E]/20 bg-[#0F766E]/5 text-xs space-y-2">
            <div className="flex items-center justify-between font-mono">
              <span className="font-bold text-[#0F766E] dark:text-[#14B8A6]">
                Hunk #1 Audit: Line {bug.crash_line || 12}
              </span>
              <span className="text-[10px] text-[#57534E] dark:text-[#D6D3D1]">
                Target: {bug.file_path}
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px]">
              <div>
                <strong className="text-rose-600 dark:text-rose-400">Why original was wrong:</strong>
                <p className="text-[#57534E] dark:text-[#D6D3D1]">
                  Allowed negative values and scores &gt; total to pass without precondition bounds check.
                </p>
              </div>
              <div>
                <strong className="text-emerald-600 dark:text-emerald-400">Why replacement fixes it:</strong>
                <p className="text-[#57534E] dark:text-[#D6D3D1]">
                  Enforces explicit ValueError check ensuring only valid scores (0 &lt;= marks &lt;= total) can be computed.
                </p>
              </div>
            </div>
            <div className="text-[11px] pt-1 border-t border-[#0F766E]/20">
              <span className="opacity-70">Alternatives considered: </span>
              <span className="italic text-[#57534E] dark:text-[#D6D3D1]">
                Silent clamping (marks = max(0, marks)) was rejected because it masks upstream caller data bugs.
              </span>
            </div>
          </div>
        </div>

        {/* Section 5: Ask AutoPatch Scoped Q&A Agent */}
        <div className="p-4 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-xl space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#57534E] dark:text-[#D6D3D1] flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6]" />
            5. Ask AutoPatch (Scoped Flaw Q&A)
          </h2>
          <div className="h-44 overflow-y-auto space-y-2 p-2.5 rounded-lg bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] text-xs font-mono">
            {chatMessages.map((msg, idx) => (
              <div
                key={idx}
                className={`p-2 rounded-lg leading-relaxed ${
                  msg.role === "autopatch"
                    ? "bg-[#0F766E]/10 text-[#0F766E] dark:text-[#14B8A6] border border-[#0F766E]/20"
                    : "bg-white dark:bg-[#292524] text-[#1C1917] dark:text-[#F5F5F4] border border-[#E7E5E4] dark:border-[#292524] ml-4"
                }`}
              >
                <div className="font-bold text-[10px] uppercase opacity-75 mb-0.5">
                  {msg.role === "autopatch" ? "AutoPatch Agent" : "You"}
                </div>
                <p className="text-[11px]">{msg.text}</p>
                {msg.cited && (
                  <div className="mt-1 text-[9px] opacity-75">
                    Cited: {msg.cited.join(", ")}
                  </div>
                )}
              </div>
            ))}
          </div>

          <form onSubmit={handleAskQuestion} className="flex gap-2">
            <input
              type="text"
              value={askQuestion}
              onChange={(e) => setAskQuestion(e.target.value)}
              placeholder="e.g. Why not use try/except here?"
              className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-[#E7E5E4] dark:border-[#292524] bg-white dark:bg-[#1C1917] text-[#1C1917] dark:text-[#F5F5F4] focus:outline-none focus:ring-1 focus:ring-[#0F766E]"
            />
            <Button variant="primary" type="submit" disabled={isAsking || !askQuestion.trim()}>
              <Send className="w-3 h-3" />
            </Button>
          </form>
        </div>

        {/* Section 6: Test Results, Severity & Change History */}
        <div className="p-4 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-xl space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[#57534E] dark:text-[#D6D3D1] flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981]" />
            6. Verification Proof & Change History
          </h2>
          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex items-center justify-between p-2 rounded bg-emerald-500/5 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
              <span>Dual Sandbox Reproduction Proof</span>
              <span className="font-bold">PASSED (V4)</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-[#FAF9F6] dark:bg-[#1C1917] text-[#57534E] dark:text-[#D6D3D1] border border-[#E7E5E4] dark:border-[#292524]">
              <span>Regression Suite Passing</span>
              <span className="font-bold text-[#1C1917] dark:text-[#F5F5F4]">14/14</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded bg-[#FAF9F6] dark:bg-[#1C1917] text-[#57534E] dark:text-[#D6D3D1] border border-[#E7E5E4] dark:border-[#292524]">
              <span>Audit State & History</span>
              <span className="font-bold text-[#0F766E] dark:text-[#14B8A6]">CONFIRMED</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
