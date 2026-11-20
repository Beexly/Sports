"""
Unit, cleared-nflverse integration, and optimization tests for
`whitefield_and_nflverse_metrics_engine.py`.
"""

from __future__ import annotations

import random

from intelligence.coaching import whitefield_and_nflverse_metrics_engine as wf


def test_cleared_nflverse_2026_efficiency_profile_runs_live() -> None:
    prof = wf.compute_cleared_nflverse_2026_efficiency_profile()
    assert prof["available"] is True
    assert prof["source"] == "nflverse_cleared_2026"
    assert prof["plays"] > 18000
    assert prof["total_pbp_rows"] > 25000
    assert prof["max_week"] >= 10
    assert 0.30 <= prof["epa_success_rate"] <= 0.60
    assert 0.30 <= prof["situational_yards_success_rate"] <= 0.65


def test_adaptive_local_html_table_header_matcher() -> None:
    sample_html = (
        "<html><body><table><tr><th>Noise</th><th>Column</th></tr><tr><td>a</td><td>b</td></tr></table>"
        "<table><tr><th>Team</th><th>Drives</th><th>Avg Start</th><th>Pts</th></tr>"
        "<tr><td>Detroit Lions</td><td>110</td><td>Own 31.2</td><td>2.45</td></tr></table></body></html>"
    )
    matched = wf.adaptive_match_html_table_headers(sample_html, ["team", "drives", "pts"])
    assert matched is not None
    assert matched["table_index"] == 1
    assert matched["match_score"] == 1.0
    assert matched["data_rows"][0][0] == "Detroit Lions"


def test_python_true_routes_trench_isolation_and_ass_optimizations() -> None:
    rng = random.Random(20261119)
    mse_naive = 0.0
    mse_true = 0.0
    for _ in range(300):
        true_yprr = 1.6 + rng.gauss(0.0, 0.45)
        routes = rng.randint(140, 180)
        pblk = rng.randint(25, 60)
        sblk = rng.randint(10, 28)
        yds = max(0.0, true_yprr * routes + rng.gauss(0.0, 18.0))
        res = wf.compute_true_routes_run_and_ass_breakout(
            routes + pblk + sblk,
            pblk,
            sblk,
            int(routes * 0.22),
            yds,
            int(routes * 0.09),
            0.05,
        )
        mse_naive += (res["naive_yprr"] - true_yprr) ** 2
        mse_true += (res["true_yprr"] - true_yprr) ** 2
    assert (mse_naive - mse_true) / mse_naive >= 0.60

    mse_raw = 0.0
    mse_iso = 0.0
    for _ in range(350):
        true_p = max(0.10, min(0.32, 0.21 + rng.gauss(0.0, 0.035)))
        ol_q = max(0, int(round(true_p * 280 + rng.gauss(0.0, 6.0))))
        qb_l = max(0, int(round(12 + 9 * rng.random())))
        raw_p = (ol_q + qb_l * 1.4) / 280.0
        res = wf.compute_trench_isolation_pbwr_rbwr(280, ol_q, qb_l, 280 - ol_q, 210, 147)
        mse_raw += (raw_p - true_p) ** 2
        mse_iso += (res["projected_true_pressure_rate"] - true_p) ** 2
    assert (mse_raw - mse_iso) / mse_raw >= 0.25


