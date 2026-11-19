# Security and Privacy Policy

## 1. Archive Ingestion Security & Bounds Enforcement
All uploaded archives (`.zip`) are subjected to strict pre-extraction security gates:
- **Zip-Slip Path Traversal Rejection**: Rejects any archive entry with `..` relative path components or leading slashes (`/` or `\`). Destination paths are resolved and verified against the temporary extraction boundary using `Path.relative_to()`. Violations immediately raise an `ArchiveSecurityViolation` and abort extraction.
- **Zip-Bomb Decompression Ratio Guard**: Enforces a maximum decompression ratio of 100:1. Archives with extreme compression ratios designed to cause storage exhaustion are rejected.
- **Size and Count Caps**: Maximum archive upload size: 50MB; maximum total uncompressed size: 100MB; maximum entries: 1,000 files; maximum single file size: 25MB.
- **Corrupted / Non-Zip Handling**: Corrupted payloads or non-zip binaries fail-fast with clean HTTP 400 errors.

## 2. Pluggable Sandbox Isolation & Environment Scrubbing
Code execution occurs strictly through the pluggable `SandboxRunner` architecture:
- **DockerSandboxRunner (Production Standard)**: Air-gapped container execution with `--network none`, `--read-only` rootfs, `--user 1000:1000` non-root execution, `--cpus=1.0`, `--memory=512m`, and `--tmpfs /tmp:rw,noexec,nosuid,size=64m`.
- **LocalSubprocessSandboxRunner (Dev Fallback)**: Used when Docker daemon is not available on host. Uses ephemeral temporary directories (`tempfile.mkdtemp`) with guaranteed cleanup in `finally` blocks, hard timeout enforcement (`subprocess.TimeoutExpired`), and 256KB output byte caps.
- **Strict Environment Scrubbing**: Executed child processes NEVER inherit host `.env` credentials. Whitelists only safe OS system variables (`PATH`, `SYSTEMROOT`, `TEMP`, `TMP`, etc.) and explicitly scrubs any keys containing `KEY`, `SECRET`, `TOKEN`, `PASS`, `CREDENTIAL`, `AUTH`, `DATABASE`, or `REDIS`.
- **Production Startup Guard**: If `APP_ENV=production`, `SANDBOX_MODE=local_dev` causes a fatal startup failure. Container isolation is mandatory in production.
- **Transparency Labeling**: Every run using the local subprocess runner explicitly reports `Local Dev Subprocess (Not Network-Isolated — Docker Unavailable)`.

## 3. Secrets Redaction & Privacy Guard
Before any code context or error log is dispatched to external LLMs:
- API keys, tokens, SSH keys, passwords, and connection strings are scanned via regex filters and redacted with `[REDACTED_SECRET]`.
- Personal identifiable information (emails, IP addresses) is sanitized.
- **Private Mode Option**: Users can switch the LLM Router to `private` mode, forcing all prompts to stay on the local Ollama instance.

## 4. Row-Level Security (RLS)
PostgreSQL tables enforce RLS:
- Users can view and mutate only projects they own.
- Cross-tenant data exfiltration is blocked at the database engine level.
- Server-side service role keys are never exposed to browser bundles.

## 5. Human Approval Requirement
AutoPatch never auto-merges or writes directly to `main`. Every patch lives on an isolated branch and requires manual developer review and sign-off.
