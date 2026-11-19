import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/demo/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        // Base surfaces
        surface: {
          light: "#FFFFFF",
          dark: "#141210",
        },
        canvas: {
          light: "#FAF9F6",
          dark: "#0C0A09",
        },
        border: {
          light: "#E7E5E4",
          dark: "#292524",
        },
        // Binding Primary Accent: Ink-Teal (Condition 1)
        teal: {
          DEFAULT: "#0F766E",
          hover: "#115E59",
          dark: "#14B8A6",
          darkHover: "#0D9488",
          subtle: "rgba(15, 118, 110, 0.08)",
          subtleDark: "rgba(20, 184, 166, 0.12)",
        },
        // Strict Semantic Amber (Reserved for Suspected, Needs Review, V2, Origin Line)
        amber: {
          DEFAULT: "#F59E0B",
          dark: "#D97706",
          subtle: "rgba(245, 158, 11, 0.08)",
          subtleDark: "rgba(217, 119, 6, 0.12)",
        },
        // Semantic Emerald (Verified, Passing, V3/V4, Additions)
        emerald: {
          DEFAULT: "#10B981",
          dark: "#059669",
          subtle: "rgba(16, 185, 129, 0.08)",
        },
        // Semantic Rose (Critical, Failing, Crash Line, Rejection)
        rose: {
          DEFAULT: "#EF4444",
          dark: "#DC2626",
          subtle: "rgba(239, 68, 68, 0.08)",
        },
        // Semantic Zinc (Unverified, Static V0/V1)
        zinc: {
          DEFAULT: "#6B7280",
          subtle: "rgba(107, 114, 128, 0.08)",
        }
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "Geist Sans", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "IBM Plex Mono", "monospace"],
      },
      letterSpacing: {
        tightest: "-0.03em",
        tighter: "-0.02em",
      }
    },
  },
  plugins: [],
};
export default config;
