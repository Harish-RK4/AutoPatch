# System Design Specification

## Overview
AutoPatch automates the identification, diagnosis, and patching of software defects across polyglot repositories and datasets.

## Component Decomposition

### 1. Ingestion & Preprocessing (Stage 1: UPLOAD)
- Accepts single files, directory archives (zip/tar), or Git repository references.
- **Language Detection Engine**: Inspects file extensions, shebang lines, build manifests (`package.json`, `pom.xml`, `requirements.txt`, `Cargo.toml`), and tree-sitter grammar probes.
- Polyglot workspaces are partitioned into per-file analysis targets.

### 2. Static Analysis & Flaw Hunting (Stage 2: SCAN)
- **AST Indexer**: Constructs AST graphs, call graphs, and caller/callee trees using tree-sitter.
- **Static Rules Engine**: Integrates open-source linters (Semgrep, Bandit, Flake8/ESLint).
- **Candidate Generator**: Queries the LLM Router for suspected logical bugs, resource leaks, edge-case vulnerabilities, and unhandled branches.

### 3. Root Cause Engine (Stage 3: EXPLAIN)
- Distinguishes **Origin Line** (where corrupted state or improper input originates) from **Crash Line** (where runtime exception occurs).
- Extracts minimal reproducing inputs.
- Synthesizes multi-audience explanations:
  - **Beginner**: High-level analogy and logic explanation.
  - **Developer**: Technical call stack and variable trace analysis.
  - **Manager**: Business risk assessment and operational impact.

### 4. Patch Synthesis (Stage 4: FIX)
- Generates 3 to 5 minimal patch candidates isolated to git branches.
- Enforces strict hunk localization: fixes only the buggy hunk without restructuring unrelated code.
- **Critic Agent**: Cross-evaluates proposed diffs using an independent model to reject regressions, hidden changes, or superficial bug suppression.

### 5. Verification & Sandboxing (Stage 5: TEST)
- **Runtime Resolver**: Selects official Docker base image for target runtime, provisions dependency cache, and disables all networking.
- **Test Generation**: Generates regression tests in native framework (`pytest`, `jest`, `cargo test`) or constructs a golden differential I/O harness.
- Assigns honest **Verification Ladder** rating (`V0` through `V4`).
