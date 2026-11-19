# AutoPatch Benchmark Results

Generated on: `2026-11-19 12:53:09 UTC`
Environment: Python 3.12.3 on win32

## Summary of Results

| Benchmark Component | Metric | Value | Target | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Polyglot Ingestion** | Accuracy | **100.0%** | >= 95% | ✅ PASS |
| **Polyglot Ingestion** | Avg Latency | **0.02 ms** | < 25 ms | ✅ PASS |
| **AST Call-Graph Indexer** | Extraction Speed | **0.39 ms** | < 50 ms | ✅ PASS |
| **Fix Explanation Engine** | Latency | **0.06 ms** | < 100 ms | ✅ PASS |
| **Fix Explanation Engine** | Trace Steps | **3 steps** | >= 2 | ✅ PASS |
| **Dataset Invariant Engine** | Mathematical Invariants | **4 / 4 Passing** | 4 / 4 | ✅ PASS |
| **Verification Ladder Tier** | Achieved Tier | **V4 (100% Conf)** | V4 Proven | ✅ PASS |
| **Dataset Proof Verification** | Latency | **27.56 ms** | < 150 ms | ✅ PASS |

## Invariant Mathematical Proof Guarantees
1. **Row Lineage**: Output rows map 1-to-1 to input rows or documented deduplication drops (`O <= I`).
2. **Cell Identity**: Untouched valid cells maintain byte-level character identity.
3. **Idempotency**: Re-running the generated Python transformation script produces an invariant output (`clean(clean(D)) == clean(D)`).
4. **Validation Rules**: Pandera and Great Expectations style boundary, pattern, and type assertions pass 100%.
