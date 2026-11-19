import httpx
import json

base_url = "http://127.0.0.1:8000/api/v1"

flawed_code = '''
import subprocess

def compute_metrics(val, divisor):
    # Bug 1: Literal zero division
    res = 100 / 0
    return res

def run_user_cmd(cmd):
    # Bug 2: Security injection
    subprocess.Popen(cmd, shell=True)
'''

print("===================================================================")
print("             AutoPatch Live Flaw & Repair Verification             ")
print("===================================================================")

print("\n[Step 1] Ingesting Code with Real Defects into AutoPatch...")
create_resp = httpx.post(
    f"{base_url}/projects",
    json={
        "name": "Live Defect Benchmark",
        "source_type": "paste",
        "language": "python",
        "filename": "analyzer.py",
        "content": flawed_code,
    },
    timeout=10.0,
)
proj = create_resp.json()
proj_id = proj["id"]
print(f"-> Project Created: {proj_id} ({proj['name']})")

print("\n[Step 2] Executing Autonomous Repair Pipeline (SCAN -> EXPLAIN -> FIX -> TEST)...")
pipeline_resp = httpx.post(f"{base_url}/projects/{proj_id}/pipeline", timeout=30.0)
res = pipeline_resp.json()

print(f"-> Pipeline Status: {res.get('status', 'unknown').upper()}")
print(f"-> Flaws Identified: {res.get('issues_count', 0)}")
print(f"-> Patch Candidates Generated: {res.get('patches_count', 0)}")
print(f"-> Sandbox Execution Time: {res.get('total_sandbox_duration_ms', 0)}ms")
print(f"-> Sandbox Runner: {res.get('runner_label', 'local')}")

print("\n[Step 3] Detected Defects:")
for idx, issue in enumerate(res.get("issues", []), start=1):
    print(f"  {idx}. [{issue['rule_id']}] Line {issue['line_number']} (Severity: {issue['severity'].upper()}):")
    print(f"     Message: {issue['message']}")
    print(f"     Code Snippet: '{issue['snippet']}'")

print("\n[Step 4] Synthesized Fixes & Dual Sandbox Verification:")
for p in res.get("patches", []):
    print(f"\n  * Patch ID: {p['id']} | Candidate #{p.get('candidate_number', 1)}: {p.get('strategy', 'Targeted Fix')}")
    print(f"    - Target File: {p['file_path']}")
    print(f"    - Verification Ladder: [{p['verification_level']}] | Confidence: {p['confidence_score']}%")
    print(f"    - Dual Sandbox Proof: Pre-patch failed={not p['pre_patch_test_passed']} | Post-patch passed={p['post_patch_test_passed']}")
    critic = p.get("critic_verdict") or {}
    print(f"    - Critic Score: {critic.get('composite_score', 0)}/100 | Recommendation: {critic.get('recommendation', 'needs_review').upper()}")
    blast = p.get("blast_radius") or {}
    print(f"    - Blast Radius: {blast.get('summary', 'Low risk')}")
    print("    - Unified Diff Applied to Fix Bug:")
    for line in p.get("unified_diff", "").splitlines():
        if line.startswith("+"):
            print(f"      \033[32m{line}\033[0m")
        elif line.startswith("-"):
            print(f"      \033[31m{line}\033[0m")
        else:
            print(f"      {line}")

print("\n===================================================================")
print("                      Verification Complete                        ")
print("===================================================================")
