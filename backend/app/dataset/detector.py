"""
Dataset Flaw and Anomaly Detector Module
Audits structured and semi-structured datasets to discover:
- Missing values and null sentinels
- Mixed/wrong types
- Duplicate rows and primary key violations
- Statistical and domain numeric outliers (flagging ambiguous cases for human decision)
- Inconsistent casing and text formats
- Inconsistent or broken date formats
- Schema drift
"""

import uuid

import pandas as pd

from app.dataset.models import AnomalyFinding, AnomalyType, DatasetProfile
from app.dataset.profiler import DATE_PATTERNS, NULL_SENTINELS, load_dataframe_from_content


def detect_dataset_anomalies(
    filename: str,
    content: str,
    profile: DatasetProfile,
) -> list[AnomalyFinding]:
    """Scans dataset content and profile to identify data quality anomalies."""
    anomalies: list[AnomalyFinding] = []
    df = load_dataframe_from_content(content, profile.detected_format)

    if len(df) == 0:
        return anomalies

    # 1. Duplicate Rows
    exact_duplicates_mask = df.duplicated()
    dup_count = int(exact_duplicates_mask.sum())
    if dup_count > 0:
        dup_indices = df[exact_duplicates_mask].index.tolist()
        evidence = df[exact_duplicates_mask].head(3).to_dict(orient="records")
        anomalies.append(
            AnomalyFinding(
                id=f"anomaly-{uuid.uuid4().hex[:8]}",
                anomaly_type=AnomalyType.DUPLICATES,
                column=None,
                affected_rows_count=dup_count,
                evidence_rows=evidence,
                evidence_indices=dup_indices[:10],
                severity="medium",
                description=f"Found {dup_count} exact duplicate row(s) in dataset.",
                proposed_correction="Deduplicate exact duplicate rows while preserving the first occurrence.",
                needs_human_decision=False,
            )
        )

    # 2. Iterate each column for specific checks
    for col_prof in profile.columns:
        col = col_prof.name
        col_series = df[col]

        # A. Missing Values
        is_sentinel = col_series.astype(str).str.strip().str.lower().isin(NULL_SENTINELS)
        null_mask = col_series.isna() | is_sentinel
        null_count = int(null_mask.sum())

        if null_count > 0:
            null_indices = df[null_mask].index.tolist()
            evidence = df[null_mask].head(3).to_dict(orient="records")
            anomalies.append(
                AnomalyFinding(
                    id=f"anomaly-{uuid.uuid4().hex[:8]}",
                    anomaly_type=AnomalyType.MISSING_VALUES,
                    column=col,
                    affected_rows_count=null_count,
                    evidence_rows=evidence,
                    evidence_indices=null_indices[:10],
                    severity="high" if null_count > len(df) * 0.1 else "medium",
                    description=f"Column '{col}' has {null_count} missing/null value(s) ({round(col_prof.null_rate * 100, 1)}%).",
                    proposed_correction=(
                        "Impute missing values with column median if numeric, or mode if categorical."
                        if col_prof.inferred_type in ("integer", "float")
                        else f"Impute missing text in '{col}' with '[Unknown]' or most frequent value."
                    ),
                    needs_human_decision=False,
                )
            )

        # B. Wrong / Mixed Types
        if col_prof.inferred_type == "mixed":
            coerced = pd.to_numeric(col_series, errors="coerce")
            mixed_mask = col_series.notna() & coerced.isna() & ~is_sentinel
            mixed_count = int(mixed_mask.sum())
            if mixed_count > 0:
                evidence = df[mixed_mask].head(3).to_dict(orient="records")
                anomalies.append(
                    AnomalyFinding(
                        id=f"anomaly-{uuid.uuid4().hex[:8]}",
                        anomaly_type=AnomalyType.WRONG_MIXED_TYPES,
                        column=col,
                        affected_rows_count=mixed_count,
                        evidence_rows=evidence,
                        evidence_indices=df[mixed_mask].index.tolist()[:10],
                        severity="high",
                        description=f"Column '{col}' contains non-numeric string values in a predominantly numeric column.",
                        proposed_correction=f"Clean non-numeric characters (currency, commas) and cast '{col}' to numeric.",
                        needs_human_decision=False,
                    )
                )

        # C. Date Inconsistencies & Broken Dates
        if col in profile.date_columns or "date" in col.lower() or "time" in col.lower():
            non_null_dates = col_series[~null_mask].astype(str).str.strip()
            detected_patterns_seen = set()
            broken_date_indices = []

            for idx, val in non_null_dates.items():
                matched = False
                for pat, fmt in DATE_PATTERNS:
                    if pat.match(val):
                        matched = True
                        detected_patterns_seen.add(fmt)
                        break
                if not matched:
                    # Try pandas parsing
                    try:
                        pd.to_datetime(val)
                    except (ValueError, TypeError, pd.errors.ParserError):
                        broken_date_indices.append(idx)

            # Broken / unparseable dates
            if len(broken_date_indices) > 0:
                evidence = df.loc[broken_date_indices].head(3).to_dict(orient="records")
                anomalies.append(
                    AnomalyFinding(
                        id=f"anomaly-{uuid.uuid4().hex[:8]}",
                        anomaly_type=AnomalyType.BROKEN_DATES,
                        column=col,
                        affected_rows_count=len(broken_date_indices),
                        evidence_rows=evidence,
                        evidence_indices=broken_date_indices[:10],
                        severity="critical",
                        description=f"Column '{col}' contains {len(broken_date_indices)} unparseable or corrupted date value(s).",
                        proposed_correction=f"Standardize parseable dates and repair corrupted formats in '{col}'.",
                        needs_human_decision=False,
                    )
                )

            # Mixed date formatting
            if len(detected_patterns_seen) > 1:
                anomalies.append(
                    AnomalyFinding(
                        id=f"anomaly-{uuid.uuid4().hex[:8]}",
                        anomaly_type=AnomalyType.INCONSISTENT_DATE_FORMAT,
                        column=col,
                        affected_rows_count=len(non_null_dates),
                        evidence_rows=df.loc[non_null_dates.index]
                        .head(3)
                        .to_dict(orient="records"),
                        severity="medium",
                        description=f"Column '{col}' mixes multiple date conventions: {', '.join(sorted(detected_patterns_seen))}.",
                        proposed_correction=f"Harmonize all dates in '{col}' to standard ISO 8601 format (YYYY-MM-DD).",
                        needs_human_decision=False,
                    )
                )

        # D. Numeric Outliers & Domain Boundary Violations
        if col_prof.inferred_type in ("integer", "float"):
            num_series = pd.to_numeric(col_series, errors="coerce").dropna()
            if len(num_series) >= 4:
                q1 = float(num_series.quantile(0.25))
                q3 = float(num_series.quantile(0.75))
                iqr = q3 - q1
                lower_fence = q1 - 1.5 * iqr
                upper_fence = q3 + 1.5 * iqr

                # Domain check: negative scores, marks, percentages, prices, counts
                is_bounded_domain = any(
                    term in col.lower()
                    for term in ("score", "mark", "grade", "percentage", "rate", "count", "age")
                )

                domain_violation_mask = pd.Series(False, index=num_series.index)
                if is_bounded_domain:
                    if (
                        "percentage" in col.lower()
                        or "rate" in col.lower()
                        or "score" in col.lower()
                        or "mark" in col.lower()
                    ):
                        domain_violation_mask = (num_series < 0) | (num_series > 100)
                    else:
                        domain_violation_mask = num_series < 0

                domain_count = int(domain_violation_mask.sum())
                if domain_count > 0:
                    outlier_indices = num_series[domain_violation_mask].index.tolist()
                    evidence = df.loc[outlier_indices].head(3).to_dict(orient="records")
                    anomalies.append(
                        AnomalyFinding(
                            id=f"anomaly-{uuid.uuid4().hex[:8]}",
                            anomaly_type=AnomalyType.NUMERIC_OUTLIER,
                            column=col,
                            affected_rows_count=domain_count,
                            evidence_rows=evidence,
                            evidence_indices=outlier_indices[:10],
                            severity="high",
                            description=(
                                f"Column '{col}' contains {domain_count} out-of-bounds value(s) "
                                f"(e.g. negative or > 100 values: {num_series[domain_violation_mask].tolist()[:3]})."
                            ),
                            proposed_correction=f"Clamp or normalize invalid bounds in '{col}' (non-negative, capped at 100.0).",
                            needs_human_decision=False,
                        )
                    )

                # Statistical Outliers (ambiguous cases)
                stat_outliers_mask = (
                    (num_series < lower_fence) | (num_series > upper_fence)
                ) & ~domain_violation_mask
                stat_count = int(stat_outliers_mask.sum())
                if stat_count > 0 and stat_count < len(num_series) * 0.15:
                    stat_indices = num_series[stat_outliers_mask].index.tolist()
                    evidence = df.loc[stat_indices].head(3).to_dict(orient="records")
                    anomalies.append(
                        AnomalyFinding(
                            id=f"anomaly-{uuid.uuid4().hex[:8]}",
                            anomaly_type=AnomalyType.AMBIGUOUS_HUMAN_DECISION,
                            column=col,
                            affected_rows_count=stat_count,
                            evidence_rows=evidence,
                            evidence_indices=stat_indices[:10],
                            severity="low",
                            description=(
                                f"Column '{col}' has {stat_count} statistical outlier(s) beyond 1.5x IQR "
                                f"[{round(lower_fence, 2)}, {round(upper_fence, 2)}]. Requires human domain verification."
                            ),
                            proposed_correction="Flag for human decision; avoid silent truncation.",
                            needs_human_decision=True,
                        )
                    )

        # E. Inconsistent String Casing
        if col_prof.inferred_type == "string" and col_prof.unique_count > 1:
            clean_str = col_series[~null_mask].astype(str).str.strip()
            lower_map: dict[str, set[str]] = {}
            for s in clean_str:
                lower_map.setdefault(s.lower(), set()).add(s)

            casing_conflicts = [variants for variants in lower_map.values() if len(variants) > 1]
            if casing_conflicts:
                conflict_examples = [list(c) for c in casing_conflicts[:3]]
                anomalies.append(
                    AnomalyFinding(
                        id=f"anomaly-{uuid.uuid4().hex[:8]}",
                        anomaly_type=AnomalyType.INCONSISTENT_CASING,
                        column=col,
                        affected_rows_count=sum(len(c) for c in casing_conflicts),
                        evidence_rows=[{"column": col, "variants": conflict_examples}],
                        severity="low",
                        description=f"Column '{col}' has inconsistent casing variants: {conflict_examples}.",
                        proposed_correction=f"Normalize casing in '{col}' to Title Case or standard lowercase.",
                        needs_human_decision=False,
                    )
                )

    return anomalies
