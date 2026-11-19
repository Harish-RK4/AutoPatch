import React from "react";
import { Check } from "lucide-react";

export type StepStage = "upload" | "scan" | "explain" | "fix" | "test";

interface StepperProps {
  currentStage: StepStage;
  className?: string;
}

const STAGES: { id: StepStage; label: string; description: string }[] = [
  { id: "upload", label: "Upload", description: "Ingest & detect format" },
  { id: "scan", label: "Scan", description: "AST index & flaw detection" },
  { id: "explain", label: "Explain", description: "Root-cause localization" },
  { id: "fix", label: "Fix", description: "Candidate patch synthesis" },
  { id: "test", label: "Test", description: "Sandboxed verification" }
];

export function Stepper({ currentStage, className = "" }: StepperProps) {
  const currentIndex = STAGES.findIndex(s => s.id === currentStage);

  return (
    <nav aria-label="Pipeline workflow progress" className={`w-full py-3 px-4 bg-white dark:bg-[#141210] border border-[#E7E5E4] dark:border-[#292524] rounded-lg ${className}`}>
      <ol className="flex items-center justify-between gap-2">
        {STAGES.map((stage, idx) => {
          const isCompleted = idx < currentIndex;
          const isActive = idx === currentIndex;

          return (
            <li key={stage.id} className="flex-1 flex items-center">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-mono font-medium transition-colors ${
                    isCompleted
                      ? "bg-[#10B981] text-white"
                      : isActive
                      ? "bg-[#0F766E] text-white dark:bg-[#14B8A6] dark:text-[#0C0A09] ring-2 ring-[#0F766E]/20"
                      : "bg-[#E7E5E4] dark:bg-[#292524] text-[#57534E] dark:text-[#D6D3D1]"
                  }`}
                >
                  {isCompleted ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                <div className="hidden sm:block">
                  <div className={`text-xs font-medium leading-none ${isActive ? "text-[#1C1917] dark:text-[#F5F5F4]" : "text-[#57534E] dark:text-[#D6D3D1]"}`}>
                    {stage.label}
                  </div>
                  <div className="text-[10px] text-[#57534E] dark:text-[#D6D3D1] mt-0.5">
                    {stage.description}
                  </div>
                </div>
              </div>
              {idx < STAGES.length - 1 && (
                <div
                  className={`flex-1 h-[1px] mx-3 ${
                    idx < currentIndex ? "bg-[#10B981]" : "bg-[#E7E5E4] dark:bg-[#292524]"
                  }`}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
