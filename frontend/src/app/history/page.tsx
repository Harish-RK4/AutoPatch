"use client";

import React from "react";
import Link from "next/link";
import { History, ArrowRight, ShieldCheck, GitBranch } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function HistoryPage() {
  return (
    <div className="max-w-2xl mx-auto py-12 text-center space-y-6">
      <div className="w-12 h-12 rounded-lg bg-[#FAF9F6] dark:bg-[#1C1917] border border-[#E7E5E4] dark:border-[#292524] flex items-center justify-center mx-auto text-[#0F766E] dark:text-[#14B8A6]">
        <History className="w-6 h-6 stroke-[1.5]" />
      </div>

      <div className="space-y-2">
        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[11px] font-mono bg-[#0F766E]/10 dark:bg-[#14B8A6]/10 text-[#0F766E] dark:text-[#14B8A6] border border-[#0F766E]/20">
          Feature Status: Scheduled for Phase P6 & P9
        </div>
        <h1 className="text-xl font-bold tracking-tight text-[#1C1917] dark:text-[#F5F5F4]">
          Audit & Change History with One-Click Rollback
        </h1>
        <p className="text-xs text-[#78716C] dark:text-[#A8A29E] leading-relaxed max-w-lg mx-auto">
          The persistent change history ledger records developer decisions, automated test receipts, and enables one-click Git branch reversion. In Phase P0, decisions are held in memory.
        </p>
      </div>

      <div className="p-4 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-lg text-left text-xs font-mono space-y-2 text-[#78716C] dark:text-[#A8A29E]">
        <p className="text-[#1C1917] dark:text-[#F5F5F4] font-semibold">Planned Deliverables:</p>
        <p>• Phase P6: Supabase persistent <code className="text-[#0F766E] dark:text-[#14B8A6]">change_history</code> table with Row-Level Security.</p>
        <p>• Phase P9: One-click branch rollback reversing candidate branches cleanly.</p>
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
