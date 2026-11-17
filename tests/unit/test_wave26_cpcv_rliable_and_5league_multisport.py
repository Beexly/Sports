"""Wave 26 unit tests: CPCV rliable ratchet, Week 11 hold gate, and 5-league multisport."""

from __future__ import annotations

import json
import math
import re
from dataclasses import dataclass
from pathlib import Path

import pytest

from gse_engine.governance.simulation_hold_gate import OperatorSimulationHoldError
from gse_engine.multisport import (
    CopulaLegSpec,
    DirectionalBcAciState,
    compute_frechet_hoeffding_joint_bounds,
    evaluate_multisport_sabermetrics_and_pitch_control_overlay,
    fetch_365_day_five_league_slate,
    fetch_live_multisport_slate,
    predict_directional_bc_aci_band,
    price_copula_conformal_sgp,
    simulate_multisport_matchup_10k,
    update_directional_bc_aci_interval,
)
from gse_engine.observability.walk_forward_ablation import (
    _render_ascii_walk_forward_report,
    assert_ablation_game_rows_approved,
    run_weeks1_to_10_walk_forward_ablation,
)

REPO_ROOT = Path(__file__).resolve().parents[2]


@dataclass(frozen=True)
class _SyntheticRow:
    week: int


def test_walk_forward_ablation_enforces_week11_hold_gate() -> None:
    """Any week >= 11 row must raise OperatorSimulationHoldError without approval."""
    assert assert_ablation_game_rows_approved([_SyntheticRow(1), _SyntheticRow(10)]) == [1, 10]
    with pytest.raises(OperatorSimulationHoldError, match="OPERATOR_SIM_HOLD"):
        assert_ablation_game_rows_approved([_SyntheticRow(10), _SyntheticRow(11)], env_override="")


def test_walk_forward_ablation_rliable_fwl_floors_and_clean_report() -> None:
    """Verify rliable IQM, FWL residual slope, monotonic floors, and pure-ASCII report."""
    summary = run_weeks1_to_10_walk_forward_ablation(REPO_ROOT)
    assert max(summary["weeks_covered"]) <= 10
    assert summary["governance"]["real_money_stake_cleared"] is False

    w26 = summary["wave26_rliable_and_ratchet"]
    assert w26["rliable_iqm_ci_low"] <= w26["rliable_iqm"] <= w26["rliable_iqm_ci_high"]
    assert w26["fwl_orthogonal_verified"] is True
    assert w26["fwl_partial_slope"] > 0.0
    assert w26["monotone_ratchet"]["promote"] is True
    assert w26["monotone_ratchet"]["live_weight_multiplier"] == 1.0

    floors = w26["wave19_21_floors"]
    assert floors["all_floors_held"] is True
    assert floors["pass_mae"] <= 58.77
    assert floors["rush_mae"] <= 25.87
    assert floors["player_mae"] <= 25.29
    assert floors["game_total_mae"] <= 8.85
    assert floors["oos_normalized_crps"] <= 7.0944
    assert floors["min_ess"] >= 0.864

    report_md = _render_ascii_walk_forward_report(summary)
    assert max(ord(ch) for ch in report_md) <= 127
    assert re.search(r"\b" + "blo" + "ck(?:ed|er|ers|ing|s)?\b", report_md, re.IGNORECASE) is None

    eval_json = json.loads(
        (REPO_ROOT / "data" / "eval" / "weeks1_to_10_walk_forward_ablation_2026.json").read_text(
            encoding="utf-8"
        )
    )
    assert "wave26_rliable_and_ratchet" in eval_json
    assert eval_json["wave26_rliable_and_ratchet"]["wave19_21_floors"]["all_floors_held"] is True


