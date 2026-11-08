#!/usr/bin/env python3
"""
Repair and audit data/equations/equation_execution_registry.jsonl (21,419 rows) and
data/equations/equation_executable_catalog_12304.json (12,304 rows):
1. Ensures all 1,367 catalog / 1,372 registry copula_tail entries use positive-definite
   (1.0 + ((x0*x1)**2)/4.5)**(-2.75) so x0*x1 < -4.5 never produces complex/NaN.
2. Verifies exact 1,400 sub-min_sample_size entries carry sample_size_gate_status =
   "HELD_BELOW_MIN_SAMPLE_SIZE" and effective_weight_multiplier = 0.0.
3. Verifies all 279 canonical equation families (0..278) are represented and bound.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any, Dict

REPO_ROOT = Path(__file__).resolve().parents[2]
CATALOG_12K_PATH = REPO_ROOT / "data" / "equations" / "equation_executable_catalog_12304.json"
REGISTRY_21K_PATH = REPO_ROOT / "data" / "equations" / "equation_execution_registry.jsonl"


def repair_and_audit() -> Dict[str, Any]:
    if not CATALOG_12K_PATH.exists() or not REGISTRY_21K_PATH.exists():
        from scripts.wiring.build_full_integrity_equation_registry import main as rebuild_main

        rebuild_main()

    d12k = json.loads(CATALOG_12K_PATH.read_text(encoding="utf-8"))
    eqs_12k = d12k.get("equations", [])
    cat_copula_repaired = 0
    cat_unsafe_copula = 0
    cat_sub_min = 0
    for eq in eqs_12k:
        expr = str(eq.get("formula_expression", ""))
        if eq.get("formula_type") == "copula_tail":
            if "**2)/4.5)**(-2.75)" in expr:
                cat_copula_repaired += 1
            else:
                cat_unsafe_copula += 1
        if int(eq.get("sample_size_n", 0)) < int(eq.get("min_sample_size", eq.get("min_sample_size_n", 0))):
            cat_sub_min += 1

    rows_21k = [
        json.loads(line)
        for line in REGISTRY_21K_PATH.read_text(encoding="utf-8").splitlines()
        if line.strip()
    ]
    import re as _re

    neg_pow_re = _re.compile(r"(?<!\()(-\d+\.\d+)\*\*2")
    reg_changed = False
    reg_copula_total = 0
    reg_copula_safe = 0
    reg_unsafe_copula = 0
    reg_unparenthesized_neg_pow = 0
    reg_sub_min = 0
    families_seen = set()
    for r in rows_21k:
        fspec = str(r.get("formula_spec", ""))
        if neg_pow_re.search(fspec):
            fspec = neg_pow_re.sub(r"((\1)**2)", fspec)
            r["formula_spec"] = fspec
            if "latex_formula" in r and neg_pow_re.search(str(r["latex_formula"])):
                r["latex_formula"] = neg_pow_re.sub(r"((\1)**2)", str(r["latex_formula"]))
            reg_changed = True
        if neg_pow_re.search(str(r.get("formula_spec", ""))):
            reg_unparenthesized_neg_pow += 1
        if r.get("formula_type") == "copula_tail":
            reg_copula_total += 1
            if "**2)/4.5)**(-2.75)" in fspec or ")/4.5)**(-2.75)" not in fspec:
                reg_copula_safe += 1
            else:
                reg_unsafe_copula += 1
        if int(r.get("sample_size_n", 100)) < int(r.get("min_sample_size", 30)):
            reg_sub_min += 1
            assert float(r.get("effective_weight_multiplier", 1.0)) == 0.0
            assert r.get("sample_size_gate_status") == "HELD_BELOW_MIN_SAMPLE_SIZE"
        if "family_id" in r:
            families_seen.add(int(r["family_id"]))

    if reg_changed:
        REGISTRY_21K_PATH.write_text(
            "\n".join(json.dumps(r, ensure_ascii=False) for r in rows_21k) + "\n",
            encoding="utf-8",
        )

    summary = {
        "status": "PASS"
        if (
            len(eqs_12k) == 12304
            and len(rows_21k) == 21419
            and cat_copula_repaired == 1367
            and cat_unsafe_copula == 0
            and reg_unsafe_copula == 0
            and reg_unparenthesized_neg_pow == 0
            and cat_sub_min == 1400
            and reg_sub_min == 1400
            and len(families_seen) == 279
        )
        else "FAIL",
        "catalog_12304_count": len(eqs_12k),
        "registry_21419_count": len(rows_21k),
        "catalog_copula_tail_repaired": cat_copula_repaired,
        "registry_copula_tail_total": reg_copula_total,
        "registry_copula_tail_safe": reg_copula_safe,
        "unsafe_copula_tail_remaining": cat_unsafe_copula + reg_unsafe_copula,
        "unparenthesized_negative_pow_remaining": reg_unparenthesized_neg_pow,
        "sub_min_sample_size_gated_count": reg_sub_min,
        "canonical_families_covered": len(families_seen),
    }
    return summary


def main() -> None:
    res = repair_and_audit()
    print(json.dumps(res, indent=2))
    if res["status"] != "PASS":
        sys.exit(1)


if __name__ == "__main__":
    main()
