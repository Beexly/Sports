from __future__ import annotations

import numpy as np

from intelligence.portfolio.correlated_card_optimizer import evaluate_sgp_strict_gate


def test_sgp_quarantined_by_default_and_blocks_missing_odds_and_recycled_legs():
    rng = np.random.default_rng(88)
    n = 4000
    z = rng.normal(size=n)
    hv = {
        "leg1": (z > -0.35),
        "leg2": ((0.65 * z + 0.76 * rng.normal(size=n)) > -0.35),
    }
    legs = [
        {"id": "leg1", "athlete": "C.J. Stroud", "calibrated_prob": 0.62, "publishAllowed": True, "edge_vs_market": 0.05},
        {"id": "leg2", "athlete": "Nico Collins", "calibrated_prob": 0.62, "publishAllowed": True, "edge_vs_market": 0.05},
    ]

    # Default hard quarantine
    q_res = evaluate_sgp_strict_gate(
        legs=legs,
        hit_vectors=hv,
        posted_sgp_american_odds=220,
        straight_card_athletes=set(),
    )
    assert q_res["publishAllowed"] is False
    assert q_res["decision"] == "PASS_SGP_QUARANTINED_BY_DEFAULT"

    # Missing actual book SGP odds even when enabled
    m_res = evaluate_sgp_strict_gate(
        legs=legs,
        hit_vectors=hv,
        posted_sgp_american_odds=None,
        straight_card_athletes=set(),
        sgp_publish_enabled=True,
    )
    assert m_res["publishAllowed"] is False
    assert m_res["decision"] == "PASS_SGP_MISSING_BOOK_PRICE"

    # Recycled straight-card athlete blocked
    r_res = evaluate_sgp_strict_gate(
        legs=legs,
        hit_vectors=hv,
        posted_sgp_american_odds=220,
        straight_card_athletes={"C.J. Stroud"},
        sgp_publish_enabled=True,
    )
    assert r_res["publishAllowed"] is False
    assert r_res["decision"] == "PASS_SGP_RECYCLED_STRAIGHT_LEG"

    # Passes only when enabled + posted odds exist + zero recycled legs + exact 10k joint edge >= +5%
    ok_res = evaluate_sgp_strict_gate(
        legs=legs,
        hit_vectors=hv,
        posted_sgp_american_odds=240,  # implied 0.2941; joint hit ~0.49
        straight_card_athletes=set(),
        sgp_publish_enabled=True,
    )
    assert ok_res["publishAllowed"] is True
    assert ok_res["decision"] == "PLAY"
    assert float(ok_res["net_edge"]) >= 0.05


def test_dfs_showdown_blocks_min_salary_zero_snap_cpt():
    import pandas as pd
    from scripts.dfs.build_week10_all_slates_dfs_packets import solve_showdown_20max_portfolio
    from scripts.dfs.build_weekly_dfs_packets import optimize_showdown_portfolio

    pool = [
        {"name": "C.J. Stroud", "team": "HOU", "position": "QB", "flex_salary": 10600, "cpt_salary": 15900, "dk_p50": 20.5, "median_fpts": 20.5, "p25_floor_fpts": 14.0, "p90_ceiling_fpts": 30.0, "ownership": 0.28},
        {"name": "Nico Collins", "team": "HOU", "position": "WR", "flex_salary": 9800, "cpt_salary": 14700, "dk_p50": 18.2, "median_fpts": 18.2, "p25_floor_fpts": 11.0, "p90_ceiling_fpts": 28.0, "ownership": 0.25},
        {"name": "Jonathan Taylor", "team": "IND", "position": "RB", "flex_salary": 10200, "cpt_salary": 15300, "dk_p50": 19.0, "median_fpts": 19.0, "p25_floor_fpts": 12.0, "p90_ceiling_fpts": 29.0, "ownership": 0.26},
        {"name": "Tyler Warren", "team": "IND", "position": "TE", "flex_salary": 7400, "cpt_salary": 11100, "dk_p50": 12.4, "median_fpts": 12.4, "p25_floor_fpts": 7.5, "p90_ceiling_fpts": 19.0, "ownership": 0.16},
        {"name": "Michael Pittman", "team": "IND", "position": "WR", "flex_salary": 7800, "cpt_salary": 11700, "dk_p50": 13.5, "median_fpts": 13.5, "p25_floor_fpts": 8.0, "p90_ceiling_fpts": 20.5, "ownership": 0.18},
        {"name": "Ka'imi Fairbairn", "team": "HOU", "position": "PK", "flex_salary": 4800, "cpt_salary": 7200, "dk_p50": 8.8, "median_fpts": 8.8, "p25_floor_fpts": 5.0, "p90_ceiling_fpts": 14.0, "ownership": 0.12},
        {"name": "Bench Scrub Punt", "team": "HOU", "position": "WR", "flex_salary": 600, "cpt_salary": 900, "dk_p50": 1.2, "median_fpts": 1.2, "p25_floor_fpts": 0.0, "p90_ceiling_fpts": 2.5, "ownership": 0.01},
    ]
    lineups_20 = solve_showdown_20max_portfolio(pool, num_lineups=3, min_salary=40000)
    for lu in lineups_20:
        cpt_entry = next(r for r in lu["roster"] if "CPT" in str(r.get("slot", "")))
        assert cpt_entry["player"] != "Bench Scrub Punt"

    df_pool = pd.DataFrame([
        {
            "name": r["name"],
            "team": r["team"],
            "position": r["position"],
            "salary": r["flex_salary"],
            "cpt_salary": r["cpt_salary"],
            "cash_score": r["dk_p50"],
        }
        for r in pool
    ])
    lineups_w = optimize_showdown_portfolio(df_pool, score_col="cash_score", num_lineups=2)
    for lu in lineups_w:
        assert lu["cpt_player"] != "Bench Scrub Punt"

