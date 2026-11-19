import React from "react";
import { VERIFICATION_LADDER, VerificationLevel } from "@/lib/tokens";

interface BadgeProps {
  children?: React.ReactNode;
  variant?: "teal" | "amber" | "emerald" | "rose" | "zinc";
  vLevel?: VerificationLevel;
  className?: string;
}

export function Badge({ children, variant = "zinc", vLevel, className = "" }: BadgeProps) {
  if (vLevel && VERIFICATION_LADDER[vLevel]) {
    const config = VERIFICATION_LADDER[vLevel];
    const vVariant = config.variant;
    
    const vStyles = {
      emerald: "bg-[#10B981]/15 text-[#047857] border-[#10B981]/30 dark:text-[#34D399]",
      amber: "bg-[#F59E0B]/15 text-[#B45309] border-[#F59E0B]/30 dark:text-[#FBBF24]",
      zinc: "bg-[#6B7280]/15 text-[#374151] border-[#6B7280]/30 dark:text-[#E5E7EB]",
    };

    return (
      <span
        title={config.description}
        className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono font-medium border ${vStyles[vVariant]} ${className}`}
      >
        <span className="w-1.5 h-1.5 rounded-full bg-current" />
        {config.badgeLabel}
      </span>
    );
  }

  const styles = {
    teal: "bg-[#0F766E]/15 text-[#0F766E] border-[#0F766E]/30 dark:text-[#2DD4BF]",
    amber: "bg-[#F59E0B]/15 text-[#B45309] border-[#F59E0B]/30 dark:text-[#FBBF24]",
    emerald: "bg-[#10B981]/15 text-[#047857] border-[#10B981]/30 dark:text-[#34D399]",
    rose: "bg-[#EF4444]/15 text-[#B91C1C] border-[#EF4444]/30 dark:text-[#F87171]",
    zinc: "bg-[#6B7280]/15 text-[#374151] border-[#6B7280]/30 dark:text-[#E5E7EB]",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}
