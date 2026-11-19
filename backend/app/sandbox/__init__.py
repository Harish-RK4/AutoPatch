"""
Sandbox Package
Pluggable isolation environments for autonomous patch execution and verification.
"""

from app.sandbox.base import ExecutionResult, SandboxRunner
from app.sandbox.docker_runner import DockerSandboxRunner, DockerUnavailableError
from app.sandbox.local_runner import LocalSubprocessSandboxRunner
from app.sandbox.resolver import get_sandbox_runner

__all__ = [
    "DockerSandboxRunner",
    "DockerUnavailableError",
    "ExecutionResult",
    "LocalSubprocessSandboxRunner",
    "SandboxRunner",
    "get_sandbox_runner",
]
