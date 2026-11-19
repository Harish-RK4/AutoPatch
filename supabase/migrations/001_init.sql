-- ==============================================================================
-- AutoPatch Canonical Database Schema
-- Migration 001_init.sql
-- ==============================================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. User Profiles
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  role text default 'developer',
  created_at timestamptz default now()
);

-- 2. Projects
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references profiles(id) on delete cascade,
  name text not null,
  language text,
  source_type text default 'upload', -- upload | git | demo
  storage_path text,
  repo_url text,
  status text default 'uploaded',    -- uploaded | scanning | ready | failed
  created_at timestamptz default now()
);

-- 3. Pipeline Scans
create table if not exists scans (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  stage text default 'scan',         -- upload | scan | explain | fix | test | done | failed
  started_at timestamptz default now(),
  finished_at timestamptz,
  summary jsonb
);

-- 4. Detected Bugs
create table if not exists bugs (
  id uuid primary key default gen_random_uuid(),
  scan_id uuid references scans(id) on delete cascade,
  project_id uuid references projects(id) on delete cascade,
  title text not null,
  description text,
  file_path text not null,
  line_start int not null,
  line_end int not null,
  origin_line int,
  crash_line int,
  trigger_input jsonb,
  failure_type text,
  execution_trace jsonb,
  stack_trace text,
  category text default 'logic',     -- logic | crash | edge_case | security | performance | flaky
  cwe_id text,
  state text default 'suspected',    -- suspected | confirmed | fixed | wont_fix
  severity text default 'medium',    -- low | medium | high | critical
  severity_score numeric default 5.0,
  confidence_score numeric default 40.0,
  priority_rank int default 1,
  verification_level text default 'V0', -- V0 | V1 | V2 | V3 | V4
  root_cause jsonb,                  -- {summary, trigger_input, trace[], beginner, developer, manager}
  blast_radius jsonb,                -- {functions[], tests[], files[]}
  created_at timestamptz default now()
);

-- 5. Reproduction Tests
create table if not exists repro_tests (
  id uuid primary key default gen_random_uuid(),
  bug_id uuid references bugs(id) on delete cascade,
  test_code text not null,
  fails_before boolean default true,
  created_at timestamptz default now()
);

-- 6. Candidate Patches
create table if not exists patches (
  id uuid primary key default gen_random_uuid(),
  bug_id uuid references bugs(id) on delete cascade,
  candidate_no int not null default 1,
  diff text not null,
  original_code text not null,
  patched_code text not null,
  reason text not null,
  risk_level text default 'low',     -- low | medium | high
  critic_verdict jsonb,
  rank int default 1,
  selected boolean default false,
  git_branch text,
  status text default 'proposed',    -- proposed | accepted | rejected | needs_review
  verification_level text default 'V0',
  created_at timestamptz default now()
);

-- 7. Patch Hunks (Per-replaced-line breakdown)
create table if not exists patch_hunks (
  id uuid primary key default gen_random_uuid(),
  patch_id uuid references patches(id) on delete cascade,
  hunk_no int not null,
  file_path text not null,
  line_start int not null,
  line_end int not null,
  original_code text not null,
  new_code text not null,
  why_wrong text not null,
  why_fix_works text not null,
  if_not_fixed text,
  side_effects jsonb,
  alternatives jsonb,
  created_at timestamptz default now()
);

-- 8. Test Executions
create table if not exists test_runs (
  id uuid primary key default gen_random_uuid(),
  patch_id uuid references patches(id) on delete cascade,
  kind text not null,                -- repro | existing | generated | property | security_rescan
  passed int default 0,
  failed int default 0,
  details jsonb,
  duration_ms int default 0,
  created_at timestamptz default now()
);

-- 9. Change History & Rollbacks
create table if not exists change_history (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  bug_id uuid references bugs(id) on delete set null,
  patch_id uuid references patches(id) on delete set null,
  action text not null,              -- detected | patched | tested | accepted | rejected | rolled_back
  actor_id uuid references profiles(id) on delete set null,
  note text,
  created_at timestamptz default now()
);

-- 10. Repository Memory (Learnings from accepted/rejected diffs)
create table if not exists repo_memory (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  kind text not null,                -- style_rule | rejected_pattern | accepted_pattern
  content text not null,
  created_at timestamptz default now()
);

-- 11. Push Notification Device Tokens
create table if not exists device_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  fcm_token text unique not null,
  platform text default 'web',
  created_at timestamptz default now()
);

