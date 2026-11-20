from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from scripts.calibration.calibrate_360_prop_families_walkforward import (
    calibrate_prop_probability,
    load_prop_calibration_heads,
    run_walkforward_prop_calibration,
)
from scripts.ops.evaluate_slate_360_full_markets import _eval_vec_against_line

REPO_ROOT = Path(__file__).resolve().parents[1]


def test_walkforward_prop_calibration_strictly_causal_and_emits_artifact(tmp_path: Path):
    out_json = tmp_path / "prop_family_calibration_heads_2026.json"
    res = run_walkforward_prop_calibration(
        pbp_path=REPO_ROOT / "intelligence" / "coaching" / "data" / "play_by_play_2026.parquet",
        out_path=out_json,
    )
    assert res["strictly_causal"] is True
    assert res["eval_weeks"] == [4, 5, 6, 7, 8, 9, 10]
    assert out_json.is_file()

    fams = res["families"]
    for req in (
        "passing_yards",
        "rushing_yards",
        "receiving_yards",
        "receptions",
        "pass_attempts",
        "pass_completions",
        "passing_tds",
        "carries",
        "longest_comp",
        "longest_rec",
        "longest_rush",
        "1q_rec_yds",
        "1q_rush_yds",
        "1q_pass_yds",
        "anytime_td",
        "tackles_plus_assists",
        "solo_tackles",
        "sacks",
    ):
        assert req in fams
        hd = fams[req]
        assert 0.10 <= float(hd["w_sim"]) <= 0.70
        assert 0.40 <= float(hd["temp"]) <= 1.50
        assert 0.56 <= float(hd["max_prob_cap"]) <= 0.76
        assert int(hd["n_oos"]) >= 20
        if float(hd["walkforward_brier"]) >= float(hd["market_baseline_brier"]) or float(hd["walkforward_accuracy"]) < 0.535:
            assert hd["eligible_for_play"] is False


def test_calibrate_prop_probability_shrinks_tails_and_respects_quarantine():
    sample_heads = {
        "families": {
            "passing_yards": {
                "w_sim": 0.35,
                "temp": 0.75,
                "max_prob_cap": 0.70,
                "walkforward_brier": 0.238,
                "market_baseline_brier": 0.250,
                "walkforward_accuracy": 0.575,
                "n_oos": 180,
                "eligible_for_play": True,
            },
            "longest_comp": {
                "w_sim": 0.15,
                "temp": 0.65,
                "max_prob_cap": 0.60,
                "walkforward_brier": 0.254,
                "market_baseline_brier": 0.250,
                "walkforward_accuracy": 0.495,
                "n_oos": 180,
                "eligible_for_play": False,
            },
        }
    }
    cal_pass = calibrate_prop_probability(
        raw_sim_prob=0.88,
        market_fair_prob=0.50,
        market_family="passing_yards",
        lean="OVER",
        heads=sample_heads,
    )
    assert cal_pass["eligible_for_play"] is True
    assert 0.50 < cal_pass["calibrated_prob"] <= 0.70

    cal_long = calibrate_prop_probability(
        raw_sim_prob=0.85,
        market_fair_prob=0.50,
        market_family="longest_comp",
        lean="OVER",
        heads=sample_heads,
    )
    assert cal_long["eligible_for_play"] is False
    assert cal_long["calibrated_prob"] <= 0.58


def test_eval_vec_against_line_quarantines_uncalibrated_tail_families():
    rng = np.random.default_rng(2026)
    vec = rng.normal(42.0, 9.0, size=4000)
    heads = load_prop_calibration_heads()
    assert isinstance(heads, dict) and "families" in heads

    # Explicitly test quarantined head path
    quar_ev = _eval_vec_against_line(
        vec,
        line=33.5,
        n_sims=4000,
        stat_type="longest_comp",
        over_odds=-115,
        under_odds=-115,
        market_family="longest_comp",
        calibration_heads={"families": {"longest_comp": {"w_sim": 0.15, "temp": 0.65, "max_prob_cap": 0.60, "eligible_for_play": False}}},
    )
    assert quar_ev["publishAllowed"] is False
    assert quar_ev["decision"] == "PASS_QUARANTINED_UNCALIBRATED_FAMILY"
