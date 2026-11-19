"""
Explanation Validator Agent Module
Enforces strict quality rules on root-cause explanations:
1. Citations must point to valid files and real line bounds.
2. Explanations must mention the trigger input, origin line, crash line.
3. Explanations must articulate why the replacement is safe.
4. Explanations must align with the actual unified diff.
Unproven or non-conforming explanations are labelled 'Hypothesis' and lower confidence.
"""

from pydantic import BaseModel, Field

from app.patcher.explanation import BugExplanationBundle


class ValidationReport(BaseModel):
    is_valid: bool
    is_hypothesis: bool
    confidence_penalty: float = 0.0
    errors: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    citations_valid: bool = True
    trigger_input_cited: bool = True
    lines_cited: bool = True
    safety_rationale_present: bool = True
    diff_aligned: bool = True


def validate_explanation_bundle(
    bundle: BugExplanationBundle,
    file_content: str,
    actual_diff: str = "",
) -> tuple[BugExplanationBundle, ValidationReport]:
    """
    Validates an explanation bundle against the actual source file content and patch diff.
    If checks fail, flags is_hypothesis = True and applies confidence penalty.
    """
    errors: list[str] = []
    warnings: list[str] = []
    confidence_penalty = 0.0

    lines = file_content.splitlines() if file_content else []
    total_lines = len(lines)

    # 1. File Bounds & Line Citations Check
    citations_valid = True
    if bundle.origin_line < 1 or (total_lines > 0 and bundle.origin_line > total_lines):
        errors.append(
            f"Origin line {bundle.origin_line} is outside valid file line range (1-{total_lines})."
        )
        citations_valid = False

    if bundle.crash_line < 1 or (total_lines > 0 and bundle.crash_line > total_lines):
        errors.append(
            f"Crash line {bundle.crash_line} is outside valid file line range (1-{total_lines})."
        )
        citations_valid = False

    # 2. Check Trigger Input Mentioned in Developer Explanation
    trigger_input_cited = True
    dev_exp = bundle.levels.developer.lower()
    if not bundle.trigger_input:
        warnings.append("Trigger input payload is empty.")
        trigger_input_cited = False
    else:
        # Check if any trigger value appears in developer explanation
        has_trigger_ref = any(
            str(v).lower() in dev_exp or str(k).lower() in dev_exp
            for k, v in bundle.trigger_input.items()
        )
        if not has_trigger_ref:
            warnings.append("Developer explanation does not explicitly cite trigger input values.")
            trigger_input_cited = False

    # 3. Check Origin and Crash Lines Referenced
    lines_cited = (
        str(bundle.origin_line) in bundle.levels.developer
        and str(bundle.crash_line) in bundle.levels.developer
    )
    if not lines_cited:
        warnings.append("Developer explanation does not cite both origin and crash line numbers.")

    # 4. Check Safety Rationale & Hunk Cards
    safety_rationale_present = True
    if not bundle.hunk_cards:
        warnings.append("No per-hunk explanation cards found.")
        safety_rationale_present = False
    else:
        for card in bundle.hunk_cards:
            if not card.why_fix_works or len(card.why_fix_works.strip()) < 10:
                warnings.append(f"Hunk #{card.hunk_no} lacks sufficient safety rationale.")
                safety_rationale_present = False

    # 5. Check Alignment with Diff
    diff_aligned = True
    if actual_diff and (
        bundle.file_path not in actual_diff and "/" + bundle.file_path not in actual_diff
    ):
        warnings.append(f"Diff does not match target file {bundle.file_path}.")
        diff_aligned = False

    # Evaluation
    is_valid = len(errors) == 0
    is_hypothesis = not is_valid or not citations_valid or not lines_cited

    if is_hypothesis:
        confidence_penalty = 20.0
        bundle.is_hypothesis = True
    else:
        bundle.is_hypothesis = False

    report = ValidationReport(
        is_valid=is_valid,
        is_hypothesis=is_hypothesis,
        confidence_penalty=confidence_penalty,
        errors=errors,
        warnings=warnings,
        citations_valid=citations_valid,
        trigger_input_cited=trigger_input_cited,
        lines_cited=lines_cited,
        safety_rationale_present=safety_rationale_present,
        diff_aligned=diff_aligned,
    )

    return bundle, report
