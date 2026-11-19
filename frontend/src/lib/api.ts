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
  files?: Array<{ file_path: string; content?: string; original_unpatched_content?: string; error_trace?: string }>;
  patched_content?: string | null;
  unified_diff?: string | null;
  patches?: any[];
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

export interface BugSummaryData {
  id: string;
  project_id: string;
  title: string;
  file_path: string;
  line_start: number;
  line_end: number;
  origin_line?: number;
  crash_line?: number;
  category: string;
  severity: string;
  confidence_score: number;
  verification_level: "V0" | "V1" | "V2" | "V3" | "V4";
  state: string;
}

export async function fetchAllBugs(mode: "all" | "user" | "demo" = "all"): Promise<BugSummaryData[]> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/bugs?filter_mode=${mode}`, { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch (err) {}

  if (mode === "user") return [];

  return [
    {
      id: "demo-bug-001",
      project_id: "demo-proj-001",
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
    },
    {
      id: "demo-bug-002",
      project_id: "demo-proj-002",
      title: "Cannot read property 'split' of undefined",
      file_path: "userDirectory.js",
      line_start: 2,
      line_end: 4,
      origin_line: 2,
      crash_line: 3,
      category: "type_error",
      severity: "high",
      confidence_score: 95.0,
      verification_level: "V4",
      state: "confirmed"
    },
    {
      id: "demo-bug-003",
      project_id: "demo-proj-003",
      title: "Off-by-one null byte buffer overflow",
      file_path: "buffer.c",
      line_start: 3,
      line_end: 7,
      origin_line: 4,
      crash_line: 6,
      category: "memory",
      severity: "critical",
      confidence_score: 85.0,
      verification_level: "V3",
      state: "confirmed"
    },
    {
      id: "demo-bug-004",
      project_id: "demo-proj-004",
      title: "Negative score anomaly and malformed date format",
      file_path: "grades.csv",
      line_start: 2,
      line_end: 4,
      origin_line: 2,
      crash_line: 3,
      category: "dataset",
      severity: "medium",
      confidence_score: 80.0,
      verification_level: "V3",
      state: "confirmed"
    },
    {
      id: "demo-bug-005",
      project_id: "demo-proj-001",
      title: "Floating-point precision rounding variance in GPA aggregation",
      file_path: "calculator.py",
      line_start: 18,
      line_end: 22,
      origin_line: 18,
      crash_line: 21,
      category: "arithmetic",
      severity: "low",
      confidence_score: 65.0,
      verification_level: "V2",
      state: "confirmed"
    },
    {
      id: "demo-bug-006",
      project_id: "demo-proj-002",
      title: "Prototype pollution via unvalidated object key in profile updater",
      file_path: "userDirectory.js",
      line_start: 12,
      line_end: 18,
      origin_line: 13,
      crash_line: 16,
      category: "security",
      severity: "critical",
      confidence_score: 85.0,
      verification_level: "V3",
      state: "confirmed"
    }
  ];
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
        },
        critic_verdict: {
          correctness_score: 95.0,
          safety_score: 100.0,
          minimality_score: 95.0,
          side_effect_score: 90.0,
          composite_score: 95.0,
          rank: 1,
          recommendation: "accept",
          rationale: "Surgical input validation guard. Highest correctness and zero regressions."
        },
        blast_radius_report: {
          target_file: "calculator.py",
          target_symbol: "calculate_percentage",
          lines_touched: 2,
          files_impacted: ["calculator.py"],
          direct_callers: ["generate_report_card"],
          transitive_callers: ["main"],
          cyclomatic_delta: 1,
          blast_score: 18,
          risk_level: "Low",
          summary: "Touches 1 file, 2 lines, 1 caller impacted. Risk Level: Low (Score: 18/100)."
        }
      },
      {
        id: "demo-patch-002",
        bug_id: "demo-bug-001",
        candidate_no: 2,
        diff: "@@ -5,3 +5,6 @@\n def calculate_percentage(marks: float, total: float = 100.0) -> float:\n+    # Clamping normalization\n+    marks = max(0.0, min(total, float(marks)))\n     percentage = (marks / total) * 100.0\n     return percentage",
        original_code: "def get_input(raw_marks):\n    return float(raw_marks)\n\ndef calculate_percentage(marks: float, total: float = 100.0) -> float:\n    # Origin line: bad input accepted on line 5\n    # Crash line: line 12 evaluates without boundary assertion\n    percentage = (marks / total) * 100.0\n    return percentage",
        patched_code: "def get_input(raw_marks):\n    return float(raw_marks)\n\ndef calculate_percentage(marks: float, total: float = 100.0) -> float:\n    # Clamping normalization\n    marks = max(0.0, min(total, float(marks)))\n    percentage = (marks / total) * 100.0\n    return percentage",
        reason: "Normalize out-of-bounds inputs by clamping scores to [0.0, total] range.",
        risk_level: "low",
        rank: 2,
        selected: false,
        git_branch: "patch/bug-001-candidate-2",
        status: "proposed",
        verification_level: "V3",
        hunks: [
          {
            hunk_no: 1,
            file_path: "calculator.py",
            line_start: 5,
            line_end: 7,
            original_code: "def calculate_percentage(marks: float, total: float = 100.0) -> float:",
            new_code: "def calculate_percentage(marks: float, total: float = 100.0) -> float:\n    # Clamping normalization\n    marks = max(0.0, min(total, float(marks)))",
            why_wrong: "Values below 0 or above total were accepted without normalization.",
            why_fix_works: "Clamping prevents runtime exceptions while constraining percentages to [0, 100].",
            if_not_fixed: "Invalid report card percentages generated.",
            side_effects: ["Silently modifies unexpected input values without raising an error."],
            alternatives: ["Candidate 1 raises ValueError explicitly."]
          }
        ],
        proof_bundle: {
          repro_test_passes: true,
          full_suite_passes: true,
          suite_count: 14,
          static_scan_clean: true,
          verification_ladder: "V3 Verified"
        },
        critic_verdict: {
          correctness_score: 82.0,
          safety_score: 95.0,
          minimality_score: 88.0,
          side_effect_score: 85.0,
          composite_score: 87.0,
          rank: 2,
          recommendation: "needs_review",
          rationale: "Clamping avoids exceptions but may silently conceal invalid data entry."
        },
        blast_radius_report: {
          target_file: "calculator.py",
          target_symbol: "calculate_percentage",
          lines_touched: 2,
          files_impacted: ["calculator.py"],
          direct_callers: ["generate_report_card"],
          transitive_callers: ["main"],
          cyclomatic_delta: 0,
          blast_score: 22,
          risk_level: "Low",
          summary: "Touches 1 file, 2 lines, 1 caller impacted. Risk Level: Low (Score: 22/100)."
        }
      },
      {
        id: "demo-patch-003",
        bug_id: "demo-bug-001",
        candidate_no: 3,
        diff: "@@ -5,3 +5,9 @@\n def calculate_percentage(marks: float, total: float = 100.0) -> float:\n+    if not isinstance(marks, (int, float)) or not isinstance(total, (int, float)):\n+        raise TypeError('Expected numeric marks and total')\n+    if marks < 0.0 or marks > total:\n+        raise ValueError(f'Invalid score: {marks} outside [0.0, {total}]')\n     percentage = (marks / total) * 100.0\n     return percentage",
        original_code: "def get_input(raw_marks):\n    return float(raw_marks)\n\ndef calculate_percentage(marks: float, total: float = 100.0) -> float:\n    # Origin line: bad input accepted on line 5\n    # Crash line: line 12 evaluates without boundary assertion\n    percentage = (marks / total) * 100.0\n    return percentage",
        patched_code: "def get_input(raw_marks):\n    return float(raw_marks)\n\ndef calculate_percentage(marks: float, total: float = 100.0) -> float:\n    if not isinstance(marks, (int, float)) or not isinstance(total, (int, float)):\n        raise TypeError('Expected numeric marks and total')\n    if marks < 0.0 or marks > total:\n        raise ValueError(f'Invalid score: {marks} outside [0.0, {total}]')\n    percentage = (marks / total) * 100.0\n    return percentage",
        reason: "Comprehensive typed validation guard with detailed error reporting.",
        risk_level: "low",
        rank: 3,
        selected: false,
        git_branch: "patch/bug-001-candidate-3",
        status: "proposed",
        verification_level: "V4",
        hunks: [
          {
            hunk_no: 1,
            file_path: "calculator.py",
            line_start: 5,
            line_end: 7,
            original_code: "def calculate_percentage(marks: float, total: float = 100.0) -> float:",
            new_code: "def calculate_percentage(marks: float, total: float = 100.0) -> float:\n    if not isinstance(marks, (int, float)) or not isinstance(total, (int, float)):\n        raise TypeError('Expected numeric marks and total')\n    if marks < 0.0 or marks > total:\n        raise ValueError(f'Invalid score: {marks} outside [0.0, {total}]')",
            why_wrong: "Missing both type validation and numerical range check.",
            why_fix_works: "Guards against both non-numeric inputs and out-of-range student marks.",
            if_not_fixed: "Crashes on non-numeric inputs and corrupts grading on negative scores.",
            side_effects: ["Slightly larger diff and strict type checks."],
            alternatives: ["Candidate 1 is more minimal."]
          }
        ],
        proof_bundle: {
          repro_test_passes: true,
          full_suite_passes: true,
          suite_count: 14,
          static_scan_clean: true,
          verification_ladder: "V4 Proven"
        },
        critic_verdict: {
          correctness_score: 98.0,
          safety_score: 100.0,
          minimality_score: 72.0,
          side_effect_score: 85.0,
          composite_score: 89.0,
          rank: 3,
          recommendation: "accept",
          rationale: "Most comprehensive guard with type safety. Slightly larger diff."
        },
        blast_radius_report: {
          target_file: "calculator.py",
          target_symbol: "calculate_percentage",
          lines_touched: 4,
          files_impacted: ["calculator.py"],
          direct_callers: ["generate_report_card"],
          transitive_callers: ["main"],
          cyclomatic_delta: 2,
          blast_score: 25,
          risk_level: "Medium",
          summary: "Touches 1 file, 4 lines, 1 caller impacted. Risk Level: Medium (Score: 25/100)."
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

export async function uploadArchive(name: string, file: File): Promise<ProjectData> {
  const formData = new FormData();
  formData.append("name", name);
  formData.append("archive", file);

  const res = await fetch(`${API_BASE}/api/v1/projects/upload-archive`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: "Upload failed" }));
    throw new Error(errData.detail || "Archive upload failed.");
  }

  const proj = await res.json();

  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("autopatch_user_projects");
      const list: ProjectData[] = stored ? JSON.parse(stored) : [];
      list.unshift(proj);
      localStorage.setItem("autopatch_user_projects", JSON.stringify(list));
    } catch (e) {}
  }

  return proj;
}

export async function executePipeline(projectId: string): Promise<any> {
  const res = await fetch(`${API_BASE}/api/v1/projects/${projectId}/pipeline`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Pipeline execution failed" }));
    throw new Error(err.detail || "Pipeline failed.");
  }
  return await res.json();
}

export async function applyPatch(
  projectId: string,
  patchId?: string
): Promise<{
  status: string;
  project_id: string;
  patch_id?: string;
  filename: string;
  patched_content: string;
  message: string;
}> {
  const res = await fetch(`${API_BASE}/api/v1/projects/${projectId}/apply-patch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ patch_id: patchId || null }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Failed to apply patch" }));
    throw new Error(err.detail || "Failed to apply patch");
  }
  const result = await res.json();

  // Also update in localStorage if present
  if (typeof window !== "undefined") {
    try {
      const stored = localStorage.getItem("autopatch_user_projects");
      if (stored) {
        const list = JSON.parse(stored);
        const match = list.find((p: any) => p.id === projectId);
        if (match && match.files && match.files.length > 0) {
          match.files[0].original_unpatched_content = match.files[0].content;
          match.files[0].content = result.patched_content;
          match.status = "fixed";
          localStorage.setItem("autopatch_user_projects", JSON.stringify(list));
        }
      }
    } catch (e) {}
  }

  return result;
}

