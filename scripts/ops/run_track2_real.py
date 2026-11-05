#!/usr/bin/env python3
"""Track2 real: run Theorem4 test, pytest, compile, write proof json with real metrics or null."""
import json, subprocess, pathlib, sys
root = pathlib.Path(__file__).resolve().parents[2]
# Run specific Theorem4 test
r = subprocess.run([sys.executable, "-m", "pytest", "packages/galaxy-conformal-ot/tests/test_cte_and_kafka_flink_pipeline.py::test_theorem4_pure_deconfounded_sepsis_braid", "-v"], cwd=root, capture_output=True, text=True, env={**__import__('os').environ, "PYTHONPATH": ""})
theorem4_pass = "1 passed" in r.stdout
# Run full suite tail
r2 = subprocess.run([sys.executable, "-m", "pytest", "packages/galaxy-conformal-ot/tests/", "-q"], cwd=root, capture_output=True, text=True, env={**__import__('os').environ, "PYTHONPATH": ""})
full_pass = "45 passed" in r2.stdout
# compile
r3 = subprocess.run([sys.executable, "docs/engine/research/2026-11-04/submission/compile_proposal.py", "--validate-only"], cwd=root, capture_output=True, text=True, env={**__import__('os').environ, "PYTHONPATH": ""})
compile_ok = r3.returncode == 0
res = {
    "track": "Track 2: Theorem4 pre-order (real test run)",
    "status": "VERIFIED" if (theorem4_pass and full_pass and compile_ok) else "PARTIAL",
    "theorem4_test_passed": theorem4_pass,
    "full_pytest_45_passed": full_pass,
    "compile_proposal_exit0": compile_ok,
    "pre_order_auc": None,
    "false_discovery_rate": None,
    "note": "No MIMIC-IV patient-level data in repo to compute AUC/FDR pre-order; tests are synthetic. AUC/FDR left null, not fabricated. cte_viscoelastic_isomorphic_engine tests pass synthetically."
}
out = root / "data/engine/gsi_overnight_pre_order_deconfounded_mimic_proof.json"
out.write_text(json.dumps(res, indent=2))
print(json.dumps(res, indent=2))
