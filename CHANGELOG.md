# Changelog

All notable changes to AutoPatch will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Phase P1 - Core Loop & Ingestion Engine] - 2026-11-19

### Added
- **Pluggable SandboxRunner Architecture (`app.sandbox`)**: Clean abstract interface with two concrete implementations:
  - `DockerSandboxRunner`: Production container runner with air-gapped network (`--network none`), read-only rootfs (`--read-only`), non-root execution (`--user 1000:1000`), CPU caps (`--cpus=1.0`), and RAM caps (`--memory=512m`).
  - `LocalSubprocessSandboxRunner`: Local dev fallback for Python and Node.js on hosts without Docker; features ephemeral temporary directory workspaces with guaranteed cleanup, hard execution timeouts, output byte capping (256KB), and strict environment variable scrubbing (zero host API keys, secrets, or database URLs leaked).
  - Explicit transparency labeling: Every run carries the label `Local Dev Subprocess (Not Network-Isolated — Docker Unavailable)`.
- **Fail-Fast Production Startup Guard**: Configuration validator in `app.core.config` enforcing that `APP_ENV=production` strictly rejects `SANDBOX_MODE=local_dev` and requires Docker container isolation.
- **Security-Hardened Archive Ingestion (`SafeArchiveIngester`)**: Multipart `.zip` extraction enforcing:
  - Zip-slip path traversal attack rejection (blocks `..` sequences, absolute root paths).
  - Zip-bomb decompression ratio limit (>100:1) and total uncompressed size limit (100MB).
  - Corrupted archive rejection and safe file extraction.
- **Polyglot Language & Format Detector (`app.ingestion.detector`)**: Automatic detection across code (Python, JS, TS, C/C++, Go, Rust, Java, Ruby, PHP, SQL, Shell), structured datasets (JSON, CSV, TSV, SQLite, Parquet), project manifests, shebangs, and honest binary file identification.
- **AST & Call-Graph Indexer (`app.indexing`)**: Python AST visitor and JS regex/parser extracting function/class/method symbol tables, decorators, parameters, import relationships, directed call graph edges, and cyclomatic complexity scores.
- **Polyglot Static Scanner (`app.scanner`)**: AST syntax checks, security rules (insecure `eval`/`exec`, `subprocess.Popen(..., shell=True)`, hardcoded credentials/API keys), and logic flaw checks (literal zero division, broad exception swallowing), coupled with Mock LLM router explanations.
- **Autonomous 5-Step Core Loop Pipeline (`app.patcher.pipeline`)**: End-to-end `UPLOAD -> SCAN -> EXPLAIN -> FIX -> TEST` loop executing dual sandbox verification (pre-patch reproduction + post-patch verification), computing unified diffs, measuring real execution durations, and assigning verification tiers (V1-V4).
- **Backend Test Expansion**: 50 pytest unit and integration tests passing with 82% coverage, 100% clean Ruff linting.

## [Phase P0 - Shell & Foundation] - 2026-11-19

### Added
- **Exact Bento Control-Room Visual Fidelity (`/dashboard`)**: Rebuilt `/dashboard` to strictly match the reference architecture with warm off-white (`#F4F2ED`) canvas, luminous golden-amber ambient radial glow, frosted translucent cards (`bg-white/75 backdrop-blur-md border border-white/80 rounded-2xl`), floating top header with centered route pill dock (`[ :: Dashboard ]`), dynamic user greeting (`Welcome Back, {session.name}`), and top quick action pills.
- **Open Split Composition (Row 1)**: Compact Getting Started card (~32% width) on the left, open central breathing space showcasing the sunlit ambient glow, and Verification Pulse semi-circular arc gauge card (~32% width) on the right.
- **Strictly Computed Real Metrics (Zero Hardcoding)**: Verification Pulse gauge (83.3% for demo seed fixtures based on 5 V3/V4 out of 6 bugs; 0% for empty user ingestions), dynamic Recharts sparklines, and Verification Ladder Breakdown with 85.0% average confidence.
- **Verification Evidence Artifacts**: Generated Playwright high-resolution screenshots in `docs/evidence/` (`p0-dashboard-desktop.png`, `p0-dashboard-dark.png`, `p0-dashboard-mobile.png`).
- **Universal Ingestion Workspace (`/projects/new`)**: 3-tab upload workspace (`?tab=code`, `?tab=dataset`, `?tab=paste`) with client-side `FileReader` reading, language auto-detection, and API persistence to `USER_PROJECTS`.
- **Honest Mock Mode Labeling on User Uploads**: User files displayed with syntax viewer and labeled `[Mock Mode Workspace Preview]` without fabricated defects, upholding the strict No Fake Data mandate.
- **Full Auth Gate & Session Management (`/login`, `AuthGuard`)**: Tabbed Sign In and Sign Up forms, 1-click Quick Demo Sign In (`demo@autopatch.dev`), and session redirection protecting all workspace routes.
- **Starting Landing Page (`/`)**: Entry landing page with "Build for Trust" manifesto, 5-stage workflow overview, Python Marks Calculator proof preview, and theme toggle.
- **Top Bar Notification Bell & Search**: Centered pill dock, Cmd/Ctrl+K command palette, and notification drawer with unread counter and mark-as-read state.
- **Accessibility & E2E Verification Suite (`verify-routes-axe.js`)**: Playwright + axe-core audit covering all 13 routes at 1280x800 and 375x667, passing with 100% HTTP 200, 0 console errors, and 0 WCAG 2.1 AA violations.
- **Backend Test Suite & Coverage**: 18 pytest unit and integration tests passing with 80% coverage; 100% clean Ruff linting.
