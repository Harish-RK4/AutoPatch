# AutoPatch Architecture & Technical Specification

AutoPatch is an autonomous bug detection and program repair system designed on the principle of **Build for Trust**. It verifies every defect and generated patch through automated sandboxed test execution.

## 1. High-Level System Architecture

```text
+-----------------------------------------------------------------------------------+
|                                  User Interface                                   |
|               Next.js App Router | Tailwind CSS | Monaco Diff Editor              |
+-----------------------------------------------------------------------------------+
                                          │
                                 HTTPS / REST / SSE
                                          ▼
+-----------------------------------------------------------------------------------+
|                               Backend Services                                    |
|                       FastAPI Python 3.12+ Web Server                             |
|                                                                                   |
|  ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────────────────────┐  |
|  │  Auth Adapter    │  │  Job Queue       │  │  LLM Router                     │  |
|  │  (Demo / Supa)   │  │  (In-Memory/Redis│  │  (Mock / Free Providers/Ollama) │  |
|  └──────────────────┘  └──────────────────┘  └─────────────────────────────────┘  |
+-----------------------------------------------------------------------------------+
       │                         │                               │
       ▼                         ▼                               ▼
┌──────────────┐       ┌──────────────────┐            ┌──────────────────┐
| PostgreSQL   |       | Docker Sandbox   |            | External Free    |
| Database &   |       | Execution Engine |            | Providers        |
| RLS Policies |       | (Zero Network)   |            | (Gemini/Groq)    |
└──────────────┘       └──────────────────┘            └──────────────────┘
```

## 2. Fixed Product Flow

The pipeline executes in five sequential stages, visible through the persistent UI stepper:
1. **UPLOAD**: Ingest source code, archives, Git repos, or structured datasets. Sniff file format and language.
2. **SCAN**: AST indexing (tree-sitter), static security analysis (Semgrep/Bandit), and heuristic flaw detection.
3. **EXPLAIN**: Trace root cause, isolate origin line vs. crash line, capture stack traces, and summarize in Beginner/Developer/Manager modes.
4. **FIX**: Generate minimal, isolated candidate patches avoiding unrelated code modifications.
5. **TEST**: Execute existing and automatically synthesized tests in an isolated sandbox, ranking candidates by test resolution and diff size.

## 3. Verification Ladder

Patches carry a tamper-proof verification level (`V0` to `V4`) that caps the maximum confidence score:
- **V4 (Proven - Max 100)**: Defect reproduced by failing test; patch passes repro test; regression suite clean; static scan clean.
- **V3 (Verified - Max 85)**: Defect reproduced by generated test; passes generated and differential tests.
- **V2 (Executed - Max 65)**: Code builds and runs; smoke and golden I/O tests show zero regression; bug not directly reproduced.
- **V1 (Static - Max 45)**: Parses/compiles clean; linter and type-checker pass; cross-model review consensus.
- **V0 (Unverified - Max 30)**: Theoretical analysis only without runtime verification.

## 4. LLM Router Architecture

AutoPatch operates on zero-cost free and local AI models without requiring paid API keys:
- **Mock Provider**: Deterministic local fixture provider allowing unit tests and demo mode to execute with 0 network calls and 0 keys.
- **Free Multi-Provider Router**: Dynamic routing across Google Gemini, Groq, Mistral/Codestral, and OpenRouter with automatic 429/timeout fallback chains.
- **Private Mode**: Routes all traffic to local Ollama (`qwen2.5-coder:7b`) with complete zero-data-leakage guarantees.
- **Secret Redaction**: Pre-flight regex and token scanners scrub API keys, credentials, and PII before requests leave the host.

## 5. Strict Demo Isolation & Production Guard

- All demo fixtures, seed data, and demo authentication live exclusively within the `/demo` module.
- Production code paths never import from `/demo`.
- Build-time guards reject deployment if `DEMO_MODE=true` when running under `NODE_ENV=production` or `APP_ENV=production`.

## 6. Pluggable Sandbox & Ingestion Architecture (Phase P1)

AutoPatch decouples code execution through the `SandboxRunner` abstraction:
- **`DockerSandboxRunner`**: Production standard using air-gapped containers (`--network none`), read-only rootfs (`--read-only`), non-root execution (`--user 1000:1000`), CPU quotas (`--cpus=1.0`), and RAM caps (`--memory=512m`).
- **`LocalSubprocessSandboxRunner`**: Development fallback when Docker is unavailable on the local host. Features:
  - Ephemeral scratch directories (`tempfile.mkdtemp`) with guaranteed cleanup.
  - Process timeout management (`subprocess.TimeoutExpired`).
  - Output byte capping (256KB) preventing buffer bloat.
  - Strict environment scrubbing (zero host API keys, secrets, or database URLs inherited by child processes).
  - Explicit UI and API transparency labeling (`Local Dev Subprocess (Not Network-Isolated — Docker Unavailable)`).
- **Fail-Fast Production Startup Guard**: Startup rejects `SANDBOX_MODE=local_dev` when `APP_ENV=production`.
- **Security-Hardened Archive Ingestion (`SafeArchiveIngester`)**: Rejects zip-slip path traversal sequences (`..`), enforces 100:1 decompression ratio caps (zip-bomb defense), and enforces a 100MB uncompressed extraction limit.
- **Polyglot Detector & AST Indexer**: Auto-detects polyglot languages/formats, parses ASTs (Python `ast`, JS parser), and builds function symbol tables and call graph hierarchies.
