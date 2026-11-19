/**
 * Design Tokens Configuration (Single Source of Truth)
 * Aligns strictly with DESIGN.md and condition 1 (Ink-Teal primary accent).
 */

export const COLOR_TOKENS = {
  // Primary Accent: Ink-Teal
  primary: {
    light: "#0F766E",
    dark: "#14B8A6",
    hoverLight: "#115E59",
    hoverDark: "#0D9488",
  },
  // Base Surfaces
  surfaces: {
    canvasLight: "#FAF9F6",
    canvasDark: "#0C0A09",
    cardLight: "#FFFFFF",
    cardDark: "#141210",
    borderLight: "#E7E5E4",
    borderDark: "#292524",
  },
  // Strict Semantic Colors
  semantics: {
    // Amber strictly for Needs Review / Suspected / V2 / Origin Line
    amber: "#F59E0B",
    amberDark: "#D97706",
    // Emerald for Passing / Accepted / V3, V4 / Patched additions
    emerald: "#10B981",
    emeraldDark: "#059669",
    // Rose for Critical / Failing / Rejected / Crash Line
    rose: "#EF4444",
    roseDark: "#DC2626",
    // Zinc for Unverified / Static / V0, V1
    zinc: "#6B7280",
    zincDark: "#9CA3AF",
  }
} as const;

export type VerificationLevel = "V0" | "V1" | "V2" | "V3" | "V4";

export const VERIFICATION_LADDER: Record<VerificationLevel, {
  name: string;
  badgeLabel: string;
  cap: number;
  description: string;
  variant: "zinc" | "amber" | "emerald";
}> = {
  V4: {
    name: "Proven",
    badgeLabel: "V4 Proven",
    cap: 100,
    description: "Bug reproduced by failing test; patch passes it; full suite clean; static scan clean.",
    variant: "emerald"
  },
  V3: {
    name: "Verified",
    badgeLabel: "V3 Verified",
    cap: 85,
    description: "Bug reproduced by generated test; passes generated and differential tests.",
    variant: "emerald"
  },
  V2: {
    name: "Executed",
    badgeLabel: "V2 Executed",
    cap: 65,
    description: "Code builds/runs; smoke/golden tests show no regression; bug not directly reproduced.",
    variant: "amber"
  },
  V1: {
    name: "Static",
    badgeLabel: "V1 Static",
    cap: 45,
    description: "Parses/compiles; linters & type-checks pass; cross-model review consensus.",
    variant: "zinc"
  },
  V0: {
    name: "Unverified",
    badgeLabel: "V0 Unverified",
    cap: 30,
    description: "Analysis and suggestion only without sandbox test execution.",
    variant: "zinc"
  }
};
