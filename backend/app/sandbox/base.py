"""
Pluggable SandboxRunner Base Specification
Defines the abstract interface for code execution isolation across container and process runners.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Literal


@dataclass
class ExecutionResult:
    """Standardized result of a sandboxed execution."""
    exit_code: int
    stdout: str
    stderr: str
    duration_ms: float
    timed_out: bool = False
    memory_exceeded: bool = False
    runner_type: Literal["docker", "local_dev"] = "local_dev"
    runner_label: str = "Local Dev Subprocess (Not Network-Isolated — Docker Unavailable)"
    isolation_level: Literal["container", "process"] = "process"
    metadata: dict[str, Any] = field(default_factory=dict)

    @property
    def passed(self) -> bool:
        """True if the process finished normally with exit code 0."""
        return self.exit_code == 0 and not self.timed_out and not self.memory_exceeded


class SandboxRunner(ABC):
    """Abstract interface for sandboxed runtime execution."""

    @property
    @abstractmethod
    def runner_type(self) -> str:
        """Identifier for the runner type ('docker' or 'local_dev')."""

    @property
    @abstractmethod
    def runner_label(self) -> str:
        """Human-readable runner label for UI & API transparency."""

    @property
    @abstractmethod
    def isolation_level(self) -> str:
        """'container' for Docker or 'process' for local subprocess."""

    @abstractmethod
    def run_command(
        self,
        cmd: list[str],
        cwd: Path | str,
        timeout_sec: float = 30.0,
        env: dict[str, str] | None = None,
    ) -> ExecutionResult:
        """Execute a command within the isolated sandbox."""

    @abstractmethod
    def execute_code(
        self,
        language: str,
        code: str,
        test_code: str | None = None,
        timeout_sec: float = 30.0,
    ) -> ExecutionResult:
        """Execute source code (with optional test harness) inside the sandbox."""
