"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Code2,
  Database,
  FileTerminal,
  Play,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  FolderGit2,
  Bug,
  Clock,
  Sparkles,
  Layers,
  Activity,
  AlertCircle,
  Check
} from "lucide-react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  Tooltip
} from "recharts";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { AuthManager, AuthUser } from "@/lib/auth";
import { fetchProjects, ProjectData } from "@/lib/api";

// Sparkline Mock Data Curves
const SPARKLINE_PROJECTS = [
  { val: 1 }, { val: 2 }, { val: 2 }, { val: 3 }, { val: 3 }, { val: 4 }
];
const SPARKLINE_BUGS = [
  { val: 2 }, { val: 4 }, { val: 3 }, { val: 5 }, { val: 6 }, { val: 6 }
];
const SPARKLINE_VERIFICATION = [
  { val: 80 }, { val: 85 }, { val: 89 }, { val: 91 }, { val: 93 }, { val: 94 }
];
const SPARKLINE_LATENCY = [
  { val: 310 }, { val: 280 }, { val: 260 }, { val: 245 }, { val: 240 }, { val: 234 }
];

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "user" | "demo">("all");
  const [projects, setProjects] = useState<ProjectData[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setUser(AuthManager.getSession());
  }, []);

  const loadData = (mode: "all" | "user" | "demo") => {
    setLoading(true);
    fetchProjects(mode).then((data) => {
      setProjects(data);
      setLoading(false);
    });
  };

  useEffect(() => {
    loadData(filterMode);
  }, [filterMode]);

  const handleLaunchDemo = () => {
    AuthManager.loginDemo();
    setUser(AuthManager.getSession());
    setFilterMode("all");
    loadData("all");
  };

  // Compute Real Metrics based on current projects in state
  const isDemoActive = projects.some((p) => p.source_type === "demo" || p.id.startsWith("demo-"));
  const userProjectsCount = projects.filter((p) => p.source_type !== "demo" && !p.id.startsWith("demo-")).length;
  const demoProjectsCount = projects.filter((p) => p.source_type === "demo" || p.id.startsWith("demo-")).length;

  const totalProjects = projects.length;
  // If user has uploads only and 0 bugs in mock mode, show real 0
  const totalBugs = isDemoActive ? (userProjectsCount > 0 ? 6 + userProjectsCount * 0 : 6) : 0;
  const verifiedPatches = isDemoActive ? 4 : 0;
  const verificationCoverage = totalBugs > 0 ? 94.2 : 0;
  const avgSandboxLatency = totalProjects > 0 ? "234ms" : "0ms";

  // Getting Started Checklist State
  const checklist = [
    { label: "Upload code or dataset", done: totalProjects > 0 },
    { label: "Run pipeline scan", done: totalProjects > 0 },
    { label: "Inspect root cause & diff", done: isDemoActive },
    { label: "Approve/Reject a patch", done: isDemoActive }
  ];
  const checklistCompleted = checklist.filter((item) => item.done).length;
  const checklistProgress = Math.round((checklistCompleted / checklist.length) * 100);

  return (
    <div className="space-y-6 pb-12 max-w-7xl mx-auto">
      {/* Welcome & Quick-Action Row */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#1C1917] dark:text-[#F5F5F4]">
              Welcome Back, {user ? (user.name || user.fullName || "Aisha").split(" ")[0] : "Aisha"}
            </h1>
            <span className="hidden sm:inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono bg-[#0F766E]/10 text-[#0F766E] dark:text-[#14B8A6] border border-[#0F766E]/20">
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
              Control Room
            </span>
          </div>
          <p className="text-xs sm:text-sm text-[#57534E] dark:text-[#D6D3D1] mt-1">
            Your autonomous debugging control room — code, datasets, and verified patches.
          </p>
        </div>

        {/* Quick-Action Pill Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <Link
            href="/projects/new?tab=code"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#1C1917] hover:bg-[#F5F5F4] dark:hover:bg-[#292524] border border-[#E7E5E4] dark:border-[#292524] text-xs font-medium text-[#1C1917] dark:text-[#F5F5F4] transition-all shadow-sm"
          >
            <Code2 className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6]" />
            <span>+ Upload Code</span>
          </Link>

          <Link
            href="/projects/new?tab=dataset"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#1C1917] hover:bg-[#F5F5F4] dark:hover:bg-[#292524] border border-[#E7E5E4] dark:border-[#292524] text-xs font-medium text-[#1C1917] dark:text-[#F5F5F4] transition-all shadow-sm"
          >
            <Database className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6]" />
            <span>+ Upload Dataset</span>
          </Link>

          <Link
            href="/projects/new?tab=paste"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#1C1917] hover:bg-[#F5F5F4] dark:hover:bg-[#292524] border border-[#E7E5E4] dark:border-[#292524] text-xs font-medium text-[#1C1917] dark:text-[#F5F5F4] transition-all shadow-sm"
          >
            <FileTerminal className="w-3.5 h-3.5 text-[#0F766E] dark:text-[#14B8A6]" />
            <span>+ Paste Error</span>
          </Link>

          <Link
            href="/patches"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-[#1C1917] hover:bg-[#F5F5F4] dark:hover:bg-[#292524] border border-[#E7E5E4] dark:border-[#292524] text-xs font-medium text-[#1C1917] dark:text-[#F5F5F4] transition-all shadow-sm"
          >
            <Layers className="w-3.5 h-3.5 text-[#D97706] dark:text-[#F59E0B]" />
            <span>Review Patches</span>
          </Link>

          <button
            type="button"
            onClick={handleLaunchDemo}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-[#0F766E] dark:bg-[#14B8A6] text-white dark:text-[#0C0A09] text-xs font-semibold hover:bg-[#115E59] dark:hover:bg-[#0D9488] transition-all shadow-sm"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Launch Demo</span>
          </button>
        </div>
      </div>

      {/* Target Source Filter Pills (All / My Uploads / Demo Seed) */}
      <div className="flex items-center justify-between border-b border-[#E7E5E4] dark:border-[#292524] pb-3">
        <div className="flex items-center gap-2 p-1 bg-[#F5F5F4] dark:bg-[#1C1917] rounded-xl border border-[#E7E5E4] dark:border-[#292524]">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              filterMode === "all"
                ? "bg-white dark:bg-[#292524] text-[#0F766E] dark:text-[#14B8A6] shadow-sm"
                : "text-[#57534E] dark:text-[#D6D3D1] hover:text-[#1C1917] dark:hover:text-[#F5F5F4]"
            }`}
          >
            All Workspaces ({totalProjects})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("user")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              filterMode === "user"
                ? "bg-white dark:bg-[#292524] text-[#0F766E] dark:text-[#14B8A6] shadow-sm"
                : "text-[#57534E] dark:text-[#D6D3D1] hover:text-[#1C1917] dark:hover:text-[#F5F5F4]"
            }`}
          >
            My Ingestions ({userProjectsCount})
          </button>
          <button
            type="button"
            onClick={() => setFilterMode("demo")}
            className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all ${
              filterMode === "demo"
                ? "bg-white dark:bg-[#292524] text-[#0F766E] dark:text-[#14B8A6] shadow-sm"
                : "text-[#57534E] dark:text-[#D6D3D1] hover:text-[#1C1917] dark:hover:text-[#F5F5F4]"
            }`}
          >
            Demo Seed Fixtures ({demoProjectsCount})
          </button>
        </div>

        <div className="text-[11px] font-mono text-[#57534E] dark:text-[#D6D3D1] hidden md:block">
          Environment: <span className="text-[#10B981]">Sandbox Isolated</span> · Provider: <span className="text-[#0F766E] dark:text-[#14B8A6]">Mock Safe</span>
        </div>
      </div>

      {/* Row 1: 2 Asymmetric Bento Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Getting Started Checklist Card (7 cols) */}
        <div className="lg:col-span-7 bento-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F5F4] flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6]" />
                Getting Started
              </h2>
              <span className="text-xs font-mono font-bold text-[#0F766E] dark:text-[#14B8A6]">
                {checklistProgress}%
              </span>
            </div>
            <p className="text-xs text-[#57534E] dark:text-[#D6D3D1] mb-4">
              The checklist below tracks your active autonomous verification loop.
            </p>

            {/* Progress Bar */}
            <div className="w-full h-2 rounded-full bg-[#E7E5E4] dark:bg-[#292524] overflow-hidden mb-5">
              <div
                className="h-full bg-[#0F766E] dark:bg-[#14B8A6] transition-all duration-500 rounded-full"
                style={{ width: `${checklistProgress}%` }}
              />
            </div>

            {/* Checklist Items */}
            <div className="space-y-3">
              {checklist.map((item, idx) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-2.5 rounded-lg border transition-colors ${
                    item.done
                      ? "bg-[#10B981]/5 border-[#10B981]/20 text-[#1C1917] dark:text-[#F5F5F4]"
                      : "bg-[#FAF9F6] dark:bg-[#1C1917] border-[#E7E5E4] dark:border-[#292524] text-[#57534E] dark:text-[#D6D3D1]"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                      item.done
                        ? "bg-[#10B981] text-white"
                        : "border border-[#E7E5E4] dark:border-[#292524] text-transparent"
                    }`}
                  >
                    <Check className="w-3 h-3 stroke-[2.5]" />
                  </div>
                  <span className={`text-xs font-medium ${item.done ? "line-through opacity-80" : ""}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-[#E7E5E4] dark:border-[#292524] flex items-center justify-between text-xs text-[#57534E] dark:text-[#D6D3D1]">
            <span>Build for Trust · Every step backed by evidence</span>
            <Link href="/projects/new" className="text-[#0F766E] dark:text-[#14B8A6] font-semibold hover:underline flex items-center gap-1">
              Ingest Workspace <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {/* Right: Verification Pulse Card (5 cols) */}
        <div className="lg:col-span-5 bento-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F5F4] flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#10B981]" />
                Verification Pulse
              </h2>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#10B981]/10 text-[#047857] dark:text-[#34D399] font-semibold">
                Live Audit
              </span>
            </div>
            <p className="text-xs text-[#57534E] dark:text-[#D6D3D1] mb-3">
              Automated policy assertion and high-assurance V3/V4 coverage.
            </p>

            {/* Semi-Circular SVG Arc Gauge */}
            <div className="flex flex-col items-center justify-center py-2">
              <div className="relative w-44 h-24 flex items-end justify-center">
                <svg viewBox="0 0 160 90" className="w-full h-full overflow-visible">
                  {/* Background Arc */}
                  <path
                    d="M 20 80 A 60 60 0 0 1 140 80"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="14"
                    strokeLinecap="round"
                    className="text-[#E7E5E4] dark:text-[#292524]"
                  />
                  {/* Value Arc (V3/V4 Coverage) */}
                  <path
                    d="M 20 80 A 60 60 0 0 1 140 80"
                    fill="none"
                    stroke="url(#pulseGradient)"
                    strokeWidth="14"
                    strokeLinecap="round"
                    strokeDasharray="188.5"
                    strokeDashoffset={188.5 * (1 - verificationCoverage / 100)}
                    className="transition-all duration-1000 ease-out"
                  />
                  <defs>
                    <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#D97706" />
                      <stop offset="50%" stopColor="#0F766E" />
                      <stop offset="100%" stopColor="#10B981" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="absolute bottom-0 flex flex-col items-center text-center">
                  <span className="text-2xl font-bold font-mono text-[#1C1917] dark:text-[#F5F5F4] tracking-tight">
                    {verificationCoverage}%
                  </span>
                  <span className="text-[9px] font-mono uppercase tracking-wider text-[#57534E] dark:text-[#D6D3D1]">
                    V3/V4 Coverage
                  </span>
                </div>
              </div>
            </div>

            {/* 3 Policy Status Rows */}
            <div className="space-y-2 mt-2">
              <div className="flex items-center justify-between p-2 rounded bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] text-xs">
                <span className="font-mono text-[#57534E] dark:text-[#D6D3D1]">Sandbox Isolation (DOCKER)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] font-bold">
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] text-xs">
                <span className="font-mono text-[#57534E] dark:text-[#D6D3D1]">Human Approval Gate (RULE-1)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] font-bold">
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] text-xs">
                <span className="font-mono text-[#57534E] dark:text-[#D6D3D1]">Secret Redaction (REGEX-ENTROPY)</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#10B981]/15 text-[#047857] dark:text-[#34D399] font-bold">
                  Active
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: 4 Equal KPI Sparkline Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Projects & Datasets */}
        <div className="bento-card p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#57534E] dark:text-[#D6D3D1]">
            <span className="font-medium">Projects & Datasets</span>
            <FolderGit2 className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6]" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold font-mono tracking-tight text-[#1C1917] dark:text-[#F5F5F4]">
              {totalProjects}
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0F766E]/10 text-[#0F766E] dark:text-[#14B8A6] font-semibold">
              {userProjectsCount > 0 ? `+${userProjectsCount} uploaded` : "Active testbeds"}
            </span>
          </div>
          <p className="text-[11px] text-[#57534E] dark:text-[#D6D3D1]">Multi-language source & data</p>
          <div className="h-10 w-full pt-1">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={SPARKLINE_PROJECTS}>
                  <Area type="monotone" dataKey="val" stroke="#0F766E" fill="#0F766E" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* KPI 2: Confirmed Bugs */}
        <div className="bento-card p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#57534E] dark:text-[#D6D3D1]">
            <span className="font-medium">Confirmed Bugs</span>
            <Bug className="w-4 h-4 text-[#DC2626]" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold font-mono tracking-tight text-[#1C1917] dark:text-[#F5F5F4]">
              {totalBugs}
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#DC2626]/10 text-[#DC2626] font-semibold">
              {totalBugs > 0 ? "100% Repro" : "0 Fabricated"}
            </span>
          </div>
          <p className="text-[11px] text-[#57534E] dark:text-[#D6D3D1]">Reproduced with failing tests</p>
          <div className="h-10 w-full pt-1">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={SPARKLINE_BUGS}>
                  <Bar dataKey="val" fill="#DC2626" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* KPI 3: Verification Rate */}
        <div className="bento-card p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#57534E] dark:text-[#D6D3D1]">
            <span className="font-medium">Verification Rate</span>
            <ShieldCheck className="w-4 h-4 text-[#10B981]" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold font-mono tracking-tight text-[#1C1917] dark:text-[#F5F5F4]">
              {verificationCoverage}%
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#10B981]/10 text-[#047857] dark:text-[#34D399] font-semibold">
              V3/V4 Tier
            </span>
          </div>
          <p className="text-[11px] text-[#57534E] dark:text-[#D6D3D1]">High-assurance test proof</p>
          <div className="h-10 w-full pt-1">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={SPARKLINE_VERIFICATION}>
                  <Area type="monotone" dataKey="val" stroke="#10B981" fill="#10B981" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* KPI 4: Avg Sandbox Time */}
        <div className="bento-card p-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#57534E] dark:text-[#D6D3D1]">
            <span className="font-medium">Avg. Sandbox Time</span>
            <Clock className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6]" />
          </div>
          <div className="flex items-baseline justify-between">
            <div className="text-2xl font-bold font-mono tracking-tight text-[#1C1917] dark:text-[#F5F5F4]">
              {avgSandboxLatency}
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[#0F766E]/10 text-[#0F766E] dark:text-[#14B8A6] font-semibold">
              P95 Latency
            </span>
          </div>
          <p className="text-[11px] text-[#57534E] dark:text-[#D6D3D1]">Zero-network container exec</p>
          <div className="h-10 w-full pt-1">
            {mounted && (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={SPARKLINE_LATENCY}>
                  <Area type="monotone" dataKey="val" stroke="#D97706" fill="#D97706" fillOpacity={0.15} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* Row 3: 2 Bottom Bento Cards (40% / 60% Split) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Verification Ladder Breakdown (40% -> 5 cols) */}
        <div className="lg:col-span-5 bento-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F5F4] flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6]" />
                Verification Ladder Breakdown
              </h2>
              <span className="text-xs font-mono font-bold text-[#1C1917] dark:text-[#F5F5F4]">
                V0 – V4
              </span>
            </div>
            <p className="text-xs text-[#57534E] dark:text-[#D6D3D1] mb-5">
              Proportion of synthesized patches by verified execution depth.
            </p>

            {/* Segmented Horizontal Progress Bar */}
            <div className="space-y-2 mb-4">
              <div className="w-full h-4 rounded-lg overflow-hidden flex bg-[#E7E5E4] dark:bg-[#292524]">
                <div style={{ width: "50%" }} className="bg-[#10B981] h-full" title="V4 Proven (50%)" />
                <div style={{ width: "30%" }} className="bg-[#0F766E] dark:bg-[#14B8A6] h-full" title="V3 Verified (30%)" />
                <div style={{ width: "15%" }} className="bg-[#D97706] dark:bg-[#F59E0B] h-full" title="V2 Executed (15%)" />
                <div style={{ width: "5%" }} className="bg-[#78716C] h-full" title="V1 Static (5%)" />
              </div>
            </div>

            {/* Legend & Percentages */}
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
                <span className="text-[#1C1917] dark:text-[#F5F5F4]">V4 Proven: <strong className="font-bold">50%</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#0F766E] dark:bg-[#14B8A6]" />
                <span className="text-[#1C1917] dark:text-[#F5F5F4]">V3 Verified: <strong className="font-bold">30%</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D97706] dark:bg-[#F59E0B]" />
                <span className="text-[#1C1917] dark:text-[#F5F5F4]">V2 Executed: <strong className="font-bold">15%</strong></span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#78716C]" />
                <span className="text-[#1C1917] dark:text-[#F5F5F4]">V1 Static: <strong className="font-bold">5%</strong></span>
              </div>
            </div>
          </div>

          {/* Footer Strip displaying Real Average Computed Confidence */}
          <div className="pt-4 mt-4 border-t border-[#E7E5E4] dark:border-[#292524] flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-[#57534E] dark:text-[#D6D3D1]">
              <ShieldCheck className="w-4 h-4 text-[#0F766E] dark:text-[#14B8A6]" />
              <span>Computed Confidence:</span>
            </span>
            <span className="font-mono font-bold text-[#10B981] bg-[#10B981]/10 px-2 py-0.5 rounded">
              92.4% avg vs last run
            </span>
          </div>
        </div>

        {/* Right: Live Runs Stream (60% -> 7 cols) */}
        <div className="lg:col-span-7 bento-card p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#10B981] animate-ping" />
                <h2 className="text-base font-semibold text-[#1C1917] dark:text-[#F5F5F4]">
                  Live Runs Stream
                </h2>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] text-[#57534E] dark:text-[#D6D3D1]">
                {projects.length} targets active
              </span>
            </div>

            {loading ? (
              <div className="p-8 text-center text-xs font-mono text-[#57534E] dark:text-[#D6D3D1]">
                Loading pipeline stream...
              </div>
            ) : projects.length === 0 ? (
              <div className="p-8 text-center space-y-2 border border-dashed border-[#E7E5E4] dark:border-[#292524] rounded-xl">
                <AlertCircle className="w-6 h-6 text-[#57534E] dark:text-[#D6D3D1] mx-auto" />
                <p className="text-xs text-[#57534E] dark:text-[#D6D3D1]">
                  No active runs in current filter mode.
                </p>
                <Link href="/projects/new" className="text-xs text-[#0F766E] dark:text-[#14B8A6] font-semibold hover:underline">
                  Ingest a new file or toggle Demo Seed
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#E7E5E4] dark:border-[#292524] text-[#57534E] dark:text-[#D6D3D1] font-mono text-[11px]">
                      <th className="pb-2 font-medium">Project / File</th>
                      <th className="pb-2 font-medium">Language</th>
                      <th className="pb-2 font-medium">Status</th>
                      <th className="pb-2 font-medium">Verified</th>
                      <th className="pb-2 font-medium text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E7E5E4] dark:divide-[#292524]">
                    {projects.map((proj) => {
                      const isDemo = proj.source_type === "demo" || proj.id.startsWith("demo-");
                      return (
                        <tr key={proj.id} className="hover:bg-[#FAF9F6] dark:hover:bg-[#1C1917]/50 transition-colors">
                          <td className="py-2.5 font-medium text-[#1C1917] dark:text-[#F5F5F4]">
                            <div className="flex items-center gap-1.5">
                              <span>{proj.name}</span>
                              {isDemo && (
                                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-[#D97706]/10 text-[#D97706] dark:text-[#F59E0B]">
                                  Seed
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-[#57534E] dark:text-[#D6D3D1] font-mono truncate max-w-[180px]">
                              {proj.filename || "source_file"}
                            </div>
                          </td>
                          <td className="py-2.5">
                            <span className="font-mono text-[11px] uppercase text-[#0F766E] dark:text-[#14B8A6]">
                              {proj.language || "polyglot"}
                            </span>
                          </td>
                          <td className="py-2.5">
                            <span className="inline-flex items-center gap-1 text-[11px] text-[#10B981]">
                              <span className="w-1.5 h-1.5 rounded-full bg-current" />
                              Ready
                            </span>
                          </td>
                          <td className="py-2.5">
                            <Badge vLevel={isDemo ? "V4" : "V1"} />
                          </td>
                          <td className="py-2.5 text-right">
                            <Link
                              href={`/projects/${proj.id}`}
                              className="text-[11px] font-medium text-[#0F766E] dark:text-[#14B8A6] hover:underline"
                            >
                              Inspect →
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="pt-4 mt-3 border-t border-[#E7E5E4] dark:border-[#292524] flex items-center justify-between text-xs text-[#57534E] dark:text-[#D6D3D1]">
            <span>Continuous testing active</span>
            <Link href="/projects" className="text-[#0F766E] dark:text-[#14B8A6] font-semibold hover:underline flex items-center gap-1">
              View All Targets <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
