"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Code2,
  Database,
  FileTerminal,
  UploadCloud,
  FileCode,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  ShieldCheck,
  X,
  FileText
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { createProject, uploadArchive } from "@/lib/api";

type TabMode = "code" | "dataset" | "paste";

const EXTENSION_MAP: Record<string, string> = {
  py: "python",
  js: "javascript",
  jsx: "javascript",
  ts: "typescript",
  tsx: "typescript",
  go: "go",
  rs: "rust",
  java: "java",
  c: "c",
  cpp: "cpp",
  rb: "ruby",
  php: "php",
  cs: "csharp",
  sql: "sql",
  json: "json",
  csv: "dataset",
  tsv: "dataset",
  yml: "yaml",
  yaml: "yaml"
};

function NewProjectForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const initialTab = (searchParams.get("tab") as TabMode) || "code";
  const [activeTab, setActiveTab] = useState<TabMode>(initialTab);

  // Form State
  const [projectName, setProjectName] = useState("");
  const [language, setLanguage] = useState("python");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [errorTrace, setErrorTrace] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  useEffect(() => {
    const tabFromUrl = searchParams.get("tab") as TabMode;
    if (tabFromUrl && ["code", "dataset", "paste"].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const switchTab = (tab: TabMode) => {
    setActiveTab(tab);
    setError(null);
    router.replace(`/projects/new?tab=${tab}`);
  };

  const handleFileChange = (file: File) => {
    setError(null);
    setSelectedFile(file);

    const ext = file.name.split(".").pop()?.toLowerCase() || "";
    const isZip = ext === "zip";
    let detectedLang = isZip ? "archive" : (EXTENSION_MAP[ext] || "plaintext");
    const lowerName = file.name.toLowerCase();
    if (detectedLang === "plaintext") {
      if (lowerName.includes("python") || lowerName.endsWith(".py")) detectedLang = "python";
      else if (lowerName.includes("javascript") || lowerName.includes("node") || lowerName.endsWith(".js")) detectedLang = "javascript";
    }
    setLanguage(detectedLang);

    if (!projectName) {
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      setProjectName(baseName.charAt(0).toUpperCase() + baseName.slice(1));
    }

    if (isZip) {
      setFileContent(`[Binary ZIP Archive: ${file.name} - ${Math.round(file.size / 1024)} KB]`);
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const content = (e.target?.result as string) || "";
      setFileContent(content);
      const lower = content.toLowerCase();
      if (detectedLang === "plaintext") {
        if (lower.includes("print(") || lower.includes("def ") || lower.includes("import ") || lower.includes("class ")) {
          setLanguage("python");
        } else if (lower.includes("console.log") || lower.includes("const ") || lower.includes("function ")) {
          setLanguage("javascript");
        }
      }
    };
    reader.onerror = () => {
      setError("Failed to read file content. Please try another file.");
    };
    reader.readAsText(file);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!projectName.trim()) {
      setError("Please specify a project or workspace name.");
      return;
    }

    if (activeTab === "code" || activeTab === "dataset") {
      if (!selectedFile && !fileContent) {
        setError("Please choose a file to upload or enter code.");
        return;
      }
    } else if (activeTab === "paste") {
      if (!fileContent.trim()) {
        setError("Please paste the code snippet you wish to analyze.");
        return;
      }
    }

    setLoading(true);

    try {
      let created: any;
      if (selectedFile && selectedFile.name.toLowerCase().endsWith(".zip")) {
        created = await uploadArchive(projectName, selectedFile);
      } else {
        const sourceType = activeTab === "paste" ? "paste" : activeTab === "dataset" ? "dataset" : "upload";
        let finalLang = language;
        const lowerContent = fileContent.toLowerCase();
        const lowerName = (selectedFile?.name || "").toLowerCase();
        if (finalLang === "plaintext" || !finalLang || finalLang === "text") {
          if (
            lowerName.includes("python") ||
            lowerName.endsWith(".py") ||
            lowerContent.includes("print(") ||
            lowerContent.includes("def ") ||
            lowerContent.includes("import ") ||
            lowerContent.includes("class ")
          ) {
            finalLang = "python";
          } else if (
            lowerName.includes("node") ||
            lowerName.includes("javascript") ||
            lowerName.endsWith(".js") ||
            lowerContent.includes("console.log") ||
            lowerContent.includes("const ") ||
            lowerContent.includes("let ")
          ) {
            finalLang = "javascript";
          }
        }

        const filename = selectedFile?.name || (activeTab === "paste" ? `snippet.${finalLang === "python" ? "py" : finalLang === "javascript" ? "js" : "txt"}` : "data.csv");

        created = await createProject({
          name: projectName,
          source_type: sourceType,
          language: finalLang,
          filename,
          content: fileContent,
          error_trace: errorTrace
        });
      }

      router.push(`/projects/${created.id}`);
    } catch (err: any) {
      setError(err?.message || "Failed to create project. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Breadcrumb & Title */}
      <div className="flex items-center justify-between border-b border-[#E7E5E4] dark:border-[#292524] pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#57534E] dark:text-[#D6D3D1] mb-1">
            <Link href="/projects" className="hover:underline">
              Projects
            </Link>
            <span>/</span>
            <span className="text-[#0F766E] dark:text-[#14B8A6]">New Ingestion Workspace</span>
          </div>
          <h1 className="text-xl font-bold tracking-tight text-[#1C1917] dark:text-[#F5F5F4]">
            Universal Code & Dataset Ingestion
          </h1>
          <p className="text-xs text-[#57534E] dark:text-[#D6D3D1] mt-0.5">
            AutoPatch accepts any programming language, script, configuration file, or dataset format without vendor lock-in.
          </p>
        </div>
      </div>

      {/* Active Pipeline Verification Notice */}
      <div className="p-3 bg-[#0F766E]/5 dark:bg-[#14B8A6]/5 border border-[#0F766E]/20 dark:border-[#14B8A6]/20 rounded-xl flex items-start gap-2.5 text-xs text-[#57534E] dark:text-[#D6D3D1]">
        <ShieldCheck className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6] flex-shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong className="text-[#1C1917] dark:text-[#F5F5F4]">Autonomous Pipeline Active: </strong>
          Uploaded files and snippets are immediately audited by the autonomous AST parser, multi-linter scanner, and sandboxed test runner to reproduce and synthesize verified repairs in real time.
        </div>
      </div>

      {/* Tab Navigation Pill Bar */}
      <div className="flex items-center gap-2 p-1 bg-[#F5F5F4] dark:bg-[#1C1917] rounded-xl border border-[#E7E5E4] dark:border-[#292524] max-w-fit">
        <button
          type="button"
          onClick={() => switchTab("code")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "code"
              ? "bg-white dark:bg-[#292524] text-[#0F766E] dark:text-[#14B8A6] shadow-sm"
              : "text-[#57534E] dark:text-[#D6D3D1] hover:text-[#1C1917] dark:hover:text-[#F5F5F4]"
          }`}
        >
          <Code2 className="w-4 h-4 stroke-[1.5]" />
          <span>Upload Code</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab("dataset")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "dataset"
              ? "bg-white dark:bg-[#292524] text-[#0F766E] dark:text-[#14B8A6] shadow-sm"
              : "text-[#57534E] dark:text-[#D6D3D1] hover:text-[#1C1917] dark:hover:text-[#F5F5F4]"
          }`}
        >
          <Database className="w-4 h-4 stroke-[1.5]" />
          <span>Upload Dataset</span>
        </button>

        <button
          type="button"
          onClick={() => switchTab("paste")}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            activeTab === "paste"
              ? "bg-white dark:bg-[#292524] text-[#0F766E] dark:text-[#14B8A6] shadow-sm"
              : "text-[#57534E] dark:text-[#D6D3D1] hover:text-[#1C1917] dark:hover:text-[#F5F5F4]"
          }`}
        >
          <FileTerminal className="w-4 h-4 stroke-[1.5]" />
          <span>Paste Error / Code</span>
        </button>
      </div>

      {error && (
        <div className="p-3 bg-[#EF4444]/10 border border-[#EF4444]/30 rounded-lg text-xs text-[#DC2626] dark:text-[#F87171] flex items-center justify-between">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload / Ingestion Form */}
      <form onSubmit={handleSubmit} className="bento-card p-6 space-y-6">
        {/* Project Name & Language Metadata */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="project-name" className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F5F4] mb-1">
              Project / Workspace Name <span className="text-[#DC2626]">*</span>
            </label>
            <input
              id="project-name"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g., Python Grade Calculator"
              required
              className="w-full px-3 py-2 text-xs rounded-lg bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] text-[#1C1917] dark:text-[#F5F5F4] focus:outline-none focus:ring-1 focus:ring-[#0F766E] dark:focus:ring-[#14B8A6]"
            />
          </div>

          <div>
            <label htmlFor="project-lang" className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F5F4] mb-1">
              Target Language / Ecosystem
            </label>
            <select
              id="project-lang"
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] text-[#1C1917] dark:text-[#F5F5F4] focus:outline-none focus:ring-1 focus:ring-[#0F766E] dark:focus:ring-[#14B8A6]"
            >
              <option value="python">Python (.py)</option>
              <option value="javascript">JavaScript (.js, .jsx)</option>
              <option value="typescript">TypeScript (.ts, .tsx)</option>
              <option value="go">Go (.go)</option>
              <option value="rust">Rust (.rs)</option>
              <option value="java">Java (.java)</option>
              <option value="c">C / C++ (.c, .cpp)</option>
              <option value="dataset">Tabular Dataset (.csv, .tsv)</option>
              <option value="sql">SQL Query / Schema (.sql)</option>
              <option value="json">JSON Structured Data (.json)</option>
              <option value="polyglot">Other / Polyglot</option>
            </select>
          </div>
        </div>

        {/* Tab 1: Upload Code */}
        {activeTab === "code" && (
          <div className="space-y-4">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragActive
                  ? "border-[#0F766E] dark:border-[#14B8A6] bg-[#0F766E]/5"
                  : selectedFile
                  ? "border-[#10B981] bg-[#10B981]/5"
                  : "border-[#E7E5E4] dark:border-[#292524] hover:border-[#0F766E] dark:hover:border-[#14B8A6] bg-[#FAF9F6]/50 dark:bg-[#1C1917]/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".py,.js,.jsx,.ts,.tsx,.go,.rs,.java,.c,.cpp,.rb,.php,.cs,.sh,.yml,.yaml,.json,.txt"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />

              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#0F766E]/10 text-[#0F766E] dark:text-[#14B8A6] flex items-center justify-center">
                  <UploadCloud className="w-5 h-5 stroke-[1.5]" />
                </div>
                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[#1C1917] dark:text-[#F5F5F4] flex items-center justify-center gap-1.5">
                      <FileCode className="w-4 h-4 text-[#10B981]" />
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-[#57534E] dark:text-[#D6D3D1] font-mono">
                      {(selectedFile.size / 1024).toFixed(1)} KB · Ready to ingest
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[#1C1917] dark:text-[#F5F5F4]">
                      Click to choose source code or drag and drop
                    </p>
                    <p className="text-[11px] text-[#57534E] dark:text-[#D6D3D1]">
                      Supports Python, JavaScript, TypeScript, Go, Rust, Java, C/C++, and any source file
                    </p>
                  </div>
                )}
              </div>
            </div>

            {fileContent && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-[#57534E] dark:text-[#D6D3D1]">
                  <span className="font-mono">File Preview ({fileContent.split("\n").length} lines)</span>
                  <span className="text-[11px] text-[#10B981] flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Read successfully
                  </span>
                </div>
                <pre className="p-3 bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] rounded-lg text-[11px] font-mono max-h-48 overflow-y-auto leading-relaxed text-[#1C1917] dark:text-[#F5F5F4]">
                  {fileContent.slice(0, 1000)}
                  {fileContent.length > 1000 ? "\n... (truncated for preview)" : ""}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: Upload Dataset */}
        {activeTab === "dataset" && (
          <div className="space-y-4">
            <div
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
                dragActive
                  ? "border-[#0F766E] dark:border-[#14B8A6] bg-[#0F766E]/5"
                  : selectedFile
                  ? "border-[#10B981] bg-[#10B981]/5"
                  : "border-[#E7E5E4] dark:border-[#292524] hover:border-[#0F766E] dark:hover:border-[#14B8A6] bg-[#FAF9F6]/50 dark:bg-[#1C1917]/50"
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".csv,.tsv,.json,.sql,.parquet,.txt"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    handleFileChange(e.target.files[0]);
                  }
                }}
              />

              <div className="flex flex-col items-center justify-center space-y-2">
                <div className="w-10 h-10 rounded-full bg-[#0F766E]/10 text-[#0F766E] dark:text-[#14B8A6] flex items-center justify-center">
                  <Database className="w-5 h-5 stroke-[1.5]" />
                </div>
                {selectedFile ? (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[#1C1917] dark:text-[#F5F5F4] flex items-center justify-center gap-1.5">
                      <FileText className="w-4 h-4 text-[#10B981]" />
                      {selectedFile.name}
                    </p>
                    <p className="text-[11px] text-[#57534E] dark:text-[#D6D3D1] font-mono">
                      {(selectedFile.size / 1024).toFixed(1)} KB · Dataset loaded
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-xs font-semibold text-[#1C1917] dark:text-[#F5F5F4]">
                      Select CSV, JSON, SQL or tabular dataset
                    </p>
                    <p className="text-[11px] text-[#57534E] dark:text-[#D6D3D1]">
                      AutoPatch sniffs delimiters, schema anomalies, and corrupt records
                    </p>
                  </div>
                )}
              </div>
            </div>

            {fileContent && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-[#57534E] dark:text-[#D6D3D1]">
                  <span className="font-mono">Dataset Sample Preview ({fileContent.split("\n").length} records)</span>
                </div>
                <pre className="p-3 bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] rounded-lg text-[11px] font-mono max-h-48 overflow-y-auto leading-relaxed text-[#1C1917] dark:text-[#F5F5F4]">
                  {fileContent.slice(0, 1000)}
                </pre>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Paste Error / Code */}
        {activeTab === "paste" && (
          <div className="space-y-4">
            <div>
              <label htmlFor="pasted-code" className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F5F4] mb-1">
                Source Code Snippet <span className="text-[#DC2626]">*</span>
              </label>
              <textarea
                id="pasted-code"
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                rows={7}
                placeholder="Paste the function or script containing the suspected defect..."
                required
                className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] text-[#1C1917] dark:text-[#F5F5F4] focus:outline-none focus:ring-1 focus:ring-[#0F766E] dark:focus:ring-[#14B8A6]"
              />
            </div>

            <div>
              <label htmlFor="error-trace" className="block text-xs font-medium text-[#1C1917] dark:text-[#F5F5F4] mb-1">
                Runtime Error / Stack Trace (Optional)
              </label>
              <textarea
                id="error-trace"
                value={errorTrace}
                onChange={(e) => setErrorTrace(e.target.value)}
                rows={4}
                placeholder="Paste the traceback, compiler error, or test failure output..."
                className="w-full px-3 py-2 text-xs font-mono rounded-lg bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] text-[#1C1917] dark:text-[#F5F5F4] focus:outline-none focus:ring-1 focus:ring-[#0F766E] dark:focus:ring-[#14B8A6]"
              />
            </div>
          </div>
        )}

        {/* Action Row */}
        <div className="flex items-center justify-between pt-4 border-t border-[#E7E5E4] dark:border-[#292524]">
          <Link href="/projects" className="text-xs text-[#57534E] dark:text-[#D6D3D1] hover:underline">
            Cancel and Return
          </Link>

          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? (
              <span>Ingesting into Pipeline...</span>
            ) : (
              <>
                <span>Ingest into Verification Pipeline</span>
                <ArrowRight className="w-3.5 h-3.5 ml-1.5 stroke-[1.5]" />
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}

export default function NewProjectPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[50vh] flex items-center justify-center text-xs font-mono text-[#57534E] dark:text-[#D6D3D1]">
          Loading ingestion workspace...
        </div>
      }
    >
      <NewProjectForm />
    </Suspense>
  );
}
