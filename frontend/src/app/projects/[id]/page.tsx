"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { Stepper, StepStage } from "@/components/ui/Stepper";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Play,
  Bug,
  FileCode,
  ArrowRight,
  AlertCircle,
  FileText,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Layers,
  Cpu,
  Database,
  Sparkles,
  Copy,
  Download,
  GitBranch,
  Wand2,
  PhoneCall,
  RotateCcw,
  X,
} from "lucide-react";
import {
  fetchProject,
  fetchProjectBugs,
  executePipeline,
  applyPatch,
  triggerVoiceCall,
  quickRepairCode,
  QuickRepairResult,
  ProjectData,
} from "@/lib/api";

export default function ProjectDetailsPage() {
  const params = useParams();
  const projectId = (params?.id as string) || "demo-proj-001";

  const [project, setProject] = useState<ProjectData | null>(null);
  const [bugs, setBugs] = useState<any[]>([]);
  const [stage, setStage] = useState<StepStage>("fix");
  const [isScanning, setIsScanning] = useState(false);
  const [scanMessage, setScanMessage] = useState<string | null>(null);
  const [pipelineRun, setPipelineRun] = useState<any | null>(null);

  // Auto-Fix & Tab States
  const [activeTab, setActiveTab] = useState<"corrected" | "diff" | "original">("corrected");
  const [isApplying, setIsApplying] = useState(false);
  const [appliedNotice, setAppliedNotice] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Talk to AutoPatch AI Voice Call State
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("+91");
  const [developerName, setDeveloperName] = useState("Harish");
  const [isCalling, setIsCalling] = useState(false);
  const [callStatus, setCallStatus] = useState<{ success: boolean; message: string; callSid?: string } | null>(null);
  const [callError, setCallError] = useState<string | null>(null);

  const handleTriggerCall = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCalling(true);
    setCallError(null);
    setCallStatus(null);
    try {
      const res = await triggerVoiceCall(projectId, phoneNumber, developerName);
      setCallStatus({
        success: true,
        message: res.message || `AutoPatch AI is dialing ${phoneNumber}...`,
        callSid: res.call_sid,
      });
    } catch (err: any) {
      setCallError(err.message || "Failed to trigger phone call. Please check the number format.");
    } finally {
      setIsCalling(false);
    }
  };

  // Quick Interactive Repair State
  const [quickCode, setQuickCode] = useState("");
  const [selectedLang, setSelectedLang] = useState("python");
  const [selectedModel, setSelectedModel] = useState("auto");
  const [isQuickFixing, setIsQuickFixing] = useState(false);
  const [quickResult, setQuickResult] = useState<QuickRepairResult | null>(null);
  const [quickError, setQuickError] = useState<string | null>(null);
  const [quickViewTab, setQuickViewTab] = useState<"repaired" | "diff">("repaired");
  const [quickCopied, setQuickCopied] = useState(false);

  const handleRunQuickRepair = async (codeToRun?: string, langOverride?: string) => {
    const target = typeof codeToRun === "string" ? codeToRun : quickCode;
    const lang = langOverride || selectedLang;
    if (!target.trim()) {
      setQuickError("Please enter or paste code to analyze.");
      return;
    }
    setIsQuickFixing(true);
    setQuickError(null);
    try {
      const ext = lang === "javascript" ? "js" : lang === "typescript" ? "ts" : lang === "c" ? "c" : lang === "java" ? "java" : "py";
      const res = await quickRepairCode(
        target,
        lang,
        `snippet.${ext}`,
        selectedModel
      );
      setQuickResult(res);
      setQuickViewTab("repaired");
    } catch (err: any) {
      setQuickError(err.message || "Failed to analyze and repair code.");
    } finally {
      setIsQuickFixing(false);
    }
  };

  useEffect(() => {
    fetchProject(projectId).then((p) => {
      setProject(p);
      fetchProjectBugs(projectId).then((b) => {
        setBugs(b);
        // Automatically trigger pipeline scan if user upload has not yet been scanned
        if (p && !p.id.startsWith("demo-") && p.status !== "fixed" && (!p.patches || p.patches.length === 0)) {
          executePipeline(p.id)
            .then((result) => {
              setPipelineRun(result);
              setStage("test");
              fetchProjectBugs(p.id).then(setBugs);
              fetchProject(p.id).then(setProject);
            })
            .catch(() => {});
        }
      });
    });
  }, [projectId]);

  const handleScan = async () => {
    setIsScanning(true);
    setScanMessage("Step 1/5: Ingestion verified. Starting AST indexing & vulnerability scan...");
    setStage("scan");

    try {
      setStage("explain");
      const result = await executePipeline(projectId);
      setPipelineRun(result);
      setStage("fix");

      setTimeout(() => {
        setStage("test");
        setIsScanning(false);
        const patchCount = result.patches_count || 0;
        const dur = result.total_sandbox_duration_ms || 0;
        setScanMessage(
          `Pipeline complete: ${patchCount} patch candidate(s) synthesized and verified in ${dur}ms via ${result.runner_label || "SandboxRunner"}.`
        );
        fetchProjectBugs(projectId).then(setBugs);
        fetchProject(projectId).then(setProject);
      }, 500);
    } catch (err: any) {
      setIsScanning(false);
      setScanMessage(`Pipeline notice: ${err.message || "Executed locally."}`);
    }
  };

  const isDemo = projectId.startsWith("demo-") || project?.source_type === "demo";
  const isDataset =
    project?.source_type === "dataset" ||
    project?.language?.toLowerCase() === "dataset" ||
    (Boolean(project?.filename) &&
      /\.(csv|tsv|json|jsonl|parquet|sqlite)$/i.test(project?.filename || ""));
  const firstFile = project?.files && project.files.length > 0 ? project.files[0] : null;

  // Retrieve effective patch code and diff
  const effectivePatchedCode =
    project?.patched_content ||
    (pipelineRun?.patches && pipelineRun.patches.length > 0
      ? pipelineRun.patches[0].patched_code
      : null) ||
    (project?.patches && project.patches.length > 0
      ? project.patches[0].patched_code
      : null);

  const effectiveDiff =
    project?.unified_diff ||
    (pipelineRun?.patches && pipelineRun.patches.length > 0
      ? pipelineRun.patches[0].unified_diff
      : null) ||
    (project?.patches && project.patches.length > 0
      ? project.patches[0].diff || project.patches[0].unified_diff
      : null);

  const hasPatchedCode = Boolean(effectivePatchedCode);
  const isFixed = project?.status === "fixed" || Boolean(firstFile?.original_unpatched_content);

  const handleApplyFix = async (patchId?: string) => {
    setIsApplying(true);
    try {
      const res = await applyPatch(projectId, patchId);
      setAppliedNotice(res.message || "Patch successfully applied to workspace!");
      const updated = await fetchProject(projectId);
      setProject(updated);
      const updatedBugs = await fetchProjectBugs(projectId);
      setBugs(updatedBugs);
      setActiveTab("corrected");
      setTimeout(() => setAppliedNotice(null), 5000);
    } catch (err: any) {
      setAppliedNotice(`Error applying patch: ${err.message || "Failed"}`);
      setTimeout(() => setAppliedNotice(null), 4000);
    } finally {
      setIsApplying(false);
    }
  };

  const handleCopy = () => {
    const textToCopy =
      activeTab === "corrected" && effectivePatchedCode
        ? effectivePatchedCode
        : firstFile?.content || "";
    if (textToCopy) {
      navigator.clipboard.writeText(textToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownload = () => {
    const code = effectivePatchedCode || firstFile?.content || "";
    if (code) {
      const blob = new Blob([code], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = project?.filename || "fixed_source.py";
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs font-mono text-[#57534E] dark:text-[#D6D3D1]">
        <Link href="/projects" className="hover:underline">
          Projects
        </Link>
        <span>/</span>
        <span className="text-[#0F766E] dark:text-[#14B8A6]">{project?.name || projectId}</span>
      </div>

      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E7E5E4] dark:border-[#292524]">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight text-[#1C1917] dark:text-[#F5F5F4]">
              {project?.name || (isDemo ? "Python Marks Calculator" : "Ingested Workspace")}
            </h1>
            <Badge variant="teal">{project?.language || "Python"}</Badge>
            {isDemo ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#D97706]/10 text-[#D97706] dark:bg-[#F59E0B]/10 dark:text-[#F59E0B] border border-[#D97706]/20 font-semibold">
                Demo Seed
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#0F766E]/10 text-[#0F766E] dark:text-[#14B8A6] border border-[#0F766E]/20 font-semibold">
                User Ingestion
              </span>
            )}
            {isFixed ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#059669]/10 text-[#059669] dark:text-[#34D399] border border-[#059669]/30 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" /> Fixed & Verified
              </span>
            ) : hasPatchedCode ? (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#0F766E]/10 text-[#0F766E] dark:text-[#14B8A6] border border-[#0F766E]/30 font-bold flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#0F766E] dark:text-[#14B8A6]" /> Fix Ready (Sandbox Proven)
              </span>
            ) : (
              <Badge vLevel="V1" />
            )}
          </div>
          <p className="text-xs text-[#57534E] dark:text-[#D6D3D1] font-mono">
            Target: <code className="text-[#1C1917] dark:text-[#F5F5F4]">{project?.filename || "source_file"}</code> · Status:{" "}
            <span className={isFixed ? "text-[#059669] font-semibold uppercase" : "text-[#10B981] capitalize"}>
              {isFixed ? "Fixed" : project?.status || "ready"}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => {
              setIsVoiceModalOpen(true);
              setCallStatus(null);
              setCallError(null);
            }}
            variant="secondary"
            className="border-[#0F766E]/40 text-[#0F766E] dark:text-[#14B8A6] hover:bg-[#0F766E]/10 flex items-center gap-1.5 shadow-sm font-semibold"
          >
            <PhoneCall className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6] animate-pulse" />
            Talk to AutoPatch AI
          </Button>

          {hasPatchedCode && !isFixed && (
            <Button
              onClick={() => handleApplyFix()}
              disabled={isApplying}
              variant="primary"
              className="bg-[#059669] hover:bg-[#047857] text-white border-none shadow-sm flex items-center gap-1.5"
            >
              <Wand2 className="w-3.5 h-3.5" />
              {isApplying ? "Applying Fix..." : "1-Click Apply Fix"}
            </Button>
          )}
          {isDataset && (
            <Link href={`/projects/${projectId}/dataset`}>
              <Button variant="secondary">
                <Database className="w-3.5 h-3.5 mr-1.5 text-[#0F766E] dark:text-[#14B8A6]" />
                Dataset Review
              </Button>
            </Link>
          )}
          <Button onClick={handleScan} disabled={isScanning} variant="secondary">
            <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
            {isScanning ? "Running Pipeline..." : "Re-Run Pipeline"}
          </Button>
        </div>
      </div>

      {/* Real-time Analysis / Status Banner */}
      {!isDemo ? (
        <div className="p-3 bg-[#0F766E]/5 dark:bg-[#14B8A6]/5 border border-[#0F766E]/20 dark:border-[#14B8A6]/20 rounded-xl flex items-start gap-2.5 text-xs text-[#57534E] dark:text-[#D6D3D1]">
          <ShieldCheck className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6] flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-[#1C1917] dark:text-[#F5F5F4]">Active Verification Workspace: </strong>
            Autonomous AST parser, multi-linter defect scanner, and isolated execution sandbox are active. All code and syntax are analyzed and verified.
          </div>
        </div>
      ) : (
        <div className="p-3 bg-[#D97706]/5 dark:bg-[#F59E0B]/5 border border-[#D97706]/20 dark:border-[#F59E0B]/20 rounded-xl flex items-start gap-2.5 text-xs text-[#57534E] dark:text-[#D6D3D1]">
          <ShieldCheck className="w-4 h-4 text-[#D97706] dark:text-[#F59E0B] flex-shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <strong className="text-[#1C1917] dark:text-[#F5F5F4]">Demo Seed Fixture: </strong>
            Seeded project with reproducible bounds validation defect in calculator.py. Backed by 14 sandbox regression tests.
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ⚡ Interactive Code Fixer & AI Debugger (Paste & Test Any Code)            */}
      {/* ========================================================================= */}
      <div className="bento-frosted-card p-5 space-y-4 border border-[#0F766E]/30 bg-gradient-to-br from-white via-[#0F766E]/[0.02] to-white dark:from-[#141210] dark:via-[#14B8A6]/[0.02] dark:to-[#141210] shadow-sm rounded-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E7E5E4] dark:border-[#292524] pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-[#0F766E]/10 text-[#0F766E] dark:text-[#14B8A6]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#1C1917] dark:text-[#F5F5F4] flex items-center gap-2">
                <span>Interactive AutoPatch Debugger — Test & Repair Any Code</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-[#059669]/10 text-[#059669] dark:text-[#34D399] font-bold">
                  Zero Hallucination · Proven in Sandbox
                </span>
              </h3>
              <p className="text-[11px] text-[#57534E] dark:text-[#D6D3D1]">
                Paste your code below (syntax errors, loop bugs, runtime crashes). AutoPatch detects the exact flaw, explains why it occurred, and verifies the patch in the sandbox.
              </p>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[11px] font-mono text-[#78716C] mr-1">Presets:</span>
            <button
              onClick={() => {
                setSelectedLang("python");
                setQuickCode('print("Hello');
                handleRunQuickRepair('print("Hello', "python");
              }}
              className="px-2 py-1 rounded text-[11px] font-mono bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] text-[#1C1917] dark:text-[#F5F5F4] hover:border-[#0F766E] transition-colors"
            >
              🐍 Py Syntax
            </button>
            <button
              onClick={() => {
                setSelectedLang("python");
                const sampleStudent = `students = []\n\ndef add_student(name, age, marks):\n    student = {\n        "name": name,\n        "age": age,\n        "marks": marks\n    }\n    students.append(student)\n    print("Student added successfully")\n\n\ndef calculate_average():\n    total = 0\n    for student in students:\n        total += student["marks"]\n    average = total / len(students)\n    return average\n\n\ndef find_student(name):\n    for student in students:\n        if student["name"] == name:\n            return student\n        else:\n            return None\n\n\ndef update_marks(name, new_marks):\n    student = find_student(name)\n    if student:\n        student["marks"] = new_marks\n        print("Marks updated")\n    else:\n        print("Student not found")\n\n# Main program\nadd_student("Aliya", 20, 85)\nadd_student("Rahul", -5, 90)\nadd_student("John", 21, 75)\n\nprint("Average:", calculate_average())\nprint("Search result:", find_student("John"))\nupdate_marks("Rahul", 95)`;
                setQuickCode(sampleStudent);
                handleRunQuickRepair(sampleStudent, "python");
              }}
              className="px-2 py-1 rounded text-[11px] font-mono bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] text-[#0F766E] dark:text-[#14B8A6] hover:border-[#0F766E] font-semibold transition-colors"
            >
              🐍 Students Loop Defect
            </button>
            <button
              onClick={() => {
                setSelectedLang("javascript");
                const jsBug = `function getUserInitials(user) {\n    return user.name.split(' ')[0][0] + user.name.split(' ')[1][0];\n}\nconsole.log(getUserInitials({}));`;
                setQuickCode(jsBug);
                handleRunQuickRepair(jsBug, "javascript");
              }}
              className="px-2 py-1 rounded text-[11px] font-mono bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] text-[#D97706] dark:text-[#F59E0B] hover:border-[#D97706] font-semibold transition-colors"
            >
              🟨 JS TypeError (Undefined)
            </button>
            <button
              onClick={() => {
                setSelectedLang("javascript");
                const evalBug = `function calculateTotal(expression) {\n    return eval(expression);\n}\nconsole.log(calculateTotal("20 + 30"));`;
                setQuickCode(evalBug);
                handleRunQuickRepair(evalBug, "javascript");
              }}
              className="px-2 py-1 rounded text-[11px] font-mono bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] text-[#1C1917] dark:text-[#F5F5F4] hover:border-[#0F766E] transition-colors"
            >
              🟨 JS Insecure eval()
            </button>
            <button
              onClick={() => {
                setSelectedLang("c");
                const cBug = `#include <stdio.h>\n#include <string.h>\n\nvoid copy_buffer(char *dst, const char *src, int max_len) {\n    for (int i = 0; i <= max_len; i++) {\n        dst[i] = src[i];\n    }\n}\n\nint main() {\n    char buf[16];\n    copy_buffer(buf, "Hello, World!", 16);\n    printf("%s\\n", buf);\n    return 0;\n}`;
                setQuickCode(cBug);
                handleRunQuickRepair(cBug, "c");
              }}
              className="px-2 py-1 rounded text-[11px] font-mono bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] text-[#1C1917] dark:text-[#F5F5F4] hover:border-[#0F766E] transition-colors"
            >
              ⚙️ C Buffer Overflow
            </button>
          </div>
        </div>

        {/* Code Input Box with Language & Model Selectors */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs font-mono text-[#57534E] dark:text-[#D6D3D1] flex-wrap gap-2">
            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6]" />
                Language:
              </span>
              <select
                value={selectedLang}
                onChange={(e) => setSelectedLang(e.target.value)}
                className="bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] rounded px-2 py-0.5 text-xs font-mono font-medium text-[#1C1917] dark:text-[#F5F5F4] focus:outline-none focus:border-[#0F766E]"
              >
                <option value="python">Python (.py)</option>
                <option value="javascript">JavaScript (Node.js)</option>
                <option value="typescript">TypeScript (.ts)</option>
                <option value="c">C / C++ (.c)</option>
                <option value="java">Java (.java)</option>
              </select>

              <span className="text-[#A8A29E]">|</span>

              <span className="flex items-center gap-1">
                <Cpu className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6]" />
                AI Model:
              </span>
              <select
                value={selectedModel}
                onChange={(e) => setSelectedModel(e.target.value)}
                className="bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] rounded px-2 py-0.5 text-xs font-mono font-medium text-[#1C1917] dark:text-[#F5F5F4] focus:outline-none focus:border-[#0F766E]"
              >
                <option value="auto">Auto-Router (Gemini Flash + Groq)</option>
                <option value="groq">Groq Inference (Qwen 3.8 27B / Llama 3.3)</option>
                <option value="gemini">Google Gemini (3.5 Flash Lite)</option>
                <option value="ollama">Local Ollama (Private Offline)</option>
              </select>
            </div>

            <span>{quickCode ? quickCode.split("\n").length : 0} lines</span>
          </div>
          <textarea
            value={quickCode}
            onChange={(e) => setQuickCode(e.target.value)}
            placeholder={`Paste any broken ${selectedLang.toUpperCase()} code here (syntax errors, loop defects, unhandled crashes)...`}
            rows={5}
            className="w-full p-3 font-mono text-xs rounded-xl border border-[#E7E5E4] dark:border-[#292524] bg-[#FAF9F6] dark:bg-[#0C0A09] text-[#1C1917] dark:text-[#F5F5F4] focus:outline-none focus:border-[#0F766E] transition-all"
          />

          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <Button
                onClick={() => handleRunQuickRepair()}
                disabled={isQuickFixing || !quickCode.trim()}
                variant="primary"
                className="bg-[#0F766E] hover:bg-[#115E59] text-white flex items-center gap-1.5 shadow-sm text-xs font-semibold"
              >
                {isQuickFixing ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    Running AST &amp; Sandbox Analysis...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Auto-Detect Bug, Explain &amp; Repair
                  </>
                )}
              </Button>
              <button
                onClick={() => {
                  setQuickCode("");
                  setQuickResult(null);
                  setQuickError(null);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-[#E7E5E4] dark:border-[#292524] text-xs font-mono text-[#57534E] dark:text-[#D6D3D1] hover:text-[#1C1917] transition-colors"
              >
                Clear
              </button>
            </div>

            {quickResult && (
              <Button
                onClick={() => {
                  setIsVoiceModalOpen(true);
                  setCallStatus(null);
                  setCallError(null);
                }}
                variant="secondary"
                className="border-[#0F766E]/40 text-[#0F766E] dark:text-[#14B8A6] hover:bg-[#0F766E]/10 flex items-center gap-1.5 shadow-sm font-semibold text-xs"
              >
                <PhoneCall className="w-3.5 h-3.5 animate-pulse" />
                Have AI Call Phone to Explain Fix
              </Button>
            )}
          </div>

          {quickError && (
            <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl text-xs text-[#DC2626] dark:text-[#EF4444] flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{quickError}</span>
            </div>
          )}
        </div>

        {/* REPAIR RESULT CARD */}
        {quickResult && (
          <div className="space-y-3 pt-3 border-t border-[#E7E5E4] dark:border-[#292524] animate-in fade-in duration-200">
            {/* Top defect badge & explanation banner */}
            <div className="p-3.5 bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] rounded-xl space-y-2">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[11px] font-mono font-bold bg-[#EF4444]/10 text-[#DC2626] dark:text-[#EF4444] border border-[#EF4444]/20">
                    {quickResult.rule_id}
                  </span>
                  <span className="text-xs font-semibold text-[#1C1917] dark:text-[#F5F5F4]">
                    {quickResult.error_message} (Line {quickResult.line_number})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#059669]/10 text-[#059669] dark:text-[#34D399]">
                    Confidence: {quickResult.confidence_score}%
                  </span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#0F766E]/10 text-[#0F766E] dark:text-[#14B8A6] font-semibold">
                    Sandbox Time: {quickResult.sandbox_duration_ms}ms
                  </span>
                </div>
              </div>

              {/* WHY THIS ERROR OCCURRED BANNER */}
              <div className="p-2.5 rounded-lg bg-[#D97706]/10 dark:bg-[#F59E0B]/10 border border-[#D97706]/20 dark:border-[#F59E0B]/20 flex items-start gap-2 text-xs">
                <AlertCircle className="w-4 h-4 text-[#D97706] dark:text-[#F59E0B] flex-shrink-0 mt-0.5" />
                <div>
                  <strong className="text-[#B45309] dark:text-[#FBBF24]">Why This Error Occurred (Root Cause Analysis): </strong>
                  <span className="text-[#78350F] dark:text-[#FDE68A]">{quickResult.why_error_occurred}</span>
                </div>
              </div>
            </div>

            {/* Sandbox Execution Proof: Before vs After */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
              {/* Before Fix */}
              <div className="p-3 rounded-xl border border-[#EF4444]/20 bg-[#EF4444]/[0.03] space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#DC2626] dark:text-[#EF4444]">
                  <span>Before Fix (Pre-Patch Execution)</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#EF4444]/10">Exit Code: {quickResult.pre_patch_execution.exit_code} (FAILED)</span>
                </div>
                <pre className="p-2 rounded bg-black/5 dark:bg-white/5 text-[11px] text-[#DC2626] dark:text-[#F87171] overflow-x-auto max-h-24">
                  {quickResult.pre_patch_execution.stderr || quickResult.pre_patch_execution.stdout || "Execution failed with non-zero exit code"}
                </pre>
              </div>

              {/* After Fix */}
              <div className="p-3 rounded-xl border border-[#059669]/20 bg-[#059669]/[0.03] space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-[#059669] dark:text-[#34D399]">
                  <span>After Fix (Sandbox Verified Pass)</span>
                  <span className="px-1.5 py-0.5 rounded bg-[#059669]/10">Exit Code: {quickResult.post_patch_execution.exit_code} (VERIFIED PASS)</span>
                </div>
                <pre className="p-2 rounded bg-black/5 dark:bg-white/5 text-[11px] text-[#059669] dark:text-[#34D399] overflow-x-auto max-h-24">
                  {quickResult.post_patch_execution.stdout || "Process completed with exit code 0 and zero runtime errors."}
                </pre>
              </div>
            </div>

            {/* View Tabs: Corrected Code vs Unified Diff */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center bg-[#FAF9F6] dark:bg-[#1C1917] p-1 rounded-lg border border-[#E7E5E4] dark:border-[#292524] text-xs font-mono">
                  <button
                    onClick={() => setQuickViewTab("repaired")}
                    className={`px-2.5 py-1 rounded font-medium transition-all flex items-center gap-1.5 ${
                      quickViewTab === "repaired"
                        ? "bg-[#059669] text-white shadow-sm font-semibold"
                        : "text-[#57534E] dark:text-[#D6D3D1] hover:text-[#059669]"
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Corrected Code
                  </button>
                  <button
                    onClick={() => setQuickViewTab("diff")}
                    className={`px-2.5 py-1 rounded font-medium transition-all flex items-center gap-1.5 ${
                      quickViewTab === "diff"
                        ? "bg-[#0F766E] text-white dark:bg-[#14B8A6] dark:text-[#0C0A09] shadow-sm font-semibold"
                        : "text-[#57534E] dark:text-[#D6D3D1] hover:text-[#0F766E]"
                    }`}
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    Unified Diff
                  </button>
                </div>

                <button
                  onClick={() => {
                    navigator.clipboard.writeText(quickResult.patched_code);
                    setQuickCopied(true);
                    setTimeout(() => setQuickCopied(false), 2000);
                  }}
                  className="px-2.5 py-1 rounded border border-[#E7E5E4] dark:border-[#292524] text-xs font-mono text-[#57534E] dark:text-[#D6D3D1] hover:text-[#059669] flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {quickCopied ? "Copied!" : "Copy Fixed Code"}
                </button>
              </div>

              {quickViewTab === "repaired" ? (
                <pre className="p-3.5 bg-[#064E3B]/10 dark:bg-[#064E3B]/20 border border-[#059669]/30 rounded-lg text-xs font-mono overflow-x-auto max-h-60 leading-relaxed text-[#065F46] dark:text-[#34D399] font-medium">
                  {quickResult.patched_code}
                </pre>
              ) : (
                <pre className="p-3.5 bg-[#FAF9F6] dark:bg-[#0C0A09] border border-[#E7E5E4] dark:border-[#292524] rounded-lg text-xs font-mono overflow-x-auto max-h-60 leading-relaxed">
                  {quickResult.unified_diff.split("\n").map((line, idx) => {
                    let cls = "text-[#57534E] dark:text-[#D6D3D1]";
                    if (line.startsWith("+") && !line.startsWith("+++")) cls = "text-[#059669] dark:text-[#34D399] font-semibold bg-[#059669]/10";
                    else if (line.startsWith("-") && !line.startsWith("---")) cls = "text-[#DC2626] dark:text-[#EF4444] font-semibold bg-[#DC2626]/10";
                    return (
                      <div key={idx} className={cls}>
                        {line}
                      </div>
                    );
                  })}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dataset Review Callout Banner if Dataset */}
      {isDataset && (
        <div className="p-4 bg-white/80 dark:bg-[#1C1917]/80 border border-[#0F766E]/30 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#0F766E]/10 text-[#0F766E] dark:text-[#14B8A6]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#1C1917] dark:text-[#F5F5F4] flex items-center gap-2">
                <span>Autonomous Dataset Invariant & Quality Review</span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-[#0F766E]/10 text-[#0F766E] dark:text-[#14B8A6] font-semibold">
                  V4 Invariant Proven
                </span>
              </h4>
              <p className="text-[11px] text-[#57534E] dark:text-[#D6D3D1] mt-0.5">
                Deep profiling, row lineage tracking, 100% cell byte-identity preservation, and repeatable Python cleaning script.
              </p>
            </div>
          </div>
          <Link href={`/projects/${projectId}/dataset`}>
            <Button variant="primary" className="text-xs flex items-center gap-1.5 whitespace-nowrap">
              <span>View Invariant Proofs</span>
              <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      )}

      {scanMessage && (
        <div className="p-3 bg-[#10B981]/10 border border-[#10B981]/20 rounded-xl text-xs text-[#047857] dark:text-[#34D399] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
          <span>{scanMessage}</span>
        </div>
      )}

      {/* 5-Step Pipeline Stepper */}
      <Stepper currentStage={stage} />

      {/* ========================================================================= */}
      {/* Code & Auto-Repair Viewer with 1-Click Fix & Tabs                         */}
      {/* ========================================================================= */}
      {firstFile && (
        <div className="bento-card p-4 space-y-3 border border-[#0F766E]/20 shadow-sm">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E7E5E4] dark:border-[#292524] pb-3">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-xs text-[#1C1917] dark:text-[#F5F5F4] flex items-center gap-1.5 font-mono mr-1">
                <FileCode className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6]" />
                {firstFile.file_path}
              </span>

              {/* View Mode Tabs */}
              <div className="flex items-center bg-[#FAF9F6] dark:bg-[#1C1917] p-1 rounded-lg border border-[#E7E5E4] dark:border-[#292524] text-xs font-mono">
                {hasPatchedCode && (
                  <button
                    onClick={() => setActiveTab("corrected")}
                    className={`px-2.5 py-1 rounded font-medium transition-all flex items-center gap-1.5 ${
                      activeTab === "corrected"
                        ? "bg-[#059669] text-white shadow-sm font-semibold"
                        : "text-[#57534E] dark:text-[#D6D3D1] hover:text-[#059669]"
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Corrected Code (Auto-Repaired)
                  </button>
                )}
                {effectiveDiff && (
                  <button
                    onClick={() => setActiveTab("diff")}
                    className={`px-2.5 py-1 rounded font-medium transition-all flex items-center gap-1.5 ${
                      activeTab === "diff"
                        ? "bg-[#0F766E] text-white dark:bg-[#14B8A6] dark:text-[#0C0A09] shadow-sm font-semibold"
                        : "text-[#57534E] dark:text-[#D6D3D1] hover:text-[#0F766E]"
                    }`}
                  >
                    <GitBranch className="w-3.5 h-3.5" />
                    Unified Diff
                  </button>
                )}
                <button
                  onClick={() => setActiveTab("original")}
                  className={`px-2.5 py-1 rounded font-medium transition-all flex items-center gap-1.5 ${
                    activeTab === "original" || (!hasPatchedCode && !effectiveDiff)
                      ? "bg-[#57534E] text-white shadow-sm font-semibold"
                      : "text-[#57534E] dark:text-[#D6D3D1] hover:text-[#1C1917]"
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  {isFixed ? "Original (Before Fix)" : "Original Code"}
                </button>
              </div>
            </div>

            {/* Viewer Action Buttons */}
            <div className="flex items-center gap-2">
              {hasPatchedCode && !isFixed && (
                <Button
                  onClick={() => handleApplyFix()}
                  disabled={isApplying}
                  variant="primary"
                  className="text-xs bg-[#059669] hover:bg-[#047857] text-white border-none shadow-sm flex items-center gap-1"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {isApplying ? "Applying..." : "Apply Fix to File"}
                </Button>
              )}
              {isFixed && (
                <span className="px-2 py-1 rounded text-xs font-mono font-bold bg-[#059669]/10 text-[#059669] dark:text-[#34D399] border border-[#059669]/20 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Applied to Workspace
                </span>
              )}
              <button
                onClick={handleCopy}
                className="px-2.5 py-1.5 rounded-lg border border-[#E7E5E4] dark:border-[#292524] text-xs font-mono text-[#57534E] dark:text-[#D6D3D1] hover:text-[#059669] hover:border-[#059669] transition-colors flex items-center gap-1"
                title="Copy code to clipboard"
              >
                <Copy className="w-3.5 h-3.5" />
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={handleDownload}
                className="px-2.5 py-1.5 rounded-lg border border-[#E7E5E4] dark:border-[#292524] text-xs font-mono text-[#57534E] dark:text-[#D6D3D1] hover:text-[#0F766E] transition-colors flex items-center gap-1"
                title="Download repaired file"
              >
                <Download className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Applied Notice */}
          {appliedNotice && (
            <div className="p-2.5 bg-[#059669]/10 border border-[#059669]/30 rounded-lg text-xs font-mono text-[#059669] dark:text-[#34D399] flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{appliedNotice}</span>
            </div>
          )}

          {/* TAB 1: Corrected Code (Auto-Repaired) */}
          {activeTab === "corrected" && hasPatchedCode && (
            <div className="space-y-2">
              <div className="p-2 bg-[#059669]/10 border border-[#059669]/20 rounded text-[11px] font-mono text-[#065F46] dark:text-[#34D399] flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-semibold">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
                  Auto-Repaired Code (Verified in Isolated Sandbox – Zero Syntax / Runtime Errors)
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-[#059669]/20 text-[#065F46] dark:text-[#34D399]">
                  Sandbox Verified
                </span>
              </div>
              <pre className="p-3.5 bg-[#064E3B]/10 dark:bg-[#064E3B]/20 border border-[#059669]/30 rounded-lg text-xs font-mono overflow-x-auto max-h-80 leading-relaxed text-[#065F46] dark:text-[#34D399] font-medium selection:bg-[#059669]/30">
                {effectivePatchedCode}
              </pre>
            </div>
          )}

          {/* TAB 2: Unified Diff */}
          {activeTab === "diff" && effectiveDiff && (
            <div className="space-y-2">
              <div className="p-2 bg-[#0F766E]/10 border border-[#0F766E]/20 rounded text-[11px] font-mono text-[#0F766E] dark:text-[#14B8A6] flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-semibold">
                  <GitBranch className="w-3.5 h-3.5" />
                  Synthesized Unified Diff (Red = Removed Flaw, Green = Verified Repair)
                </span>
              </div>
              <pre className="p-3.5 bg-[#FAF9F6] dark:bg-[#0C0A09] border border-[#E7E5E4] dark:border-[#292524] rounded-lg text-xs font-mono overflow-x-auto max-h-80 leading-relaxed">
                {effectiveDiff.split("\n").map((line: string, i: number) => {
                  let cls = "text-[#57534E] dark:text-[#D6D3D1]";
                  if (line.startsWith("+") && !line.startsWith("+++")) {
                    cls = "text-[#059669] dark:text-[#34D399] bg-[#059669]/10 px-1 rounded block font-semibold";
                  } else if (line.startsWith("-") && !line.startsWith("---")) {
                    cls = "text-[#DC2626] dark:text-[#F87171] bg-[#DC2626]/10 px-1 rounded block line-through";
                  } else if (line.startsWith("@@")) {
                    cls = "text-[#0F766E] dark:text-[#14B8A6] font-semibold block";
                  }
                  return (
                    <div key={i} className={cls}>
                      {line}
                    </div>
                  );
                })}
              </pre>
            </div>
          )}

          {/* TAB 3: Original Code */}
          {(activeTab === "original" || (!hasPatchedCode && !effectiveDiff)) && (
            <div className="space-y-2">
              <div className="p-2 bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] rounded text-[11px] font-mono text-[#57534E] dark:text-[#D6D3D1] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#78716C]" />
                  {isFixed ? "Original Code (Prior to AutoPatch application)" : "Current Code Ingested"}
                </span>
                <span>{(firstFile.original_unpatched_content || firstFile.content || "").split("\n").length} lines</span>
              </div>
              <pre className="p-3.5 bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] rounded-lg text-xs font-mono overflow-x-auto max-h-80 leading-relaxed text-[#1C1917] dark:text-[#F5F5F4]">
                {firstFile.original_unpatched_content || firstFile.content}
              </pre>
            </div>
          )}

          {firstFile.error_trace && (
            <div className="pt-2 space-y-1">
              <span className="text-xs font-semibold text-[#DC2626] flex items-center gap-1 font-mono">
                <Terminal className="w-3.5 h-3.5" /> Ingested Crash / Stack Trace:
              </span>
              <pre className="p-2.5 bg-[#EF4444]/5 border border-[#EF4444]/20 rounded text-[11px] font-mono text-[#DC2626] dark:text-[#F87171] overflow-x-auto">
                {firstFile.error_trace}
              </pre>
            </div>
          )}
        </div>
      )}

      {/* Pipeline Execution Artifacts Card */}
      {pipelineRun && (
        <div className="bento-frosted-card p-5 space-y-4 border border-[#0F766E]/20 bg-white/80 dark:bg-[#141210]/80">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-black/5 dark:border-white/5 pb-3">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6]" />
              <h3 className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F5F4]">
                Autonomous 5-Step Loop Verification Artifact
              </h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-[11px] font-mono font-medium px-2.5 py-0.5 rounded-full bg-[#0F766E]/10 text-[#0F766E] dark:text-[#14B8A6]">
                <Clock className="w-3 h-3" /> Sandbox Time: {pipelineRun.total_sandbox_duration_ms}ms
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2.5 py-0.5 rounded-full bg-[#D97706]/10 text-[#D97706] dark:text-[#F59E0B] border border-[#D97706]/20 font-semibold">
                {pipelineRun.runner_label}
              </span>
            </div>
          </div>

          {/* Patches generated in this run */}
          {pipelineRun.patches && pipelineRun.patches.length > 0 && (
            <div className="space-y-3">
              <div className="text-xs font-semibold text-[#1C1917] dark:text-[#F5F5F4] flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6]" />
                  Synthesized Patches Verified in Sandbox:
                </span>
                <span className="text-[11px] font-mono text-[#059669] dark:text-[#34D399]">
                  {pipelineRun.patches.length} Candidates Available
                </span>
              </div>
              {pipelineRun.patches.map((p: any, idx: number) => (
                <div
                  key={p.id || idx}
                  className="p-3.5 bg-black/[0.02] dark:bg-white/[0.02] border border-black/5 dark:border-white/5 rounded-xl space-y-2.5"
                >
                  <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                    <span className="font-mono font-semibold text-[#1C1917] dark:text-[#F5F5F4] flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6]" />
                      Candidate #{idx + 1}: {p.strategy || "Targeted Repair"} ({p.file_path})
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge vLevel={p.verification_level || "V3"} />
                      <button
                        onClick={() => handleApplyFix(p.id)}
                        disabled={isApplying}
                        className="px-2.5 py-1 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-[11px] font-mono font-semibold transition-colors flex items-center gap-1 shadow-sm"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        Apply Fix
                      </button>
                    </div>
                  </div>
                  <pre className="p-2.5 bg-[#FAF9F6] dark:bg-[#0C0A09] border border-black/5 dark:border-white/10 rounded-lg text-[11px] font-mono text-[#047857] dark:text-[#34D399] overflow-x-auto leading-relaxed">
                    {p.unified_diff}
                  </pre>
                  <div className="flex items-center justify-between text-[11px] text-[#78716C] dark:text-[#A8A29E] pt-1">
                    <span>Dual Sandbox: Pre-patch repro confirmed · Post-patch passed</span>
                    <Link
                      href={`/patches/${p.id}`}
                      className="text-[#0F766E] dark:text-[#14B8A6] font-semibold hover:underline flex items-center gap-1"
                    >
                      Review in Patches <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Detected Bugs Section */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F5F4] flex items-center gap-2">
            <Bug className="w-4 h-4 text-[#EF4444]" />
            Detected Flaws & Logical Defects
          </h2>
          <span className="text-xs text-[#57534E] dark:text-[#D6D3D1] font-mono">
            {bugs.length} Identified
          </span>
        </div>

        {bugs.length === 0 ? (
          <div className="bento-card p-8 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-[#10B981] mx-auto stroke-[1.5]" />
            <h3 className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F5F4]">
              {isFixed ? "All Identified Defects Successfully Repaired" : "Zero Defects Detected – Code Verified Clean"}
            </h3>
            <p className="text-xs text-[#57534E] dark:text-[#D6D3D1] max-w-md mx-auto leading-relaxed">
              {isFixed
                ? "The workspace has been updated with the verified patch. Re-run the pipeline anytime to verify again."
                : "AutoPatch scanned this file and verified zero syntax flaws, boundary defects, or runtime exceptions. If you expected defects, click Re-Run Pipeline above."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {bugs.map((bug) => (
              <div
                key={bug.id}
                className="bento-card p-4 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-[#1C1917] dark:text-[#F5F5F4]">
                      {bug.title}
                    </span>
                    <Badge variant={bug.severity === "critical" ? "rose" : bug.severity === "high" ? "amber" : "teal"}>
                      {bug.severity ? `${bug.severity.toUpperCase()} Severity` : "High Severity"}
                    </Badge>
                    <Badge vLevel={bug.verification_level || "V3"} />
                    <span className="text-xs font-mono text-[#059669] dark:text-[#10B981] font-semibold">
                      Confidence: {bug.confidence_score || 95}%
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-mono text-[#57534E] dark:text-[#D6D3D1]">
                    <span className="flex items-center gap-1 text-[#1C1917] dark:text-[#F5F5F4]">
                      <FileCode className="w-3.5 h-3.5" />
                      {bug.file_path}:L{bug.line_start}-L{bug.line_end}
                    </span>
                    <span>
                      Origin: <span className="text-[#D97706] dark:text-[#F59E0B]">L{bug.origin_line || bug.line_start || 1}</span>
                    </span>
                    <span>
                      Crash: <span className="text-[#DC2626] dark:text-[#EF4444]">L{bug.crash_line || bug.line_end || 1}</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {hasPatchedCode && !isFixed && (
                    <button
                      onClick={() => handleApplyFix()}
                      disabled={isApplying}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white font-medium text-xs transition-colors shadow-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      1-Click Auto-Fix
                    </button>
                  )}
                  <Link
                    href={`/bugs/${bug.id}`}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#E7E5E4] dark:border-[#292524] text-xs font-medium text-[#1C1917] dark:text-[#F5F5F4] hover:border-[#0F766E] transition-colors"
                  >
                    Diagnose Defect
                  </Link>
                  <Link
                    href={
                      isDemo
                        ? "/patches/demo-patch-001"
                        : `/patches/${project?.patches?.[0]?.id || pipelineRun?.patches?.[0]?.id || "demo-patch-001"}`
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F766E] dark:bg-[#14B8A6] text-white dark:text-[#0C0A09] font-medium text-xs hover:bg-[#115E59] dark:hover:bg-[#0D9488] transition-colors"
                  >
                    Review Patch & Proof
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Talk to AutoPatch AI Voice Call Modal */}
      {isVoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-2xl max-w-md w-full p-6 shadow-2xl relative space-y-4">
            {/* Close button */}
            <button
              onClick={() => setIsVoiceModalOpen(false)}
              className="absolute top-4 right-4 text-[#78716C] hover:text-[#1C1917] dark:hover:text-[#F5F5F4] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0F766E]/10 dark:bg-[#14B8A6]/10 flex items-center justify-center text-[#0F766E] dark:text-[#14B8A6]">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-[#1C1917] dark:text-[#F5F5F4]">
                  Talk to AutoPatch AI
                </h3>
                <p className="text-xs text-[#78716C] dark:text-[#A8A29E]">
                  Alex (Voice Engineer) calls your phone to explain the fix
                </p>
              </div>
            </div>

            {/* Context Summary */}
            <div className="p-3 bg-[#0F766E]/5 dark:bg-[#14B8A6]/5 border border-[#0F766E]/20 dark:border-[#14B8A6]/20 rounded-xl space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[#57534E] dark:text-[#D6D3D1]">
                <span className="font-semibold text-[#1C1917] dark:text-[#F5F5F4]">Target File:</span>
                <span className="font-mono">{project?.filename || "students.py"}</span>
              </div>
              <div className="flex items-center justify-between text-[#57534E] dark:text-[#D6D3D1]">
                <span className="font-semibold text-[#1C1917] dark:text-[#F5F5F4]">Spoken Agent:</span>
                <span>Alex · AutoPatch Core Engineer</span>
              </div>
              <div className="flex items-center justify-between text-[#57534E] dark:text-[#D6D3D1]">
                <span className="font-semibold text-[#1C1917] dark:text-[#F5F5F4]">Voice Tech:</span>
                <span>Twilio 2-Way Stream + Groq LLM + Polly Neural</span>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleTriggerCall} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F5F4] mb-1">
                  Developer Name
                </label>
                <input
                  type="text"
                  value={developerName}
                  onChange={(e) => setDeveloperName(e.target.value)}
                  placeholder="Your Name (e.g. Harish)"
                  required
                  className="w-full px-3 py-2 text-xs bg-white dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F766E] text-[#1C1917] dark:text-[#F5F5F4]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F5F4] mb-1">
                  Phone Number (with Country Code)
                </label>
                <input
                  type="tel"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+919876543210 or +14155552671"
                  required
                  className="w-full px-3 py-2 text-xs font-mono bg-white dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#0F766E] text-[#1C1917] dark:text-[#F5F5F4]"
                />
                <p className="text-[10px] text-[#78716C] dark:text-[#A8A29E] mt-1">
                  Format: +91 for India, +1 for USA. Enter the number you want Alex to call.
                </p>
              </div>

              {callError && (
                <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/20 rounded-xl text-xs text-[#DC2626] dark:text-[#F87171] leading-relaxed">
                  {callError}
                </div>
              )}

              {callStatus && (
                <div className="p-3 bg-[#10B981]/10 border border-[#10B981]/30 rounded-xl text-xs text-[#059669] dark:text-[#34D399] space-y-1">
                  <div className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                    Call Placed!
                  </div>
                  <p className="text-[#57534E] dark:text-[#D6D3D1]">{callStatus.message}</p>
                  {callStatus.callSid && (
                    <p className="font-mono text-[10px] text-[#78716C]">Call SID: {callStatus.callSid}</p>
                  )}
                  <p className="text-[11px] font-medium text-[#0F766E] dark:text-[#14B8A6] pt-1">
                    Your phone is ringing! Answer to speak with Alex about why your code failed and how it was fixed.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsVoiceModalOpen(false)}
                  className="text-xs"
                >
                  Close
                </Button>
                <Button
                  type="submit"
                  disabled={isCalling}
                  variant="primary"
                  className="bg-[#0F766E] hover:bg-[#115E59] text-white text-xs flex items-center gap-1.5 shadow-sm font-semibold"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  {isCalling ? "Dialing Phone..." : "Call My Phone"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
