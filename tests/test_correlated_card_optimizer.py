from __future__ import annotations

import numpy as np

from intelligence.portfolio.correlated_card_optimizer import construct_uncorrelated_game_card


def _make_cand(
    cid: str,
    athlete: str,
    market: str,
    cal_prob: float,
    w_lb: float,
    mkt_p: float = 0.50,
    odds: int = -112,
    team: str = "IND",
) -> dict:
    return {
        "id": cid,
        "athlete": athlete,
        "team": team,
        "position": "WR",
        "market": market,
        "model_lean": "OVER",
        "calibrated_prob": cal_prob,
        "win_prob_on_lean": cal_prob,
        "wilson_lower_90": w_lb,
        "market_fair_prob": mkt_p,
        "edge_vs_market": cal_prob - mkt_p,
        "american_odds": odds,
        "publishAllowed": True,
        "decision": "EDGE#2",
    }


def test_max_one_prop_per_athlete_corr_cap_and_kelly_bounds():
    rng = np.random.default_rng(42)
    n = 4000
    z_qb = rng.normal(0.0, 1.0, size=n)
    # Two same-athlete props + two highly correlated (rho ~ 0.85) WR props + independent props
    hv = {
        "qb_yds": (z_qb > -0.30),
        "qb_cmp": (z_qb > -0.25),
        "wr_corr": ((0.88 * z_qb + 0.47 * rng.normal(size=n)) > -0.22),
        "rb_ind": (rng.normal(size=n) > -0.22),
        "lb_ind": (rng.normal(size=n) > -0.24),
        "pk_ind": (rng.normal(size=n) > -0.21),
    }
    cands = [
        _make_cand("qb_yds", "C.J. Stroud", "Passing Yards", 0.62, 0.60, team="HOU"),
        _make_cand("qb_cmp", "C.J. Stroud", "Pass Completions", 0.60, 0.58, team="HOU"),
        _make_cand("wr_corr", "Nico Collins", "Receiving Yards", 0.59, 0.57, team="HOU"),
        _make_cand("rb_ind", "Jonathan Taylor", "Rushing Yards", 0.585, 0.565, team="IND"),
        _make_cand("lb_ind", "Azeez Al-Shaair", "Tackles + Assists", 0.595, 0.575, team="HOU"),
        _make_cand("pk_ind", "Ka'imi Fairbairn", "Kicking Points", 0.58, 0.56, team="HOU"),
    ]
    res = construct_uncorrelated_game_card(cands, hv)
    approved = [c for c in res["evaluated_candidates"] if c["publishAllowed"]]
    by_ath = [c["athlete"] for c in approved]
    assert len(by_ath) == len(set(by_ath))  # max 1 per athlete
    assert "qb_cmp" not in {c["id"] for c in approved}
    assert "wr_corr" not in {c["id"] for c in approved}  # |rho| > 0.45 blocked
    for c in approved:
        assert 0.0 < float(c["recommended_stake_pct"]) <= 0.02 + 1e-9
    assert res["total_game_stake_pct"] <= 0.08 + 1e-9


def test_a_plus_conviction_exception_clears_above_standard_cap():
    rng = np.random.default_rng(101)
    n = 4000
    # 7 standard uncorrelated plays + 1 uncorrelated A+ play (different athlete, prob >= 0.68, w_lb >= mkt + 0.06)
    keys = [f"p{i}" for i in range(8)]
    hv = {k: (rng.normal(size=n) > -0.25) for k in keys[:-1]}
    hv["p7"] = (rng.normal(size=n) > -0.52)  # ~0.70

    cands = [
        _make_cand(f"p{i}", f"Player {i}", "Receiving Yards", 0.60, 0.58, mkt_p=0.50)
        for i in range(7)
    ]
    cands.append(_make_cand("p7", "Elite Uncorr WR", "Receiving Yards", 0.695, 0.675, mkt_p=0.50))

    res = construct_uncorrelated_game_card(cands, hv, max_straight_bets_per_game=6)
    approved_ids = {c["id"] for c in res["evaluated_candidates"] if c["publishAllowed"]}
    assert "p7" in approved_ids  # A+ play included despite 6 standard slots full
    std_approved = [c for c in res["evaluated_candidates"] if c["publishAllowed"] and c["id"] != "p7"]
    assert len(std_approved) == 6
    assert res["total_game_stake_pct"] <= 0.10 + 1e-9
