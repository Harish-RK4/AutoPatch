"""
Dataset Profiler Module
Computes deep schema, types, distributions, null rates, uniqueness, date formats,
and statistical profiles across structured and semi-structured dataset formats.
"""

import io
import json
import re

import pandas as pd

from app.dataset.models import ColumnProfile, DatasetProfile

DATE_PATTERNS = [
    (re.compile(r"^\d{4}-\d{2}-\d{2}$"), "%Y-%m-%d"),
    (re.compile(r"^\d{4}/\d{2}/\d{2}$"), "%Y/%m/%d"),
    (re.compile(r"^\d{2}-\d{2}-\d{4}$"), "%d-%m-%Y"),
    (re.compile(r"^\d{2}/\d{2}/\d{4}$"), "%m/%d/%Y"),
    (re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}"), "%Y-%m-%dT%H:%M:%S"),
]

NULL_SENTINELS = {"", "null", "none", "nan", "na", "n/a", "missing", "undefined", "?", "-"}


def infer_format(filename: str, content: str) -> str:
    lower_fn = filename.lower()
    if lower_fn.endswith(".csv"):
        return "csv"
    if lower_fn.endswith(".tsv"):
        return "tsv"
    if lower_fn.endswith(".json"):
        return "json"
    if lower_fn.endswith((".jsonl", ".ndjson")):
        return "jsonl"
    if lower_fn.endswith(".parquet"):
        return "parquet"
    if lower_fn.endswith((".sqlite", ".db")):
        return "sqlite"
    if lower_fn.endswith(".xml"):
        return "xml"
    if lower_fn.endswith((".yaml", ".yml")):
        return "yaml"
    if lower_fn.endswith(".toml"):
        return "toml"

    # Sniff content
    stripped = content.strip()
    if stripped.startswith(("{", "[")):
        try:
            json.loads(stripped)
            return "json"
        except (ValueError, TypeError, json.JSONDecodeError):
            pass
    if "\t" in stripped.splitlines()[0]:
        return "tsv"
    if "," in stripped.splitlines()[0]:
        return "csv"
    return "text"


def load_dataframe_from_content(content: str, detected_format: str) -> pd.DataFrame:
    """Safely parses dataset text into a pandas DataFrame."""
    if not content.strip():
        return pd.DataFrame()

    if detected_format == "csv":
        try:
            return pd.read_csv(io.StringIO(content), skipinitialspace=True)
        except (ValueError, TypeError, pd.errors.ParserError):
            return pd.read_csv(io.StringIO(content), sep=None, engine="python")

    elif detected_format == "tsv":
        return pd.read_csv(io.StringIO(content), sep="\t")

    elif detected_format == "json":
        data = json.loads(content)
        if isinstance(data, list):
            return pd.json_normalize(data)
        elif isinstance(data, dict):
            # Check if dict wraps a list
            for val in data.values():
                if isinstance(val, list) and len(val) > 0 and isinstance(val[0], dict):
                    return pd.json_normalize(val)
            return pd.json_normalize([data])
        return pd.DataFrame()

    elif detected_format == "jsonl":
        records = []
        for line in content.splitlines():
            line = line.strip()
            if line:
                records.append(json.loads(line))
        return pd.DataFrame(records)

    else:
        # Fallback to CSV parser
        try:
            return pd.read_csv(io.StringIO(content))
        except (ValueError, TypeError, pd.errors.ParserError):
            # Minimal single-column text fallback
            lines = content.strip().splitlines()
            return pd.DataFrame({"raw_line": lines})


def detect_date_format_sample(series: pd.Series) -> tuple[bool, str | None]:
    """Detects whether a column represents dates and identifies variance in formatting."""
    non_null = series.dropna().astype(str).str.strip()
    if len(non_null) == 0:
        return False, None

    matched_formats = set()
    matches_count = 0

    for val in non_null.head(100):
        val_lower = val.lower()
        if val_lower in NULL_SENTINELS:
            continue
        for pat, fmt in DATE_PATTERNS:
            if pat.match(val):
                matched_formats.add(fmt)
                matches_count += 1
                break

    if matches_count >= max(2, int(len(non_null) * 0.5)):
        if len(matched_formats) == 1:
            return True, next(iter(matched_formats))
        elif len(matched_formats) > 1:
            return True, "mixed"
    return False, None


