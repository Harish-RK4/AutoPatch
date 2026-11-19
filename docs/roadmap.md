# AutoPatch Roadmap

AutoPatch is implemented across 10 progressive phases, gated by clean-room verification.

| Phase | Target Milestone | Status | Key Deliverable |
| :--- | :--- | :--- | :--- |
| **P0** | Demo Shell & Foundation | In Progress | Isolated `/demo` module, Next.js UI, FastAPI mock backend, design tokens. |
| **P1** | Core Ingestion & Analysis | Planned | Real file upload, tree-sitter AST, Semgrep/Bandit scan, sandbox execution. |
| **P2** | Trust & Verification Ladder | Planned | Auto test generator, Docker sandbox with network isolation, V0-V4 badges. |
| **P3** | Free LLM Router Complete | Planned | Multi-provider adapters (Gemini, Groq, Mistral), fallback chain, local Ollama. |
| **P4** | Universal Dataset Engine | Planned | CSV/JSON/Parquet profiling, cleaning scripts, Great Expectations invariants. |
| **P5** | Fix Explanation Engine | Planned | Crash vs Origin line isolation, backward slice, hunk cards, 3 explanation modes. |
| **P6** | Supabase Persistence & RLS | Planned | Production PostgreSQL cutover, RLS policies, Storage buckets, Realtime events. |
| **P7** | FCM Push Notifications | Planned | Web push service worker, background notifications, user preference toggles. |
| **P8** | Production Ecosystem | Planned | GitHub PR bot, crash-to-fix intake endpoint, repository memory system. |
| **P9** | Hardening & Benchmarks | Planned | SWE-bench Lite / BugsInPy evaluation, automated risk policy, one-click rollback. |
