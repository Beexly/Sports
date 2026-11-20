from __future__ import annotations

import numpy as np

from scripts.ops.evaluate_slate_360_full_markets import compute_calibrated_anytime_td_lambda
from scripts.ops.gse_connected_game_workflow import allocate_conserved_receptions


def test_allocate_conserved_receptions_conserves_team_comp_and_anchors_line():
    rng = np.random.default_rng(99)
    n_w = 2000
    tm_comp = rng.normal(21.0, 3.5, size=n_w).clip(8.0, 36.0)
    ath = {
        "Tyler Warren": {"team": "IND", "position": "TE", "pbp_2026": {"receptions": 38, "rec_yds": 360, "player_gp": 10}, "core_lines": {"Total Receptions (incl. overtime)": 4.5}},
        "Michael Pittman Jr.": {"team": "IND", "position": "WR", "pbp_2026": {"receptions": 52, "rec_yds": 620, "player_gp": 10}, "core_lines": {"Total Receptions (incl. overtime)": 5.5}},
        "Jonathan Taylor": {"team": "IND", "position": "RB", "pbp_2026": {"receptions": 28, "rec_yds": 210, "player_gp": 10}, "core_lines": {"Total Receptions (incl. overtime)": 2.5}},
        "OTHER_TEAM_REC": {"team": "IND", "position": "WR", "pbp_2026": {"receptions": 10, "rec_yds": 120, "player_gp": 10}, "core_lines": {}},
    }
    rec_alloc = {
        "Tyler Warren": rng.gamma(4.0, 12.0, size=n_w),
        "Michael Pittman Jr.": rng.gamma(5.0, 13.0, size=n_w),
        "Jonathan Taylor": rng.gamma(2.5, 8.5, size=n_w),
        "OTHER_TEAM_REC": rng.gamma(3.0, 14.0, size=n_w),
    }
    res = allocate_conserved_receptions(tm_comp, ath, rec_alloc, rng)
    tot_rec = sum(res[k] for k in ath)
    assert np.max(np.abs(tot_rec - tm_comp)) < 1e-4
    # Must NEVER inflate 4.5-line TE to 8.00 catches!
    assert float(np.mean(res["Tyler Warren"])) < 6.5


def test_calibrated_anytime_td_conserves_team_tds_no_66_pct_inflation():
    # HOU projects 31.25 pts (~3.42 offensive TDs), Stroud already throws 3.12 pass TDs
    rec_tds = np.zeros(2000, dtype=np.float64)
    lam = compute_calibrated_anytime_td_lambda(
        rec_tds_vec=rec_tds,
        rush_share=0.58,
        team_pts_mean=31.25,
        team_pass_tds_mean=3.12,
    )
    p_atd = float(np.mean(lam))
    assert p_atd <= 0.52, f"Expected <= 0.52 anytime TD when pass_tds consume 3.12 TDs, got {p_atd:.3f}"
