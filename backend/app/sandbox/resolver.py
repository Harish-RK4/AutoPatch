"""
Sandbox Resolver
Factory for acquiring the active SandboxRunner based on environment configuration.
"""

from app.core.config import settings
from app.sandbox.base import SandboxRunner
from app.sandbox.docker_runner import DockerSandboxRunner
from app.sandbox.local_runner import LocalSubprocessSandboxRunner


def get_sandbox_runner() -> SandboxRunner:
    """
    Returns the configured SandboxRunner:
    - 'docker': DockerSandboxRunner (production standard)
    - 'local_dev': LocalSubprocessSandboxRunner (development fallback)
    """
    if settings.SANDBOX_MODE == "docker":
        return DockerSandboxRunner()
    return LocalSubprocessSandboxRunner()
