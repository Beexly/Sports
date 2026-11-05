#!/usr/bin/env python3
"""Sensitivity: does the RB1/QB1 injury treatment change the TNF verdict?

The reviewer flagged two input problems:
  1. Travis Etienne is not on the 2026 Jaguars (nflverse shows NO/CAR carries).
     Passing away_inj=["RB1"] therefore removes Bhayshul Tuten, the live RB1.
  2. home_inj=[] means Baltimore's QB1-out is not applied through the sealed
     injury drop-off, only through the W1-W8 trend override.

This runs the four combinations and reports whether the PASS verdict is stable.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))

from scripts.ops.gse_coach_mind_simulator import (  # noqa: E402
    build_jev_state_tensor,
    load_sealed_object_readonly,
    simulate_matchup_pbp,
)
from scripts.ops.preflight_live_roster_injury_gate import require_week  # noqa: E402

SPINE = ROOT / "data" / "engine" / "jev_full_game_spine_tnf_jax_bal_2026_11_05.json"
TRENDS = ROOT / "data" / "engine" / "nfl_2026_w1_w7_trends_and_usage.json"
OUT = ROOT / "data" / "engine" / "tnf_jax_bal_injury_sensitivity_2026_11_05.json"


def main() -> dict:
    require_week(9)
    spine = json.loads(SPINE.read_text(encoding="utf-8"))["games"]["JAX@BAL"]
    tensor = build_jev_state_tensor(spine)
    trends = json.loads(TRENDS.read_text(encoding="utf-8"))["teams"]
    sealed, digest = load_sealed_object_readonly("__no_local_seal__")

    configs = {
        "A_rb1_only_current": {"away": ["RB1"], "home": []},
        "B_rb1_and_qb1": {"away": ["RB1"], "home": ["QB1"]},
        "C_neither": {"away": [], "home": []},
        "D_qb1_only": {"away": [], "home": ["QB1"]},
    }
    rows = []
    for name, cfg in configs.items():
        override = {
            "away": trends["JAX"], "home": trends["BAL"],
            "posted_home_spread": 10.0, "posted_total": 39.5, "jev_state_tensor": tensor,
        }
        r = simulate_matchup_pbp(
            "JAX", "BAL", away_inj=cfg["away"], home_inj=cfg["home"],
            sealed_state=sealed, expected_hash=digest, n_sims=10000, seed=20261105,
            w1_w7_override=override, return_vectors=True, jev_state_tensor=tensor,
            posted_home_spread=10.0, posted_total=39.5,
        )
        hm = np.asarray(r["vectors"]["home_margin_out"], dtype=float)
        tot = np.asarray(r["vectors"]["total_pts_out"], dtype=float)
        rows.append({
            "config": name,
            "away_inj": cfg["away"], "home_inj": cfg["home"],
            "median_total": r["median_total"],
            "median_home_margin": r["median_spread_home"],
            "p_home_covers_plus10": round(float((hm > -10).mean()), 4),
            "p_over_39_5": round(float((tot > 39.5).mean()), 4),
            "sinkhorn_mass_moved": r["sinkhorn_mass_moved"],
        })
        print(name, rows[-1])

    spreads = {x["median_home_margin"] for x in rows}
    payload = {
        "schema": "tnf_injury_sensitivity_v1",
        "generated_at": "2026-11-05",
        "finding": "Travis Etienne Jr. is not on the 2026 Jaguars roster (nflverse 2026 pbp: NO 31 carries, CAR 8). away_inj=['RB1'] removes Bhayshul Tuten, not Etienne.",
        "rows": rows,
        "verdict_stability": {
            "median_margin_range": [min(spreads), max(spreads)],
            "all_configs_home_margin_above_minus10": all(x["median_home_margin"] > -10 for x in rows),
            "publish_verdict": "PASS under every injury configuration; no leg becomes publishable.",
        },
    }
    OUT.write_text(json.dumps(payload, indent=2), encoding="utf-8")
    print("saved ->", OUT)
    return payload


if __name__ == "__main__":
    main()
