# AutoPatch – Autonomous Software Bug Detection and Repair System

> Built on the foundational principle of **Build for Trust**. AutoPatch inspects, localizes, repairs, and formally proves defects in polyglot codebases and datasets inside isolated sandboxes before developer approval.

[![Production Frontend](https://img.shields.io/badge/Vercel-Live%20App-000000?style=for-the-badge&logo=vercel&logoColor=white)](https://frontend-theta-two-44.vercel.app)
[![Production Backend](https://img.shields.io/badge/Render-FastAPI%20Live-46E3B7?style=for-the-badge&logo=render&logoColor=white)](https://autopatch-9kk9.onrender.com)
[![API Docs](https://img.shields.io/badge/Swagger-API%20Docs-85EA2D?style=for-the-badge&logo=swagger&logoColor=black)](https://autopatch-9kk9.onrender.com/docs)
[![CI Backend](https://img.shields.io/badge/pytest-120%20passed-10b981.svg)](docs/BENCHMARKS.md)
[![Verification Ladder](https://img.shields.io/badge/Verification%20Ladder-V0%20to%20V4%20Proven-0f766e.svg)](#the-verification-ladder)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

### 🌐 Live Production Deployments
- **Frontend App (Vercel)**: [https://frontend-theta-two-44.vercel.app](https://frontend-theta-two-44.vercel.app)
- **Backend API (Render)**: [https://autopatch-9kk9.onrender.com](https://autopatch-9kk9.onrender.com)
- **Interactive API Swagger Docs**: [https://autopatch-9kk9.onrender.com/docs](https://autopatch-9kk9.onrender.com/docs)
- **Backend Health Check**: [https://autopatch-9kk9.onrender.com/health](https://autopatch-9kk9.onrender.com/health)

---

## Architecture & System Overview

AutoPatch implements a complete closed-loop pipeline for autonomous bug discovery, root-cause isolation, multi-candidate repair synthesis, dual-sandbox differential testing, and formal invariant verification.

```
                    ┌──────────────────────────────────────────────┐
                    │               UNIVERSAL INTAKE               │
                    │  Code Repo / Single File / Dataset / Trace   │
                    └──────────────────────┬───────────────────────┘
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │     POLYGLOT DETECTOR & CALL-GRAPH INDEX     │
                    │ Tree-sitter AST, Symbol Tables, Dependencies │
                    └──────────────────────┬───────────────────────┘
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │           STATIC & SECURITY SCANNER          │
                    │   CWE/OWASP Tagging + OSV.dev Manifest Audit │
                    └──────────────────────┬───────────────────────┘
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │          REPRODUCER & LOCALIZATION           │
                    │  Crash vs Origin Line, Variable Trace, Slice │
                    └──────────────────────┬───────────────────────┘
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │         MULTI-CANDIDATE REPAIR ENGINE        │
                    │  1. Minimal Diff  2. Guard  3. Safe Alt      │
                    └──────────────────────┬───────────────────────┘
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │           DUAL SANDBOX VERIFICATION          │
                    │  Pre-patch Repro Fail -> Post-patch Pass     │
                    │  Differential & Regression Suites Passed     │
                    └──────────────────────┬───────────────────────┘
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │             VERIFICATION LADDER              │
                    │   V4 Proven | V3 Verified | V2 Executed      │
                    │          V1 Static | V0 Unverified           │
                    └──────────────────────┬───────────────────────┘
                                           │
                                           ▼
                    ┌──────────────────────────────────────────────┐
                    │        REVIEW & REPOSITORY MEMORY            │
                    │  Accept -> Branch / PR Bot / Rollback        │
                    └──────────────────────────────────────────────┘
```

---

## The Verification Ladder

AutoPatch enforces strict mathematical and execution integrity. A patch is **never** presented as proven simply because an LLM generated it. Every candidate carries a Verification Tier badge that strictly caps confidence:

| Tier | Badge | Max Confidence | Invariant & Proof Requirements |
| :--- | :--- | :--- | :--- |
| **V4** | `V4 Proven` | **100%** | Defect reliably reproduced by a failing test in isolated sandbox; patch makes it pass; full test suite passes; static analysis clean. |
| **V3** | `V3 Verified` | **85%** | Defect reproduced by an autonomously generated harness; patch passes generated and differential property-based tests. |
| **V2** | `V2 Executed` | **65%** | Code builds and executes; smoke and golden input/output tests show zero regressions; bug not directly reproduced. |
| **V1** | `V1 Static` | **45%** | Code parses and compiles; linters and type checkers pass; independent Critic model cross-reviews and approves. |
| **V0** | `V0 Unverified`| **30%** | Static heuristic analysis and patch recommendation only; runtime environment unavailable. |

---

## Core Capabilities

### 1. Universal Polyglot Ingestion & AST Call-Graph
- **Language Coverage**: Python, TypeScript, JavaScript, Go, Rust, Java, C/C++, Ruby, PHP, SQL, Shell, Dockerfiles, and CI YAML.
- **Safe Extraction**: Zip-slip path traversal attack rejection and zip-bomb decompression limits (100:1 ratio cap, 100MB ceiling).
- **Deep Indexing**: Python AST visitor and JS regex parser extracting classes, functions, decorators, parameters, import maps, and cyclomatic complexity.

### 2. Universal Dataset Engine & Invariant Verification
- **Multi-Format Sniffer**: Native support for CSV, TSV, JSON, JSONL, SQLite, XML, YAML, and text tables.
- **Non-Destructive Repairs**: Original dataset files are strictly immutable; AutoPatch generates a clean copy and a standalone, repeatable Python/pandas script.
- **Four Mathematical Proof Invariants**:
  1. *Row Lineage*: Every output row traces to an input row or documented deduplication drop (`output_rows <= input_rows`).
  2. *Cell Identity*: Untouched valid cells remain byte-level identical.
  3. *Idempotency*: Re-running the cleaning script produces identical output (`clean(clean(D)) == clean(D)`).
  4. *Validation Rules*: Generated Great Expectations / Pandera style assertions pass 100%.

### 3. Explainable Program Repair & Scoped Assistant
- **Line Localisation**: Distinguishes `origin_line` (where invalid input enters) from `crash_line` (where failure occurs).
- **Execution Trace & Slice**: Step-by-step chronological variable mutations and backward data-flow dependency slicing.
- **Three Switchable Explanations**: Beginner (plain analogy), Developer (technical invariant reasoning), and Manager (business risk & ROI).
- **Per-Hunk "Why" Cards**: Explains why original code was wrong, why replacement works, and potential blast-radius side effects.
- **Interactive Scoped Q&A**: Scoped defect chatbot (`POST /api/v1/bugs/{id}/ask`) answering questions with codebase context.

### 4. Free-Tier-Friendly LLM Router
Operates with **zero paid API keys required**:
- **Supported Adapters**:
  - **Google Gemini**: Native OpenAI-compatible streaming adapter (`gemini-3.5-flash-lite`).
  - **Groq**: Ultra-low-latency LLaMA and Qwen inference (`qwen/qwen3.8-27b`).
  - **Ollama**: Local air-gapped models (`qwen2.5-coder:7b`) for Private Mode.
  - **Deterministic Mock Provider**: 100% offline fixture responses ensuring tests pass without network access.
- **Reliability Bus**:
  - Sliding-window token-bucket rate limiter enforcing per-provider RPM and TPM caps.
  - Automatic fallback chain (`Gemini -> Groq -> Ollama -> Mock`).
  - SHA-256 prompt-response cache preventing redundant quota consumption.

### 5. Pluggable Database & Supabase Swap
- **Pluggable Auth (`IAuthProvider`)**: Seamlessly hot-swap between 1-click Demo Mode and production Supabase Auth.
- **PostgREST Repository**: Asynchronous database and storage operations (`/storage/v1/object/{bucket}/{path}`) with automatic in-memory fallback.

### 6. Firebase Cloud Messaging (FCM) & Web Push
- **Background Service Worker**: `public/firebase-messaging-sw.js` handles background push alerts with interactive action buttons ("Review Patch", "Dismiss").
- **Multi-Platform Device Registry**: Registers and unregisters web push tokens with automatic simulation fallback.

### 7. Product Features & CI Integrations
- **Repository Memory (`app.memory.repo_memory`)**: Learns from accepted and rejected patches, feeding stylistic preferences into future Critic evaluations.
- **Security Mode & OSV.dev**: Automated CWE/OWASP Top 10 tagging and open-source dependency vulnerability auditing.
- **Crash-to-Fix Intake (`POST /api/v1/intake/crash`)**: Ingests raw multiline stack traces and Sentry webhook events.
- **GitHub PR Bot Webhook (`POST /api/v1/webhook/github`)**: Generates automated PR review comments with Verification Ladder badges.
- **One-Click Rollback (`POST /api/v1/patches/{id}/rollback`)**: Reverses unified diffs and creates an inverse branch.

---

## Route Map

| Route | Purpose | Key Features |
| :--- | :--- | :--- |
| `/` | Landing page | "Build for Trust" manifesto, Marks Calculator proof preview, theme toggle |
| `/login` | Auth gate | 1-Click Demo Login (`demo@autopatch.dev`), Supabase cloud auth |
| `/dashboard` | Bento control room | Verification Pulse arc gauge, computed sparklines, recent activity stream |
| `/projects` | Project directory | Polyglot targets, filter pills (`All`, `User Uploads`, `Demo Fixtures`) |
| `/projects/new` | Ingestion workspace | 3-tab uploader (`?tab=code`, `?tab=dataset`, `?tab=paste`) |
| `/projects/[id]` | Pipeline stepper | 5-step stepper, AST symbol table, syntax viewer, defect queue |
| `/projects/[id]/dataset` | Dataset inspection | 4 invariant pulse cards, row diff table, repeatable script viewer |
| `/bugs` | Defect inventory | Severity badges, origin/crash line tags, verification proof status |
| `/bugs/[id]` | Diagnostic report | Interactive stack trace, execution timeline, 3-tier tabs, "Ask AutoPatch" chat |
| `/patches` | Candidate list | Multi-candidate comparison, Verification Ladder badges, ranking |
| `/patches/[id]` | Patch review | Monaco split diff, per-hunk "why" cards, critic breakdown, review actions |
| `/settings` | Services & quotas | Live provider ping, latency metrics, switchable LLM and Auth modes |

---

## Quickstart & Verification

### 1. Prerequisites
- **Node.js**: v20+ LTS (Tested on v24)
- **Python**: v3.11+ (Tested on v3.12)
- **Git**: v2.30+

### 2. Environment Setup
```bash
# Clone the repository
git clone https://github.com/Harish-RK4/AutoPatch.git
cd AutoPatch

# Copy default environment
cp .env.example .env
```

To configure free LLM providers, add your free API keys to `.env`:
```ini
LLM_MODE=free
GEMINI_API_KEY=your_gemini_key_here
GROQ_API_KEY=your_groq_key_here
```
*(If no keys are provided, AutoPatch defaults to `LLM_MODE=mock` and runs 100% locally with deterministic fixtures).*

### 3. Backend Setup & Test Suite
```bash
cd backend
python -m venv .venv

# On Windows:
.\.venv\Scripts\Activate.ps1
# On Linux/macOS:
source .venv/bin/activate

pip install -r requirements.txt

# Run the 110-test unit & integration test suite
pytest

# Verify code formatting and linting
ruff check .
```

### 4. Frontend Setup & Verification
```bash
cd ../frontend
npm install

# Verify TypeScript types
npx tsc --noEmit

# Build production bundle
npm run build
```

### 5. Run the Autonomous Benchmark Suite
```bash
cd ..
python scripts/run_benchmarks.py
```
*(Generates the performance report in `docs/BENCHMARKS.md` measuring polyglot accuracy, AST extraction, explanation synthesis, and dataset mathematical proofs).*

### 6. Starting Development Servers
```bash
# Terminal 1: Backend API (port 8000)
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

# Terminal 2: Frontend Next.js (port 3000)
cd frontend
npm run dev
```

Visit `http://localhost:3000` to launch the AutoPatch Control Room.

---

## Benchmark Results Snapshot

| Benchmark Component | Measured Value | Performance Target | Status |
| :--- | :--- | :--- | :--- |
| **Polyglot Ingestion** | **100.0% Accuracy** | >= 95% | ✅ PASS |
| **AST Symbol Indexing** | **0.39 ms** | < 50 ms | ✅ PASS |
| **Fix Explanation Engine** | **0.06 ms** | < 100 ms | ✅ PASS |
| **Dataset Invariant Proofs** | **4 / 4 Invariants Passing** | 4 / 4 | ✅ PASS |
| **Verification Level** | **V4 Proven (100% Conf)** | V4 Proven | ✅ PASS |
| **Backend Test Suite** | **110 / 110 Tests Passing** | 100% | ✅ PASS |
| **Frontend Type Safety** | **0 Errors (`tsc --noEmit`)** | 0 Errors | ✅ PASS |

Full detailed metrics are recorded in [`docs/BENCHMARKS.md`](docs/BENCHMARKS.md).

---

## Cloud Production Deployment (Vercel & Render)

AutoPatch is fully configured for automated cloud deployment with zero localhost dependency.

### Architecture Overview
- **Frontend**: Next.js 16 deployed on **Vercel** with edge routing, automatic SSL, and global CDN.
- **Backend**: FastAPI web service deployed on **Render** with automatic health check polling (`/health`) and CI/CD blueprints (`render.yaml`).
- **Database & Auth**: **Supabase** PostgreSQL with Row Level Security (RLS), real-time WebSockets, and OAuth authentication.
- **AI Engine**: **Google Gemini 3.5 Flash** and **Groq Qwen 2.5/3.8** for sub-millisecond AST bug repair and patch synthesis.

### 1. Backend Deployment on Render
1. Connect your GitHub repository (`Harish-RK4/AutoPatch`) in [Render Dashboard](https://dashboard.render.com).
2. Choose **Blueprint** and select `render.yaml` (or create a new **Web Service** with `rootDir: backend`).
3. Set the following environment variables:
   - `APP_ENV`: `production`
   - `DEMO_MODE`: `false`
   - `NEXT_PUBLIC_AUTH_MODE`: `supabase`
   - `SANDBOX_MODE`: `docker`
   - `LLM_MODE`: `free`
   - `GEMINI_API_KEY`: `<your-gemini-api-key>`
   - `GROQ_API_KEY`: `<your-groq-api-key>`
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://qqgwmkqfdoayiblculhf.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `sb_publishable_GhU7u75Vua_I4FyE8DuW3Q_tkjuVm01`
   - `SUPABASE_SERVICE_ROLE_KEY`: `<your-supabase-service-role-key>`
   - `DATABASE_URL`: `postgresql://postgres.qqgwmkqfdoayiblculhf:[PASSWORD]@aws-1-ap-northeast-1.pooler.supabase.com:5432/postgres`
   - `ALLOWED_ORIGINS`: `https://autopatch.vercel.app,https://<your-vercel-domain>.vercel.app`
4. Deploy the service. The live backend URL will be provided by Render (e.g., `https://autopatch-backend.onrender.com`).

### 2. Frontend Deployment on Vercel
1. Import repository `Harish-RK4/AutoPatch` in [Vercel Dashboard](https://vercel.com/new).
2. Set **Root Directory** to `frontend`.
3. Configure Environment Variables:
   - `NEXT_PUBLIC_API_URL`: Your Render backend live URL (e.g., `https://autopatch-backend.onrender.com`)
   - `NEXT_PUBLIC_AUTH_MODE`: `supabase`
   - `APP_ENV`: `production`
   - `NEXT_PUBLIC_SUPABASE_URL`: `https://qqgwmkqfdoayiblculhf.supabase.co`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: `sb_publishable_GhU7u75Vua_I4FyE8DuW3Q_tkjuVm01`
   - `SUPABASE_SERVICE_ROLE_KEY`: `<your-supabase-service-role-key>`
   - `GOOGLE_CLIENT_ID`: `9251047750-mktoc44alquphuugsj5u11aklgkaahql.apps.googleusercontent.com`
   - `GOOGLE_CLIENT_SECRET`: `<your-google-client-secret>`
   - `NEXT_PUBLIC_GOOGLE_CLIENT_ID`: `9251047750-mktoc44alquphuugsj5u11aklgkaahql.apps.googleusercontent.com`
4. Click **Deploy**. Vercel will build the optimized production bundle and issue a live public URL.

### 3. Supabase Auth Redirect Configuration
Add your production Vercel URL to the Supabase Dashboard -> Authentication -> URL Configuration -> Redirect URLs:
- `https://<your-vercel-app>.vercel.app/auth/callback`
- `https://<your-vercel-app>.vercel.app`

---

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
