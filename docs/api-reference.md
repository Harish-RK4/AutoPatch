# API Reference

AutoPatch exposes a RESTful API built with FastAPI. All endpoints return standardized JSON structures.

## Base URL
- Local: `http://localhost:8000/api/v1`

## Endpoints

### 1. System & Health
- `GET /health`: System health status and active services.
- `GET /settings/llm`: Configured LLM providers, active routing table, and connectivity status.
- `POST /settings/llm/test`: Trigger live connection test to a specific LLM provider.

### 2. Projects
- `POST /projects`: Create a new project (Upload / Git clone / Demo seed).
  - *Request Body*: `{ "name": string, "source_type": "upload" | "git" | "demo", "repo_url"?: string }`
  - *Response*: `{ "id": UUID, "name": string, "status": string, "created_at": string }`
- `GET /projects`: List all accessible projects for authenticated user.
- `GET /projects/{id}`: Retrieve project details and current pipeline stage.

### 3. Pipeline Execution
- `POST /projects/{id}/scan`: Trigger pipeline execution (Upload -> Scan -> Explain -> Fix -> Test).
- `GET /projects/{id}/bugs`: List prioritized bugs identified in a project.
  - *Query Params*: `severity`, `verification_level`, `category`, `limit`, `offset`
- `GET /bugs/{id}`: Detailed bug report containing 6 sections: Bug Details, Root Cause, Suggested Patch, Test Results, Severity & Confidence, Change History.

### 4. Patch Review & Decision
- `POST /bugs/{id}/reproduce`: Run or regenerate sandboxed reproduction test.
- `POST /bugs/{id}/patch`: Generate candidate patches.
- `POST /patches/{id}/verify`: Execute full test suite against proposed candidate patch.
- `POST /patches/{id}/decision`: Record human developer decision.
  - *Request Body*: `{ "action": "accept" | "reject" | "needs_review", "note": string }`
- `POST /patches/{id}/rollback`: Revert accepted patch branch cleanly.

### 5. Diagnostics & Assistance
- `POST /bugs/{id}/ask`: Contextual Q&A agent scoped to the bug and affected codebase.
- `POST /intake/crash`: Ingest raw stack traces or Sentry events to trigger reproduction.
- `POST /devices`: Register FCM client token for real-time notifications.
