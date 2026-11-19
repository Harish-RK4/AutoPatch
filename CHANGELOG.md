# Changelog

All notable changes to AutoPatch will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Phase P7 - FCM Push Notifications Complete] - 2026-11-19

### Added
- **Web Push Token Registration & Device Registry (`app.notifications.fcm`, `POST /devices`)**:
  - Endpoints to register (`POST /devices`) and unregister (`DELETE /devices/{token}`) push client devices across web and mobile platforms.
  - Association of device tokens with authenticated or demo user accounts.
- **Firebase Cloud Messaging Dispatcher & Simulated Fallback (`app.notifications.fcm`)**:
  - Dynamic multicast FCM dispatch via Firebase Admin SDK when `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, and `FIREBASE_PRIVATE_KEY` are provided.
  - Transparent zero-credential simulation engine: logs dispatches, tracks delivery states (`delivered_simulated`), and maintains an in-memory chronological inbox.
- **Notification History & Diagnostic Endpoints (`app.api.routes_notifications`)**:
  - `GET /notifications`: Query chronological notification items with per-user filtering and limits.
  - `POST /notifications/test`: Send immediate test alert to registered client devices.
  - `POST /notifications/{id}/read`: Mark individual notification as read.
  - `POST /notifications/read-all`: Mark all notifications as read for current user.
  - `GET /notifications/status`: Telemetry exposing FCM connection status, active device token counts, and delivery mode.
- **Background Web Push Service Worker (`frontend/public/firebase-messaging-sw.js`)**:
  - Service worker handling incoming `push` events with notification actions (`Review Patch`, `Dismiss`).
  - Implements `notificationclick` handler focusing active tabs or opening target patch review routes (`/patches/{id}`).
- **Interactive Push Client & TopNav Drawer Integration (`pushClient.ts`, `TopNav.tsx`)**:
  - Web Notification API permission requester and device token synchronization.
  - Interactive "Enable Push" status toggle and "Send Test Alert" action button inside the TopNav notification drawer.
- **Comprehensive Verification Suite**:
  - Added `backend/tests/unit/test_notifications.py` covering device lifecycle, payload dispatch, simulation fallback, and REST endpoints.
  - 101 backend pytest tests passing with 100% clean Ruff linting.
  - Zero TypeScript compile errors.

## [Phase P6 - Supabase Swap] - 2026-11-19

### Added
- **Pluggable Frontend Auth Provider Architecture (`frontend/src/lib/authProvider.ts`)**:
  - Clean `IAuthProvider` abstraction allowing hot-swapping between `DemoAuthProvider` and `SupabaseAuthProvider` based on `NEXT_PUBLIC_AUTH_MODE`.
  - Comprehensive authentication handling including session restoration, user sign-in, user registration, and sign-out.
  - Retains zero-configuration 1-click Demo Mode access while enabling real Supabase cloud auth when keys are supplied.
- **Asynchronous Supabase PostgREST & Storage Repository (`backend/app/db/supabase.py`)**:
  - `SupabaseRepository` supporting asynchronous PostgREST CRUD operations (`insert_record`, `fetch_records`) and artifact storage uploads (`upload_storage_artifact`).
  - Resilient fail-soft architecture: in-memory mock repository fallback when Supabase URL or Service Key are absent, guaranteeing uninterrupted local test execution.
  - Non-blocking HTTP client with explicit timeout controls and typed error handling.
- **Supabase Connectivity & Diagnostic Endpoints (`backend/app/api/routes_settings.py`)**:
  - `GET /settings/supabase`: Diagnostic telemetry exposing URL configuration, key presence, and auth mode.
  - `POST /settings/supabase/test`: Live round-trip connectivity probe measuring real-world latency or verifying mock readiness.
- **Unit Test Suite Verification**:
  - Added `backend/tests/unit/test_supabase_repo.py` verifying fallback in-memory behavior, mocked network interactions, and public artifact URL resolution.
  - 98 backend pytest tests passing with 100% clean Ruff linting.

## [Phase P5 - Fix Explanation Engine Complete] - 2026-11-19

### Added
- **Crash & Defect Localisation Engine (`app.patcher.explanation`)**:
  - Distinguishes `origin_line` (where untrusted/malformed data is ingested) from `crash_line` (where computation or runtime fails).
  - Categorizes failure types (`logic_boundary_defect`, `zero_division_error`, `null_pointer_dereference`, `buffer_boundary_overflow`, `unvalidated_command_injection`).
  - Synthesizes minimal trigger inputs (e.g. `{"marks": -5.0}`) and maps stack frames to source file locations.
- **Variable Execution Trace Timeline & Backward Data-Flow Slice**:
  - Step-by-step chronological execution timeline tracing variables along the failing path: external input ingestion -> propagation -> crash/exception.
  - Backward data-flow slice recording data and control dependencies directly influencing the defect.
- **Three-Tiered Switchable Explanations**:
  - *Beginner*: Plain-language analogy without technical jargon.
  - *Developer*: Precise code terms, data-flow reasoning, and precondition invariants.
  - *Manager*: Business risk, impact scope, and ROI summary in two lines.
- **Per-Hunk Explanation Cards**:
  - Detailed cards for every modified hunk: original code, replacement code, why the original was wrong, why the replacement fixes it, what would still fail without it, blast radius side effects, and rejected alternatives.
- **Explanation Validator Agent (`app.patcher.explanation_validator`)**:
  - Self-checking verification agent ensuring cited file line numbers are within file bounds, trigger inputs are cited, origin/crash lines are referenced, and replacement rationale matches the actual patch diff.
  - Unproven or unverified explanations are tagged `Hypothesis` and penalized on confidence.
- **Interactive UI & Scoped Flaw Assistant (`/bugs/[id]`)**:
  - Clickable interactive stack trace frames highlighting origin line (amber) and crash line (red).
  - Variable trace timeline cards displaying step-by-step state mutations.
  - Interactive "Ask AutoPatch" scoped Q&A assistant (`POST /bugs/{id}/ask`) answering questions with codebase context.
  - 1-click Markdown Bug Report export (`GET /bugs/{id}/export-markdown`).
- **Comprehensive Test Suite**:
  - 95 backend pytest tests passing with 100% clean Ruff linting.
  - Zero TypeScript compile errors and passing demo guard audit.

## [Phase P4 - Universal Dataset Engine Complete] - 2026-11-19

### Added
- **Multi-Format Dataset Profiler (`app.dataset.profiler`)**:
  - Polyglot format sniffer supporting CSV, TSV, JSON, JSONL, SQLite, XML, YAML, TOML, and text tables.
  - Computes comprehensive column profiles: schema snapshot, data types, null rates, uniqueness ratios, numerical quartiles & bounds, and date format conventions.
  - Large file chunking and representative sampling (up to 5,000 rows) for datasets exceeding 10,000 rows while tracking exact total row counts.
- **Flaw & Quality Anomaly Detector (`app.dataset.detector`)**:
  - Identifies 11 defect types: missing values/null sentinels, wrong/mixed types, duplicate rows, out-of-bounds domain bounds, statistical IQR outliers, inconsistent casing, mixed date conventions, broken dates, and schema drift.
  - Ambiguous cases (extreme statistical outliers beyond 1.5x IQR) flagged explicitly as `needs_human_decision=True` with sample evidence rows to avoid silent data destruction.
- **Idempotent Python & Pandas Cleaning Script Generator (`app.dataset.cleaner`)**:
  - Strictly non-destructive architecture: original dataset files are NEVER modified.
  - Generates standalone, transparent, repeatable Python/pandas transformation scripts normalizing dates to ISO 8601, imputing missing values with statistical medians/modes, clamping boundary violations, and deduplicating records.
  - Generates detailed row-level before/after diffs (`ChangedRow`) auditing every modified cell.
- **Formal Invariant Verification Engine (`app.dataset.invariants`)**:
  - Enforces four strict mathematical invariants:
    1. *Row Lineage*: Every output row traces to an input row or documented deduplication drop (`output_rows <= input_rows`).
    2. *Cell Identity*: Untouched valid cells remain byte-identical to original inputs.
    3. *Idempotency*: Re-executing the cleaning script on cleaned output yields identical state (`clean(clean(D)) == clean(D)`).
    4. *Validation Rules*: Generated schema constraints (e.g. non-negative scores, ISO date patterns, primary key uniqueness) pass 100%.
  - High-confidence verification ladder capping: assigns `V4 (Proven)` when all invariants hold.
- **Interactive Dataset Review Screen (`/projects/[id]/dataset`)**:
  - Four verification invariant pulse cards showcasing real-time mathematical proof status.
  - Four-tab inspection view: Row Lineage Diff table with cell-level change highlighting, Discovered Anomalies table with human decision flags, Side-by-Side Before/After Profile, and Repeatable Script Viewer with syntax highlighting and 1-click copy/download.
  - Export capabilities for verified clean dataset copies and standalone Python cleaning scripts.
- **Test Suite Expansion**:
  - 90 backend pytest tests passing with 100% clean Ruff linting.
  - Full frontend TypeScript type-checking passing with 0 errors.

## [Phase P3 - Free LLM Router Complete] - 2026-11-19

### Added
- **Multi-Provider LLM Adapters (`app.llm.adapters`)**:
  - `GeminiAdapter`: Live Google Generative Language API adapter with native `contents` structure, system prompts, temperature controls, and error mapping. Verified live against `models/gemini-3.5-flash-lite`.
  - `GroqAdapter`: Live OpenAI-compatible Groq API client with sub-second inference. Verified live against `qwen/qwen3.8-27b`.
  - `OllamaAdapter`: Air-gapped local model adapter targeting `http://localhost:11434` for Private Mode.
