from __future__ import annotations

import json
from pathlib import Path

import numpy as np

from scripts.ops.evaluate_slate_360_full_markets import (
    _eval_vec_against_line,
    check_sim_market_drift_circuit_breaker,
)
from scripts.ops.merge_two_sided_prop_odds import merge_two_sided_prop_odds


def test_merge_two_sided_prop_odds_local_json_and_csv_snapshots(tmp_path: Path):
    board_props = [
        {"athlete": "C.J. Stroud", "team": "HOU", "position": "QB", "market": "Total Passing Yards (incl. overtime)", "line": 235.5},
        {"athlete": "Jonathan Taylor", "team": "IND", "position": "RB", "market": "Total Rushing Yards (incl. overtime)", "line": 79.5},
        {"athlete": "Michael Pittman Jr.", "team": "IND", "position": "WR", "market": "Total Receiving Yards (incl. overtime)", "line": 58.5},
        {"athlete": "Tyler Warren", "team": "IND", "position": "TE", "market": "Total Receptions (incl. overtime)", "line": 4.5},
        {"athlete": "Ka'imi Fairbairn", "team": "HOU", "position": "PK", "market": "Total Kicking Points (incl. overtime)", "line": 7.5},
        {"athlete": "Azeez Al-Shaair", "team": "HOU", "position": "LB", "market": "Total Tackles Plus Assists (incl. overtime)", "line": 7.5},
        {"athlete": "Unpriced Player", "team": "IND", "position": "WR", "market": "Total Receiving Yards (incl. overtime)", "line": 22.5},
    ]

    snap_json = tmp_path / "odds_snapshot.json"
    snap_json.write_text(
        json.dumps([
            {"athlete": "C.J. Stroud", "market": "Total Passing Yards (incl. overtime)", "line": 235.5, "over_american": -112, "under_american": -118},
            {"athlete": "Jonathan Taylor", "market": "Total Rushing Yards (incl. overtime)", "line": 79.5, "over_odds": -115, "under_odds": -115},
            {"athlete": "Michael Pittman", "market": "Total Receiving Yards (incl. overtime)", "line": 58.5, "over_american": -110, "under_american": -120},
            {"athlete": "Tyler Warren", "market": "Total Receptions (incl. overtime)", "line": 4.5, "over_odds": -125, "under_odds": -105},
            {"athlete": "Ka'imi Fairbairn", "market": "Total Kicking Points (incl. overtime)", "line": 7.5, "over_odds": -110, "under_odds": -120},
            {"athlete": "Azeez Al-Shaair", "market": "Total Tackles Plus Assists (incl. overtime)", "line": 7.5, "over_american": -105, "under_american": -125},
        ]),
        encoding="utf-8",
    )

    merged = merge_two_sided_prop_odds(
        board_props=board_props,
        game_meta={"away": "IND", "home": "HOU", "week": 11},
        local_odds_snapshot_path=snap_json,
        allow_live_fetch=False,
    )
    by_ath = {r["athlete"]: r for r in merged}
    for nm in ("C.J. Stroud", "Jonathan Taylor", "Michael Pittman Jr.", "Tyler Warren", "Ka'imi Fairbairn", "Azeez Al-Shaair"):
        assert by_ath[nm]["pricing_status"] == "PRICED_TWO_SIDED"
        assert by_ath[nm]["over_odds"] is not None
        assert by_ath[nm]["under_odds"] is not None
    assert by_ath["Unpriced Player"]["pricing_status"] == "UNPRICED_LINE_ONLY"

    snap_csv = tmp_path / "odds_snapshot.csv"
    snap_csv.write_text(
        "athlete,market,line,over_american,under_american\n"
        "C.J. Stroud,Total Passing Yards (incl. overtime),235.5,-114,-116\n"
        "Jonathan Taylor,Total Rushing Yards (incl. overtime),79.5,-108,-122\n",
        encoding="utf-8",
    )
    merged_csv = merge_two_sided_prop_odds(
        board_props=board_props[:3],
        game_meta={"away": "IND", "home": "HOU", "week": 11},
        local_odds_snapshot_path=snap_csv,
        allow_live_fetch=False,
    )
    assert merged_csv[0]["over_odds"] == -114
    assert merged_csv[1]["under_odds"] == -122
    assert merged_csv[2]["pricing_status"] == "UNPRICED_LINE_ONLY"


def test_check_sim_market_drift_circuit_breaker_flags_extreme_divergences():
    d_pass_bad = check_sim_market_drift_circuit_breaker(255.0, 195.5, "pass_yds")
    assert d_pass_bad["tripped"] is True
    assert d_pass_bad["decision"] == "PASS_SIM_MARKET_DRIFT_CIRCUIT_BREAKER"

    d_pass_ok = check_sim_market_drift_circuit_breaker(230.0, 224.5, "pass_yds")
    assert d_pass_ok["tripped"] is False

    d_rush_bad = check_sim_market_drift_circuit_breaker(42.0, 68.5, "rush_yds")
    assert d_rush_bad["tripped"] is True

    d_rec_bad = check_sim_market_drift_circuit_breaker(8.0, 4.5, "receptions")
    assert d_rec_bad["tripped"] is True

    d_tk_bad = check_sim_market_drift_circuit_breaker(5.1, 8.5, "tackles_plus_assists")
    assert d_tk_bad["tripped"] is True


def test_eval_vec_against_line_enforces_sniper_gate_drift_and_fail_closed():
    rng = np.random.default_rng(77)
    vec_ok = rng.normal(86.0, 12.0, size=4000)

    # 1 alignment signal and prob < 0.68 must fail Prop Sniper Gate
    ev_solo = _eval_vec_against_line(
        vec_ok,
        line=79.5,
        n_sims=4000,
        stat_type="rushing_yards",
        over_odds=-115,
        under_odds=-115,
        alignment_signals_count=1,
    )
    assert ev_solo["publishAllowed"] is False
    assert str(ev_solo["decision"]).startswith("PASS")

    # 2 alignment signals with clear edge passes (rushing_yards is walk-forward eligible)
    vec_strong = rng.normal(93.0, 11.0, size=4000)
    ev_dual = _eval_vec_against_line(
        vec_strong,
        line=79.5,
        n_sims=4000,
        stat_type="rushing_yards",
        over_odds=-112,
        under_odds=-112,
        alignment_signals_count=2,
    )
    assert ev_dual["publishAllowed"] is True

    # Missing under price fails closed
    ev_one_sided = _eval_vec_against_line(
        vec_strong,
        line=79.5,
        n_sims=4000,
        stat_type="rushing_yards",
        over_odds=-112,
        under_odds=None,
        alignment_signals_count=2,
    )
    assert ev_one_sided["publishAllowed"] is False
    assert ev_one_sided["decision"] == "PASS"

    # Huge drift trips circuit breaker even with 2 signals
    vec_drift = rng.normal(125.0, 12.0, size=4000)
    ev_drift = _eval_vec_against_line(
        vec_drift,
        line=75.5,
        n_sims=4000,
        stat_type="rushing_yards",
        over_odds=-110,
        under_odds=-110,
        alignment_signals_count=3,
    )
    assert ev_drift["publishAllowed"] is False
    assert ev_drift["decision"] == "PASS_SIM_MARKET_DRIFT_CIRCUIT_BREAKER"
