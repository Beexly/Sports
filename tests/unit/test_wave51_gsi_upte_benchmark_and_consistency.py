"""Unit tests pinning Wave 51 GSI UPTE reproducible C++20 benchmark & ecosystem consistency."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_reproducible_gsi_upte_benchmark_compiles_cpp20_and_matches_receipt() -> None:
    sys.path.insert(0, str(ROOT / "src"))
    from gse_engine.science.wave51_gsi_upte_benchmark_runner import (
        build_gsi_upte_benchmark_receipt,
    )

    receipt = build_gsi_upte_benchmark_receipt(ROOT)
    measured = receipt["measured_host_verification"]
    assert measured["tests_passed"] == 10
    assert measured["tests_total"] == 10
    assert measured["sram_under_38400_bytes_budget"] is True
    assert 0 < int(measured["static_sram_bytes_used"]) <= 38400
    warp_err = float(measured["python_dual_use_invariants"]["rough_path_nonlinear_warp_rel_err"])
    assert warp_err < 1e-3

    stored_path = ROOT / "data" / "eval" / "gsi_upte_reproducible_benchmark_receipt_2026_11_19.json"
    assert stored_path.is_file()
    stored = json.loads(stored_path.read_text(encoding="utf-8"))
    assert stored["deterministic_core_sha256"] == receipt["deterministic_core_sha256"]


def test_ecosystem_consistency_audit_passes_all_checks() -> None:
    script = ROOT / "scripts" / "ops" / "verify_ecosystem_consistency.py"
    res = subprocess.run(
        [sys.executable, str(script), "--check"],
        cwd=ROOT,
        capture_output=True,
        text=True,
        check=False,
    )
    assert res.returncode == 0, f"Consistency check failed:\n{res.stdout}\n{res.stderr}"