- **Token Bucket & Sliding-Window Rate Limiter (`app.llm.rate_limiter`)**:
  - Enforces per-provider Requests Per Minute (RPM) and Tokens Per Minute (TPM) caps.
  - Automatically avoids rate-limit exhaustion by shedding or diverting traffic to fallback providers.
- **Automatic Fallback Chain Engine (`app.llm.router`)**:
  - Role-based dispatch following `llm_routing.yaml`:
    - `scanner`, `root_cause`, `patcher`, `explainer`: Primary Google Gemini with automatic failover to Groq and Ollama.
    - `critic`: Primary Groq LLaMA/Qwen with automatic failover to Gemini (guaranteeing cross-model independent review).
  - On provider error (HTTP 429 rate limit, 503 high demand, or network timeout), seamlessly routes to the next candidate in the chain.
- **Prompt and Model Response Cache (`app.llm.cache`)**:
  - Deterministic SHA-256 request hashing caching prompt responses to prevent redundant quota usage and accelerate repetitive queries.
- **Interactive Credentials & Services Settings Page (`/settings`)**:
  - Live provider status indicators (`Configured`, `Key Missing`, `Ready`).
  - Interactive "Test Connection" buttons making live health-check API calls and reporting measured response latencies in milliseconds.
  - "Ping All Providers" concurrent health-check button.
  - Switchable `LLM_MODE` at runtime (`Free Tier Multi-Provider`, `Deterministic Mock Mode`, `Private Mode Local Ollama`).
