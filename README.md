# AutoPatch

> Autonomous Software Bug Detection and Repair System built on the principle of **Build for Trust**.

AutoPatch ingests source code across languages, configs, and datasets, finds bugs, isolates root causes, synthesizes minimal patches, and executes test suites inside an isolated sandbox to verify fixes before human developer approval.

---

## Key Features

- **Universal Polyglot Analysis**: Inspects code in any language, SQL, Dockerfiles, and structured datasets without hardcoded limits.
- **Verification Ladder (V0–V4)**: Patches carry an honest verification badge backed by concrete test execution.
- **Zero-Paid-Key Architecture**: LLM Router supports free-tier providers (Gemini, Groq, Mistral) and local Ollama, with a deterministic Mock Provider for offline testing.
- **Explainable Program Repair**: Interactive stack traces, frame mapping, origin line vs. crash line isolation, and three-tier explanations (Beginner, Developer, Manager).
- **Strict Demo Isolation**: Seed data lives strictly inside `/demo` and is barred from production execution.

---

## Quickstart (Phase P0 Local Setup)

### 1. Prerequisites
- **Node.js**: v20+ LTS (Tested on v24.14+)
- **Python**: v3.11+ (Tested on v3.14+)
- **Git**: v2.30+

### 2. Clone and Setup Environment
```bash
git clone https://github.com/Harish-RK4/AutoPatch.git
cd AutoPatch

# Copy environment configuration
cp .env.example .env
```

### 3. Verify Configuration
Run the environment and credentials verification check:
```bash
npm run check:env
```

### 4. Install Dependencies
```bash
# Frontend dependencies
cd frontend
npm install

# Backend dependencies
cd ../backend
python -m venv .venv
# Windows PowerShell:
.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 5. Run the Application (P0 Demo Mode)
In demo mode, no external keys or databases are required:
```bash
# Run backend (from backend directory)
uvicorn app.main:app --reload --port 8000

# Run frontend (from frontend directory)
npm run dev
```

Visit `http://localhost:3000` to access the application starting page. Explore the live interactive defect demo, review the 5-step pipeline, and log into the demo portal (`http://localhost:3000/login`) using:
- **Email**: `demo@autopatch.dev`
- **Password**: `Demo@1234`

### Application Routes & Navigation
- `/`: AutoPatch starting page with "Build for Trust" overview, 5-stage workflow, and code-to-proof preview.
- `/dashboard`: Engineering dashboard with active workspaces and verification metrics.
- `/projects`: Multi-language workspaces inventory (`/projects/demo-proj-001`).
- `/bugs`: Defect inventory with origin/crash lines and confidence rankings (`/bugs/demo-bug-001`).
- `/patches`: Patch review panel with split diff viewer and proof bundles (`/patches/demo-patch-001`).
- `/history`: Audit & change history with rollback (Designed empty state for P0).
- `/analytics`: Telemetry and defect intelligence dashboard (Designed empty state for P0).
- `/settings`: LLM engine routing table (`llm_routing.yaml`), provider quotas, and connection testing.

---

## Testing & Quality Assurance

Run the test suite across frontend and backend:
```bash
# Backend pytest suite (with LLM_MODE=mock)
cd backend
pytest -v

# Frontend test suite
cd ../frontend
npm test

# End-to-end smoke test
npm run smoke
```

---

## License

Licensed under the Apache License, Version 2.0. See [LICENSE](LICENSE) for details.