-- 12. In-App Notifications
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  type text not null,                -- scan_completed | bug_confirmed | patch_verified | review_needed | pipeline_failed
  title text not null,
  body text not null,
  data jsonb,
  read boolean default false,
  created_at timestamptz default now()
);

-- 13. Dataset Profiles
create table if not exists dataset_profiles (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  row_count bigint,
  column_count int,
  null_rates jsonb,
  schema_snapshot jsonb,
  created_at timestamptz default now()
);

-- 14. Dataset Changes
create table if not exists dataset_changes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references projects(id) on delete cascade,
  original_hash text not null,
  corrected_hash text not null,
  script_content text not null,
  invariants_passed boolean default true,
  created_at timestamptz default now()
);

-- ==============================================================================
-- ROW LEVEL SECURITY POLICIES
-- Rule: Users can access only rows belonging to projects they own.
-- ==============================================================================

alter table profiles enable row level security;
alter table projects enable row level security;
alter table scans enable row level security;
alter table bugs enable row level security;
alter table repro_tests enable row level security;
alter table patches enable row level security;
alter table patch_hunks enable row level security;
alter table test_runs enable row level security;
alter table change_history enable row level security;
alter table repo_memory enable row level security;
alter table device_tokens enable row level security;
alter table notifications enable row level security;
alter table dataset_profiles enable row level security;
alter table dataset_changes enable row level security;

-- Profiles: Users manage their own profile
create policy "Users can view own profile" on profiles
  for select using (auth.uid() = id);
create policy "Users can update own profile" on profiles
  for update using (auth.uid() = id);

-- Projects: Users manage their own projects
create policy "Users can access own projects" on projects
  for all using (auth.uid() = owner_id);

-- Scans: Access through project ownership
create policy "Users can access own project scans" on scans
  for all using (
    exists (select 1 from projects where projects.id = scans.project_id and projects.owner_id = auth.uid())
  );

-- Bugs: Access through project ownership
create policy "Users can access own project bugs" on bugs
  for all using (
    exists (select 1 from projects where projects.id = bugs.project_id and projects.owner_id = auth.uid())
  );

-- Repro Tests
create policy "Users can access own bug repro_tests" on repro_tests
  for all using (
    exists (
      select 1 from bugs
      join projects on projects.id = bugs.project_id
      where bugs.id = repro_tests.bug_id and projects.owner_id = auth.uid()
    )
  );

-- Patches
create policy "Users can access own bug patches" on patches
  for all using (
    exists (
      select 1 from bugs
      join projects on projects.id = bugs.project_id
      where bugs.id = patches.bug_id and projects.owner_id = auth.uid()
    )
  );

-- Patch Hunks
create policy "Users can access own patch hunks" on patch_hunks
  for all using (
    exists (
      select 1 from patches
      join bugs on bugs.id = patches.bug_id
      join projects on projects.id = bugs.project_id
      where patches.id = patch_hunks.patch_id and projects.owner_id = auth.uid()
    )
  );

-- Test Runs
create policy "Users can access own test runs" on test_runs
  for all using (
    exists (
      select 1 from patches
      join bugs on bugs.id = patches.bug_id
      join projects on projects.id = bugs.project_id
      where patches.id = test_runs.patch_id and projects.owner_id = auth.uid()
    )
  );

-- Change History
create policy "Users can access own project change history" on change_history
  for all using (
    exists (select 1 from projects where projects.id = change_history.project_id and projects.owner_id = auth.uid())
  );

-- Repo Memory
create policy "Users can access own repo memory" on repo_memory
  for all using (
    exists (select 1 from projects where projects.id = repo_memory.project_id and projects.owner_id = auth.uid())
  );

-- Device Tokens
create policy "Users manage own device tokens" on device_tokens
  for all using (auth.uid() = user_id);

-- Notifications
create policy "Users manage own notifications" on notifications
  for all using (auth.uid() = user_id);

-- Dataset Profiles
create policy "Users access own dataset profiles" on dataset_profiles
  for all using (
    exists (select 1 from projects where projects.id = dataset_profiles.project_id and projects.owner_id = auth.uid())
  );

-- Dataset Changes
create policy "Users access own dataset changes" on dataset_changes
  for all using (
    exists (select 1 from projects where projects.id = dataset_changes.project_id and projects.owner_id = auth.uid())
  );