def profile_dataset(filename: str, content: str) -> DatasetProfile:
    """Profiles dataset structure, types, nulls, distributions, and keys."""
    detected_format = infer_format(filename, content)
    df = load_dataframe_from_content(content, detected_format)

    total_rows = len(df)
    total_columns = len(df.columns)

    if total_rows == 0 or total_columns == 0:
        return DatasetProfile(
            total_rows=0,
            total_columns=0,
            detected_format=detected_format,
            columns=[],
        )

    # For large datasets (>10k rows), sample for deep statistical profiling
    working_df = df.sample(n=min(5000, total_rows), random_state=42) if total_rows > 10000 else df

    column_profiles: list[ColumnProfile] = []
    primary_key_candidates: list[str] = []
    date_columns: list[str] = []
    total_nulls_count = 0

    for col in working_df.columns:
        col_series = working_df[col]
        # Identify true nulls + sentinel string nulls
        is_sentinel = col_series.astype(str).str.strip().str.lower().isin(NULL_SENTINELS)
        null_mask = col_series.isna() | is_sentinel
        null_count = int(null_mask.sum())
        null_rate = round(null_count / total_rows, 4)
        total_nulls_count += null_count

        valid_series = col_series[~null_mask]
        unique_count = int(valid_series.nunique())
        unique_rate = round(unique_count / total_rows, 4) if total_rows > 0 else 0.0

        # Sample values
        sample_vals = [None if pd.isna(v) else v for v in valid_series.head(5).tolist()]

        # Infer type
        is_date, date_fmt = detect_date_format_sample(col_series)
        if is_date:
            date_columns.append(str(col))

        min_val, max_val, mean_val, std_val = None, None, None, None

        if is_date:
            inferred_type = "datetime"
        elif pd.api.types.is_bool_dtype(valid_series):
            inferred_type = "boolean"
        elif pd.api.types.is_integer_dtype(valid_series):
            inferred_type = "integer"
            if len(valid_series) > 0:
                min_val = float(valid_series.min())
                max_val = float(valid_series.max())
                mean_val = round(float(valid_series.mean()), 2)
                std_val = round(float(valid_series.std()), 2) if len(valid_series) > 1 else 0.0
        elif pd.api.types.is_float_dtype(valid_series):
            # Check if all floats are actually ints
            is_int_compat = False
            try:
                is_int_compat = bool((valid_series == valid_series.round()).all())
            except (ValueError, TypeError):
                is_int_compat = False
            inferred_type = "integer" if is_int_compat else "float"
            if len(valid_series) > 0:
                min_val = float(valid_series.min())
                max_val = float(valid_series.max())
                mean_val = round(float(valid_series.mean()), 2)
                std_val = round(float(valid_series.std()), 2) if len(valid_series) > 1 else 0.0
        else:
            # Check if strings can be coerced to numeric or datetime
            coerced_num = pd.to_numeric(valid_series, errors="coerce")
            num_success_rate = (
                coerced_num.notna().sum() / len(valid_series) if len(valid_series) > 0 else 0
            )

            if num_success_rate > 0.8:
                inferred_type = "mixed"
                num_valid = coerced_num.dropna()
                if len(num_valid) > 0:
                    min_val = float(num_valid.min())
                    max_val = float(num_valid.max())
                    mean_val = round(float(num_valid.mean()), 2)
            else:
                inferred_type = "string"

        # Check for Primary Key candidate (0 nulls, 100% unique)
        is_pk = (null_count == 0) and (unique_count == total_rows) and total_rows > 0
        if is_pk:
            primary_key_candidates.append(str(col))

        column_profiles.append(
            ColumnProfile(
                name=str(col),
                inferred_type=inferred_type,
                null_count=null_count,
                null_rate=null_rate,
                unique_count=unique_count,
                unique_rate=unique_rate,
                sample_values=sample_vals,
                min_val=min_val,
                max_val=max_val,
                mean_val=mean_val,
                std_val=std_val,
                detected_date_format=date_fmt,
                is_primary_key_candidate=is_pk,
            )
        )

    overall_null_rate = round(total_nulls_count / (total_rows * total_columns), 4)

    return DatasetProfile(
        total_rows=total_rows,
        total_columns=total_columns,
        detected_format=detected_format,
        encoding="utf-8",
        columns=column_profiles,
        primary_key_candidates=primary_key_candidates,
        date_columns=date_columns,
        overall_null_rate=overall_null_rate,
    )
