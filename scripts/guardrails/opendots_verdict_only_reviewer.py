#!/usr/bin/env python3
"""
Verdict-Only OpenDots / Santa-Method Reviewer (`scripts/guardrails/opendots_verdict_only_reviewer.py`).
Gated behind `OPENDOTS_VERDICT_ONLY_ENABLED` (default `false` in production).
Strictly verdict-only: never mutates prompts, weights, or model artifacts; returns
structured `{status, findings, blocking_defects_count}`.
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any, Dict, List

REPO_ROOT = Path(__file__).resolve().parents[2]
PROMPT_MUTATION_PERMITTED: bool = False


def evaluate_verdict_only_review(payload: Dict[str, Any] | None = None) -> Dict[str, Any]:
    enabled = os.environ.get("OPENDOTS_VERDICT_ONLY_ENABLED", "false").lower() in ("1", "true", "yes", "on")
    target = payload or {}
    findings: List[Dict[str, Any]] = []

    if not enabled:
        return {
            "status": "BYPASSED_FEATURE_FLAG_OFF",
            "opendots_verdict_only_enabled": False,
            "prompt_mutation_permitted": PROMPT_MUTATION_PERMITTED,
            "findings": findings,
            "blocking_defects_count": 0,
        }

    if target.get("placeholder_formula_specs", 0) > 0:
        findings.append(
            {
                "severity": "BLOCKING",
                "code": "PLACEHOLDER_FORMULA_SPECS_DETECTED",
                "detail": f"Detected {target['placeholder_formula_specs']} placeholder formula specs.",
            }
        )
    if target.get("unaccounted_families", 0) > 0:
        findings.append(
            {
                "severity": "BLOCKING",
                "code": "UNACCOUNTED_EQUATION_FAMILIES",
                "detail": f"Detected {target['unaccounted_families']} unaccounted equation families.",
            }
        )
    if target.get("local_downloads_paths_in_runtime", 0) > 0:
        findings.append(
            {
                "severity": "BLOCKING",
                "code": "TWO_HOST_RULE_VIOLATION",
                "detail": "Runtime module references machine-specific Downloads path.",
            }
        )

    if target.get("sub_min_sample_size_warnings", 0) > 0:
        findings.append(
            {
                "severity": "WARN",
                "code": "SUB_MIN_SAMPLE_SIZE_EQUATIONS_HELD",
                "detail": f"{target['sub_min_sample_size_warnings']} equations held at effective_weight=0.0.",
            }
        )

    blocking_count = sum(1 for f in findings if f["severity"] == "BLOCKING")
    warn_count = sum(1 for f in findings if f["severity"] == "WARN")
    status = "FAIL" if blocking_count > 0 else ("WARN" if warn_count > 0 else "PASS")
    return {
        "status": status,
        "verdict": status,
        "opendots_verdict_only_enabled": True,
        "prompt_mutation_permitted": PROMPT_MUTATION_PERMITTED,
        "findings": findings,
        "blocking_defects_count": blocking_count,
        "warning_count": warn_count,
    }


def main() -> None:
    res = evaluate_verdict_only_review()
    print(json.dumps(res, indent=2))
    if res["status"] in ("FAIL", "BLOCK"):
        sys.exit(1)


if __name__ == "__main__":
    main()