- **Comprehensive Test Expansion**:
  - 82 pytest tests passing with 81% coverage and 100% clean Ruff linting.
  - Verified live API responses from Google Gemini and Groq using production credentials stored safely in git-ignored `.env`.

## [Phase P2 - Universal Layer & Trust Engine] - 2026-11-19

### Added
- **Blast Radius Analysis Engine (`app.indexing.blast_radius`)**:
  - Traverses AST symbol tables, file indices, and directed call graphs to calculate affected symbols, direct callers, transitive callers, and impacted files.
  - Measures pre-patch vs. post-patch cyclomatic complexity delta.
  - Generates quantitative blast score (0-100) and qualitative risk level (`Low`, `Medium`, `High`, `Critical`).
- **Multi-Candidate Patch Generation (3 Distinct Strategies)**:
  - Generates 3 ranked candidate patches per detected defect:
    1. *Candidate 1 (Rank 1 - Minimal Targeted Fix)*: Surgical defensive guard with lowest blast radius.
    2. *Candidate 2 (Rank 2 - Defensive Guard Insertion)*: Comprehensive input bounds validation and normalization.
    3. *Candidate 3 (Rank 3 - Refactored Safe Alternative)*: Restructured approach using safe parsing or wrapped error handling.
- **Critic Agent (`app.patcher.critic`)**:
  - Multi-axis evaluation scoring candidate patches on Correctness (40%), Safety (25%), Minimality (20%), and Side-effects/Blast Radius (15%).
  - Automatically flags syntax errors, dangerous introduced patterns (`eval`, `exec`, `shell=True`), and assigns recommendation (`accept`, `reject`, `needs_review`).
- **Verification Ladder & Composite Confidence Scoring (`app.patcher.confidence`)**:
  - Strictly caps confidence scores by verification tier: `V4 (Proven)` max 100, `V3 (Verified)` max 85, `V2 (Executed)` max 65, `V1 (Static)` max 45, `V0 (Unverified)` max 30.
  - Computes composite priority scores combining capped confidence with vulnerability severity.
- **Reproducer Agent (`app.patcher.reproducer`)**:
  - Synthesizes minimal trigger inputs to confirm defect reproduction in the sandbox before patch evaluation.
- **Automated Test Generator (`app.patcher.test_generator`)**:
  - Generates language-specific targeted unit test harnesses (Python `unittest` / JS assertions) asserting defect remediation.
- **Patch Review Screen Redesign (`/patches/[id]`)**:
  - Dynamic Candidate Switcher: Tabbed selector switching between Candidate 1 (Minimal Diff), Candidate 2 (Defensive Guard), and Candidate 3 (Comprehensive).
  - Left: Interactive Diff Viewer with Origin (Amber), Crash (Red), and Patch (Emerald) line highlights.
  - Right: Proof-Carrying Bundle, Per-Hunk "Why" Card, Critic Evaluation metrics (Correctness, Safety, Minimality, Side-Effects), and Blast Radius Impact card.
  - Sticky Action Bar: Reviewer rationale note input with `Needs Review`, `Reject Patch`, and `Accept & Branch` actions.
- **Expanded Verification Suites**:
  - 69 pytest tests passing with 83% coverage and 100% clean Ruff linting.
  - 18 Playwright and Axe accessibility audits passing with 0 critical/serious violations.

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
