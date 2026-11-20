from __future__ import annotations

from pathlib import Path

import numpy as np

from scripts.ops.gse_coach_mind_simulator import (
    load_sealed_object_readonly,
    resolve_qb_mobility_profile,
    simulate_matchup_pbp,
)
from scripts.ops.gse_connected_game_workflow import calibrate_qb_rush_distribution

REPO_ROOT = Path(__file__).resolve().parents[1]


def test_resolve_qb_mobility_profile_hydrates_pbp_and_lowers_statue_floor():
    # Even when called without explicit pbp_df, mobile QBs not in static map or active in 2026 PBP should hydrate
    statue = resolve_qb_mobility_profile("Matthew Stafford", team="LAR")
    assert statue["scramble_p"] <= 0.025

    mobile_ward = resolve_qb_mobility_profile("Cam Ward", team="TEN")
    assert mobile_ward["scramble_p"] >= 0.045

    # In full simulation, pocket statue scramble_p_lut clip must not force 0.04 floor when spatial conditioners exist
    sealed_obj, sealed_hash = load_sealed_object_readonly()
    sim = simulate_matchup_pbp(
        away="LAR",
        home="ARI",
        away_inj=[],
        home_inj=[],
        sealed_state=sealed_obj,
        expected_hash=sealed_hash,
        n_sims=800,
        seed=20261115,
        w1_w7_override={
            "away": {"qb_name": "Matthew Stafford"},
            "home": {"qb_name": "Jacoby Brissett"},
            "spatial_micro_pbp_conditioners": {
                "away_conditioners": {"qb_scramble_escape_delta": -0.005},
                "home_conditioners": {"qb_scramble_escape_delta": 0.0},
            },
        },
        return_vectors=True,
    )
    stafford_rush = np.asarray(sim["vectors"]["away_qb_rush_yds"], dtype=np.float64)
    assert float(np.mean(stafford_rush)) <= 5.5


def test_calibrate_qb_rush_distribution_statue_allows_kneeldowns_no_inflation():
    rng = np.random.default_rng(42)
    kneel_vec = rng.binomial(3, 0.25, size=2000).astype(np.float64)

    # Matthew Stafford / Aaron Rodgers profile: 0.4 non-kneel rush yds/gp, 0.5 car/gp, line=0.5 rush yds
    scr, r_yds = calibrate_qb_rush_distribution(
        qb_pbp_rush_pg=0.2,
        qb_pbp_car_pg=0.8,
        qb_rush_board_line=0.5,
        qb_car_board_line=1.5,
        kneel_vec=kneel_vec,
        ol_scramble_boost=1.0,
        rng=rng,
    )
    assert float(np.mean(r_yds)) <= 3.5, f"Pocket statue projected {np.mean(r_yds):.2f} rush yds instead of <= 3.5"
    assert float(np.mean(r_yds <= 0.0)) >= 0.35, "Expected meaningful zero/negative kneeldown probability"


def test_evaluate_slate_360_removes_gamma_and_poisson_qb_rush_corruption():
    src = (REPO_ROOT / "scripts" / "ops" / "evaluate_slate_360_full_markets.py").read_text(encoding="utf-8")
    assert "rng.gamma(2.2, 4.5" not in src
    assert "rng.poisson(1.4" not in src
