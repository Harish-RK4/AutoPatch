/**
 * Typed API Client for AutoPatch
 * Handles user uploads, projects, defect retrieval, and patch review actions.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface ProjectData {
  id: string;
  name: string;
  language: string;
  source_type: "upload" | "dataset" | "paste" | "git" | "demo";
  status: string;
  created_at: string;
  filename?: string;
  files?: Array<{ file_path: string; content?: string; error_trace?: string }>;
}

export async function fetchProjects(mode: "all" | "user" | "demo" = "all"): Promise<ProjectData[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/projects?filter_mode=${mode}`, { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch (err) {
    // Fallback for local frontend standalone testing
  }

  // Fallback to client-side storage + seed if backend not reachable
  let localProjects: ProjectData[] = [];
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("autopatch_user_projects");
      if (stored) localProjects = JSON.parse(stored);
    } catch (e) {
      // ignore
    }
  }

  const demoSeed: ProjectData[] = [
    {
      id: "demo-proj-001",
      name: "Python Marks Calculator",
      language: "python",
      source_type: "demo",
      status: "ready",
      created_at: "2026-11-19T05:00:00Z",
      filename: "calculator.py"
    },
    {
      id: "demo-proj-002",
      name: "JavaScript User Directory",
      language: "javascript",
      source_type: "demo",
      status: "ready",
      created_at: "2026-11-19T05:10:00Z",
      filename: "userDirectory.js"
    },
    {
      id: "demo-proj-003",
      name: "C Memory Buffer Utility",
      language: "c",
      source_type: "demo",
      status: "ready",
      created_at: "2026-11-19T05:20:00Z",
      filename: "buffer.c"
    },
    {
      id: "demo-proj-004",
      name: "Student Assessment Dataset",
      language: "dataset",
      source_type: "demo",
      status: "ready",
      created_at: "2026-11-19T05:30:00Z",
      filename: "grades.csv"
    }
  ];

  if (mode === "user") return localProjects;
  if (mode === "demo") return demoSeed;
  return [...localProjects, ...demoSeed];
}

export async function createProject(payload: {
  name: string;
  source_type: "upload" | "dataset" | "paste" | "git";
  language?: string;
  filename?: string;
  content?: string;
  error_trace?: string;
  repo_url?: string;
}): Promise<ProjectData> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/projects`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
    if (res.ok) {
      const created = await res.json();
      // Also cache in localStorage for fast UI updates
      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("autopatch_user_projects");
          const existing = stored ? JSON.parse(stored) : [];
          existing.unshift(created);
          localStorage.setItem("autopatch_user_projects", JSON.stringify(existing));
        } catch (e) {}
      }
      return created;
    }
  } catch (err) {}

  // Local fallback creation
  const localRecord: ProjectData = {
    id: `proj-${Date.now().toString(36)}`,
    name: payload.name,
    language: payload.language || "Unknown",
    source_type: payload.source_type,
    status: "ready",
    created_at: new Date().toISOString(),
    filename: payload.filename || "source_file",
    files: [
      {
        file_path: payload.filename || "source_file",
        content: payload.content || "",
        error_trace: payload.error_trace || ""
      }
    ]
  };

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("autopatch_user_projects");
      const existing = stored ? JSON.parse(stored) : [];
      existing.unshift(localRecord);
      localStorage.setItem("autopatch_user_projects", JSON.stringify(existing));
    } catch (e) {}
  }

  return localRecord;
}

export async function fetchProject(projectId: string): Promise<ProjectData | null> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/projects/${projectId}`, { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch (err) {}

  const all = await fetchProjects("all");
  return all.find((p) => p.id === projectId) || null;
}

export async function fetchProjectBugs(projectId: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/projects/${projectId}/bugs`, { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch (err) {}

  if (projectId.startsWith("demo-")) {
    return [
      {
        id: "demo-bug-001",
        project_id: projectId,
        title: "Missing bounds validation on student marks",
        file_path: "calculator.py",
        line_start: 5,
        line_end: 12,
        origin_line: 5,
        crash_line: 12,
        category: "logic",
        severity: "high",
        confidence_score: 100.0,
        verification_level: "V4",
        state: "confirmed"
      }
    ];
  }
  return [];
}

export async function fetchBugDetail(bugId: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/bugs/${bugId}`, { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch (err) {}

  return {
    id: "demo-bug-001",
    project_id: "demo-proj-001",
    title: "Missing bounds validation on student marks",
    description: "calculate_percentage() allows negative marks and scores > total, resulting in invalid percentages (-5% or 105%).",
    file_path: "calculator.py",
    line_start: 5,
    line_end: 12,
    origin_line: 5,
    crash_line: 12,
    trigger_input: { marks: -5.0, total: 100.0 },
    failure_type: "missing_bounds_check",
    category: "logic",
    state: "confirmed",
    severity: "high",
    severity_score: 8.0,
    confidence_score: 100.0,
    priority_rank: 1,
    verification_level: "V4",
    root_cause: {
      summary: "calculate_percentage assumes input marks are non-negative and <= total without validation.",
      trigger_input: { marks: -5.0, total: 100.0 },
      beginner: "The calculator trusted any number entered, even negative scores like -5 or impossibly high scores like 105%. We added a check at the entrance to ensure only real scores between 0 and 100% are computed.",
      developer: "calculate_percentage lacked invariant precondition validation. When marks < 0 or marks > total, percentage was computed linearly yielding out-of-range float values. The patch inserts an explicit bounds assertion raising ValueError.",
      manager: "Resolved arithmetic logic defect that could corrupt student grading reports and GPA calculations with negative or overflow percentages. Fixed with low risk and validated by automated tests."
    },
    blast_radius: {
      functions: ["calculate_percentage", "generate_report_card"],
      tests: ["test_calculator.py::test_negative_marks"],
      files: ["calculator.py"]
    },
    patches: [
      {
        id: "demo-patch-001",
        bug_id: "demo-bug-001",
        candidate_no: 1,
        diff: "@@ -5,3 +5,6 @@\n def calculate_percentage(marks: float, total: float = 100.0) -> float:\n+    if not (0.0 <= marks <= total):\n+        raise ValueError('Marks must be between 0.0 and total')\n     percentage = (marks / total) * 100.0\n     return percentage",
        original_code: "def get_input(raw_marks):\n    return float(raw_marks)\n\ndef calculate_percentage(marks: float, total: float = 100.0) -> float:\n    # Origin line: bad input accepted on line 5\n    # Crash line: line 12 evaluates without boundary assertion\n    percentage = (marks / total) * 100.0\n    return percentage",
        patched_code: "def get_input(raw_marks):\n    return float(raw_marks)\n\ndef calculate_percentage(marks: float, total: float = 100.0) -> float:\n    if not (0.0 <= marks <= total):\n        raise ValueError('Marks must be between 0.0 and total')\n    percentage = (marks / total) * 100.0\n    return percentage",
        reason: "Add explicit ValueError precondition bounds check before percentage calculation.",
        risk_level: "low",
        rank: 1,
        selected: true,
        git_branch: "patch/bug-001-candidate-1",
        status: "proposed",
        verification_level: "V4",
        hunks: [
          {
            hunk_no: 1,
            file_path: "calculator.py",
            line_start: 5,
            line_end: 7,
            original_code: "def calculate_percentage(marks: float, total: float = 100.0) -> float:",
            new_code: "def calculate_percentage(marks: float, total: float = 100.0) -> float:\n    if not (0.0 <= marks <= total):\n        raise ValueError('Marks must be between 0.0 and total')",
            why_wrong: "The original function allowed any numerical value for marks, including negative numbers or values exceeding the maximum.",
            why_fix_works: "Adding an immediate validation guard ensures invalid numbers raise ValueError before corrupting calculations.",
            if_not_fixed: "Negative marks will produce negative percentages; marks > total will produce percentages above 100% in student report cards.",
            side_effects: ["Callers must handle ValueError when supplying out-of-range student scores."],
            alternatives: ["Candidate 2 clamps out-of-bound values instead of raising, but silent clamping conceals data entry errors."]
          }
        ],
        proof_bundle: {
          repro_test_passes: true,
          full_suite_passes: true,
          suite_count: 14,
          static_scan_clean: true,
          verification_ladder: "V4 Proven"
        }
      }
    ]
  };
}

export async function submitPatchDecision(patchId: string, action: "accept" | "reject" | "needs_review", note?: string) {
  try {
    const res = await fetch(`${API_BASE}/api/v1/patches/${patchId}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, note })
    });
    if (res.ok) return await res.json();
  } catch (err) {}
  return { patch_id: patchId, action, status: "recorded" };
}
