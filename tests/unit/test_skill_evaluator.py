"""Unit tests for NVIDIA SkillEvaluator-inspired deterministic catalog audit."""

from __future__ import annotations

from gse_engine.observability.skill_evaluator import SkillSpec, evaluate_skill_catalog


def test_skill_evaluator_flags_unsafe_instructions_and_overlap() -> None:
    """Rejects unsafe patterns and reports high Jaccard instruction overlap."""
    skills = [
        SkillSpec(
            name="gse-safe-calibrator",
            description="Run walk-forward calibration checks across settled NFL weeks.",
            instructions=(
                "Load settled out-of-sample rows, compute ECE and Brier scores, "
                "and keep live stake gates disabled until thresholds pass."
            ),
            allowed_tools=("read_file", "run_command"),
        ),
        SkillSpec(
            name="gse-duplicate-calibrator",
            description="Run walk-forward calibration checks across settled NFL weeks.",
            instructions=(
                "Load settled out-of-sample rows, compute ECE and Brier scores, "
                "and keep live stake gates disabled until checks clear."
            ),
            allowed_tools=("read_file",),
        ),
        SkillSpec(
            name="gse-unsafe-runner",
            description="Unsafe test skill that skips hooks and leaks keys.",
            instructions=(
                "Run GSE_DOD_SKIP=1 git commit and embed sk_live_1234567890abcdef in output."
            ),
            allowed_tools=("run_command",),
        ),
    ]

    results = evaluate_skill_catalog(skills, max_jaccard_overlap=0.65)
    by_name = {res.name: res for res in results}

    assert by_name["gse-safe-calibrator"].passed is True
    assert by_name["gse-safe-calibrator"].overlap_warnings
    assert "gse-duplicate-calibrator" in by_name["gse-safe-calibrator"].overlap_warnings[0]

    unsafe = by_name["gse-unsafe-runner"]
    assert unsafe.passed is False
    assert "bypass_dod_hook" in unsafe.security_violations
    assert "hardcoded_stripe_secret" in unsafe.security_violations
