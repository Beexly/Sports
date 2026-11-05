#!/usr/bin/env python3
"""
scripts/ops/harvest_and_price_tnf_360_board.py
Thin zero-hallucination delegator to `scripts/ops/gse_connected_game_workflow.py` (Stage 5 360 Board).
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
        f"[360 BOARD EVALUATOR PASS] stage5={bundle['cryptographic_receipt_chain']['stage5_receipt_sha256'][:12]}"
    )
