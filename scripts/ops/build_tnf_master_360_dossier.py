#!/usr/bin/env python3
"""
scripts/ops/build_tnf_master_360_dossier.py
Thin zero-hallucination delegator to `scripts/ops/gse_connected_game_workflow.py` (Master Call-Sheet Dossier).
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
        f"[MASTER 360 DOSSIER PASS] master_sha256={bundle['master_bundle_sha256'][:16]}"
    )
