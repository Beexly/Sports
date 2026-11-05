#!/usr/bin/env python3
"""
scripts/ops/verify_and_wire_all_layers_before_sim.py
Thin zero-hallucination delegator to `scripts/ops/gse_connected_game_workflow.py` (Stages 0, 1A, 1B).
"""
from __future__ import annotations

import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.ops.gse_connected_game_workflow import execute_connected_game_workflow  # noqa: E402

if __name__ == "__main__":
    bundle = execute_connected_game_workflow("JAX", "BAL", 9, n_sims=10000)
    print(
        f"[PRE-SIM FULL LAYER GATE PASS] stage0={bundle['cryptographic_receipt_chain']['stage0_receipt_sha256'][:12]} | "
        f"stage1a={bundle['cryptographic_receipt_chain']['stage1a_receipt_sha256'][:12]} | "
        f"stage1b={bundle['cryptographic_receipt_chain']['stage1b_receipt_sha256'][:12]}"
    )
