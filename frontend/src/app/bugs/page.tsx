"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Bug, ArrowRight, FileCode } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { fetchProjectBugs } from "@/lib/api";

export default function BugsListPage() {
  const [bugs, setBugs] = useState<any[]>([]);

  useEffect(() => {
    fetchProjectBugs("demo-proj-001").then(setBugs);
  }, []);

  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-[#E7E5E4] dark:border-[#292524]">
        <h1 className="text-xl font-bold tracking-tight text-[#1C1917] dark:text-[#F5F5F4]">
          Defect Inventory
        </h1>
        <p className="text-xs text-[#57534E] dark:text-[#D6D3D1] mt-0.5">
          Priority-ranked defects with exact origin and crash lines, verification ratings, and proof status.
        </p>
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
                <Badge vLevel={bug.verification_level || "V4"} />
                <span className="text-xs font-mono text-[#059669] dark:text-[#10B981] font-semibold">
                  Confidence: {bug.confidence_score}%
                </span>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono text-[#57534E] dark:text-[#D6D3D1]">
                <span className="flex items-center gap-1 text-[#1C1917] dark:text-[#F5F5F4]">
                  <FileCode className="w-3.5 h-3.5 stroke-[1.5]" />
                  {bug.file_path}:L{bug.line_start}-L{bug.line_end}
                </span>
                <span>Origin: <span className="text-[#F59E0B]">L{bug.origin_line || 5}</span></span>
                <span>Crash: <span className="text-[#EF4444]">L{bug.crash_line || 12}</span></span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/patches/demo-patch-001`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-[#0F766E] dark:bg-[#14B8A6] text-white dark:text-[#0C0A09] font-medium text-xs hover:bg-[#115E59] dark:hover:bg-[#0D9488] transition-colors"
              >
                Inspect & Review Fix
                <ArrowRight className="w-3.5 h-3.5 stroke-[1.5]" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