def test_python_seven_pfr_11_19_rules_and_ind_hou_council_invariants() -> None:
    sr = wf.compute_non_sneak_success_rate_guard(500, 22, 20, 0.48, 12, 90)
    assert sr["non_sneak_success_rate"] < sr["raw_yards_success_rate"]
    assert sr["sneak_inflation_gap"] > 0.015

    cov_sack = wf.classify_pass_rush_coverage_regime(0.36, 0.089, 0.68, 2.92, 1.0, 0.0, 0.0)
    assert cov_sack["regime"] == "COVERAGE_SACK_REGIME"
    assert cov_sack["coverage_sack_regression_risk"] > 0.35

    quick_rel = wf.classify_pass_rush_coverage_regime(0.49, 0.051, 0.42, 2.38, 0.0, 1.0, 0.0)
    assert quick_rel["regime"] == "QUICK_RELEASE_BACKEND_VULNERABILITY"
    assert quick_rel["quick_release_vulnerability"] > 0.35

    sfmt = wf.compute_strict_fmt_index(120, 28, 10, 6)
    assert sfmt["strict_fmt_count"] == 24
    assert abs(sfmt["noise_inflation_share"] - (10.0 / 28.0)) < 1e-4

    bc = wf.evaluate_bellcow_trajectory_slope([
        {"week": 7, "snap_share": 0.38, "touch_share": 0.34, "explosive_run_rate": 0.07, "yac_per_att": 2.3, "strict_fmt_per_att": 0.14, "rb_yprr": 0.85},
        {"week": 8, "snap_share": 0.51, "touch_share": 0.47, "explosive_run_rate": 0.11, "yac_per_att": 2.8, "strict_fmt_per_att": 0.18, "rb_yprr": 1.15},
        {"week": 9, "snap_share": 0.64, "touch_share": 0.60, "explosive_run_rate": 0.15, "yac_per_att": 3.3, "strict_fmt_per_att": 0.23, "rb_yprr": 1.45},
        {"week": 10, "snap_share": 0.74, "touch_share": 0.71, "explosive_run_rate": 0.18, "yac_per_att": 3.7, "strict_fmt_per_att": 0.26, "rb_yprr": 1.62},
    ])
    assert bc["breakout_buy_low_flag"] is True
    assert bc["projected_next_week_snap_share_delta"] > 0.10

    scheme = wf.evaluate_scheme_concept_matchup_matrix(0.42, 0.28, 0.20, 0.10, 0.68, 0.72, 0.11, 0.04, -0.02, 0.03, 0.09, 0.06, 0.58, 0.24)
    assert scheme["scheme_concept_matchup_epa_delta"] > 0.02

    qc = wf.validate_cross_charting_consistency(20, 10, 0.44, 0.21, 12, 200)
    assert qc["qc_passed"] is False
    assert qc["population_drift_flag"] is True
    assert qc["reliability_weight"] < 0.75

    qbr = wf.compute_garbage_time_adjusted_qbr_proxy(300, 210, -0.04, 0.36, 0.015, 2.0, 35.0, 0.03)
    assert qbr["garbage_time_inflation_bias"] > 0.08
    assert qbr["garbage_time_filtered_qbr_epa"] < 0.05

    # Matchup integration + council checks: IR non-double-count, asymmetric Q sigma, swap antisymmetry, OL monotonicity
    ind_hou = wf.evaluate_whitefield_and_nflverse_matchup_profile("IND", "HOU")
    hou_ind = wf.evaluate_whitefield_and_nflverse_matchup_profile("HOU", "IND")
    assert ind_hou["nflverse_max_week"] >= 10
    assert abs(ind_hou["stream_15m_away_trench_pressure_delta"] - hou_ind["stream_15m_home_trench_pressure_delta"]) < 1e-6
    assert abs(ind_hou["stream_15m_home_trench_pressure_delta"] - hou_ind["stream_15m_away_trench_pressure_delta"]) < 1e-6
    # Asymmetric Questionable sigma (Sauce Gardner 87.2% CB Q hurts HOU pass clarity vs IND more than HOU Qs)
    assert ind_hou["stream_15m_away_questionable_sigma"] > 0.0
    assert ind_hou["stream_15m_home_questionable_sigma"] > ind_hou["stream_15m_away_questionable_sigma"]
    # OL Hold+FS penalty discipline advantage for IND (0.2193/dr vs HOU 0.3265/dr)
    assert ind_hou["stream_15m_away_non_sneak_sr_edge"] > ind_hou["stream_15m_home_non_sneak_sr_edge"]
    # HOU Jaylin Smith CB IR logged as already_priced_in, NOT doubled into live cb_out
    assert ind_hou["away_profile"]["opponent_live_def_injuries"]["ir_already_priced_in"] >= 1
    # Monotonicity: more OL starters out raises pressure_hazard_delta and lowers trench_pressure_delta
    clean_ol = wf.evaluate_whitefield_and_nflverse_matchup_profile("IND", "HOU", {"away_ol_starters_out": 0.0, "home_ol_starters_out": 0.0})
    hurt_ol = wf.evaluate_whitefield_and_nflverse_matchup_profile("IND", "HOU", {"away_ol_starters_out": 2.0, "home_ol_starters_out": 0.0})
    assert hurt_ol["stream_15m_away_pressure_hazard_delta"] > clean_ol["stream_15m_away_pressure_hazard_delta"]
    assert hurt_ol["stream_15m_away_trench_pressure_delta"] < clean_ol["stream_15m_away_trench_pressure_delta"]
