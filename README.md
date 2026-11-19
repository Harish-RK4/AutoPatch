# AutoPatch

> Autonomous Software Bug Detection and Repair System built on the principle of **Build for Trust**.

AutoPatch ingests source code across languages, configs, and datasets, finds bugs, isolates root causes, synthesizes minimal patches, and executes test suites inside an isolated sandbox to verify fixes before human developer approval.

---

## Key Features

- **Universal Polyglot Ingestion**: Upload source files, tabular datasets (CSV/JSON/SQL), or pasted snippets without language boundaries (`/projects/new`).
- **Bento Control-Room Dashboard**: High-density engineering control room featuring a sleek top pill dock, ambient sunlit-cream canvas, Verification Pulse arc gauge, and real computed sparklines (`/dashboard`).
- **Verification Ladder (V0–V4)**: Every patch carries an honest verification rating capped strictly by sandbox test results (`V4 Proven` down to `V0 Unverified`).
- **Explainable Program Repair**: Origin line vs. crash line isolation, three-tier explanations (Beginner, Developer, Manager), and per-hunk "why" cards.
- **Strict Demo Isolation & No Fake Data**: Seed data lives strictly inside `/demo` behind demo guards; real user uploads are handled without fabricated stats or hallucinated bugs.
- **Zero-Cloud-Key Architecture**: Local `MockLLMProvider` and Ollama support enable 100% offline development and testing.

---

## Route Overview

| Route | Purpose | Access |
|---|---|---|
| `/` | Landing page, "Build for Trust" manifesto, Marks Calculator preview | Public |
| `/login` | Sign In, Sign Up, and 1-Click Quick Demo Sign In | Public |
| `/dashboard` | Bento Control Room, Verification Pulse, sparklines & stream | Authenticated |
| `/projects` | Workspace target list with filter pills (`All`, `My Ingestions`, `Demo Seed`) | Authenticated |
| `/projects/new` | Universal Ingestion Workspace (Upload Code, Upload Dataset, Paste Error) | Authenticated |
| `/projects/:id` | Workspace 5-stage stepper, file index, syntax viewer, and bug list | Authenticated |
| `/bugs` | Defect inventory with origin/crash lines and proof status | Authenticated |
| `/bugs/:id` | 6-section defect diagnostic report with 3-tier audience explanations | Authenticated |
| `/patches` | Synthesized minimal diff candidate list and ranking | Authenticated |
| `/patches/:id` | Monaco-style split diff viewer, per-hunk "why" card, and sign-off toolbar | Authenticated |
| `/settings` | LLM router connectivity table, role mapping, and provider tests | Authenticated |

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

### 3. Install Dependencies
```bash
# Frontend dependencies
cd frontend
npm install

# Backend dependencies
cd ../backend
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
```

### 4. Run Verification & Phase Gate
```bash
# Run backend tests and coverage
cd backend
python -m pytest --cov=app

# Run backend linter
python -m ruff check .

# Run frontend build and production demo guard
cd ../frontend
npm run build

# Run Playwright + Axe accessibility suite
node scripts/verify-routes-axe.js
```

### 5. Start Servers
```bash
# Backend server (port 8000)
cd backend
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000

# Frontend server (port 3000)
cd frontend
npm run start
```
