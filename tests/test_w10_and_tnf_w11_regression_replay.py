from __future__ import annotations

import numpy as np

from intelligence.portfolio.correlated_card_optimizer import (
    construct_uncorrelated_game_card,
    evaluate_sgp_strict_gate,
)
from scripts.calibration.calibrate_360_prop_families_walkforward import (
    load_prop_calibration_heads,
)
from scripts.ops.evaluate_slate_360_full_markets import (
    _eval_vec_against_line,
    sample_discrete_window_yards,
    sample_exact_n_trial_longest_play,
)
from scripts.ops.gse_connected_game_workflow import (
    calibrate_qb_rush_distribution,
    enforce_joint_qb_pass_coherence,
    veto_contradictory_same_qb_props,
)
from scripts.ops.merge_two_sided_prop_odds import merge_two_sided_prop_odds
from scripts.ops.week8_forensic_kernels import detect_role_surge_or_line_divergence_trap


def test_w10_and_tnf_w11_regression_replay_eliminates_all_structural_failures():
    rng = np.random.default_rng(20261120)
    heads = load_prop_calibration_heads()

    # 1. Fail-closed on unpriced single-side or line-only TNF/W10 props
    unpriced_board = [
        {"athlete": "C.J. Stroud", "team": "HOU", "position": "QB", "market": "Total Rushing Yards (incl. overtime)", "line": 8.5, "over_odds": -115},
        {"athlete": "Davis Mills", "team": "HOU", "position": "QB", "market": "Longest Passing Completion", "line": 32.5},
    ]
    merged = merge_two_sided_prop_odds(unpriced_board, allow_live_fetch=False)
    for row in merged:
        assert row["pricing_status"] == "UNPRICED_LINE_ONLY"
        ev_u = _eval_vec_against_line(
            rng.normal(float(row["line"]) + 1.5, 4.0, size=2000),
            line=float(row["line"]),
            n_sims=2000,
            stat_type="generic",
            over_odds=row["over_odds"],
            under_odds=row["under_odds"],
            market_family=row["market"],
            calibration_heads=heads,
        )
        assert ev_u["publishAllowed"] is False
        assert ev_u["decision"] == "PASS"

    # 2. Tail/lottery props from TNF (longest_comp, 1q_rec_yds, anytime_td) stay quarantined even if two-sided priced
    for mkt_nm in ("Longest Passing Completion", "1st Quarter Receiving Yards", "Anytime Touchdown Scorer"):
        ev_tail = _eval_vec_against_line(
            rng.normal(20.0, 8.0, size=2000),
            line=12.5,
            n_sims=2000,
            stat_type=mkt_nm.lower(),
            over_odds=-115,
            under_odds=-115,
            market_family=mkt_nm,
            calibration_heads=heads,
        )
        assert ev_tail["publishAllowed"] is False

    # 3. CJ Allen W10 & W11 role-surge UNDER trap vetoed
    for line_val, gp_val, avg_val in ((8.5, 5, 1.64), (10.5, 6, 5.5)):
        trap = detect_role_surge_or_line_divergence_trap("CJ Allen", line_val, avg_val, gp_val, gp_val + 4)
        assert trap["is_role_surge_trap"] is True
        assert trap["block_under_bets"] is True

    # 4. Contradictory same-QB volume splits (Week 10 Tyler Shough / Cousins) vetoed
    shough_cands = veto_contradictory_same_qb_props([
        {"athlete": "Tyler Shough", "team": "NO", "position": "QB", "market": "Total Pass Completions (incl. overtime)", "model_lean": "UNDER", "edge_vs_market": 0.07, "win_prob_on_lean": 0.64, "publishAllowed": True, "decision": "EDGE#2"},
        {"athlete": "Tyler Shough", "team": "NO", "position": "QB", "market": "Total Passing Attempts (incl. overtime)", "model_lean": "OVER", "edge_vs_market": 0.04, "win_prob_on_lean": 0.61, "publishAllowed": True, "decision": "EDGE#1b"},
    ])
    assert sum(1 for x in shough_cands if x["publishAllowed"]) == 1

    # 5. QB pass coherence + pocket-statue kneeldown preservation
    py, pa, pc = enforce_joint_qb_pass_coherence(
        pass_yds_vec=np.clip(rng.normal(240.5, 50.0, 2000), 60.0, 450.0),
        pass_att_vec=np.clip(rng.normal(28.6, 4.5, 2000), 14.0, 50.0),
        pass_comp_vec=np.clip(rng.normal(24.4, 3.8, 2000), 8.0, 42.0),
        qb_att_line=31.5,
        qb_comp_line=21.5,
    )
    assert 0.54 <= float(np.mean(pc)) / float(np.mean(pa)) <= 0.74
    assert 8.8 <= float(np.mean(py)) / float(np.mean(pc)) <= 13.8

    _scr, qb_ry = calibrate_qb_rush_distribution(
        qb_pbp_rush_pg=1.2,
        qb_pbp_car_pg=1.4,
        qb_rush_board_line=0.5,
        qb_car_board_line=1.5,
        kneel_vec=np.where(rng.random(2000) < 0.35, 1.0, 0.0),
        ol_scramble_boost=1.0,
        rng=rng,
    )
    assert float(np.mean(qb_ry <= 0.0)) >= 0.30

    # 6. Discrete 1Q zero mass & exact N-trial longest play
    q1 = sample_discrete_window_yards(rng, np.full(2000, 4.0), rng.gamma(4.0, 11.0, 2000), 0.24, 11.0)
    assert float(np.mean(q1 == 0.0)) >= 0.25
    assert float(np.mean(sample_exact_n_trial_longest_play(rng, np.full(2000, 24.0), 4.1, 1.15))) >= 14.0

    # 7. Card optimizer caps straight props <= 1 per athlete, <= 6 std per game, <= 8% exposure & quarantine blocks SGPs
    z = rng.normal(size=2000)
    hv = {f"c{i}": (rng.normal(size=2000) > -0.25) for i in range(8)}
    hv["c0"] = z > -0.30
    hv["c1"] = z > -0.25
    cands = [
        {"id": "c0", "athlete": "C.J. Stroud", "market": "Pass Attempts", "calibrated_prob": 0.61, "wilson_lower_90": 0.59, "market_fair_prob": 0.50, "edge_vs_market": 0.11, "publishAllowed": True},
        {"id": "c1", "athlete": "C.J. Stroud", "market": "Pass Completions", "calibrated_prob": 0.60, "wilson_lower_90": 0.58, "market_fair_prob": 0.50, "edge_vs_market": 0.10, "publishAllowed": True},
        *[
            {"id": f"c{i}", "athlete": f"Ath {i}", "market": "Rushing Yards", "calibrated_prob": 0.59, "wilson_lower_90": 0.57, "market_fair_prob": 0.50, "edge_vs_market": 0.09, "publishAllowed": True}
            for i in range(2, 8)
        ],
    ]
    card = construct_uncorrelated_game_card(cands, hv, max_straight_bets_per_game=6)
    approved = [x for x in card["evaluated_candidates"] if x["publishAllowed"]]
    assert len(approved) <= 6
    assert len({x["athlete"] for x in approved}) == len(approved)
    assert card["total_game_stake_pct"] <= 0.08 + 1e-9

    sgp = evaluate_sgp_strict_gate(approved[:2], hv, posted_sgp_american_odds=240, straight_card_athletes={x["athlete"] for x in approved})
    assert sgp["publishAllowed"] is False
    assert sgp["decision"] == "PASS_SGP_QUARANTINED_BY_DEFAULT"
