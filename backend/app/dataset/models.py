"""
Dataset Engine Data Models
Structures for dataset profiling, anomaly detection, idempotent correction,
and invariant verification.
"""

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class AnomalyType(str, Enum):
    MISSING_VALUES = "missing_values"
    WRONG_MIXED_TYPES = "wrong_mixed_types"
    DUPLICATES = "duplicates"
    NUMERIC_OUTLIER = "numeric_outlier"
    INCONSISTENT_CASING = "inconsistent_casing"
    INCONSISTENT_DATE_FORMAT = "inconsistent_date_format"
    BROKEN_DATES = "broken_dates"
    KEY_VIOLATION = "key_violation"
    SCHEMA_DRIFT = "schema_drift"
    AMBIGUOUS_HUMAN_DECISION = "ambiguous_human_decision"
    LABEL_LEAKAGE = "label_leakage"


class ColumnProfile(BaseModel):
    name: str
    inferred_type: str  # "integer", "float", "string", "datetime", "boolean", "mixed"
    null_count: int
    null_rate: float
    unique_count: int
    unique_rate: float
    sample_values: list[Any] = Field(default_factory=list)
    min_val: float | None = None
    max_val: float | None = None
    mean_val: float | None = None
    std_val: float | None = None
    detected_date_format: str | None = None
    is_primary_key_candidate: bool = False


class DatasetProfile(BaseModel):
    total_rows: int
    total_columns: int
    detected_format: str  # "csv", "tsv", "json", "jsonl", "sqlite", "xml", "yaml", "excel", "text"
    encoding: str = "utf-8"
    columns: list[ColumnProfile] = Field(default_factory=list)
    primary_key_candidates: list[str] = Field(default_factory=list)
    date_columns: list[str] = Field(default_factory=list)
    overall_null_rate: float = 0.0


class AnomalyFinding(BaseModel):
    id: str
    anomaly_type: AnomalyType
    column: str | None = None
    affected_rows_count: int
    evidence_rows: list[dict[str, Any]] = Field(default_factory=list)
    severity: str = "medium"  # "low", "medium", "high", "critical"
    description: str
    proposed_correction: str
    needs_human_decision: bool = False
    evidence_indices: list[int] = Field(default_factory=list)


class ChangedRow(BaseModel):
    row_index: int
    original: dict[str, Any]
    corrected: dict[str, Any]
    changed_columns: list[str]
    reason: str


class RuleCheckResult(BaseModel):
    rule_name: str
    column: str
    condition: str
    passed: bool
    violation_count: int = 0
    message: str


class InvariantVerificationResult(BaseModel):
    row_lineage_preserved: bool
    total_input_rows: int
    total_output_rows: int
    dropped_rows_count: int
    untouched_valid_cells_identical: bool
    idempotent: bool
    validation_rules_passed: bool
    rule_checks: list[RuleCheckResult] = Field(default_factory=list)
    all_invariants_hold: bool


class DatasetReviewBundle(BaseModel):
    project_id: str
    filename: str
    detected_format: str
    before_profile: DatasetProfile
    after_profile: DatasetProfile
    anomalies: list[AnomalyFinding] = Field(default_factory=list)
    cleaning_script: str
    corrected_content: str
    changed_rows: list[ChangedRow] = Field(default_factory=list)
    invariants: InvariantVerificationResult
    verification_level: str = "V3"
    confidence_score: float = 85.0
    summary: str
