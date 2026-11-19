"use client";

import React from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  ArrowRight, 
  CheckCircle2, 
  Terminal, 
  FileCode, 
  Layers, 
  Cpu, 
  GitBranch, 
  AlertTriangle 
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export default function LandingPage() {
  return (
    <div className="space-y-16 pb-12">
      {/* Top Navigation Bar inside Landing Page */}
      <header className="flex items-center justify-between pb-4 border-b border-[#E7E5E4] dark:border-[#292524]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-[#0F766E] dark:bg-[#14B8A6] flex items-center justify-center text-white dark:text-[#0C0A09]">
            <ShieldCheck className="w-5 h-5 stroke-[1.5]" />
          </div>
          <div>
            <span className="font-semibold text-base tracking-tight text-[#1C1917] dark:text-[#F5F5F4]">
              AutoPatch
            </span>
            <span className="hidden sm:inline-block ml-2 text-xs font-mono px-2 py-0.5 rounded bg-[#FAF9F6] dark:bg-[#1C1917] text-[#78716C] dark:text-[#A8A29E] border border-[#E7E5E4] dark:border-[#292524]">
              Build for Trust
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />
          <Link href="/login" className="text-xs font-medium text-[#78716C] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F5F5F4] px-3 py-1.5 transition-colors">
            Sign In
          </Link>
          <Link href="/dashboard">
            <Button variant="primary" size="sm">
              Enter Demo Mode
              <ArrowRight className="w-3.5 h-3.5 ml-1.5 stroke-[1.5]" />
            </Button>
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="text-center max-w-3xl mx-auto space-y-6 pt-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-[#0F766E]/10 dark:bg-[#14B8A6]/10 text-[#0F766E] dark:text-[#14B8A6] border border-[#0F766E]/20">
          <span className="w-2 h-2 rounded-full bg-current" />
          Autonomous Software Bug Detection & Repair System
        </div>

        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#1C1917] dark:text-[#F5F5F4] leading-[1.15]">
          Every Bug Explained. Every Change Shown. <br className="hidden sm:inline" />
          <span className="text-[#0F766E] dark:text-[#14B8A6]">Backed by Concrete Test Evidence.</span>
        </h1>

        <p className="text-sm sm:text-base text-[#78716C] dark:text-[#A8A29E] leading-relaxed max-w-2xl mx-auto">
          AutoPatch doesn&apos;t just suggest code guesses. It reproduces defects with automated tests, isolates root causes from origin to crash lines, synthesizes minimal patches, and proves them in isolated sandboxes before you approve.
        </p>

        <div className="flex items-center justify-center gap-3 pt-2">
          <Link href="/dashboard">
            <Button variant="primary" size="lg">
              Explore Demo Workspace
              <ArrowRight className="w-4 h-4 ml-2 stroke-[1.5]" />
            </Button>
          </Link>
          <Link href="/login">
            <Button variant="secondary" size="lg">
              Developer Sign In
            </Button>
          </Link>
        </div>

        <div className="flex items-center justify-center gap-6 pt-4 text-xs font-mono text-[#78716C] dark:text-[#A8A29E]">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#10B981] stroke-[1.5]" /> Zero Cloud Keys Required
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#10B981] stroke-[1.5]" /> Sandboxed Zero-Network Execution
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-[#10B981] stroke-[1.5]" /> Verification Ladder (V0–V4)
          </span>
        </div>
      </section>

      {/* 5-Step Workflow Section */}
      <section className="space-y-6">
        <div className="border-b border-[#E7E5E4] dark:border-[#292524] pb-3">
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#78716C] dark:text-[#A8A29E]">
            Autonomous 5-Stage Verification Pipeline
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
          {[
            {
              step: "01",
              title: "UPLOAD",
              subtitle: "Universal Ingestion",
              desc: "Ingests single files, folders, zip archives, Git URLs, or datasets. Sniffs language, manifests, and tree-sitter ASTs."
            },
            {
              step: "02",
              title: "SCAN",
              subtitle: "Flaw Localization",
              desc: "Constructs call graphs and runs static linters (Semgrep, Bandit) alongside LLM review to discover logical vulnerabilities."
            },
            {
              step: "03",
              title: "EXPLAIN",
              subtitle: "Root-Cause Tracing",
              desc: "Distinguishes bad state creation (Origin Line) from runtime exception (Crash Line) with three audience explanation tiers."
            },
            {
              step: "04",
              title: "FIX",
              subtitle: "Minimal Patching",
              desc: "Synthesizes 3-5 minimal candidate diffs without modifying unrelated code. Independent Critic agent screens for side effects."
            },
            {
              step: "05",
              title: "TEST",
              subtitle: "Sandboxed Proof",
              desc: "Executes regression and differential tests inside a zero-network sandbox, issuing an honest Verification Ladder badge."
            }
          ].map((item, idx) => (
            <div
              key={item.step}
              className="p-4 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-lg space-y-2 relative"
            >
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-[#0F766E] dark:text-[#14B8A6] font-bold">{item.step}</span>
                <span className="text-[#A8A29E]">{item.title}</span>
              </div>
              <h3 className="text-xs font-semibold text-[#1C1917] dark:text-[#F5F5F4]">
                {item.subtitle}
              </h3>
              <p className="text-[11px] text-[#78716C] dark:text-[#A8A29E] leading-relaxed">
                {item.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Code to Proof Preview: Python Marks Calculator */}
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E7E5E4] dark:border-[#292524] pb-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-[#78716C] dark:text-[#A8A29E]">
              Real Defect-to-Proof Preview
            </h2>
            <p className="text-xs text-[#1C1917] dark:text-[#F5F5F4] font-medium mt-0.5">
              Python Marks Calculator (<code className="font-mono">calculator.py</code>) · Missing Precondition Validation
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge vLevel="V4" />
            <Badge variant="teal">Confidence: 100%</Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 font-mono text-xs">
          {/* Defect Inspection */}
          <div className="p-4 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-lg space-y-3">
            <div className="flex items-center justify-between border-b border-[#E7E5E4] dark:border-[#292524] pb-2 text-[11px]">
              <span className="font-bold text-[#DC2626] dark:text-[#EF4444] flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 stroke-[1.5]" />
                1. Detected Flaw
              </span>
              <span className="text-[#A8A29E]">L5 → L12</span>
            </div>
            <pre className="text-[11px] text-[#1C1917] dark:text-[#F5F5F4] overflow-x-auto leading-relaxed bg-[#FAF9F6] dark:bg-[#1C1917] p-2.5 rounded border border-[#E7E5E4] dark:border-[#292524]">
{`def get_input(raw):
    return float(raw) # L5: Origin

def calculate_percentage(marks, total=100.0):
    # L12: Unchecked arithmetic
    return (marks / total) * 100.0`}
            </pre>
            <p className="text-[11px] text-[#78716C] dark:text-[#A8A29E] font-sans leading-relaxed">
              Accepts negative marks (<code className="text-[#F59E0B]">-5.0</code>) and overflow scores (<code className="text-[#F59E0B]">105.0</code>), producing invalid percentages without assertion guards.
            </p>
          </div>

          {/* Minimal Patch */}
          <div className="p-4 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-lg space-y-3">
            <div className="flex items-center justify-between border-b border-[#E7E5E4] dark:border-[#292524] pb-2 text-[11px]">
              <span className="font-bold text-[#059669] dark:text-[#10B981] flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 stroke-[1.5]" />
                2. Minimal Synthesized Patch
              </span>
              <span className="text-[#A8A29E]">Candidate #1</span>
            </div>
            <pre className="text-[11px] text-[#059669] dark:text-[#10B981] overflow-x-auto leading-relaxed bg-[#10B981]/[0.03] p-2.5 rounded border border-[#10B981]/20">
{`@@ -5,3 +5,6 @@
 def calculate_percentage(marks, total=100.0):
+    if not (0.0 <= marks <= total):
+        raise ValueError("Invalid score")
     return (marks / total) * 100.0`}
            </pre>
            <p className="text-[11px] text-[#78716C] dark:text-[#A8A29E] font-sans leading-relaxed">
              Non-destructive hunk addition. Guards against corrupted score entries while preserving exact function signature.
            </p>
          </div>

          {/* Proof Bundle */}
          <div className="p-4 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-lg space-y-3">
            <div className="flex items-center justify-between border-b border-[#E7E5E4] dark:border-[#292524] pb-2 text-[11px]">
              <span className="font-bold text-[#10B981] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 stroke-[1.5]" />
                3. Proof-Carrying Evidence
              </span>
              <span className="text-[#10B981]">V4 Proven</span>
            </div>
            <ul className="space-y-2 text-[11px] font-sans">
              <li className="flex items-center gap-2 text-[#059669] dark:text-[#10B981]">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 stroke-[1.5]" />
                <span>Repro test fails before & passes after patch</span>
              </li>
              <li className="flex items-center gap-2 text-[#059669] dark:text-[#10B981]">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 stroke-[1.5]" />
                <span>14/14 existing test suite cases pass clean</span>
              </li>
              <li className="flex items-center gap-2 text-[#059669] dark:text-[#10B981]">
                <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 stroke-[1.5]" />
                <span>Semgrep & Bandit security scans clean (0 alerts)</span>
              </li>
            </ul>
            <div className="pt-2">
              <Link href="/patches/demo-patch-001" className="block text-center py-1.5 px-3 rounded bg-[#0F766E] dark:bg-[#14B8A6] text-white dark:text-[#0C0A09] font-medium text-xs hover:bg-[#115E59] dark:hover:bg-[#0D9488] transition-colors">
                Open Full Interactive Review
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Verification Ladder Section */}
      <section className="p-6 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-lg space-y-4">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-[#78716C] dark:text-[#A8A29E]">
            The Verification Ladder (V0 – V4)
          </h2>
          <p className="text-xs text-[#1C1917] dark:text-[#F5F5F4] font-medium mt-0.5">
            AutoPatch never inflates confidence. Every patch carries a verification badge capped strictly by test execution.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 font-mono text-xs">
          {[
            { level: "V4", name: "Proven", cap: "100", desc: "Bug reproduced by failing test; patch passes it; full suite clean; static scan clean." },
            { level: "V3", name: "Verified", cap: "85", desc: "Bug reproduced by generated test; passes generated and differential tests." },
            { level: "V2", name: "Executed", cap: "65", desc: "Code builds & runs; smoke/golden I/O tests pass; bug not directly reproduced." },
            { level: "V1", name: "Static", cap: "45", desc: "Parses/compiles; linters & type-checks pass; cross-model review consensus." },
            { level: "V0", name: "Unverified", cap: "30", desc: "Theoretical analysis and suggestion only without sandbox test execution." }
          ].map((v) => (
            <div key={v.level} className="p-3 bg-[#FAF9F6] dark:bg-[#1C1917] rounded border border-[#E7E5E4] dark:border-[#292524] space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#1C1917] dark:text-[#F5F5F4]">{v.level} {v.name}</span>
                <span className="text-[10px] text-[#A8A29E]">Cap {v.cap}</span>
              </div>
              <p className="text-[10px] text-[#78716C] dark:text-[#A8A29E] font-sans leading-relaxed">
                {v.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-8 border-t border-[#E7E5E4] dark:border-[#292524] flex flex-col sm:flex-row items-center justify-between text-xs text-[#78716C] dark:text-[#A8A29E] gap-4">
        <div>
          AutoPatch Autonomous Repair Engine · Apache-2.0 License
        </div>
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="hover:text-[#1C1917] dark:hover:text-[#F5F5F4]">
            Dashboard
          </Link>
          <Link href="/settings" className="hover:text-[#1C1917] dark:hover:text-[#F5F5F4]">
            Settings & Quotas
          </Link>
          <Link href="/login" className="hover:text-[#1C1917] dark:hover:text-[#F5F5F4]">
            Sign In
          </Link>
        </div>
      </footer>
    </div>
  );
}
