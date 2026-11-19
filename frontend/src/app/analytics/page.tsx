"use client";

import React from "react";
import Link from "next/link";
import { BarChart3, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function AnalyticsPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
      <div className="w-12 h-12 rounded-lg bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] flex items-center justify-center mx-auto text-[#0F766E] dark:text-[#14B8A6]">
        <BarChart3 className="w-6 h-6 stroke-[1.5]" />
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono bg-[#0F766E]/10 dark:bg-[#14B8A6]/10 text-[#0F766E] dark:text-[#14B8A6] border border-[#0F766E]/20">
          Feature Status: Scheduled for Phase P8
        </div>
        <h1 className="text-xl font-bold tracking-tight text-[#1C1917] dark:text-[#F5F5F4]">
          Engineering Analytics & Defect Intelligence
        </h1>
        <p className="text-xs text-[#57534E] dark:text-[#D6D3D1] leading-relaxed max-w-lg mx-auto">
          Deep telemetry tracking time saved, patch acceptance rates, defect recurrence frequency, and bug-prone codebase modules.
        </p>
      </div>

      <div className="p-4 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-lg text-left text-xs font-mono space-y-2 text-[#57534E] dark:text-[#D6D3D1]">
        <p className="text-[#1C1917] dark:text-[#F5F5F4] font-semibold">Planned Deliverables:</p>
        <p>• Phase P8: Aggregated metrics endpoint (<code className="text-[#0F766E] dark:text-[#14B8A6]">GET /analytics</code>) with Recharts trendline visualizations.</p>
        <p>• Phase P8: Bug-prone module heatmaps and developer triage velocity.</p>
      </div>

      <div className="pt-2">
        <Link href="/dashboard">
          <Button variant="primary">
            Return to Dashboard
            <ArrowRight className="w-3.5 h-3.5 ml-1.5 stroke-[1.5]" />
          </Button>
        </Link>
      </div>
    </div>
  );
}
