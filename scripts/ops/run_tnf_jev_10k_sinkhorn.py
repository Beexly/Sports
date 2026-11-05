#!/usr/bin/env python3
"""TNF JAX @ BAL Stage 2B: 10,000-world x 175-snap Sinkhorn PBP run.

Consumes the completed Jev full-game spine (158 snaps) as a 48-state transition
tensor, applies W1-W8 nflverse team trends, and runs the sealed-baseline PBP
Monte Carlo with return_vectors=True. Stage 0 is enforced before any sim.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

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
OUT = ROOT / "data" / "engine" / "tnf_jax_bal_10k_sinkhorn_2026_11_05.json"


def main() -> dict:
    require_week(9)  # Stage 0 hard gate

    spine_doc = json.loads(SPINE.read_text(encoding="utf-8"))
    spine = spine_doc["games"]["JAX@BAL"]
    tensor = build_jev_state_tensor(spine)
    trends = json.loads(TRENDS.read_text(encoding="utf-8"))["teams"]

    sealed, digest = load_sealed_object_readonly("__no_local_seal__")  # DEFAULT_SEALED_BASELINE v1.0
    override = {
        "away": trends["JAX"],
        "home": trends["BAL"],
        "posted_home_spread": 10.0,   # BAL +10 (JAX -10)
        "posted_total": 39.5,
        "jev_state_tensor": tensor,
    }

    result = simulate_matchup_pbp(
        "JAX", "BAL",
        away_inj=["RB1"],   # Travis Etienne Jr. IR
        home_inj=[],        # QB1-out already carried in the trend override + spine tensor
        sealed_state=sealed,
        expected_hash=digest,
        n_sims=10000,
        seed=20261105,
        w1_w7_override=override,
        return_vectors=True,
        jev_state_tensor=tensor,
        posted_home_spread=10.0,
        posted_total=39.5,
    )

    import numpy as np

    def materialize(obj):
        if isinstance(obj, np.ndarray):
            return obj.tolist()
        if isinstance(obj, dict):
            return {k: materialize(v) for k, v in obj.items()}
        if isinstance(obj, list):
            return [materialize(v) for v in obj]
        return obj

    vectors = result.get("vectors") or {}
    hm = np.asarray(vectors.get("home_margin_out", []), dtype=float)
    tot = np.asarray(vectors.get("total_pts_out", []), dtype=float)
    derived = {
        "n": int(hm.size),
        "p_away_covers_minus10": round(float((hm < -10).mean()), 4) if hm.size else None,
        "p_home_covers_plus10": round(float((hm > -10).mean()), 4) if hm.size else None,
        "p_over_39_5": round(float((tot > 39.5).mean()), 4) if tot.size else None,
        "p_under_39_5": round(float((tot < 39.5).mean()), 4) if tot.size else None,
        "p_away_ml": round(float((hm < 0).mean()), 4) if hm.size else None,
        "home_margin_std": round(float(hm.std()), 3) if hm.size else None,
        "total_std": round(float(tot.std()), 3) if tot.size else None,
    }
    result = materialize(result)

    payload = {
        "schema": "tnf_jax_bal_10k_sinkhorn_v1",
        "generated_at": "2026-11-05",
        "engine": "gse_coach_mind_simulator.simulate_matchup_pbp",
        "sims": 10000,
        "snaps_per_sim": 175,
        "total_simulated_snaps": 10000 * 175,
        "jev_spine": {
            "path": str(SPINE.relative_to(ROOT)),
            "snaps": spine.get("total_snaps_simulated_with_jev"),
            "drives": spine.get("total_drives"),
            "final_score": spine.get("final_score_spine"),
            "state_tensor_states": len(tensor.get("by_state", {})),
        },
        "market_inputs": {"posted_home_spread": 10.0, "posted_total": 39.5, "source": "ESPN/DraftKings pickcenter 2026-11-05"},
        "stage0_gate": "PASS (require_week(9), roster config as_of 2026-11-04)",
        "derived": derived,
        "result": result,
    }
    OUT.write_text(json.dumps(payload, indent=2, default=str), encoding="utf-8")
    print(json.dumps({k: v for k, v in result.items() if not isinstance(v, (list, dict))}, indent=1))
    print("priors:", json.dumps(result.get("priors", {}), indent=1)[:600])
    print("saved ->", OUT)
    return payload


if __name__ == "__main__":
    main()
