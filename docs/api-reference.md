# API Reference

AutoPatch exposes a RESTful API built with FastAPI. All endpoints return standardized JSON structures.

## Base URL
- Local: `http://localhost:8000/api/v1`

## Endpoints

### 1. System & Health
- `GET /health`: System health status and active services.
- `GET /settings/llm`: Configured LLM providers, active routing table, and connectivity status.
- `POST /settings/llm/test`: Trigger live connection test to a specific LLM provider.

### 2. Projects & Ingestion
- `POST /projects`: Create a new project from user code snippet, single file, or dataset.
  - *Request Body*: `{ "name": string, "source_type": "upload" | "dataset" | "paste" | "git", "filename"?: string, "content"?: string, "error_trace"?: string }`
- `POST /projects/upload-archive`: Upload a `.zip` archive with security guards (zip-slip traversal rejection, zip-bomb ratio checks), automatic polyglot detection, and AST symbol indexing.
  - *Form Data*: `archive` (file, `.zip`), `name` (string)
  - *Response*: `ProjectResponse` with parsed files and AST indexes.
- `GET /projects`: List all accessible projects (`filter_mode`: `all` | `user` | `demo`).
- `GET /projects/{id}`: Retrieve project details, indexed files, and pipeline run status.

### 3. Pipeline Execution
- `POST /projects/{id}/pipeline`: Execute full 5-step autonomous core loop (`UPLOAD -> SCAN -> EXPLAIN -> FIX -> TEST`) inside active `SandboxRunner`.
  - *Response*: Pipeline result with real measured sandbox latency (`total_sandbox_duration_ms`), active runner label, detected flaws, and synthesized patches with unified diffs.
- `POST /projects/{id}/scan`: Trigger asynchronous pipeline scan job.
- `GET /projects/{id}/bugs`: List real detected flaws for the project.
- `GET /bugs`: List all active defects across user runs and demo fixtures.
- `GET /bugs/{id}`: Detailed 6-section bug report.

### 4. Patch Review & Decision
- `GET /patches`: List all active synthesized patches and demo patch candidates.
- `GET /patches/{id}`: Retrieve patch candidate details with unified diff and sandbox proof metadata.
- `POST /bugs/{id}/reproduce`: Run or regenerate sandboxed reproduction test.
- `POST /bugs/{id}/patch`: Generate candidate patches.
- `POST /patches/{id}/verify`: Execute full test suite against proposed candidate patch in sandbox.
- `POST /patches/{id}/decision`: Record human developer decision (`accept` | `reject` | `needs_review`).
- `POST /patches/{id}/rollback`: Revert accepted patch branch cleanly.

### 5. Diagnostics & Assistance
- `POST /bugs/{id}/ask`: Contextual Q&A agent scoped to the bug and affected codebase.
- `POST /intake/crash`: Ingest raw stack traces or Sentry events to trigger reproduction.
- `POST /devices`: Register FCM client token for real-time notifications.
