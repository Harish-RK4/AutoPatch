"""
DockerSandboxRunner Implementation
Production-grade container isolation with --network none, read-only rootfs, non-root user,
and strict CPU/memory limits.
"""

import shutil
import subprocess
import time
from pathlib import Path

from app.sandbox.base import ExecutionResult, SandboxRunner


class DockerUnavailableError(RuntimeError):
    """Raised when Docker execution is attempted but Docker is not installed/running."""


class DockerSandboxRunner(SandboxRunner):
    """Production sandbox runner using Docker containers."""

    IMAGE_PYTHON = "python:3.11-slim"
    IMAGE_NODE = "node:20-alpine"

    def __init__(self, cpus: float = 1.0, memory_mb: int = 512):
        self.cpus = cpus
        self.memory_mb = memory_mb

    @property
    def runner_type(self) -> str:
        return "docker"

    @property
    def runner_label(self) -> str:
        return "Docker Sandbox (Network Isolated — Read-Only Rootfs)"

    @property
    def isolation_level(self) -> str:
        return "container"

    @staticmethod
    def is_docker_available() -> bool:
        """Check if docker binary exists in system PATH."""
        return shutil.which("docker") is not None

    def build_docker_command(
        self,
        image: str,
        volume_mount_src: Path | str,
        container_workdir: str,
        inner_cmd: list[str],
    ) -> list[str]:
        """
        Construct strict Docker isolation CLI arguments:
        - --network none (air-gapped, zero external network)
        - --read-only (immutable rootfs)
        - --user 1000:1000 (non-root UID)
        - --cpus (capped compute)
        - --memory (capped RAM)
        - --tmpfs /tmp:rw,noexec,nosuid,size=64m
        """
        return [
            "docker",
            "run",
            "--rm",
            "--network",
            "none",
            "--read-only",
            "--user",
            "1000:1000",
            f"--cpus={self.cpus}",
            f"--memory={self.memory_mb}m",
            "--tmpfs",
            "/tmp:rw,noexec,nosuid,size=64m",
            "-v",
            f"{Path(volume_mount_src).resolve()}:{container_workdir}:rw",
            "-w",
            container_workdir,
            image,
            *inner_cmd,
        ]

    def run_command(
        self,
        cmd: list[str],
        cwd: Path | str,
        timeout_sec: float = 30.0,
        env: dict[str, str] | None = None,
    ) -> ExecutionResult:
        if not self.is_docker_available():
            raise DockerUnavailableError(
                "Docker daemon is not available on this host. "
                "Ensure Docker Desktop is running or configure SANDBOX_MODE=local_dev for development."
            )

        start_time = time.perf_counter()
        docker_cmd = self.build_docker_command(
            image=self.IMAGE_PYTHON,
            volume_mount_src=cwd,
            container_workdir="/workspace",
            inner_cmd=cmd,
        )

        try:
            res = subprocess.run(
                docker_cmd,
                capture_output=True,
                text=True,
                check=False,
                timeout=timeout_sec,
            )
            duration_ms = (time.perf_counter() - start_time) * 1000
            return ExecutionResult(
                exit_code=res.returncode,
                stdout=res.stdout,
                stderr=res.stderr,
                duration_ms=round(duration_ms, 2),
                runner_type="docker",
                runner_label=self.runner_label,
                isolation_level="container",
            )
        except subprocess.TimeoutExpired:
            duration_ms = (time.perf_counter() - start_time) * 1000
            return ExecutionResult(
                exit_code=-1,
                stdout="",
                stderr=f"Execution timed out after {timeout_sec}s",
                duration_ms=round(duration_ms, 2),
                timed_out=True,
                runner_type="docker",
                runner_label=self.runner_label,
                isolation_level="container",
            )

    def execute_code(
        self,
        language: str,
        code: str,
        test_code: str | None = None,
        timeout_sec: float = 30.0,
    ) -> ExecutionResult:
        """Execute source code in the Docker container."""
        # Delegates to run_command with temporary mount
        import tempfile
        with tempfile.TemporaryDirectory(prefix="autopatch_docker_ws_") as temp_dir:
            temp_path = Path(temp_dir)
            if language.lower() in ("python", "py"):
                main_file = temp_path / "main.py"
                main_file.write_text(code, encoding="utf-8")
                if test_code:
                    test_file = temp_path / "test_main.py"
                    test_file.write_text(test_code, encoding="utf-8")
                    cmd = ["python", "-m", "unittest", "test_main.py"]
                else:
                    cmd = ["python", "main.py"]
            elif language.lower() in ("javascript", "js", "typescript", "ts"):
                main_file = temp_path / "index.js"
                main_file.write_text(code, encoding="utf-8")
                cmd = ["node", "index.js"]
            else:
                return ExecutionResult(
                    exit_code=1,
                    stdout="",
                    stderr=f"Unsupported language for Docker sandbox: {language}",
                    duration_ms=0.0,
                    runner_type="docker",
                    runner_label=self.runner_label,
                    isolation_level="container",
                )

            return self.run_command(cmd, cwd=temp_path, timeout_sec=timeout_sec)
