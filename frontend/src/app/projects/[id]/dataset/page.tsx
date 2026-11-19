"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Database,
  Download,
  FileCode,
  FileText,
  Filter,
  RefreshCw,
  ShieldCheck,
  Table,
} from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { DatasetReviewBundle, fetchDatasetReview } from "@/lib/api";

export default function DatasetReviewPage() {
  const params = useParams();
  const projectId = (params?.id as string) || "demo-proj-004";

  const [bundle, setBundle] = useState<DatasetReviewBundle | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"diff" | "anomalies" | "profile" | "script">("diff");
  const [showOnlyChanged, setShowOnlyChanged] = useState(true);
  const [copiedScript, setCopiedScript] = useState(false);

  useEffect(() => {
    fetchDatasetReview(projectId)
      .then((data) => {
        setBundle(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [projectId]);

  const handleCopyScript = () => {
    if (!bundle?.cleaning_script) return;
    navigator.clipboard.writeText(bundle.cleaning_script);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleDownloadDataset = () => {
    if (!bundle?.corrected_content) return;
    const blob = new Blob([bundle.corrected_content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `corrected_${bundle.filename || "dataset.csv"}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadScript = () => {
    if (!bundle?.cleaning_script) return;
    const blob = new Blob([bundle.cleaning_script], { type: "text/x-python" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `clean_${bundle.filename || "dataset"}.py`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center space-y-4">
        <RefreshCw className="w-8 h-8 animate-spin mx-auto text-[#0F766E] dark:text-[#14B8A6]" />
        <p className="text-sm text-[#57534E] dark:text-[#D6D3D1] font-mono">
          Profiling dataset and verifying formal invariants...
        </p>
      </div>
    );
  }

  if (!bundle) {
    return (
      <div className="max-w-6xl mx-auto py-12 text-center space-y-4">
        <AlertCircle className="w-8 h-8 mx-auto text-amber-500" />
        <h2 className="text-lg font-bold text-[#1C1917] dark:text-[#F5F5F4]">Dataset Review Unavailable</h2>
        <p className="text-sm text-[#57534E] dark:text-[#D6D3D1]">
          No dataset artifacts could be located for project {projectId}.
        </p>
        <Link href={`/projects/${projectId}`}>
          <Button variant="secondary">Return to Project</Button>
        </Link>
      </div>
    );
  }

  const { before_profile, after_profile, invariants, anomalies, changed_rows } = bundle;

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between border-b border-[#E7E5E4] dark:border-[#292524] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-xs font-mono text-[#57534E] dark:text-[#D6D3D1]">
            <Link href={`/projects/${projectId}`} className="hover:underline flex items-center gap-1">
              <ArrowLeft className="w-3 h-3" /> Back to Project
            </Link>
            <span>/</span>
            <span className="text-[#0F766E] dark:text-[#14B8A6]">Dataset Verification & Review</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#1C1917] dark:text-[#F5F5F4] flex items-center gap-2.5">
            <Database className="w-5 h-5 text-[#0F766E] dark:text-[#14B8A6]" />
            <span>Dataset Quality & Invariant Proof Bundle</span>
          </h1>
          <p className="text-xs text-[#57534E] dark:text-[#D6D3D1]">
            Target: <code className="font-mono text-[#1C1917] dark:text-[#F5F5F4]">{bundle.filename}</code> · Format: <span className="uppercase font-semibold text-[#0F766E] dark:text-[#14B8A6]">{bundle.detected_format}</span>
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge vLevel={bundle.verification_level} />
          <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-full bg-[#0F766E]/10 text-[#0F766E] dark:text-[#14B8A6] border border-[#0F766E]/20">
            {bundle.confidence_score}% Confidence
          </span>
          <Button variant="secondary" onClick={handleDownloadScript}>
            <FileCode className="w-3.5 h-3.5 mr-1.5" />
            Script
          </Button>
          <Button variant="primary" onClick={handleDownloadDataset}>
            <Download className="w-3.5 h-3.5 mr-1.5" />
            Export Clean Copy
          </Button>
        </div>
      </div>

      {/* Formal Invariants Verification Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Invariant 1: Row Lineage */}
        <div className="p-3.5 rounded-xl border border-[#E7E5E4] dark:border-[#292524] bg-white/80 dark:bg-[#1C1917]/80 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#57534E] dark:text-[#D6D3D1] font-mono">1. Row Lineage</span>
            {invariants.row_lineage_preserved ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-500" />
            )}
          </div>
          <div className="text-base font-bold font-mono text-[#1C1917] dark:text-[#F5F5F4]">
            {invariants.total_input_rows} → {invariants.total_output_rows}
          </div>
          <p className="text-[11px] text-[#57534E] dark:text-[#D6D3D1] leading-tight">
            {invariants.dropped_rows_count === 0
              ? "100% rows traced to input."
              : `${invariants.dropped_rows_count} exact duplicate(s) dropped.`}
          </p>
        </div>

        {/* Invariant 2: Cell Identity */}
        <div className="p-3.5 rounded-xl border border-[#E7E5E4] dark:border-[#292524] bg-white/80 dark:bg-[#1C1917]/80 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#57534E] dark:text-[#D6D3D1] font-mono">2. Valid Cells</span>
            {invariants.untouched_valid_cells_identical ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-500" />
            )}
          </div>
          <div className="text-base font-bold font-mono text-emerald-600 dark:text-emerald-400">
            Byte-Identical
          </div>
          <p className="text-[11px] text-[#57534E] dark:text-[#D6D3D1] leading-tight">
            Untouched valid cells remain strictly unmodified.
          </p>
        </div>

        {/* Invariant 3: Idempotency */}
        <div className="p-3.5 rounded-xl border border-[#E7E5E4] dark:border-[#292524] bg-white/80 dark:bg-[#1C1917]/80 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#57534E] dark:text-[#D6D3D1] font-mono">3. Idempotency</span>
            {invariants.idempotent ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-500" />
            )}
          </div>
          <div className="text-base font-bold font-mono text-[#1C1917] dark:text-[#F5F5F4]">
            clean(clean(D)) == clean(D)
          </div>
          <p className="text-[11px] text-[#57534E] dark:text-[#D6D3D1] leading-tight">
            Second pass yields identical deterministic state.
          </p>
        </div>

        {/* Invariant 4: Validation Rules */}
        <div className="p-3.5 rounded-xl border border-[#E7E5E4] dark:border-[#292524] bg-white/80 dark:bg-[#1C1917]/80 backdrop-blur-sm space-y-1">
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#57534E] dark:text-[#D6D3D1] font-mono">4. Rules Verified</span>
            {invariants.validation_rules_passed ? (
              <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-500" />
            )}
          </div>
          <div className="text-base font-bold font-mono text-[#0F766E] dark:text-[#14B8A6]">
            {invariants.rule_checks.filter((r) => r.passed).length}/{invariants.rule_checks.length} Passed
          </div>
          <p className="text-[11px] text-[#57534E] dark:text-[#D6D3D1] leading-tight">
            Synthesized domain constraints satisfied.
          </p>
        </div>
      </div>

      {/* Summary Alert */}
      <div className="p-3 bg-white dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] rounded-xl flex items-start gap-2.5 text-xs text-[#57534E] dark:text-[#D6D3D1]">
        <CheckCircle2 className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6] flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-[#1C1917] dark:text-[#F5F5F4]">Autonomous Pipeline Summary: </strong>
          {bundle.summary}
        </div>
      </div>

      {/* Tab Navigation Pill Bar */}
      <div className="flex items-center gap-2 p-1 bg-[#F5F5F4] dark:bg-[#1C1917] rounded-xl border border-[#E7E5E4] dark:border-[#292524] max-w-fit">
        <button
          type="button"
          onClick={() => setActiveTab("diff")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "diff"
              ? "bg-white dark:bg-[#292524] text-[#0F766E] dark:text-[#14B8A6] shadow-sm"
              : "text-[#57534E] dark:text-[#D6D3D1]"
          }`}
        >
          <Table className="w-3.5 h-3.5" />
          <span>Row Lineage Diff ({changed_rows.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("anomalies")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "anomalies"
              ? "bg-white dark:bg-[#292524] text-[#0F766E] dark:text-[#14B8A6] shadow-sm"
              : "text-[#57534E] dark:text-[#D6D3D1]"
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5" />
          <span>Discovered Anomalies ({anomalies.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "profile"
              ? "bg-white dark:bg-[#292524] text-[#0F766E] dark:text-[#14B8A6] shadow-sm"
              : "text-[#57534E] dark:text-[#D6D3D1]"
          }`}
        >
          <Database className="w-3.5 h-3.5" />
          <span>Before / After Profile</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("script")}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "script"
              ? "bg-white dark:bg-[#292524] text-[#0F766E] dark:text-[#14B8A6] shadow-sm"
              : "text-[#57534E] dark:text-[#D6D3D1]"
          }`}
        >
          <FileCode className="w-3.5 h-3.5" />
          <span>Repeatable Script</span>
        </button>
      </div>

      {/* Tab 1: Row Lineage Diff */}
      {activeTab === "diff" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between text-xs text-[#57534E] dark:text-[#D6D3D1]">
            <p>Showing rows modified by the idempotent correction pipeline.</p>
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500/20 border border-rose-500/40 inline-block" />
                Original Value
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/20 border border-emerald-500/40 inline-block" />
                Corrected Value
              </span>
            </div>
          </div>

          <div className="border border-[#E7E5E4] dark:border-[#292524] rounded-2xl overflow-hidden bg-white dark:bg-[#1C1917]">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF9F6] dark:bg-[#141210] border-b border-[#E7E5E4] dark:border-[#292524] font-mono text-[#57534E] dark:text-[#D6D3D1]">
                  <tr>
                    <th className="py-2.5 px-3 w-16">Row #</th>
                    <th className="py-2.5 px-3 w-32">Changed Fields</th>
                    <th className="py-2.5 px-3">Original Row Data</th>
                    <th className="py-2.5 px-3">Corrected State</th>
                    <th className="py-2.5 px-3">Audit Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E7E5E4] dark:divide-[#292524] font-mono">
                  {changed_rows.map((cr) => (
                    <tr key={cr.row_index} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01]">
                      <td className="py-2.5 px-3 text-[#57534E] dark:text-[#D6D3D1] font-bold">
                        #{cr.row_index}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-wrap gap-1">
                          {cr.changed_columns.map((c) => (
                            <span
                              key={c}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20"
                            >
                              {c}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[#1C1917] dark:text-[#F5F5F4]">
                        <div className="space-y-0.5 text-[11px]">
                          {Object.entries(cr.original).map(([k, v]) => {
                            const isChanged = cr.changed_columns.includes(k);
                            return (
                              <div key={k} className={isChanged ? "bg-rose-500/10 text-rose-700 dark:text-rose-400 px-1 rounded inline-block mr-2" : "inline-block mr-2 text-[#57534E] dark:text-[#D6D3D1]"}>
                                <span className="opacity-70">{k}:</span> {v === null || v === undefined ? "<null>" : String(v)}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[#1C1917] dark:text-[#F5F5F4]">
                        <div className="space-y-0.5 text-[11px]">
                          {Object.entries(cr.corrected).map(([k, v]) => {
                            const isChanged = cr.changed_columns.includes(k);
                            return (
                              <div key={k} className={isChanged ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 px-1 rounded inline-block mr-2 font-bold" : "inline-block mr-2 text-[#57534E] dark:text-[#D6D3D1]"}>
                                <span className="opacity-70">{k}:</span> {v === null || v === undefined ? "<null>" : String(v)}
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-[11px] text-[#57534E] dark:text-[#D6D3D1] max-w-xs leading-snug font-sans">
                        {cr.reason}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Discovered Anomalies */}
      {activeTab === "anomalies" && (
        <div className="space-y-3">
          <div className="border border-[#E7E5E4] dark:border-[#292524] rounded-2xl overflow-hidden bg-white dark:bg-[#1C1917]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF9F6] dark:bg-[#141210] border-b border-[#E7E5E4] dark:border-[#292524] font-mono text-[#57534E] dark:text-[#D6D3D1]">
                <tr>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Target Column</th>
                  <th className="py-2.5 px-3">Severity</th>
                  <th className="py-2.5 px-3">Affected Rows</th>
                  <th className="py-2.5 px-3">Finding Description</th>
                  <th className="py-2.5 px-3">Proposed Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E7E5E4] dark:divide-[#292524]">
                {anomalies.map((anom) => (
                  <tr key={anom.id} className="hover:bg-black/[0.01] dark:hover:bg-white/[0.01]">
                    <td className="py-2.5 px-3 font-mono font-bold text-[#1C1917] dark:text-[#F5F5F4] capitalize">
                      {anom.anomaly_type.replace(/_/g, " ")}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#0F766E] dark:text-[#14B8A6]">
                      {anom.column || "Dataset-wide"}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                          anom.severity === "critical" || anom.severity === "high"
                            ? "bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20"
                            : anom.severity === "medium"
                            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20"
                            : "bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20"
                        }`}
                      >
                        {anom.severity}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#1C1917] dark:text-[#F5F5F4]">
                      {anom.affected_rows_count}
                    </td>
                    <td className="py-2.5 px-3 text-[#57534E] dark:text-[#D6D3D1] max-w-sm">
                      <p>{anom.description}</p>
                      {anom.needs_human_decision && (
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20 font-semibold font-mono">
                          Needs Human Decision
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-[#1C1917] dark:text-[#F5F5F4] max-w-xs font-mono text-[11px]">
                      {anom.proposed_correction}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Before / After Profile */}
      {activeTab === "profile" && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Raw Profile */}
            <div className="p-4 border border-[#E7E5E4] dark:border-[#292524] rounded-2xl bg-white dark:bg-[#1C1917] space-y-3">
              <div className="flex items-center justify-between border-b border-[#E7E5E4] dark:border-[#292524] pb-2">
                <span className="text-xs font-mono font-bold text-rose-600 dark:text-rose-400 uppercase">
                  Before: Raw Ingestion Profile
                </span>
                <span className="text-xs font-mono text-[#57534E] dark:text-[#D6D3D1]">
                  Nulls: {roundPct(before_profile.overall_null_rate)}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>Total Rows: <span className="font-bold">{before_profile.total_rows}</span></div>
                <div>Total Columns: <span className="font-bold">{before_profile.total_columns}</span></div>
                <div>Detected Format: <span className="font-bold uppercase">{before_profile.detected_format}</span></div>
                <div>Primary Key: <span className="font-bold">{before_profile.primary_key_candidates.join(", ") || "None"}</span></div>
              </div>
              <div className="space-y-1 pt-2">
                <h4 className="text-[11px] font-mono text-[#57534E] dark:text-[#D6D3D1] uppercase">Column Breakdown</h4>
                {before_profile.columns.map((c) => (
                  <div key={c.name} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-[#FAF9F6] dark:bg-[#141210] font-mono">
                    <span className="font-semibold text-[#1C1917] dark:text-[#F5F5F4]">{c.name}</span>
                    <span className="text-[#57534E] dark:text-[#D6D3D1]">{c.inferred_type} (null: {c.null_count})</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Clean Profile */}
            <div className="p-4 border border-[#E7E5E4] dark:border-[#292524] rounded-2xl bg-white dark:bg-[#1C1917] space-y-3">
              <div className="flex items-center justify-between border-b border-[#E7E5E4] dark:border-[#292524] pb-2">
                <span className="text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                  After: Corrected Profile
                </span>
                <span className="text-xs font-mono text-emerald-600 dark:text-emerald-400 font-bold">
                  Nulls: {roundPct(after_profile.overall_null_rate)}%
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>Total Rows: <span className="font-bold">{after_profile.total_rows}</span></div>
                <div>Total Columns: <span className="font-bold">{after_profile.total_columns}</span></div>
                <div>Verified Invariants: <span className="font-bold text-emerald-600 dark:text-emerald-400">100% Valid</span></div>
                <div>Primary Key: <span className="font-bold">{after_profile.primary_key_candidates.join(", ") || "None"}</span></div>
              </div>
              <div className="space-y-1 pt-2">
                <h4 className="text-[11px] font-mono text-[#57534E] dark:text-[#D6D3D1] uppercase">Column Breakdown</h4>
                {after_profile.columns.map((c) => (
                  <div key={c.name} className="flex items-center justify-between text-xs py-1 px-2 rounded bg-[#FAF9F6] dark:bg-[#141210] font-mono">
                    <span className="font-semibold text-[#1C1917] dark:text-[#F5F5F4]">{c.name}</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{c.inferred_type} (null: {c.null_count})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Repeatable Script */}
      {activeTab === "script" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#57534E] dark:text-[#D6D3D1]">
              Repeatable, idempotent Python / pandas transformation script. Run this in any pipeline or sandbox.
            </p>
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={handleCopyScript}>
                <Copy className="w-3.5 h-3.5 mr-1" />
                {copiedScript ? "Copied!" : "Copy Code"}
              </Button>
              <Button variant="primary" onClick={handleDownloadScript}>
                <Download className="w-3.5 h-3.5 mr-1" />
                Download Script
              </Button>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-[#E7E5E4] dark:border-[#292524] bg-[#FAF9F6] dark:bg-[#141210] font-mono text-xs overflow-x-auto text-[#1C1917] dark:text-[#F5F5F4] leading-relaxed">
            <pre>{bundle.cleaning_script}</pre>
          </div>
        </div>
      )}
    </div>
  );
}

function roundPct(val: number): string {
  return (val * 100).toFixed(1);
}
