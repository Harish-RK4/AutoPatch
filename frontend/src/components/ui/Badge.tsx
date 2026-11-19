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
      emerald: "bg-[#10B981]/10 text-[#059669] border-[#10B981]/30 dark:text-[#10B981]",
      amber: "bg-[#F59E0B]/10 text-[#D97706] border-[#F59E0B]/30 dark:text-[#F59E0B]",
      zinc: "bg-[#6B7280]/10 text-[#4B5563] border-[#6B7280]/30 dark:text-[#9CA3AF]",
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
    teal: "bg-[#0F766E]/10 text-[#0F766E] border-[#0F766E]/20 dark:text-[#14B8A6]",
    amber: "bg-[#F59E0B]/10 text-[#D97706] border-[#F59E0B]/20 dark:text-[#F59E0B]",
    emerald: "bg-[#10B981]/10 text-[#059669] border-[#10B981]/20 dark:text-[#10B981]",
    rose: "bg-[#EF4444]/10 text-[#DC2626] border-[#EF4444]/20 dark:text-[#EF4444]",
    zinc: "bg-[#6B7280]/10 text-[#4B5563] border-[#6B7280]/20 dark:text-[#9CA3AF]",
  };

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium border ${styles[variant]} ${className}`}>
      {children}
    </span>
  );
}
