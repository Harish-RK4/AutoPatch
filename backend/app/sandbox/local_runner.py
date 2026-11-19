"""
LocalSubprocessSandboxRunner Implementation
Development-only fallback runner for Python and Node.js.
Features:
- Isolated temporary directory per execution with guaranteed cleanup
- Hard timeout with process termination
- Strict environment variable scrubbing (zero host secrets leaked to executed code)
- Byte-capped stdout/stderr to avoid memory exhaustion
- Explicit transparency labeling
"""

import os
import shutil
import subprocess
import sys
import tempfile
import time
from pathlib import Path
from typing import Any

from app.sandbox.base import ExecutionResult, SandboxRunner

# Whitelist of environment variable names safe to inherit from host OS
SAFE_ENV_WHITELIST = {
    "PATH",
    "SYSTEMROOT",
    "TEMP",
    "TMP",
    "COMSPEC",
    "PATHEXT",
    "PYTHONPATH",
    "NODE_PATH",
    "LANG",
    "LC_ALL",
    "USERPROFILE",
    "HOMEDRIVE",
    "HOMEPATH",
    "WINDIR",
}

# Substrings that disqualify an environment variable from child process inheritance
DISALLOWED_SUBSTRINGS = (
    "KEY",
    "SECRET",
    "TOKEN",
    "PASS",
    "CREDENTIAL",
    "AUTH",
    "DATABASE",
    "REDIS",
    "SUPABASE",
    "FIREBASE",
    "GEMINI",
    "GROQ",
    "OPENAI",
    "MISTRAL",
    "ANTHROPIC",
    "SENTRY",
    "NVD",
    "SEMGREP",
)

# Max bytes captured from stdout/stderr to protect against runaway loops
MAX_OUTPUT_BYTES = 256 * 1024  # 256 KB


def get_scrubbed_environment(extra_env: dict[str, str] | None = None) -> dict[str, str]:
    """
    Construct a sanitized environment dict that contains NO API keys, tokens,
    passwords, or host secrets.
    """
    clean_env: dict[str, str] = {}
    for key, value in os.environ.items():
        upper_key = key.upper()
        # Must be in whitelist
        if upper_key not in SAFE_ENV_WHITELIST:
            continue
        # Must not contain any forbidden secret substrings
        if any(substr in upper_key for substr in DISALLOWED_SUBSTRINGS):
            continue
        clean_env[key] = value

    # Explicit dev sandbox flag
    clean_env["AUTOPATCH_SANDBOX"] = "local_dev"
    clean_env["PYTHONUNBUFFERED"] = "1"

    if extra_env:
        for k, v in extra_env.items():
            if not any(substr in k.upper() for substr in DISALLOWED_SUBSTRINGS):
                clean_env[k] = v

    return clean_env


class LocalSubprocessSandboxRunner(SandboxRunner):
    """Dev-only local process runner with scrubbed env and temporary directory isolation."""

    @property
    def runner_type(self) -> str:
        return "local_dev"

    @property
    def runner_label(self) -> str:
        return "Local Dev Subprocess (Not Network-Isolated — Docker Unavailable)"

    @property
    def isolation_level(self) -> str:
        return "process"

    def run_command(
        self,
        cmd: list[str],
        cwd: Path | str,
        timeout_sec: float = 30.0,
        env: dict[str, str] | None = None,
    ) -> ExecutionResult:
        """Run an arbitrary command in the scrubbed local environment."""
        start_time = time.perf_counter()
        scrubbed_env = get_scrubbed_environment(env)
        workdir = Path(cwd).resolve()

        try:
            proc = subprocess.run(
                cmd,
                cwd=workdir,
                env=scrubbed_env,
                capture_output=True,
                text=True,
                errors="replace",
                timeout=timeout_sec,
            )
            duration_ms = (time.perf_counter() - start_time) * 1000

            stdout = proc.stdout[:MAX_OUTPUT_BYTES]
            stderr = proc.stderr[:MAX_OUTPUT_BYTES]
            if len(proc.stdout) > MAX_OUTPUT_BYTES:
                stdout += "\n...[stdout truncated at 256KB cap]"
            if len(proc.stderr) > MAX_OUTPUT_BYTES:
                stderr += "\n...[stderr truncated at 256KB cap]"

            return ExecutionResult(
                exit_code=proc.returncode,
                stdout=stdout,
                stderr=stderr,
                duration_ms=round(duration_ms, 2),
                runner_type="local_dev",
                runner_label=self.runner_label,
                isolation_level="process",
                metadata={"scrubbed_env_count": len(scrubbed_env)},
            )
        except subprocess.TimeoutExpired as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000
            stdout_str = (exc.stdout or "")[:MAX_OUTPUT_BYTES] if isinstance(exc.stdout, str) else ""
            stderr_str = (exc.stderr or "")[:MAX_OUTPUT_BYTES] if isinstance(exc.stderr, str) else ""
            return ExecutionResult(
                exit_code=-1,
                stdout=stdout_str,
                stderr=f"{stderr_str}\nExecution timed out after {timeout_sec}s",
                duration_ms=round(duration_ms, 2),
                timed_out=True,
                runner_type="local_dev",
                runner_label=self.runner_label,
                isolation_level="process",
            )
        except Exception as exc:
            duration_ms = (time.perf_counter() - start_time) * 1000
            return ExecutionResult(
                exit_code=1,
                stdout="",
                stderr=f"Subprocess runner invocation error: {str(exc)}",
                duration_ms=round(duration_ms, 2),
                runner_type="local_dev",
                runner_label=self.runner_label,
                isolation_level="process",
            )

    def execute_code(
        self,
        language: str,
        code: str,
        test_code: str | None = None,
        timeout_sec: float = 30.0,
    ) -> ExecutionResult:
        """
        Write code and test files to an isolated temporary workspace directory,
        execute them, and guarantee cleanup.
        """
        temp_dir = tempfile.mkdtemp(prefix="autopatch_local_ws_")
        temp_path = Path(temp_dir)

        try:
            lang = language.lower()
            if lang in ("python", "py"):
                main_file = temp_path / "main.py"
                main_file.write_text(code, encoding="utf-8")

                if test_code:
                    test_file = temp_path / "test_main.py"
                    test_file.write_text(test_code, encoding="utf-8")
                    cmd = [sys.executable, "-m", "unittest", "test_main.py"]
                else:
                    cmd = [sys.executable, "main.py"]

                return self.run_command(cmd, cwd=temp_path, timeout_sec=timeout_sec)

            elif lang in ("javascript", "js"):
                node_bin = shutil.which("node")
                if not node_bin:
                    return ExecutionResult(
                        exit_code=1,
                        stdout="",
                        stderr="Node.js runtime not found in host PATH.",
                        duration_ms=0.0,
                        runner_type="local_dev",
                        runner_label=self.runner_label,
                        isolation_level="process",
                    )

                main_file = temp_path / "index.js"
                main_file.write_text(code, encoding="utf-8")

                if test_code:
                    test_file = temp_path / "test.js"
                    test_file.write_text(test_code, encoding="utf-8")
                    cmd = [node_bin, "test.js"]
                else:
                    cmd = [node_bin, "index.js"]

                return self.run_command(cmd, cwd=temp_path, timeout_sec=timeout_sec)

            else:
                return ExecutionResult(
                    exit_code=1,
                    stdout="",
                    stderr=f"Language '{language}' not directly executable in LocalSubprocessSandboxRunner.",
                    duration_ms=0.0,
                    runner_type="local_dev",
                    runner_label=self.runner_label,
                    isolation_level="process",
                )
        finally:
            shutil.rmtree(temp_dir, ignore_errors=True)