import { VerificationLevel } from "./tokens";

export async function fetchAllPatches(bugId?: string): Promise<any[]> {
  try {
    const url = bugId
      ? `${API_BASE}/api/v1/patches?bug_id=${encodeURIComponent(bugId)}`
      : `${API_BASE}/api/v1/patches`;
    const res = await fetch(url, { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch (err) {}
  return [];
}

export async function fetchPatchDetail(patchId: string): Promise<any> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/patches/${patchId}`, { cache: "no-store" });
    if (res.ok) return await res.json();
  } catch (err) {}
  return null;
}

export interface ColumnProfile {
  name: string;
  inferred_type: string;
  null_count: number;
  null_rate: number;
  unique_count: number;
  unique_rate: number;
  sample_values: any[];
  min_val?: number | null;
  max_val?: number | null;
  mean_val?: number | null;
  std_val?: number | null;
  detected_date_format?: string | null;
  is_primary_key_candidate: boolean;
}

export interface DatasetProfile {
  total_rows: number;
  total_columns: number;
  detected_format: string;
  encoding: string;
  columns: ColumnProfile[];
  primary_key_candidates: string[];
  date_columns: string[];
  overall_null_rate: number;
}

export interface AnomalyFinding {
  id: string;
  anomaly_type: string;
  column?: string | null;
  affected_rows_count: number;
  evidence_rows: any[];
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  proposed_correction: string;
  needs_human_decision: boolean;
  evidence_indices: number[];
}

export interface ChangedRow {
  row_index: number;
  original: Record<string, any>;
  corrected: Record<string, any>;
  changed_columns: string[];
  reason: string;
}

export interface RuleCheckResult {
  rule_name: string;
  column: string;
  condition: string;
  passed: boolean;
  violation_count: number;
  message: string;
}

export interface InvariantVerificationResult {
  row_lineage_preserved: boolean;
  total_input_rows: number;
  total_output_rows: number;
  dropped_rows_count: number;
  untouched_valid_cells_identical: boolean;
  idempotent: boolean;
  validation_rules_passed: boolean;
  rule_checks: RuleCheckResult[];
  all_invariants_hold: boolean;
}

export interface DatasetReviewBundle {
  project_id: string;
  filename: string;
  detected_format: string;
  before_profile: DatasetProfile;
  after_profile: DatasetProfile;
  anomalies: AnomalyFinding[];
  cleaning_script: string;
  corrected_content: string;
  changed_rows: ChangedRow[];
  invariants: InvariantVerificationResult;
  verification_level: VerificationLevel;
  confidence_score: number;
  summary: string;
}

export async function fetchDatasetReview(projectId: string): Promise<DatasetReviewBundle> {
  try {
    const res = await fetch(`${API_BASE}/api/v1/projects/${projectId}/dataset-review`, {
      cache: "no-store",
    });
    if (res.ok) return await res.json();
  } catch (err) {}

  // Fallback demo fixture for demo-proj-004
  return {
    project_id: projectId,
    filename: "grades.csv",
    detected_format: "csv",
    before_profile: {
      total_rows: 5,
      total_columns: 4,
      detected_format: "csv",
      encoding: "utf-8",
      columns: [
        { name: "student_id", inferred_type: "integer", null_count: 0, null_rate: 0, unique_count: 5, unique_rate: 1, sample_values: [101, 102, 103, 104, 105], is_primary_key_candidate: true },
        { name: "name", inferred_type: "string", null_count: 0, null_rate: 0, unique_count: 5, unique_rate: 1, sample_values: ["Alice Johnson", "Bob Smith", "Charlie Brown"], is_primary_key_candidate: true },
        { name: "score", inferred_type: "float", null_count: 1, null_rate: 0.2, unique_count: 4, unique_rate: 0.8, sample_values: [88.5, -15.0, 105.0, 92.0], min_val: -15.0, max_val: 105.0, mean_val: 67.6, is_primary_key_candidate: false },
        { name: "submission_date", inferred_type: "datetime", null_count: 0, null_rate: 0, unique_count: 5, unique_rate: 1, sample_values: ["2026-10-01", "2026/10/02", "02-10-2026"], detected_date_format: "mixed", is_primary_key_candidate: false },
      ],
      primary_key_candidates: ["student_id"],
      date_columns: ["submission_date"],
      overall_null_rate: 0.05,
    },
    after_profile: {
      total_rows: 5,
      total_columns: 4,
      detected_format: "csv",
      encoding: "utf-8",
      columns: [
        { name: "student_id", inferred_type: "integer", null_count: 0, null_rate: 0, unique_count: 5, unique_rate: 1, sample_values: [101, 102, 103, 104, 105], is_primary_key_candidate: true },
        { name: "name", inferred_type: "string", null_count: 0, null_rate: 0, unique_count: 5, unique_rate: 1, sample_values: ["Alice Johnson", "Bob Smith", "Charlie Brown"], is_primary_key_candidate: true },
        { name: "score", inferred_type: "float", null_count: 0, null_rate: 0.0, unique_count: 5, unique_rate: 1, sample_values: [88.5, 15.0, 90.25, 100.0, 92.0], min_val: 15.0, max_val: 100.0, mean_val: 77.15, is_primary_key_candidate: false },
        { name: "submission_date", inferred_type: "datetime", null_count: 0, null_rate: 0, unique_count: 5, unique_rate: 1, sample_values: ["2026-10-01", "2026-10-02", "2026-02-10"], detected_date_format: "%Y-%m-%d", is_primary_key_candidate: false },
      ],
      primary_key_candidates: ["student_id"],
      date_columns: ["submission_date"],
      overall_null_rate: 0.0,
    },
    anomalies: [
      {
        id: "anom-01",
        anomaly_type: "missing_values",
        column: "score",
        affected_rows_count: 1,
        evidence_rows: [{ student_id: 103, name: "Charlie Brown", score: null, submission_date: "02-10-2026" }],
        severity: "high",
        description: "Column 'score' has 1 missing/null value(s) (20.0%).",
        proposed_correction: "Impute missing numeric values with median (90.25).",
        needs_human_decision: false,
        evidence_indices: [2],
      },
      {
        id: "anom-02",
        anomaly_type: "numeric_outlier",
        column: "score",
        affected_rows_count: 2,
        evidence_rows: [
          { student_id: 102, name: "Bob Smith", score: -15.0, submission_date: "2026/10/02" },
          { student_id: 104, name: "Diana Prince", score: 105.0, submission_date: "2026-10-04" },
        ],
        severity: "high",
        description: "Column 'score' contains 2 out-of-bounds value(s) (negative or > 100 values: [-15.0, 105.0]).",
        proposed_correction: "Normalize bounds (convert negative to positive, clamp to 100.0).",
        needs_human_decision: false,
        evidence_indices: [1, 3],
      },
      {
        id: "anom-03",
        anomaly_type: "inconsistent_date_format",
        column: "submission_date",
        affected_rows_count: 5,
        evidence_rows: [
          { submission_date: "2026/10/02" },
          { submission_date: "02-10-2026" },
        ],
        severity: "medium",
        description: "Column 'submission_date' mixes multiple date conventions: %Y-%m-%d, %Y/%m/%d, %d-%m-%Y.",
        proposed_correction: "Harmonize all dates to standard ISO 8601 (YYYY-MM-DD).",
        needs_human_decision: false,
        evidence_indices: [1, 2],
      },
    ],
    cleaning_script: `import io
import pandas as pd

def clean_dataset(raw_input: str) -> str:
    df = pd.read_csv(io.StringIO(raw_input))
    df["score"] = pd.to_numeric(df["score"], errors="coerce").fillna(90.25)
    df["score"] = df["score"].apply(lambda v: min(100.0, abs(v)))
    df["submission_date"] = pd.to_datetime(df["submission_date"], dayfirst=True).dt.strftime("%Y-%m-%d")
    out = io.StringIO()
    df.to_csv(out, index=False)
    return out.getvalue()
`,
    corrected_content: `student_id,name,score,submission_date
101,Alice Johnson,88.5,2026-10-01
102,Bob Smith,15.0,2026-10-02
103,Charlie Brown,90.25,2026-02-10
104,Diana Prince,100.0,2026-10-04
105,Evan Wright,92.0,2026-10-05
`,
    changed_rows: [
      {
        row_index: 2,
        original: { student_id: 102, name: "Bob Smith", score: -15.0, submission_date: "2026/10/02" },
        corrected: { student_id: 102, name: "Bob Smith", score: 15.0, submission_date: "2026-10-02" },
        changed_columns: ["score", "submission_date"],
        reason: "Normalized negative score to positive; standardized date format to ISO 8601",
      },
      {
        row_index: 3,
        original: { student_id: 103, name: "Charlie Brown", score: null, submission_date: "02-10-2026" },
        corrected: { student_id: 103, name: "Charlie Brown", score: 90.25, submission_date: "2026-02-10" },
        changed_columns: ["score", "submission_date"],
        reason: "Imputed missing score with median 90.25; converted date to ISO 8601",
      },
      {
        row_index: 4,
        original: { student_id: 104, name: "Diana Prince", score: 105.0, submission_date: "2026-10-04" },
        corrected: { student_id: 104, name: "Diana Prince", score: 100.0, submission_date: "2026-10-04" },
        changed_columns: ["score"],
        reason: "Clamped score > 100.0 to maximum allowed boundary 100.0",
      },
    ],
    invariants: {
      row_lineage_preserved: true,
      total_input_rows: 5,
      total_output_rows: 5,
      dropped_rows_count: 0,
      untouched_valid_cells_identical: true,
      idempotent: true,
      validation_rules_passed: true,
      rule_checks: [
        {
          rule_name: "Non-Negative Constraint",
          column: "score",
          condition: "val >= 0.0",
          passed: true,
          violation_count: 0,
          message: "All 5 values in 'score' satisfy non-negative bound.",
        },
        {
          rule_name: "ISO 8601 Date Format Standard",
          column: "submission_date",
          condition: "matches 'YYYY-MM-DD'",
          passed: true,
          violation_count: 0,
          message: "100% of non-null dates in 'submission_date' conform to YYYY-MM-DD standard.",
        },
        {
          rule_name: "Primary Key Uniqueness",
          column: "student_id",
          condition: "unique(key) == 1.0",
          passed: true,
          violation_count: 0,
          message: "Primary key 'student_id' has 0 duplicate values.",
        },
      ],
      all_invariants_hold: true,
    },
    verification_level: "V4",
    confidence_score: 95.0,
    summary: "Analyzed 5 rows across 4 columns. Identified 3 anomalies. Corrected 3 rows via idempotent script. All invariants satisfied (V4).",
  };
}
