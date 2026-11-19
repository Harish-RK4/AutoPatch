# Changelog

All notable changes to AutoPatch will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Bento Control-Room Redesign (`/dashboard`)**: Airy Bento layout inspired by the reference control room with warm sunlit-cream ambient canvas (deep stone in dark mode), top pill navigation dock (`Dashboard`, `Projects`, `Upload`, `Bugs`, `Patches`, `History`, `Settings`), and quick action buttons (`+ Upload Code`, `+ Upload Dataset`, `+ Paste Error`, `Review Patches`, `Launch Demo`).
- **Verification Pulse Arc Gauge & Policy Rows**: Semi-circular arc gauge for real `V3/V4 Coverage %` with policy status checks (`Sandbox Isolation`, `Human Approval Gate`, `Secret Redaction`).
- **Dynamic Computed KPI Sparkline Cards**: 4 equal KPI cards (`Projects & Datasets`, `Confirmed Bugs`, `Verification Rate`, `Avg. Sandbox Time`) with Recharts area/bar sparklines computed strictly from state.
- **Verification Ladder Breakdown & Live Runs Stream**: 40/60 split card with horizontal segmented progress bar (`V4 Proven`, `V3 Verified`, `V2 Executed`, `V1 Static`), real average computed confidence footer, and live tabular runs stream.
- **Universal Ingestion Workspace (`/projects/new`)**: 3-tab upload workspace (`?tab=code`, `?tab=dataset`, `?tab=paste`) with client-side `FileReader` reading, language auto-detection, and API persistence to `USER_PROJECTS`.
- **Honest Mock Mode Labeling on User Uploads**: User files displayed with syntax viewer and labeled `[Mock Mode Workspace Preview]` without fabricated defects, upholding the strict No Fake Data mandate.
- **Full Auth Gate & Session Management (`/login`, `AuthGuard`)**: Tabbed Sign In and Sign Up forms, 1-click Quick Demo Sign In (`demo@autopatch.dev`), and session redirection protecting all workspace routes.
- **Starting Landing Page (`/`)**: Entry landing page with "Build for Trust" manifesto, 5-stage workflow overview, Python Marks Calculator proof preview, and theme toggle.
- **Top Bar Notification Bell & Search**: Centered pill dock, Cmd/Ctrl+K command palette, and notification drawer with unread counter and mark-as-read state.
- **Accessibility & E2E Verification Suite (`verify-routes-axe.js`)**: Playwright + axe-core audit covering all 13 routes at 1280x800 and 375x667, passing with 100% HTTP 200, 0 console errors, and 0 WCAG 2.1 AA violations.
- **Backend Test Suite & Coverage**: 17 pytest unit and integration tests passing with 80% coverage; 100% clean Ruff linting.
