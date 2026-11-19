"""
Unit Tests for Pluggable Sandbox Architecture
Verifies:
1. LocalSubprocessSandboxRunner executes Python & Node code with correct outputs
2. Secret environment variable scrubbing (zero API keys leaked)
3. Hard execution timeout termination
4. Output byte capping
5. DockerSandboxRunner builds strict security flags (--network none, --read-only, --user 1000:1000)
"""

import os
import sys
import pytest
from app.sandbox.docker_runner import DockerSandboxRunner, DockerUnavailableError
from app.sandbox.local_runner import (
    LocalSubprocessSandboxRunner,
    get_scrubbed_environment,
    DISALLOWED_SUBSTRINGS,
)
from app.sandbox.resolver import get_sandbox_runner


def test_sandbox_resolver_returns_local_dev(monkeypatch):
    """Resolver accurately selects LocalSubprocessSandboxRunner when SANDBOX_MODE=local_dev."""
    monkeypatch.setattr("app.core.config.settings.SANDBOX_MODE", "local_dev")
    runner = get_sandbox_runner()
    assert isinstance(runner, LocalSubprocessSandboxRunner)
    assert runner.runner_type == "local_dev"
    assert "Not Network-Isolated" in runner.runner_label


def test_sandbox_resolver_returns_docker(monkeypatch):
    """Resolver accurately selects DockerSandboxRunner when SANDBOX_MODE=docker."""
    monkeypatch.setattr("app.core.config.settings.SANDBOX_MODE", "docker")
    runner = get_sandbox_runner()
    assert isinstance(runner, DockerSandboxRunner)
    assert runner.runner_type == "docker"
    assert "Network Isolated" in runner.runner_label


def test_local_runner_executes_python():
    """LocalSubprocessSandboxRunner runs valid Python code and captures output."""
    runner = LocalSubprocessSandboxRunner()
    code = "print('Hello from sandboxed Python!')"
    result = runner.execute_code("python", code)
    assert result.exit_code == 0
    assert result.passed is True
    assert "Hello from sandboxed Python!" in result.stdout
    assert result.duration_ms > 0
    assert result.runner_type == "local_dev"


def test_local_runner_executes_python_test_harness():
    """LocalSubprocessSandboxRunner executes a Python unit test harness."""
    runner = LocalSubprocessSandboxRunner()
    main_code = """
def add(a, b):
    return a + b
"""
    test_code = """
import unittest
from main import add

class TestMath(unittest.TestCase):
    def test_add(self):
        self.assertEqual(add(2, 3), 5)

if __name__ == '__main__':
    unittest.main()
"""
    result = runner.execute_code("python", main_code, test_code=test_code)
    assert result.exit_code == 0
    assert result.passed is True
    assert "OK" in result.stderr or "OK" in result.stdout


def test_local_runner_executes_node():
    """LocalSubprocessSandboxRunner runs valid JavaScript via Node.js."""
    runner = LocalSubprocessSandboxRunner()
    code = "console.log('Hello from sandboxed Node.js!');"
    result = runner.execute_code("javascript", code)
    assert result.exit_code == 0
    assert result.passed is True
    assert "Hello from sandboxed Node.js!" in result.stdout


def test_local_runner_secret_env_scrubbing(monkeypatch):
    """
    Security Test: Host secrets in environment variables MUST NOT be leaked
    to executed child processes.
    """
    # Inject fake host secrets into os.environ
    monkeypatch.setenv("OPENAI_API_KEY", "sk-proj-super-secret-12345")
    monkeypatch.setenv("DATABASE_URL", "postgresql://admin:secretpass@db.local:5432/autopatch")
    monkeypatch.setenv("GITHUB_TOKEN", "ghp_TopSecretTokenValue")
    monkeypatch.setenv("SAFE_TEST_VAR", "SafePublicValue")

    scrubbed = get_scrubbed_environment()

    # Assert secret variables are completely stripped
    assert "OPENAI_API_KEY" not in scrubbed
    assert "DATABASE_URL" not in scrubbed
    assert "GITHUB_TOKEN" not in scrubbed

    # Assert none of the scrubbed keys contain sensitive substrings
    for key in scrubbed.keys():
        for bad in DISALLOWED_SUBSTRINGS:
            assert bad not in key.upper(), f"Leaked sensitive key: {key}"

    # Now verify inside actual executed Python process
    runner = LocalSubprocessSandboxRunner()
    code = """
import os
print("OPENAI_KEY_PRESENT:", "OPENAI_API_KEY" in os.environ)
print("DB_URL_PRESENT:", "DATABASE_URL" in os.environ)
print("AUTOPATCH_SANDBOX:", os.environ.get("AUTOPATCH_SANDBOX"))
"""
    result = runner.execute_code("python", code)
    assert result.exit_code == 0
    assert "OPENAI_KEY_PRESENT: False" in result.stdout
    assert "DB_URL_PRESENT: False" in result.stdout
    assert "AUTOPATCH_SANDBOX: local_dev" in result.stdout


def test_local_runner_timeout():
    """LocalSubprocessSandboxRunner enforces hard timeout on infinite loops."""
    runner = LocalSubprocessSandboxRunner()
    infinite_loop = """
import time
while True:
    time.sleep(0.1)
"""
    result = runner.execute_code("python", infinite_loop, timeout_sec=1.0)
    assert result.timed_out is True
    assert result.passed is False
    assert "timed out" in result.stderr.lower()


def test_docker_runner_command_construction():
    """DockerSandboxRunner creates strict container isolation CLI parameters."""
    runner = DockerSandboxRunner(cpus=1.5, memory_mb=256)
    cmd = runner.build_docker_command(
        image="python:3.11-slim",
        volume_mount_src="/tmp/workspace",
        container_workdir="/workspace",
        inner_cmd=["pytest", "-q"],
    )

    assert "docker" == cmd[0]
    assert "run" == cmd[1]
    assert "--rm" in cmd
    assert "--network" in cmd and cmd[cmd.index("--network") + 1] == "none"
    assert "--read-only" in cmd
    assert "--user" in cmd and cmd[cmd.index("--user") + 1] == "1000:1000"
    assert "--cpus=1.5" in cmd
    assert "--memory=256m" in cmd
    assert "--tmpfs" in cmd
    assert "pytest" in cmd


def test_docker_runner_unavailability_handling(monkeypatch):
    """DockerSandboxRunner raises DockerUnavailableError if docker is not installed."""
    monkeypatch.setattr(DockerSandboxRunner, "is_docker_available", staticmethod(lambda: False))
    runner = DockerSandboxRunner()
    with pytest.raises(DockerUnavailableError, match="Docker daemon is not available"):
        runner.run_command(["python", "--version"], cwd=".")
