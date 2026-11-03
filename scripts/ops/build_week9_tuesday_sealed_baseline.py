"""Build and seal the Week 9 Tuesday 04:00 CT Baseline (`data/engine/week9_tuesday_0400ct_sealed_baseline_2026.json`).

Integrates:
  - `WEEK9_SEA_ARI_PASS_CATCHER_MATRIX` (with Marvin Harrison Jr. restored to his Empirical Bayes shrunk target-share
    prior >= 0.20 and Dirichlet total volume conservation across ARI & SEA pass catchers).
  - `ESPN_2026_OT_PBWR_LEADERS`, `ESPN_2026_EDGE_PRWR_LEADERS`, and `WEEK9_TRENCH_MISMATCH_SPOTLIGHT`.
  - `sinkhorn_unbalanced_target_reallocation_with_epa_dropoff` + `scale_dropoff_by_effective_contributors`.
  - `recommend_scrimmage_over_receiving_prop` lateral screen/jet-sweep classification gate.
  - Cryptographic SHA-256 baseline seal so downstream mid-week / Sunday runs cannot silently mutate priors.
"""
from __future__ import annotations

import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from scripts.ops.locked_production_pipeline import (  # noqa: E402
    ESPN_2026_EDGE_PRWR_LEADERS,
    ESPN_2026_OT_PBWR_LEADERS,
    MHJ_SHRUNK_TARGET_SHARE_PRIOR,
    WEEK9_SEA_ARI_PASS_CATCHER_MATRIX,
    WEEK9_TRENCH_MISMATCH_SPOTLIGHT,
    enforce_production_sanity_gates,
    scale_dropoff_by_effective_contributors,
    sinkhorn_unbalanced_target_reallocation_with_epa_dropoff,
    validate_roster_and_coordinate_mutation_guard,
)
from scripts.ops.week8_forensic_kernels import recommend_scrimmage_over_receiving_prop  # noqa: E402

DEFAULT_OUT = ROOT / "data" / "engine" / "week9_tuesday_0400ct_sealed_baseline_2026.json"


def build_week9_tuesday_sealed_baseline(out_path: str | Path = DEFAULT_OUT) -> Dict[str, Any]:
    # 1. Validate canonical roster assignments across Week 9 pass-catcher matrix & trench leaders
    roster_check = validate_roster_and_coordinate_mutation_guard(
        [
            {"player_name": r["player_id"], "team": r["team"]}
            for r in WEEK9_SEA_ARI_PASS_CATCHER_MATRIX
            if not r["player_id"].endswith("_Other")
        ]
        + [{"player_name": k, "team": v["team"]} for k, v in ESPN_2026_OT_PBWR_LEADERS.items()]
        + [{"player_name": k, "team": v["team"]} for k, v in ESPN_2026_EDGE_PRWR_LEADERS.items()]
    )

    # 2. Enforce 15% Participation Hurdle & Dirichlet Total Volume Conservation for ARI (34 targets) & SEA (33 targets)
    team_caps = {"ARI": 34.0, "SEA": 33.0}
    conserved_by_team: Dict[str, List[Dict[str, Any]]] = {}
    for tm, cap in team_caps.items():
        tm_rows = [r for r in WEEK9_SEA_ARI_PASS_CATCHER_MATRIX if r["team"] == tm]
        raw_df = pd.DataFrame(
            [{"player_id": r["player_id"], "raw_projected_volume": r["target_share_prior"] * cap} for r in tm_rows]
        )
        part_priors = {r["player_id"]: r["route_participation"] for r in tm_rows}
        gated_df = enforce_production_sanity_gates(raw_df, part_priors, team_target_cap=cap, min_participation=0.15)
        vol_map = dict(zip(gated_df["player_id"], gated_df["conserved_volume"]))

        tm_out = []
        for r in tm_rows:
            pid = r["player_id"]
            c_vol = float(vol_map.get(pid, 0.0))
            c_share = c_vol / cap if cap > 0 else 0.0
            # Apply lateral/screen scrimmage gate for gadget/high-screen receivers
            screen_share = 0.16 if pid in {"Reggie Virgil"} else 0.04
            lat_gate = recommend_scrimmage_over_receiving_prop(
                player_name=pid,
                raw_rec_over_prob=0.58,
                behind_los_screen_or_jet_share=screen_share,
                rush_attempt_share=0.02,
            )
            tm_out.append(
                {
                    **r,
                    "conserved_projected_targets": round(c_vol, 3),
                    "conserved_target_share": round(c_share, 4),
                    "lateral_scrimmage_gate_decision": lat_gate["decision"],
                }
            )
        conserved_by_team[tm] = tm_out

    # 3. Unbalanced Sinkhorn Injury Reallocation & Davies (2025) HHI Effective-Contributor Scaling
    ari_active_shares = [
        r["conserved_target_share"] for r in conserved_by_team["ARI"] if r["conserved_target_share"] > 0
    ]
    ari_hhi = sum(s ** 2 for s in ari_active_shares)
    ari_load_scaling = scale_dropoff_by_effective_contributors(base_dropoff=-0.065, team_target_hhi=ari_hhi)

    sea_sinkhorn = sinkhorn_unbalanced_target_reallocation_with_epa_dropoff(
        pre_injury_shares=[0.265, 0.240, 0.165, 0.110, 0.220],
        post_injury_capacity=[0.300, 0.270, 0.190, 0.001, 0.239],
        cost_matrix=np.array(
            [
                [0.0, 0.2, 0.4, 0.3, 0.6],
                [0.2, 0.0, 0.3, 0.3, 0.5],
                [0.4, 0.3, 0.0, 0.5, 0.3],
                [0.3, 0.3, 0.5, 0.0, 0.5],
                [0.6, 0.5, 0.3, 0.5, 0.0],
            ],
            dtype=np.float64,
        ),
        role_epa_factors=[1.06, 1.03, 0.99, 0.85, 0.96],
    )

    body = {
        "schema_version": "GSE-WEEK9-SEALED-BASELINE-v1.0",
        "sealed_window": "Tuesday 04:00 CT Pre-Market Baseline (Week 9, 2026)",
        "generated_at_utc": datetime.now(timezone.utc).isoformat(),
        "roster_and_coordinate_guard": roster_check,
        "mhj_shrunk_target_share_prior": MHJ_SHRUNK_TARGET_SHARE_PRIOR,
        "espn_2026_ot_pbwr_leaders": ESPN_2026_OT_PBWR_LEADERS,
        "espn_2026_edge_prwr_leaders": ESPN_2026_EDGE_PRWR_LEADERS,
        "week9_trench_mismatch_spotlight": WEEK9_TRENCH_MISMATCH_SPOTLIGHT,
        "conserved_pass_catcher_priors": conserved_by_team,
        "ari_effective_contributor_load_scaling": ari_load_scaling,
        "sea_shaheed_out_unbalanced_sinkhorn": sea_sinkhorn,
    }
    canonical_bytes = json.dumps(body, sort_keys=True).encode("utf-8")
    body["baseline_sha256"] = hashlib.sha256(canonical_bytes).hexdigest()

    op = Path(out_path)
    op.parent.mkdir(parents=True, exist_ok=True)
    op.write_text(json.dumps(body, indent=2), encoding="utf-8")
    return body


if __name__ == "__main__":
    sealed = build_week9_tuesday_sealed_baseline()
    print(
        f"Sealed Week 9 Tuesday baseline: sha256={sealed['baseline_sha256'][:16]}... "
        f"MHJ prior={sealed['mhj_shrunk_target_share_prior']}"
    )