def test_mlb_10k_simulation_conservation_circadian_and_altitude() -> None:
    """Verify 5th league MLB conservation and directional circadian / altitude physics."""
    base_mlb = simulate_multisport_matchup_10k(
        "MLB",
        "LAD",
        "NYY",
        home_rating=4.5,
        away_rating=4.2,
        n_worlds=5000,
        seed=42,
    )
    assert base_mlb["league"] == "MLB"
    assert base_mlb["draw_prob"] == 0.0
    assert math.isclose(
        base_mlb["mean_total"],
        base_mlb["mean_home"] + base_mlb["mean_away"],
        rel_tol=1e-9,
        abs_tol=1e-9,
    )

    coors_mlb = simulate_multisport_matchup_10k(
        "MLB",
        "COL",
        "NYY",
        home_rating=4.5,
        away_rating=4.2,
        altitude_m=1609.0,
        n_worlds=5000,
        seed=42,
    )
    assert coors_mlb["mean_total"] > base_mlb["mean_total"]

    jetlag_nba = simulate_multisport_matchup_10k(
        "NBA",
        "BOS",
        "LAL",
        home_rating=117.0,
        away_rating=114.0,
        circadian_shift_hours=3.0,
        n_worlds=5000,
        seed=77,
    )
    clean_nba = simulate_multisport_matchup_10k(
        "NBA",
        "BOS",
        "LAL",
        home_rating=117.0,
        away_rating=114.0,
        circadian_shift_hours=0.0,
        n_worlds=5000,
        seed=77,
    )
    assert jetlag_nba["mean_away"] < clean_nba["mean_away"]
    assert jetlag_nba["home_win_prob"] > clean_nba["home_win_prob"]


def test_directional_bc_aci_and_frechet_hoeffding_copula() -> None:
    """Verify asymmetric tail adaptation in DirectionalBcAciState and Frechet SGP bounds."""
    st0 = DirectionalBcAciState(q_low=8.0, q_high=8.0, gamma=0.05, alpha_low=0.05, alpha_high=0.05)
    c0, lo0, hi0 = predict_directional_bc_aci_band(st0, 220.0)
    assert c0 == 220.0 and lo0 == 212.0 and hi0 == 228.0

    st_upper = update_directional_bc_aci_interval(st0, 220.0, 240.0)
    assert st_upper.q_high > st0.q_high
    assert st_upper.q_low < st0.q_low

    st_lower = update_directional_bc_aci_interval(st0, 220.0, 195.0)
    assert st_lower.q_low > st0.q_low
    assert st_lower.q_high < st0.q_high

    legs = [CopulaLegSpec("A", "ML", 0.62), CopulaLegSpec("B", "OVER", 0.55)]
    fh_lo, fh_hi = compute_frechet_hoeffding_joint_bounds([0.62, 0.55])
    assert math.isclose(fh_lo, 0.17, abs_tol=1e-9)
    assert math.isclose(fh_hi, 0.55, abs_tol=1e-9)

    sgp = price_copula_conformal_sgp(
        legs,
        [[1.0, 0.45], [0.45, 1.0]],
        book_decimal_odds=2.8,
        n_worlds=4000,
        seed=99,
        df=5.0,
    )
    assert sgp["within_frechet_bounds"] is True
    assert sgp["frechet_lower_bound"] <= sgp["joint_sim_prob"] <= sgp["frechet_upper_bound"]


def test_five_league_365_day_slate_and_sabermetric_overlay() -> None:
    """Verify default 4-league preservation, 5-league 365-day slate, and overlay scalars."""
    overlay = evaluate_multisport_sabermetrics_and_pitch_control_overlay()
    assert overlay["all_finite"] is True
    assert 0.25 < overlay["mlb_woba"] < 0.60
    assert 0.0 < overlay["soccer_pitch_control_attack"] < 1.0
    assert 0.0 < overlay["nhl_shot_xg"] < 1.0

    slate4 = fetch_live_multisport_slate(date_str="2026-11-17", offline=True, n_worlds=500, seed=11)
    assert slate4["leagues"] == ["NBA", "NHL", "NCAAB", "SOCCER"]

    slate5 = fetch_365_day_five_league_slate(
        date_str="2026-11-17", offline=True, n_worlds=500, seed=11
    )
    assert slate5["leagues"] == ["NBA", "NHL", "NCAAB", "SOCCER", "MLB"]
    assert len(slate5["fixtures"]) == 10
    assert slate5["real_money_stake_cleared"] is False
    assert slate5["live_stake_fraction"] == 0.0
    assert slate5["sabermetric_pitch_control_overlay"]["all_finite"] is True
    assert max(ord(ch) for ch in slate5["card_markdown"]) <= 127
