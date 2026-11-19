"""
Persistence layer for user-uploaded projects and pipeline run results.
Saves records to JSON files under backend/.autopatch_data/ so state is
preserved across server restarts and hot reloads.
"""

import json
from pathlib import Path
from typing import Any

DATA_DIR = Path(__file__).resolve().parent.parent.parent / ".autopatch_data"
PROJECTS_FILE = DATA_DIR / "user_projects.json"
RUNS_FILE = DATA_DIR / "pipeline_runs.json"


def ensure_data_dir() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)


def load_user_projects() -> list[dict[str, Any]]:
    ensure_data_dir()
    if not PROJECTS_FILE.exists():
        return []
    try:
        with open(PROJECTS_FILE, encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, list):
                return data
    except Exception:
        pass
    return []


def save_user_projects(projects: list[dict[str, Any]]) -> None:
    ensure_data_dir()
    try:
        # Write to temporary file then replace to avoid corruption
        tmp_file = PROJECTS_FILE.with_suffix(".tmp")
        with open(tmp_file, "w", encoding="utf-8") as f:
            json.dump(projects, f, indent=2, default=str)
        tmp_file.replace(PROJECTS_FILE)
    except Exception:
        pass


def load_pipeline_runs() -> dict[str, dict[str, Any]]:
    ensure_data_dir()
    if not RUNS_FILE.exists():
        return {}
    try:
        with open(RUNS_FILE, encoding="utf-8") as f:
            data = json.load(f)
            if isinstance(data, dict):
                return data
    except Exception:
        pass
    return {}


def save_pipeline_runs(runs: dict[str, dict[str, Any]]) -> None:
    ensure_data_dir()
    try:
        tmp_file = RUNS_FILE.with_suffix(".tmp")
        with open(tmp_file, "w", encoding="utf-8") as f:
            json.dump(runs, f, indent=2, default=str)
        tmp_file.replace(RUNS_FILE)
    except Exception:
        pass
