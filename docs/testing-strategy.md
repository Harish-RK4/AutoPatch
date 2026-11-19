# Testing Strategy & Quality Assurance

AutoPatch uses a comprehensive multi-layered test pyramid to ensure total reliability.

## Test Layers

### 1. Static Checks & Linters
- **TypeScript**: Strict mode type checking with `tsc --noEmit`.
- **Python**: Static analysis with `ruff` and strict typing checks.
- **Secret & Dependency Audits**: Pre-commit secret scanning to prevent credential leakage.

### 2. Unit Tests
- **Backend**: Pytest suite covering LLM Router routing logic, rate-limiters, response caching, token budgeting, secret redaction, and in-memory queue fallback.
- **Frontend**: Vitest / React Testing Library verifying component states, token fidelity, and demo isolation guards.

### 3. API Contract & Integration Tests
- Validates FastAPI routes against OpenAPI specifications.
- Tests database migrations from clean-room state.
- Ensures RLS blocks unauthorized cross-user queries.

### 4. End-to-End & Smoke Tests
- Automated browser smoke runner verifying full 5-stage pipeline stepper.
- Ensures failure resilience under simulated 429 rate-limiting, network drops, and corrupted uploads.

### 5. Phase-Gate Verification Standard
Every development phase terminates in a mandatory 10-step verification gate covering clean rebuilds, regressions, accessibility checks, and performance latencies.
