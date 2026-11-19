# Security and Privacy Policy

## 1. Zero-Trust Upload Policy
All uploaded repositories, archives, and snippets are treated as untrusted and potentially malicious:
- **Zero Network Access**: Code execution occurs in isolated Docker containers with `--network none`.
- **Resource Constraints**: Hard CPU (1 vCPU), memory (512MB), and execution wall-time limits (30s) prevent fork bombs and resource exhaustion.
- **Read-Only Base**: Execution mounts use read-only file systems except for a strictly isolated temporary scratch directory.

## 2. Secrets Redaction & Privacy Guard
Before any code context or error log is dispatched to external LLMs:
- API keys, tokens, SSH keys, passwords, and connection strings are scanned via regex filters and redacted with `[REDACTED_SECRET]`.
- Personal identifiable information (emails, IP addresses) is sanitized.
- **Private Mode Option**: Users can switch the LLM Router to `private` mode, forcing all prompts to stay on the local Ollama instance.

## 3. Row-Level Security (RLS)
PostgreSQL tables enforce RLS:
- Users can view and mutate only projects they own.
- Cross-tenant data exfiltration is blocked at the database engine level.
- Server-side service role keys are never exposed to browser bundles.

## 4. Human Approval Requirement
AutoPatch never auto-merges or writes directly to `main`. Every patch lives on an isolated branch and requires manual developer review and sign-off.
