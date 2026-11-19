# AutoPatch Design System (DESIGN.md)

AutoPatch is designed for professional software engineers who value clarity, density, and evidence. The design system combines the precision of Linear and Raycast with an airy, warm Bento Control-Room layout.

## 1. Principles
- **Build for Trust**: Visual elements emphasize proof—diffs, V-badges, test results, and call graphs.
- **Calm & Focused**: High contrast, minimal visual noise, and no unnecessary animations or rainbow gradients.
- **Evidence-Driven Semantics**: Color is never purely decorative; each color conveys a strict semantic state.
- **No-Fake-Data Rigor**: Metrics and sparklines are computed from real active records; empty states are handled honestly without fabricated stats.

---

## 2. Bento Control-Room Layout & Navigation Architecture

### Sleek Top Navigation Bar & Centered Pill Dock
Replacing legacy left sidebars, AutoPatch utilizes a floating top bar with a centered pill dock:
- **Left**: AutoPatch brand mark with geometric shield glyph.
- **Center**: Centered rounded-full pill capsule dock with active route pill highlighting:
  - `Dashboard` (`/dashboard`)
  - `Projects` (`/projects`)
  - `Upload` (`/projects/new`)
  - `Bugs` (`/bugs`)
  - `Patches` (`/patches`)
  - `History` (`/history`)
  - `Settings` (`/settings`)
- **Right Utility**:
  - Global Search Command Palette (`Cmd/Ctrl + K`)
  - Light/Dark Mode Theme Toggle (`ThemeToggle`)
  - Notification Bell with unread counter and simulated P0 notification drawer
  - User Profile capsule with active role badge and session sign-out

### Ambient Sunlit-Cream Canvas
- **Light Theme**:
  - Canvas: `#FAF8F5` with ambient warm radial glow (`rgba(245, 158, 11, 0.09)` and `#0F766E` subtle undertone)
  - Bento Surface: `rgba(255, 255, 255, 0.85)` with `backdrop-filter: blur(12px)`
  - Border: 1px hairline stone `#E7E5E4`
  - Text Primary: `#1C1917` (Stone-900, 14.5:1 contrast)
  - Text Secondary: `#57534E` (Stone-600, 5.8:1 contrast)
- **Dark Theme**:
  - Canvas: `#0C0A09` (deep stone) with subtle warm dark amber undertone
  - Bento Surface: `rgba(20, 18, 16, 0.85)` with `backdrop-filter: blur(12px)`
  - Border: 1px hairline stone `#292524`
  - Text Primary: `#F5F5F4` (Stone-100, 16.2:1 contrast)
  - Text Secondary: `#D6D3D1` (Stone-300, 9.8:1 contrast)

---

## 3. Dashboard Bento Structure (`/dashboard`)

1. **Welcome & Quick-Action Row**:
   - Dynamic greeting (`Welcome Back, {user}`) + subtitle
   - Quick-action pills: `+ Upload Code`, `+ Upload Dataset`, `+ Paste Error`, `Review Patches`, and primary `Launch Demo`
   - Active source toggle pills: `All Workspaces`, `My Ingestions`, `Demo Seed Fixtures`
2. **Row 1 (Asymmetric Cards — 7/5 Split)**:
   - **Getting Started**: Active verification checklist with real-time percentage progress bar.
   - **Verification Pulse**: Semi-circular arc gauge showing high-assurance `V3/V4 Coverage %` alongside 3 policy status rows (`Docker Sandbox`, `Human Approval Gate`, `Secret Redaction`).
3. **Row 2 (4 Equal KPI Sparkline Cards)**:
   - `Projects & Datasets`, `Confirmed Bugs`, `Verification Rate`, and `Avg. Sandbox Time` with Recharts sparkline curves.
4. **Row 3 (40% / 60% Split)**:
   - **Verification Ladder Breakdown**: Horizontal segmented progress bar (`V4 Proven`, `V3 Verified`, `V2 Executed`, `V1 Static`) with real average computed confidence footer.
   - **Live Runs Stream**: Real-time tabular stream of active targets with status, verification badge, and direct inspection links.

---

## 4. Universal Ingestion Workspace (`/projects/new`)
Three query-synced tabs (`?tab=code`, `?tab=dataset`, `?tab=paste`):
- **Upload Code**: Ingests `.py`, `.js`, `.ts`, `.go`, `.rs`, `.java`, `.c`, `.cpp` via browser `FileReader`.
- **Upload Dataset**: Ingests `.csv`, `.tsv`, `.json`, `.sql` datasets with sample row preview.
- **Paste Error / Code**: Multi-field editor for code snippet and optional crash stack trace.
- **Honest Labeling**: User uploads are displayed with clean syntax preview and labeled `[Mock Mode Workspace Preview]` without fabricating hallucinated defects.

---

## 5. Strict Semantic Color Tokens
- **Primary Accent (Ink-Teal)**: `#0F766E` (light) / `#14B8A6` (dark).
- **Amber (`#B45309` light / `#FBBF24` dark)**: Strictly reserved for:
  - Needs Review state
  - Suspected flaw state
  - Verification Ladder Level V2 (Executed)
  - Origin Line highlight in stack traces & diffs
- **Emerald (`#047857` light / `#34D399` dark)**:
  - Passing tests & accepted patches
  - Verification Ladder Level V3 (Verified) & V4 (Proven)
  - Patched Line addition highlight
- **Rose (`#DC2626` light / `#EF4444` dark)**:
  - Failing tests & rejected patches
  - Crash Line highlight in diffs
  - Critical severity defects
- **Zinc (`#52525B` light / `#A1A1AA` dark)**:
  - Verification Ladder Level V0 (Unverified) & V1 (Static)

---

## 6. Anti-Pattern Bans
- ❌ No purple or neon gradients
- ❌ No floating 3D spheres or distracting mesh blobs
- ❌ No low-contrast grey-on-grey text (100% WCAG 2.1 AA compliant)
- ❌ No fake testimonials or fabricated metrics
