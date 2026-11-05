#!/usr/bin/env python3
"""
scripts/ops/run_tnf_post_injury_jev_5stage_pipeline.py
Thin zero-hallucination delegator to `scripts/ops/gse_connected_game_workflow.py` (Stages 0-5).
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
        f"[5-STAGE JEV PIPELINE PASS] stage2={bundle['cryptographic_receipt_chain']['stage2_receipt_sha256'][:12]} | "
        f"stage3_4={bundle['cryptographic_receipt_chain']['stage3_4_receipt_sha256'][:12]}"
    )
