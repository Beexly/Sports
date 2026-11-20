#!/usr/bin/env python3
"""
Backwards-compatible TNF IND @ HOU wrapper delegating to `evaluate_slate_360_full_markets.py`.
"""
from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.ops.evaluate_slate_360_full_markets import evaluate_slate_360_markets  # noqa: E402


def evaluate_full_360_markets() -> dict[str, Any]:
    return evaluate_slate_360_markets(
        away="IND",
        home="HOU",
        week=11,
        board_path=REPO_ROOT / "data" / "engine" / "tnf_ind_hou_dk_full_board_2026_11_19.json",
        dossier_path=REPO_ROOT / "data" / "engine" / "connected_workflow_dossier_ind_hou_week11.json",
        spine_path=REPO_ROOT / "data" / "engine" / "jev_full_game_spine_ind_hou_week11.json",
        out_path=REPO_ROOT / "data" / "engine" / "tnf_ind_hou_360_full_markets_eval_2026_11_19.json",
        master_out_path=REPO_ROOT / "data" / "engine" / "tnf_ind_hou_master_bundle_2026_11_19.json",
        n_sims=10000,
        seed=20261119,
    )


if __name__ == "__main__":
    evaluate_full_360_markets()
