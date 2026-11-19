import React from "react";

interface DiffViewerProps {
  originalCode: string;
  patchedCode: string;
  originLine?: number;
  crashLine?: number;
  filename?: string;
}

export function DiffViewer({
  originalCode,
  patchedCode,
  originLine,
  crashLine,
  filename = "calculator.py"
}: DiffViewerProps) {
  const origLines = originalCode.trim().split("\n");
  const patchedLines = patchedCode.trim().split("\n");

  return (
    <div className="border border-[#E7E5E4] dark:border-[#292524] rounded-lg overflow-hidden bg-white dark:bg-[#141210] font-mono text-xs">
      <div className="bg-[#FAF9F6] dark:bg-[#1C1917] px-4 py-2 border-b border-[#E7E5E4] dark:border-[#292524] flex items-center justify-between text-xs text-[#78716C] dark:text-[#A8A29E]">
        <span className="font-semibold text-[#1C1917] dark:text-[#F5F5F4]">{filename}</span>
        <div className="flex items-center gap-4 text-[11px]">
          {originLine && (
            <span className="flex items-center gap-1.5 text-[#D97706] dark:text-[#F59E0B]">
              <span className="w-2 h-2 rounded-full bg-[#F59E0B]" />
              Origin Line (L{originLine})
            </span>
          )}
          {crashLine && (
            <span className="flex items-center gap-1.5 text-[#DC2626] dark:text-[#EF4444]">
              <span className="w-2 h-2 rounded-full bg-[#EF4444]" />
              Crash Line (L{crashLine})
            </span>
          )}
          <span className="flex items-center gap-1.5 text-[#059669] dark:text-[#10B981]">
            <span className="w-2 h-2 rounded-full bg-[#10B981]" />
            Patched Guard
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#E7E5E4] dark:divide-[#292524]">
        {/* Left: Original Code */}
        <div className="overflow-x-auto">
          <div className="px-3 py-1 bg-[#FAF9F6] dark:bg-[#1C1917] text-[10px] uppercase font-bold text-[#78716C] tracking-wider border-b border-[#E7E5E4] dark:border-[#292524]">
            Original Defective Code
          </div>
          <div className="py-2">
            {origLines.map((line, idx) => {
              const lineNo = idx + 1;
              const isOrigin = lineNo === originLine;
              const isCrash = lineNo === crashLine;

              return (
                <div
                  key={`orig-${lineNo}`}
                  className={`flex items-start px-2 py-0.5 leading-relaxed ${
                    isCrash
                      ? "bg-[#EF4444]/15 border-l-2 border-[#EF4444]"
                      : isOrigin
                      ? "bg-[#F59E0B]/15 border-l-2 border-[#F59E0B]"
                      : "hover:bg-black/5 dark:hover:bg-white/5"
                  }`}
                >
                  <span className="w-8 text-right text-[#A8A29E] select-none pr-3 flex-shrink-0 text-[11px]">
                    {lineNo}
                  </span>
                  <span className="text-[#1C1917] dark:text-[#F5F5F4] whitespace-pre">
                    {line}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Patched Code */}
        <div className="overflow-x-auto bg-[#10B981]/[0.02]">
          <div className="px-3 py-1 bg-[#FAF9F6] dark:bg-[#1C1917] text-[10px] uppercase font-bold text-[#059669] dark:text-[#10B981] tracking-wider border-b border-[#E7E5E4] dark:border-[#292524]">
            Synthesized Patch (Candidate 1 - Minimal Diff)
          </div>
          <div className="py-2">
            {patchedLines.map((line, idx) => {
              const lineNo = idx + 1;
              const isNew = line.includes("ValueError") || line.includes("if not (0.0 <=");

              return (
                <div
                  key={`patch-${lineNo}`}
                  className={`flex items-start px-2 py-0.5 leading-relaxed ${
                    isNew
                      ? "bg-[#10B981]/15 border-l-2 border-[#10B981] text-[#059669] dark:text-[#10B981] font-semibold"
                      : "hover:bg-black/5 dark:hover:bg-white/5 text-[#1C1917] dark:text-[#F5F5F4]"
                  }`}
                >
                  <span className="w-8 text-right text-[#A8A29E] select-none pr-3 flex-shrink-0 text-[11px]">
                    {lineNo}
                  </span>
                  <span className="whitespace-pre">
                    {line}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
