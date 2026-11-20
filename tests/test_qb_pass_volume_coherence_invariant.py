from __future__ import annotations

import numpy as np

from scripts.ops.gse_connected_game_workflow import (
    enforce_joint_qb_pass_coherence,
    veto_contradictory_same_qb_props,
)


def test_enforce_joint_qb_pass_coherence_prevents_purdy_cousins_shough_distortions():
    rng = np.random.default_rng(123)
    # Reproduce Purdy distortion: 24.39 comp / 28.61 att = 85.2% comp on 240.56 yds
    pass_yds = np.clip(rng.normal(240.56, 55.0, size=2000), 60.0, 480.0)
    pass_att = np.clip(rng.normal(28.61, 4.5, size=2000), 14.0, 55.0)
    pass_comp = np.clip(rng.normal(24.39, 3.8, size=2000), 8.0, 45.0)

    py_out, pa_out, pc_out = enforce_joint_qb_pass_coherence(
        pass_yds_vec=pass_yds,
        pass_att_vec=pass_att,
        pass_comp_vec=pass_comp,
        qb_att_line=31.5,
        qb_comp_line=21.5,
        qb_pbp_comp_pct=0.675,
        qb_pbp_ypa=7.8,
    )
    mean_comp_pct = float(np.mean(pc_out)) / float(np.mean(pa_out))
    mean_ypc = float(np.mean(py_out)) / float(np.mean(pc_out))
    assert 0.54 <= mean_comp_pct <= 0.74
    assert 8.8 <= mean_ypc <= 13.8
    assert np.all(pc_out <= pa_out * 0.78 + 1e-6)
    assert np.all(pc_out >= pa_out * 0.40 - 1e-6)

    # Reproduce Cousins distortion: 155 yds / 23.58 comp = 6.57 YPC
    cy_out, ca_out, cc_out = enforce_joint_qb_pass_coherence(
        pass_yds_vec=np.clip(rng.normal(155.0, 45.0, size=2000), 50.0, 400.0),
        pass_att_vec=np.clip(rng.normal(31.29, 5.0, size=2000), 14.0, 55.0),
        pass_comp_vec=np.clip(rng.normal(23.58, 4.0, size=2000), 8.0, 40.0),
        qb_att_line=34.5,
        qb_comp_line=21.5,
        qb_pbp_comp_pct=0.65,
        qb_pbp_ypa=6.9,
    )
    assert float(np.mean(cy_out)) / float(np.mean(cc_out)) >= 8.8


def test_veto_contradictory_same_qb_props_blocks_shough_cousins_purdy_splits():
    cands = [
        {
            "athlete": "Tyler Shough",
            "team": "NO",
            "position": "QB",
            "market": "Total Pass Completions (incl. overtime)",
            "model_lean": "UNDER",
            "edge_vs_market": 0.08,
            "win_prob_on_lean": 0.66,
            "publishAllowed": True,
            "decision": "PLAY",
        },
        {
            "athlete": "Tyler Shough",
            "team": "NO",
            "position": "QB",
            "market": "Total Passing Attempts (incl. overtime)",
            "model_lean": "OVER",
            "edge_vs_market": 0.04,
            "win_prob_on_lean": 0.61,
            "publishAllowed": True,
            "decision": "PLAY",
        },
        {
            "athlete": "Patrick Mahomes",
            "team": "KC",
            "position": "QB",
            "market": "Total Passing Touchdowns (incl. overtime)",
            "model_lean": "OVER",
            "edge_vs_market": 0.06,
            "win_prob_on_lean": 0.62,
            "publishAllowed": True,
            "decision": "PLAY",
        },
        {
            "athlete": "Patrick Mahomes",
            "team": "KC",
            "position": "QB",
            "market": "Total Passing Yards (incl. overtime)",
            "model_lean": "UNDER",
            "edge_vs_market": 0.04,
            "win_prob_on_lean": 0.62,
            "publishAllowed": True,
            "decision": "PLAY",
        },
    ]
    out = veto_contradictory_same_qb_props(cands)
    shough_comp = next(x for x in out if x["athlete"] == "Tyler Shough" and "Completions" in x["market"])
    shough_att = next(x for x in out if x["athlete"] == "Tyler Shough" and "Attempts" in x["market"])
    assert shough_comp["publishAllowed"] is True
    assert shough_att["publishAllowed"] is False
    assert shough_att["decision"] == "PASS_CONTRADICTORY_SAME_QB_VOLUME"

    mahomes_tds = next(x for x in out if x["athlete"] == "Patrick Mahomes" and "Touchdowns" in x["market"])
    mahomes_yds = next(x for x in out if x["athlete"] == "Patrick Mahomes" and "Yards" in x["market"])
    assert mahomes_tds["publishAllowed"] is True
    assert mahomes_yds["publishAllowed"] is False
