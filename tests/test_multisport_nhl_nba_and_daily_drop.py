#!/usr/bin/env python3
from __future__ import annotations

import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from scripts.calibration.train_multisport_nhl_nba_walkforward import (
    compute_nba_fatigue_adjustment_pts,
    run_walkforward_nhl_and_nba_calibration,
    walkforward_evaluate_chronological_games,
)
from scripts.ops.run_daily_multisport_audio_and_telegram_drop import (
    assert_guardrail_clean_daily_script,
    build_daily_multisport_script,
    run_daily_drop,
)
from scripts.ops.run_week11_sunday_rc1_rc13_recalibrated_slate import (
    run_sunday_week11_rc1_rc13_recalibration,
)


def test_nba_fatigue_bayesian_posterior_and_non_fake_data_quarantine(tmp_path: Path) -> None:
    adj = compute_nba_fatigue_adjustment_pts(rest_diff=1.0, westward_travel_hours=2.0, three_in_four_diff=1.0)
    assert -6.0 <= adj < 0.0

    # Empty real settled history NEVER fakes n_oos and stays strictly quarantined in TIER_B
    res = run_walkforward_nhl_and_nba_calibration(out_path=tmp_path / "ms_heads.json")
    assert res["no_fake_data_law"] is True
    assert res["sports"]["NHL"]["n_oos"] == 0
    assert res["sports"]["NHL"]["eligible_for_play"] is False
    assert res["sports"]["NHL"]["readiness"]["readiness_tier"] == "TIER_B_ENVIRONMENT_INTEL_AND_PAPER_LEARNING"
    assert res["sports"]["NBA"]["n_oos"] == 0
    assert res["sports"]["NBA"]["eligible_for_play"] is False

    # Chronological walk-forward test with >= 200 settled games carrying clean signal clears TIER_A
    import random
    rng = random.Random(20261120)
    games = []
    for i in range(210):
        sig = 0.70 if i % 2 == 0 else -0.70
        p_true = 0.66 if sig > 0 else 0.34
        outcome = 1.0 if rng.random() < p_true else 0.0
        games.append({
            "date": f"2026-01-{(i % 28) + 1:02d}",
            "game_id": f"nhl-{i:04d}",
            "market_fair_prob": 0.50,
            "raw_signal_logit_delta": sig,
            "outcome": outcome,
        })
    eval_nhl = walkforward_evaluate_chronological_games("NHL", games, market_family="moneypuck_xg_moneyline")
    assert eval_nhl["strictly_causal"] is True
    assert eval_nhl["n_oos"] == 180
    assert eval_nhl["walkforward_brier"] < eval_nhl["market_baseline_brier"]
    assert eval_nhl["walkforward_accuracy"] >= 0.555
    assert eval_nhl["eligible_for_play"] is True


def test_daily_multisport_audio_and_telegram_drop_guardrails(tmp_path: Path) -> None:
    with pytest.raises(ValueError):
        assert_guardrail_clean_daily_script("Tonight has 80% confidence on our 10,000 worlds Sinkhorn play.")
    with pytest.raises(ValueError):
        assert_guardrail_clean_daily_script("OFFICIAL VIP TICKET: OVER 245.5 Passing Yards 1.5u")

    script, briefs = build_daily_multisport_script(
        {"families": {"passing_tds": {"eligible_for_play": True}, "rushing_yards": {"eligible_for_play": True}}},
        {"sports": {"NBA": {"readiness": {"readiness_tier": "TIER_B_ENVIRONMENT_INTEL_AND_PAPER_LEARNING"}}}, "moneypuck_live_environment": {}},
    )
    assert "%" not in script
    assert len(briefs) == 3

    receipt_p = tmp_path / "daily_drop_receipt.json"
    ms_p = tmp_path / "ms_heads.json"
    receipt = run_daily_drop(
        fetch_live=False,
        synthesize_audio=False,
        send_to_telegram=False,
        receipt_path=receipt_p,
        multisport_out_path=ms_p,
    )
    assert "%" not in receipt["telegram_teaser"]
    assert receipt_p.is_file()


def test_sunday_week11_rc1_rc13_recalibration_preserves_fail_closed_gates(tmp_path: Path) -> None:
    out_p = tmp_path / "w11_sunday_rc1_rc13.json"
    rep = run_sunday_week11_rc1_rc13_recalibration(out_path=out_p)
    assert rep["games_count"] == 12
    assert rep["summary"]["total_props_evaluated"] > 0
    assert rep["summary"]["sgp_default_quarantined"] is True
    assert out_p.is_file()
