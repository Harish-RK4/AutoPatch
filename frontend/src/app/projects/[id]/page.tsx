"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Stepper, StepStage } from "@/components/ui/Stepper";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Play, Bug, FileCode, CheckCircle2, ArrowRight } from "lucide-react";
import { fetchProjectBugs } from "@/lib/api";

export default function ProjectDetailsPage() {
  const params = useParams();
  const projectId = (params?.id as string) || "demo-proj-001";
  
  const [stage, setStage] = useState<StepStage>("fix");
  const [bugs, setBugs] = useState<any[]>([]);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    fetchProjectBugs(projectId).then(setBugs);
  }, [projectId]);

  const handleScan = () => {
    setIsScanning(true);
    setStage("scan");
    setTimeout(() => {
      setStage("explain");
      setTimeout(() => {
        setStage("fix");
        setTimeout(() => {
          setStage("test");
          setIsScanning(false);
        }, 800);
      }, 800);
    }, 800);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E7E5E4] dark:border-[#292524]">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h1 className="text-xl font-bold tracking-tight text-[#1C1917] dark:text-[#F5F5F4]">
              Python Marks Calculator
            </h1>
            <Badge variant="teal">Python 3.12</Badge>
            <Badge vLevel="V4" />
          </div>
          <p className="text-xs text-[#57534E] dark:text-[#D6D3D1]">
            Target File: <code className="font-mono text-[#1C1917] dark:text-[#F5F5F4]">calculator.py</code> · Student grading arithmetic module.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={handleScan}
            disabled={isScanning}
            variant="primary"
          >
            <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
            {isScanning ? "Running Pipeline..." : "Re-Run Pipeline"}
          </Button>
        </div>
      </div>

      {/* 5-Step Stepper (Condition / master prompt requirement) */}
      <Stepper currentStage={stage} />

      {/* Bugs List */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F5F4] flex items-center gap-2">
            <Bug className="w-4 h-4 text-[#EF4444]" />
            Detected Flaws & Logical Defects
          </h2>
          <span className="text-xs text-[#57534E] dark:text-[#D6D3D1] font-mono">
            {bugs.length} Identified
          </span>
        </div>

        <div className="space-y-3">
          {bugs.map((bug) => (
            <div
              key={bug.id}
              className="p-4 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-sm text-[#1C1917] dark:text-[#F5F5F4]">
                    {bug.title}
                  </span>
                  <Badge variant="rose">High Severity</Badge>
                  <Badge vLevel="V4" />
                  <span className="text-xs font-mono text-[#059669] dark:text-[#10B981] font-semibold">
                    Confidence: 100%
                  </span>
                </div>

                <div className="flex items-center gap-4 text-xs font-mono text-[#57534E] dark:text-[#D6D3D1]">
                  <span className="flex items-center gap-1 text-[#1C1917] dark:text-[#F5F5F4]">
                    <FileCode className="w-3.5 h-3.5" />
                    {bug.file_path}:L{bug.line_start}-L{bug.line_end}
                  </span>
                  <span>Origin: <span className="text-[#F59E0B]">L{bug.origin_line || 5}</span></span>
                  <span>Crash: <span className="text-[#EF4444]">L{bug.crash_line || 12}</span></span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <a
                  href={`/patches/demo-patch-001`}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0F766E] dark:bg-[#14B8A6] text-white dark:text-[#0C0A09] font-medium text-xs hover:bg-[#115E59] dark:hover:bg-[#0D9488] transition-colors"
                >
                  Review Patch & Proof
                  <ArrowRight className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
