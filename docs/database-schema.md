# Database Schema Reference

AutoPatch uses PostgreSQL with Row Level Security (RLS). The canonical schema is maintained in `supabase/migrations/001_init.sql`.

## Entity Relationship Overview

```text
profiles (auth.users)
  └── projects
        ├── scans
        │     └── bugs
        │           ├── repro_tests
        │           ├── patches
        │           │     ├── patch_hunks
        │           │     └── test_runs
        │           └── change_history
        ├── repo_memory
        ├── dataset_profiles
        └── dataset_changes

profiles
  ├── device_tokens
  └── notifications
```

## Tables & Columns

### 1. `profiles`
- `id` (uuid, PK, references `auth.users`)
- `full_name` (text)
- `role` (text, default 'developer')
- `created_at` (timestamptz)

### 2. `projects`
- `id` (uuid, PK)
- `owner_id` (uuid, FK `profiles.id`)
- `name` (text)
- `language` (text)
- `source_type` (text: 'upload', 'git', 'demo')
- `storage_path` (text)
- `repo_url` (text)
- `status` (text: 'uploaded', 'scanning', 'ready', 'failed')
- `created_at` (timestamptz)

### 3. `scans`
- `id` (uuid, PK)
- `project_id` (uuid, FK `projects.id`)
- `stage` (text: 'upload', 'scan', 'explain', 'fix', 'test', 'done', 'failed')
- `started_at` (timestamptz)
- `finished_at` (timestamptz)
- `summary` (jsonb)

### 4. `bugs`
- `id` (uuid, PK)
- `scan_id` (uuid, FK `scans.id`)
- `project_id` (uuid, FK `projects.id`)
- `title` (text)
- `description` (text)
- `file_path` (text)
- `line_start` (int), `line_end` (int)
- `origin_line` (int), `crash_line` (int)
- `trigger_input` (jsonb)
- `failure_type` (text)
- `execution_trace` (jsonb)
- `stack_trace` (text)
- `category` (text: logic, crash, edge_case, security, performance, flaky)
- `cwe_id` (text)
- `state` (text: suspected, confirmed, fixed, wont_fix)
- `severity` (text: low, medium, high, critical)
- `severity_score` (numeric 0-10)
- `confidence_score` (numeric 0-100)
- `priority_rank` (int)
- `verification_level` (text: V0, V1, V2, V3, V4)
- `root_cause` (jsonb: summary, trigger_input, trace, beginner, developer, manager)
- `blast_radius` (jsonb: functions, tests, files)

### 5. `patches`
- `id` (uuid, PK)
- `bug_id` (uuid, FK `bugs.id`)
- `candidate_no` (int)
- `diff` (text)
- `original_code` (text), `patched_code` (text)
- `reason` (text)
- `risk_level` (text: low, medium, high)
- `critic_verdict` (jsonb)
- `rank` (int)
- `selected` (boolean)
- `git_branch` (text)
- `status` (text: proposed, accepted, rejected, needs_review)

### 6. `patch_hunks`
- `id` (uuid, PK)
- `patch_id` (uuid, FK `patches.id`)
- `hunk_no` (int)
- `file_path` (text)
- `line_start` (int), `line_end` (int)
- `original_code` (text), `new_code` (text)
- `why_wrong` (text), `why_fix_works` (text), `if_not_fixed` (text)
- `side_effects` (jsonb), `alternatives` (jsonb)

### 7. `test_runs`
- `id` (uuid, PK)
- `patch_id` (uuid, FK `patches.id`)
- `kind` (text: repro, existing, generated, property, security_rescan)
- `passed` (int), `failed` (int), `details` (jsonb), `duration_ms` (int)
- `created_at` (timestamptz)

### 8. `change_history`
- `id` (uuid, PK)
- `project_id` (uuid, FK `projects.id`)
- `bug_id` (uuid, FK `bugs.id`), `patch_id` (uuid, FK `patches.id`)
- `action` (text: detected, patched, tested, accepted, rejected, rolled_back)
- `actor_id` (uuid, FK `profiles.id`)
- `note` (text)
- `created_at` (timestamptz)

### Row Level Security (RLS) Policy
RLS is enabled on every table. Users can select, insert, update, or delete rows only where the referenced project is owned by the authenticated user (`auth.uid() = owner_id`).
