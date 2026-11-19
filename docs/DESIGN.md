# AutoPatch Design System (DESIGN.md)

AutoPatch is designed for professional software engineers who value clarity, density, and evidence. The design system is inspired by Linear, Raycast, and Sentry.

## 1. Principles
- **Build for Trust**: Visual elements emphasize proof—diffs, V-badges, test results, and call graphs.
- **Calm & Focused**: High contrast, minimal visual noise, and no unnecessary animations or rainbow gradients.
- **Evidence-Driven Semantics**: Color is never purely decorative; each color conveys a strict semantic state.

---

## 2. Color Tokens

### Primary Accent: Ink-Teal
Used strictly for primary buttons, active navigation, stepper progress, and key interactive highlights:
- **Light Mode**: `#0F766E` (teal-700)
- **Dark Mode**: `#14B8A6` (teal-500)
- **Hover / Active States**: `#115E59` (light hover), `#0D9488` (dark hover)

### Base Surfaces
- **Light Theme**:
  - Background (Canvas): `#FAF9F6` (warm off-white)
  - Surface (Card/Panel): `#FFFFFF`
  - Border: `#E7E5E4` (stone-200 hairline)
  - Text Primary: `#1C1917` (stone-900)
  - Text Secondary: `#78716C` (stone-500)
- **Dark Theme**:
  - Background (Canvas): `#0C0A09` (deep stone-black)
  - Surface (Card/Panel): `#141210` (stone-950 elevation)
  - Border: `#292524` (stone-800 hairline)
  - Text Primary: `#F5F5F4` (stone-100)
  - Text Secondary: `#A8A29E` (stone-400)

### Strict Semantic Colors
- **Amber (`#F59E0B` / `#D97706`)**: Strictly reserved for:
  - Needs Review state
  - Suspected bug state
  - Verification Ladder Level V2 (Executed)
  - Origin Line highlight in stack traces & diffs
- **Emerald (`#10B981` / `#059669`)**:
  - Passing tests
  - Accepted patch
  - Verification Ladder Level V3 (Verified) & V4 (Proven)
  - Patched Line addition highlight
- **Rose (`#EF4444` / `#DC2626`)**:
  - Failing tests
  - Crash Line highlight in diffs & execution traces
  - Critical severity bugs
  - Rejected patch
- **Zinc (`#6B7280` / `#9CA3AF`)**:
  - Verification Ladder Level V0 (Unverified) & V1 (Static)
  - Inactive or neutral metadata

---

## 3. Typography
- **UI Sans**: `IBM Plex Sans`, `Geist Sans`, or system `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto`
  - Body text line height: `1.55`
  - Headings: tight letter spacing (`-0.02em`)
- **Code & Numbers**: `JetBrains Mono`, `IBM Plex Mono`
  - Tabular figures enabled for test metrics, line numbers, and timestamps.

---

## 4. Spacing, Borders & Shadows
- **4px Base Grid**: `space-1` (4px), `space-2` (8px), `space-3` (12px), `space-4` (16px), `space-6` (24px).
- **Hairline Borders**: `1px solid var(--border-subtle)` (low-contrast delineation).
- **Subtle Elevation**: Light shadows for floating panels and modals (`0 1px 3px rgba(0,0,0,0.05)`).
- **Corner Radii**: 6px for controls, 8px for cards, 10px for dialogs.

---

## 5. Anti-Patterns (Forbidden)
- ❌ Do NOT use Amber `#F59E0B` for primary actions (use Ink-Teal `#0F766E` / `#14B8A6`).
- ❌ No floating gradients, glassmorphism blur layers, or rainbow borders.
- ❌ No placeholder or lorem ipsum content.
- ❌ No emoji icons in UI headers or buttons (use 1.5px stroke Lucide vector icons).
