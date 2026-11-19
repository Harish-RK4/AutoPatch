# Production Deployment Guide

## Production Architecture Overview
AutoPatch separates stateless frontend and API tiers from containerized sandboxes and persistence tiers.

```text
[ Cloudflare / CDN ]
         │
         ▼
[ Ingress Controller / Reverse Proxy ]
   ├── /api/*   ──► [ FastAPI Service Replicas ]
   │                     ├── PostgreSQL (Supabase with RLS)
   │                     ├── Redis Cluster
   │                     └── Docker Runner Host (Isolated Sandbox)
   └── /*       ──► [ Next.js Web Frontend ]
```

## Production Hardening Requirements

### 1. Mandatory Demo Guard
In production builds, `DEMO_MODE` must be explicitly `false` and `NEXT_PUBLIC_AUTH_MODE` must be `supabase`. If `DEMO_MODE=true` is detected under `NODE_ENV=production` or `APP_ENV=production`, startup aborts immediately.

### 2. Sandbox Isolation
- Docker container runs with `--network=none` during code execution.
- Read-only root filesystem with a small tmpfs for execution artifacts.
- Non-root user execution (`uid 1000:1000`).
- Strict resource limits: 1 vCPU, 512MB RAM, 30s timeout.

### 3. Environment Variables
Ensure all production secrets are injected via secure secret stores (e.g. AWS Secrets Manager, Doppler, Vault) and never committed to version control.
