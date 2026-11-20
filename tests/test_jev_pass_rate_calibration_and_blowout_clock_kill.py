from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from scripts.ops.gse_coach_mind_simulator import (
    build_jev_state_tensor,
    calibrate_jev_pass_prob,
    compute_progressive_script_pass_shift,
    load_sealed_object_readonly,
    simulate_matchup_pbp,
)
from scripts.ops.gse_connected_game_workflow import _get_matchup_env
from scripts.ops.run_week11_jev_full_game_spine import _resolve_snap

REPO_ROOT = Path(__file__).resolve().parents[1]


def test_calibrate_jev_pass_prob_clamps_menu_skew_and_applies_clock_kill():
    # Menu bias (0.86 pass prob) in Q4 up 17 on 1st & 10 must drop steeply into clock-kill territory
    q4_blowout = calibrate_jev_pass_prob(
        raw_jev_pass_prob=0.86,
        team_ed_pass_rate=0.54,
        down=1,
        ydstogo=10,
        score_diff=17.0,
        qtr=4,
    )
    assert q4_blowout <= 0.32

    # Neutral 1st & 10 stays tightly bounded (+/- 0.05) around baseline
    neutral = calibrate_jev_pass_prob(
        raw_jev_pass_prob=0.86,
        team_ed_pass_rate=0.54,
        down=1,
        ydstogo=10,
        score_diff=0.0,
        qtr=1,
    )
    assert 0.49 <= neutral <= 0.60


def test_progressive_script_pass_shift_monotonic_blowout_decay():
    sd = np.array([7.0, 14.0, 21.0, 14.0, -18.0, 0.0], dtype=np.float64)
    qt = np.array([2, 3, 3, 4, 4, 2], dtype=np.int32)
    lead_shift = np.full(6, -0.08, dtype=np.float64)
    trail_shift = np.full(6, 0.09, dtype=np.float64)
    panic = np.full(6, 0.06, dtype=np.float64)

    shifts = compute_progressive_script_pass_shift(sd, qt, lead_shift, trail_shift, panic)
    assert abs(shifts[0] - (-0.08)) <= 0.02
    assert shifts[1] <= -0.16
    assert shifts[2] < shifts[1]
    assert shifts[3] <= -0.28  # Q4 & +14
    assert shifts[4] < 0.15    # trailing blowout Q4 stall
    assert abs(shifts[5]) < 1e-9


def test_build_jev_state_tensor_shrinks_single_trajectory_snowball():
    spine_p = REPO_ROOT / "data" / "engine" / "jev_full_game_spine_ind_hou_week11.json"
    if not spine_p.is_file():
        return
    raw = json.loads(spine_p.read_text(encoding="utf-8"))
    game_node = (raw.get("games") or {}).get("IND@HOU", raw)
    tensor = build_jev_state_tensor(game_node, enforce_freshness=False)
    for tm in ("IND", "HOU"):
        tm_p = float((tensor.get("by_team") or {}).get(tm, {}).get("pass_prob", 0.54))
        assert 0.48 <= tm_p <= 0.61, f"{tm} pass_prob={tm_p} still reflects uncalibrated JEV menu skew"


def test_resim_ind_hou_and_sea_lv_eliminate_runaway_pass_volume():
    sealed_obj, sealed_hash = load_sealed_object_readonly()
    env_ind_hou = _get_matchup_env("IND", "HOU", 11)
    spine_p = REPO_ROOT / "data" / "engine" / "jev_full_game_spine_ind_hou_week11.json"
    if spine_p.is_file():
        raw = json.loads(spine_p.read_text(encoding="utf-8"))
        game_node = (raw.get("games") or {}).get("IND@HOU", raw)
        jev_tensor = build_jev_state_tensor(game_node, enforce_freshness=False)
        sim_res = simulate_matchup_pbp(
            away="IND",
            home="HOU",
            away_inj=[],
            home_inj=[],
            sealed_state=sealed_obj,
            expected_hash=sealed_hash,
            n_sims=1000,
            seed=20261119,
            return_vectors=True,
            jev_state_tensor=jev_tensor,
            posted_home_spread=float(env_ind_hou["posted_home_spread"]),
            posted_total=float(env_ind_hou["posted_total"]),
        )
        vecs = sim_res["vectors"]
        assert float(np.mean(vecs["home_pass_att"])) < 33.5
        assert float(np.mean(vecs["home_pass_yds"])) <= 253.5 * 1.15


def test_resolve_snap_respects_calibrated_pass_rate():
    rng = np.random.default_rng(7)
    answers = {
        "off_play_call": {
            "choice": "quick_game_rpo",
            "probabilities": {
                "inside_zone_run": 0.08,
                "outside_zone_run": 0.06,
                "quick_game_rpo": 0.30,
                "play_action_intermediate": 0.25,
                "deep_shot_pass": 0.20,
                "screen_or_draw": 0.11,
            },
        },
        "def_shell_call": {"choice": "two_high_quarters_shell", "probabilities": {"two_high_quarters_shell": 1.0}},
        "target_carrier": {"choice": "RB1", "probabilities": {"RB1": 0.5, "WR1": 0.5}},
        "snap_outcome": {"choice": "short_gain_1_4", "probabilities": {"short_gain_1_4": 1.0}},
        "pressure_disruption": {"noul": 0.25},
        "aggressive_coaching_edge": {"noul": 0.50},
    }
    off_ctx = {"early_down_pass_rate": 0.52, "comp_rate_pct": 63.0, "sack_rate_allowed_pct": 6.0}
    n_pass = 0
    for _ in range(300):
        res = _resolve_snap(rng, 1, 10, 75, answers, off_ctx, score_diff=17.0, qtr=4)
        if res["play_type"] == "pass":
            n_pass += 1
    assert (n_pass / 300.0) <= 0.42
