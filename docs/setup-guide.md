# Local Setup Guide

Follow this guide to get AutoPatch running on your local machine.

## Prerequisites
- Node.js 20+ LTS
- Python 3.11+
- Git 2.30+
- (Optional for P0 / Required for P1+): Docker Desktop with WSL2 (Windows)

## Setup Steps

### 1. Repository Configuration
```bash
git clone https://github.com/Harish-RK4/AutoPatch.git
cd AutoPatch
cp .env.example .env
```

### 2. Run Environment Validation
Verify that all required environment variables are set correctly:
```bash
npm run check:env
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
The frontend is available at `http://localhost:3000`.

### 4. Backend Setup
In a new terminal:
```bash
cd backend
python -m venv .venv
# On Windows:
.venv\Scripts\Activate.ps1
# On Linux/macOS:
# source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
API docs available at `http://localhost:8000/docs`.

### 5. Running the Mock Suite (0 Keys Needed)
With default configuration (`LLM_MODE=mock` and `NEXT_PUBLIC_AUTH_MODE=demo`), no external API keys or cloud services are required. You can log into the demo portal at `http://localhost:3000` using:
- Email: `demo@autopatch.dev`
- Password: `Demo@1234`
