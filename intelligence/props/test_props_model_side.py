"""
Tests for the measured model side (props_model_side.py).

The play-by-play fixture is built by hand so every expected number is
checkable by arithmetic, not by trusting the code under test:

  Pat Slinger (QB, id ...001), team AAA, 5 games in the window:
    pass_yards by game: [200, 250, 0, 150, 100]
      (game 3 he appears ONLY as a rusher — the zero is a real game in
      his universe, and it must count)
      -> mu 140.0, sigma sqrt(37000/4) = sqrt(9250)
    pass_attempts: [2, 1, 0, 1, 3]; interceptions: [0, 0, 0, 0, 1]
    rush_yards: [0, 0, 7, 0, 0] -> mu 1.4
  Ray Catcher (WR, id ...002), 4 games in the window:
    receiving_yards: [200, 250, 10, 20] -> mu 120.0
    receptions: [2, 1, 1, 1] -> mu 1.25, sigma 0.5 exactly
    tds: [0, 1, 0, 0]
  Tiny Sample (RB, id ...003): 3 games only -> below the floor of 4.
  Steady Eddie (WR, id ...004): receiving_yards 5 in each of 4 games
    -> sigma 0 -> degenerate, withheld.
  Ghost Player (id ...005): on the roster, never appears in a play.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import pandas as pd
import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO_ROOT))

from intelligence.props import props_live_board as live_board  # noqa: E402
from intelligence.props.prop_discrepancy_engine import (  # noqa: E402
    NormalFit,
    devig_two_way,
    fit_for_stat,
)
from intelligence.props.props_model_side import (  # noqa: E402
    MEASURED_CAVEAT,
    MIN_GAMES,
    PBP_COLUMNS,
    estimate_distributions,
    measured_model_provenance,
    player_game_logs,
    resolve_players,
)

PAT, RAY, TINY, EDDIE, GHOST, OTHER_QB = (
    "00-0000001", "00-0000002", "00-0000003", "00-0000004", "00-0000005", "00-0000099",
)
FETCHED_AT = "2026-10-12T21:40:00+00:00"
GAME_ID = 1637432964


def _play(game_id, date, week=1, season=2025, season_type="REG", posteam="AAA", **kw):
    row = {c: None for c in PBP_COLUMNS}
    row.update({
        "game_id": game_id, "game_date": date, "season_type": season_type,
        "week": week, "posteam": posteam, "season": season,
        "passing_yards": 0.0, "pass_touchdown": 0, "receiving_yards": 0.0,
        "rushing_yards": 0.0, "complete_pass": 0, "pass_attempt": 0,
        "rush_attempt": 0, "interception": 0, "field_goal_result": None,
    })
    row.update(kw)
    return row


def _pbp() -> pd.DataFrame:
    g = [
        ("2025_01_BBB_AAA", "2025-09-07", 1),
        ("2025_02_AAA_CCC", "2025-09-14", 2),
        ("2025_03_AAA_DDD", "2025-09-21", 3),
        ("2025_04_EEE_AAA", "2025-09-28", 4),
        ("2025_05_AAA_FFF", "2025-10-05", 5),
    ]
    plays = []
    # g1: Pat throws 120 + 80, both to Ray. Tiny rushes for 30.
    plays.append(_play(*g[0], passer_player_id=PAT, receiver_player_id=RAY,
                       passing_yards=120.0, receiving_yards=120.0,
                       pass_attempt=1, complete_pass=1))
    plays.append(_play(*g[0], passer_player_id=PAT, receiver_player_id=RAY,
                       passing_yards=80.0, receiving_yards=80.0,
                       pass_attempt=1, complete_pass=1))
    plays.append(_play(*g[0], rusher_player_id=TINY, rushing_yards=30.0, rush_attempt=1))
    plays.append(_play(*g[0], passer_player_id=OTHER_QB, receiver_player_id=EDDIE,
                       passing_yards=5.0, receiving_yards=5.0,
                       pass_attempt=1, complete_pass=1))
    # g2: Pat throws a 250-yard TD to Ray. Tiny rushes for 40.
    plays.append(_play(*g[1], passer_player_id=PAT, receiver_player_id=RAY,
                       passing_yards=250.0, receiving_yards=250.0,
                       pass_attempt=1, complete_pass=1, pass_touchdown=1,
                       td_player_id=RAY))
    plays.append(_play(*g[1], rusher_player_id=TINY, rushing_yards=40.0, rush_attempt=1))
    plays.append(_play(*g[1], passer_player_id=OTHER_QB, receiver_player_id=EDDIE,
                       passing_yards=5.0, receiving_yards=5.0,
                       pass_attempt=1, complete_pass=1))
    # g3: Pat appears ONLY as a rusher (7 yards). Ray catches 10 from OTHER_QB.
    plays.append(_play(*g[2], rusher_player_id=PAT, rushing_yards=7.0, rush_attempt=1))
    plays.append(_play(*g[2], passer_player_id=OTHER_QB, receiver_player_id=RAY,
                       passing_yards=10.0, receiving_yards=10.0,
                       pass_attempt=1, complete_pass=1))
    plays.append(_play(*g[2], rusher_player_id=TINY, rushing_yards=50.0, rush_attempt=1))
    plays.append(_play(*g[2], passer_player_id=OTHER_QB, receiver_player_id=EDDIE,
                       passing_yards=5.0, receiving_yards=5.0,
                       pass_attempt=1, complete_pass=1))
    # g4: Pat throws 150 (to a receiver outside the id set). Ray catches 20.
    plays.append(_play(*g[3], passer_player_id=PAT, receiver_player_id="00-0000777",
                       passing_yards=150.0, receiving_yards=150.0,
                       pass_attempt=1, complete_pass=1))
    plays.append(_play(*g[3], passer_player_id=OTHER_QB, receiver_player_id=RAY,
                       passing_yards=20.0, receiving_yards=20.0,
                       pass_attempt=1, complete_pass=1))
    plays.append(_play(*g[3], passer_player_id=OTHER_QB, receiver_player_id=EDDIE,
                       passing_yards=5.0, receiving_yards=5.0,
                       pass_attempt=1, complete_pass=1))
    # g5: Pat throws 60 + 40 complete, then an interception. Ray absent.
    plays.append(_play(*g[4], passer_player_id=PAT, receiver_player_id="00-0000777",
                       passing_yards=60.0, receiving_yards=60.0,
                       pass_attempt=1, complete_pass=1))
    plays.append(_play(*g[4], passer_player_id=PAT, receiver_player_id="00-0000777",
                       passing_yards=40.0, receiving_yards=40.0,
                       pass_attempt=1, complete_pass=1))
    plays.append(_play(*g[4], passer_player_id=PAT, pass_attempt=1, interception=1))
    return pd.DataFrame(plays, columns=[*PBP_COLUMNS, "season"])


def _rosters() -> list:
    rows = [
        ("Pat Slinger", PAT, "AAA", "QB"),
        ("Ray Catcher", RAY, "AAA", "WR"),
        ("Tiny Sample", TINY, "AAA", "RB"),
        ("Steady Eddie", EDDIE, "AAA", "WR"),
        ("Ghost Player", GHOST, "AAA", "WR"),
        ("Dupe Name", "00-0000010", "AAA", "WR"),
        ("Dupe Name", "00-0000011", "BBB", "WR"),
    ]
    df = pd.DataFrame(rows, columns=["full_name", "gsis_id", "team", "position"])
    return [df]


def _logs() -> pd.DataFrame:
    return player_game_logs(_pbp(), {PAT, RAY, TINY, EDDIE, GHOST})


def _estimate(pairs):
    resolved, _ = resolve_players(
        ["Pat Slinger", "Ray Catcher", "Tiny Sample", "Steady Eddie", "Ghost Player"],
        _rosters(),
    )
    return estimate_distributions(_logs(), pairs, resolved)


# ---------------------------------------------------------------------------
# Aggregation: hand-checked numbers
# ---------------------------------------------------------------------------

def test_game_logs_zero_fill_the_rusher_only_game():
    logs = _logs()
    pat = logs[logs["player_id"] == PAT].sort_values("game_date")
    assert len(pat) == 5  # the rusher-only game counts in his universe
    assert pat["pass_yards"].tolist() == [200.0, 250.0, 0.0, 150.0, 100.0]
    assert pat["pass_attempts"].tolist() == [2.0, 1.0, 0.0, 1.0, 3.0]
    assert pat["interceptions"].tolist() == [0.0, 0.0, 0.0, 0.0, 1.0]
    assert pat["rush_yards"].tolist() == [0.0, 0.0, 7.0, 0.0, 0.0]


def test_rush_rec_yards_is_the_per_game_sum_of_its_series():
    logs = _logs()
    for _, row in logs.iterrows():
        assert row["rush_rec_yards"] == row["rush_yards"] + row["receiving_yards"]


def test_estimator_mu_sigma_match_hand_arithmetic():
    registry, coverage, _ = _estimate([("Pat Slinger", "pass_yards")])
    cov = coverage[0]
    assert cov["status"] == "measured"
    assert cov["n_games"] == 5
    assert cov["mu"] == pytest.approx(140.0)
    assert cov["sigma"] == pytest.approx(9250.0 ** 0.5)  # sample sd, ddof=1
    assert cov["first_game_date"] == "2025-09-07"
    assert cov["last_game_date"] == "2025-10-05"
    assert cov["seasons"] == [2025]
    entry = registry[("pat slinger", "pass_yards")]
    assert entry["mu"] == pytest.approx(140.0)
    assert entry["sigma"] == pytest.approx(9250.0 ** 0.5)
    assert entry["sample"]["n_games"] == 5
    assert entry["sample"]["derivation"] == "sum(passing_yards) as passer"
    assert "measured" in entry["params_source"]


def test_stat_mapping_receptions_and_tds_are_exact_counts():
    registry, coverage, _ = _estimate(
        [("Ray Catcher", "receptions"), ("Ray Catcher", "tds"),
         ("Ray Catcher", "receiving_yards")]
    )
    by_stat = {c["stat"]: c for c in coverage}
    assert by_stat["receptions"]["mu"] == pytest.approx(1.25)
    assert by_stat["receptions"]["sigma"] == pytest.approx(0.5)
    assert by_stat["tds"]["mu"] == pytest.approx(0.25)
    assert by_stat["receiving_yards"]["mu"] == pytest.approx(120.0)
    assert ("ray catcher", "receptions") in registry


# ---------------------------------------------------------------------------
# The floor and the other withholding reasons
# ---------------------------------------------------------------------------

def test_sample_floor_withholds_and_says_so():
    registry, coverage, missing = _estimate([("Tiny Sample", "rush_yards")])
    assert ("tiny sample", "rush_yards") not in registry
    cov = coverage[0]
    assert cov["status"] == "insufficient_sample"
    assert cov["n_games"] == 3
    # The withheld numbers are shown in coverage, labelled by their status.
    assert cov["mu"] == pytest.approx(40.0)
    note = missing[("tiny sample", "rush_yards")]
    assert "insufficient_sample" in note and "n=3" in note
    assert f"minimum {MIN_GAMES}" in note


def test_zero_appearances_is_insufficient_not_invented():
    registry, coverage, _ = _estimate([("Ghost Player", "receiving_yards")])
    assert registry == {}
    assert coverage[0]["status"] == "insufficient_sample"
    assert coverage[0]["n_games"] == 0
    assert coverage[0]["mu"] is None


def test_zero_variance_is_degenerate_and_withheld():
    registry, coverage, missing = _estimate([("Steady Eddie", "receiving_yards")])
    assert registry == {}
    assert coverage[0]["status"] == "degenerate_sample"
    assert coverage[0]["sigma"] == pytest.approx(0.0)
    assert "degenerate_sample" in missing[("steady eddie", "receiving_yards")]


def test_unmappable_stat_is_reported_not_estimated():
    registry, coverage, missing = _estimate([("Pat Slinger", "targets")])
    assert registry == {}
    assert coverage[0]["status"] == "unmappable"
    assert "no nflverse play-by-play derivation" in missing[("pat slinger", "targets")]


def test_resolve_players_exact_ambiguous_and_missing():
    resolved, unresolved = resolve_players(
        ["Pat Slinger", "Dupe Name", "Mystery Man"], _rosters()
    )
    assert resolved == {"Pat Slinger": PAT}
    assert sorted(unresolved) == ["Dupe Name", "Mystery Man"]
    registry, coverage, missing = estimate_distributions(
        _logs(), [("Mystery Man", "pass_yards")], resolved
    )
    assert coverage[0]["status"] == "player_unresolved"
    assert "could not be resolved" in missing[("mystery man", "pass_yards")]


def test_week_cap_and_postseason_are_excluded_from_the_window():
    plays = [
        _play("2026_05_AAA_BBB", "2026-10-04", season=2026, week=5,
              passer_player_id=PAT, passing_yards=50.0, pass_attempt=1, complete_pass=1),
        _play("2026_06_AAA_BBB", "2026-10-11", season=2026, week=6,
              passer_player_id=PAT, passing_yards=999.0, pass_attempt=1, complete_pass=1),
        _play("2025_19_AAA_BBB", "2026-01-11", season=2025, week=19, season_type="POST",
              passer_player_id=PAT, passing_yards=888.0, pass_attempt=1, complete_pass=1),
    ]
    logs = player_game_logs(pd.DataFrame(plays, columns=[*PBP_COLUMNS, "season"]), {PAT})
    assert len(logs) == 1
    assert logs.iloc[0]["pass_yards"] == 50.0


# ---------------------------------------------------------------------------
# The join: measured parameters through the engine's own math
# ---------------------------------------------------------------------------

def _record(player, stat, line, over=-110, under=-110):
    shin = devig_two_way(over, under, method="shin")
    mult = devig_two_way(over, under, method="multiplicative")
    return {
        "game_matchup_id": GAME_ID, "prop_matchup_id": 999000111,
        "player": player, "stat": stat, "stat_raw": stat, "line": line,
        "over_price": over, "under_price": under, "book": "pinnacle",
        "status": "open", "cutoff_at": "2026-10-13T00:15:00Z",
        "devig": {
            "booksum": shin["booksum"],
            "shin": {"fair_over": shin["fair"][0], "fair_under": shin["fair"][1], "z": shin["z"]},
            "multiplicative": {"fair_over": mult["fair"][0], "fair_under": mult["fair"][1]},
        },
    }


def test_measured_pair_gets_a_model_side_with_its_sample():
    pairs = [("Pat Slinger", "pass_yards"), ("Tiny Sample", "rush_yards"),
             ("Ray Catcher", "tds")]
    registry, coverage, missing = _estimate(pairs)
    records = [
        _record("Pat Slinger", "pass_yards", 180.5),
        _record("Tiny Sample", "rush_yards", 44.5),
        _record("Ray Catcher", "tds", 0.5),
    ]
    with_model, priced_only = live_board.build_board_rows(
        records, registry, FETCHED_AT, missing_notes=missing
    )
    assert len(with_model) == 1
    row = with_model[0]
    model = row["model"]
    assert model["mu"] == pytest.approx(140.0)
    assert model["sample"]["n_games"] == 5
    assert "nflverse" in model["params_source"]
    # The probability is the ENGINE's fit at the measured parameters.
    fit = fit_for_stat("pass_yards", 140.0, 9250.0 ** 0.5)
    normal = NormalFit(140.0, 9250.0 ** 0.5)
    assert model["family"] == fit.family
    assert model["p_over"] == pytest.approx(float(fit.p_over(180.5)), abs=1e-12)
    assert model["p_over_normal_basis"] == pytest.approx(float(normal.p_over(180.5)), abs=1e-12)
    assert row["comparison"]["model_minus_fair_over"] == pytest.approx(
        model["p_over"] - 0.5, abs=1e-9
    )

    by_player = {r["player"]: r for r in priced_only}
    # Below the floor: priced-only, reason names the withheld sample.
    assert "insufficient_sample" in by_player["Tiny Sample"]["model_note"]
    # Measured but the engine has no family for anytime-TD totals: the
    # engine's own cannot-fit degradation, not a silent pass.
    assert by_player["Ray Catcher"]["model"] is None
    assert "cannot fit" in by_player["Ray Catcher"]["model_note"]


def test_measured_artifact_keeps_the_stamps_and_bans_stakes():
    pairs = [("Pat Slinger", "pass_yards"), ("Tiny Sample", "rush_yards")]
    registry, coverage, missing = _estimate(pairs)
    game_board = {
        "game_matchup_id": GAME_ID, "teams": ["Los Angeles Rams", "Buffalo Bills"],
        "start_time": "2026-10-13T00:15:00Z", "specials_seen": 2, "skipped": 0,
        "records": [_record("Pat Slinger", "pass_yards", 180.5),
                    _record("Tiny Sample", "rush_yards", 44.5)],
    }
    artifact = live_board.build_artifact(
        [game_board], registry, FETCHED_AT,
        missing_notes=missing, caveat=MEASURED_CAVEAT,
        model_provenance=measured_model_provenance(coverage),
    )
    assert artifact["label"] == "DIAGNOSTIC"
    assert artifact["is_pick"] is False
    assert artifact["is_edge_claim"] is False
    assert artifact["rvc_cleared"] is False
    assert "residual-versus-close has NOT cleared" in artifact["caveat"]
    assert "MEASURED" in artifact["caveat"]
    assert artifact["counts"] == {
        "priced_rows": 2, "rows_with_model": 1, "priced_only_rows": 1,
    }
    prov = artifact["provenance"]["model_distributions"]
    assert prov["pairs_evaluated"] == 2
    assert prov["pairs_measured"] == 1
    assert prov["min_games"] == MIN_GAMES

    def walk(node):
        if isinstance(node, dict):
            for k, v in node.items():
                yield k
                yield from walk(v)
        elif isinstance(node, list):
            for item in node:
                yield from walk(item)

    for key in walk(artifact):
        assert "kelly" not in key.lower()
        assert "stake" not in key.lower()
    assert "kelly" not in json.dumps(artifact).lower()
