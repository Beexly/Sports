"""Tests for the 2026-11-03 football-metrics batch.

Covers:
  * intelligence/vision/polygon_zone_breach.py   (SiteGuard point-in-polygon)
  * intelligence/coaching/drive_dire_situations.py (@Timo_NFL Dire Situations)
  * intelligence/coaching/pgwe_luck_audit.py       (@sfdata9ers PGWE luck audit)
  * intelligence/coaching/schedule_cleaned_epa.py  (@HaydenWinks schedule-cleaned EPA)
  * intelligence/coaching/redzone.py               (2-minute trust + EZ regression)
  * intelligence/coaching/pressure_answer.py       (ARBY pressure survival index)

Every metric test runs against synthetic frames with known answers, so a pass is
evidence about the code rather than about the data. One real-data smoke test runs
against the on-disk 2026 PBP and is skipped when that file is absent.
"""

from __future__ import annotations

import math
from pathlib import Path

import pandas as pd
import pytest

ROOT = Path(__file__).resolve().parents[1]

from intelligence.vision.polygon_zone_breach import (  # noqa: E402
    compute_zone_void_breach,
    point_in_polygon,
    point_in_polygon_raycast,
    polygon_area,
    rect_zone,
    winding_number,
)
from intelligence.coaching.drive_dire_situations import (  # noqa: E402
    compute_dire_situation_drive_efficiency,
)
from intelligence.coaching.pgwe_luck_audit import compute_pgwe_luck_delta  # noqa: E402
from intelligence.coaching.schedule_cleaned_epa import (  # noqa: E402
    compute_schedule_adjusted_epa,
    detect_paired_adot_drop,
)
from intelligence.coaching.redzone import (  # noqa: E402
    compute_two_minute_trust_and_ez_regression,
)
from intelligence.coaching.pressure_answer import (  # noqa: E402
    compute_arby_pressure_survival_index,
)

SQUARE = [(0.0, 0.0), (10.0, 0.0), (10.0, 10.0), (0.0, 10.0)]


# --------------------------------------------------------------------------
# polygon zone breach
# --------------------------------------------------------------------------
def test_raycast_inside_and_outside():
    assert point_in_polygon_raycast((5.0, 5.0), SQUARE) is True
    assert point_in_polygon_raycast((15.0, 5.0), SQUARE) is False
    assert point_in_polygon_raycast((5.0, -1.0), SQUARE) is False


def test_boundary_point_counts_as_inside():
    assert point_in_polygon_raycast((0.0, 5.0), SQUARE) is True
    assert point_in_polygon_raycast((10.0, 10.0), SQUARE) is True


def test_winding_number_agrees_on_convex_polygon():
    assert winding_number((5.0, 5.0), SQUARE) != 0
    assert winding_number((15.0, 5.0), SQUARE) == 0
    # reversed winding flips the sign but not the in/out verdict
    rev = list(reversed(SQUARE))
    assert winding_number((5.0, 5.0), rev) == -winding_number((5.0, 5.0), SQUARE)


def test_both_methods_agree():
    assert point_in_polygon((5.0, 5.0), SQUARE, method="both") is True
    assert point_in_polygon((20.0, 20.0), SQUARE, method="both") is False


def test_polygon_area_is_shoelace():
    assert polygon_area(SQUARE) == pytest.approx(100.0)
    tri = [(0.0, 0.0), (4.0, 0.0), (0.0, 3.0)]
    assert polygon_area(tri) == pytest.approx(6.0)


def test_degenerate_polygon_has_no_area_and_no_inside():
    assert polygon_area([(0.0, 0.0), (1.0, 1.0)]) == 0.0
    assert point_in_polygon_raycast((0.5, 0.5), [(0.0, 0.0), (1.0, 1.0)]) is False


def test_void_breach_flags_only_empty_zones():
    zones = {
        "flat_left": rect_zone(0, 20, 0, 25),
        "seam_middle": rect_zone(40, 60, 15, 35),
    }
    players = {"nickel": (10.0, 12.0), "free_safety": (95.0, 27.0)}
    out = compute_zone_void_breach(players, zones)
    assert out["breached_zones"] == ["seam_middle"]
    assert out["zones"]["flat_left"]["defenders_inside"] == 1
    assert out["zones"]["seam_middle"]["void"] is True
    assert out["total_void_area_sq_yds"] == pytest.approx(20 * 20)
    assert 0.0 < out["void_fraction"] < 1.0


def test_void_breach_accepts_bare_point_iterable():
    out = compute_zone_void_breach([(5.0, 5.0)], {"box": SQUARE})
    assert out["zones"]["box"]["defenders_inside"] == 1
    assert out["breached_zones"] == []


def test_void_breach_expected_defenders_threshold():
    out = compute_zone_void_breach(
        {"cb": (5.0, 5.0)}, {"box": SQUARE}, expected_defenders_per_zone=2
    )
    assert out["breached_zones"] == ["box"]


def test_zone_breach_is_deterministic():
    zones = {"a": rect_zone(0, 30, 0, 20)}
    players = {"p1": (5.0, 5.0), "p2": (25.0, 15.0)}
    first = compute_zone_void_breach(players, zones)
    second = compute_zone_void_breach(players, zones)
    assert first == second


# --------------------------------------------------------------------------
# Dire Situations (@Timo_NFL)
# --------------------------------------------------------------------------
def _pbp_row(**kw):
    base = {
        "game_id": "2026_01_AAA_BBB",
        "play_id": 1,
        "week": 1,
        "posteam": "AAA",
        "defteam": "BBB",
        "down": 1,
        "ydstogo": 10,
        "yardline_100": 75,
        "qtr": 1,
        "half_seconds_remaining": 1800,
        "drive": 1,
        "epa": 0.0,
        "pass_attempt": 0,
        "rush_attempt": 1,
        "sack": 0,
        "qb_hit": 0,
        "air_yards": None,
        "receiver_player_name": None,
        "score_differential": 0,
        "posteam_score_post": 0,
        "defteam_score_post": 0,
        "play_type": "run",
        "touchdown": 0,
    }
    base.update(kw)
    return base


def _synthetic_dire_frame():
    rows = []
    pid = 0
    for team in ("AAA", "BBB"):
        for drive in range(1, 21):
            pid += 1
            # dire drive: 3rd & 8 conversion situation
            rows.append(_pbp_row(play_id=pid, posteam=team, drive=drive, down=3, ydstogo=8,
                                 yardline_100=60, epa=0.35))
            pid += 1
            rows.append(_pbp_row(play_id=pid, posteam=team, drive=drive, down=4, ydstogo=2,
                                 yardline_100=40, epa=0.20))
            pid += 1
            rows.append(_pbp_row(play_id=pid, posteam=team, drive=drive, down=1, ydstogo=10,
                                 yardline_100=25, epa=0.10))
            pid += 1
            # normal drive
            rows.append(_pbp_row(play_id=pid, posteam=team, drive=100 + drive, down=1, ydstogo=10,
                                 yardline_100=75, epa=0.0))
            pid += 1
            rows.append(_pbp_row(play_id=pid, posteam=team, drive=100 + drive, down=2, ydstogo=6,
                                 yardline_100=65, epa=0.05))
    return pd.DataFrame(rows)


def test_dire_situations_emits_rates_and_respects_gate():
    out = compute_dire_situation_drive_efficiency(_synthetic_dire_frame())
    assert out["metric"] == "dire_situation_drive_efficiency"
    assert out["plays_considered"] > 0
    teams = {t["team"]: t for t in out["teams"]}
    assert "AAA" in teams
    row = teams["AAA"]
    assert row["dire_drives"] >= 15
    assert 0.0 <= row["dire_score_rate"] <= 1.0
    assert isinstance(row["dire_epa_per_drive"], float)


def test_dire_situations_rejects_empty_frame():
    # the module validates columns and raises rather than returning an error dict
    with pytest.raises(ValueError):
        compute_dire_situation_drive_efficiency(pd.DataFrame())


# --------------------------------------------------------------------------
# PGWE luck audit (@sfdata9ers)
# --------------------------------------------------------------------------
def _synthetic_wp_frame():
    rows = []
    pid = 0
    for team, wins in (("AAA", 4), ("BBB", 1)):
        for g in range(1, 8):
            pid += 1
            rows.append(_pbp_row(
                play_id=pid, game_id=f"2026_0{g}_AAA_BBB", week=g, posteam=team,
                drive=g, wp=0.75 if team == "AAA" else 0.40, epa=0.2 if team == "AAA" else -0.15,
                posteam_score_post=wins, defteam_score_post=0,
            ))
    return pd.DataFrame(rows)


def test_pgwe_luck_audit_reports_luck_delta():
    out = compute_pgwe_luck_delta(_synthetic_wp_frame())
    assert out["metric"] == "pgwe_luck_delta"
    assert out["games_graded"] > 0
    teams = {t["team"]: t for t in out["teams"]}
    assert set(teams) == {"AAA", "BBB"}
    for row in teams.values():
        assert row["luck_delta_wins"] == pytest.approx(
            row["actual_wins"] - row["earned_wins_pgwe"], abs=1e-6
        )


def test_pgwe_rejects_empty():
    with pytest.raises(ValueError):
        compute_pgwe_luck_delta(pd.DataFrame())


# --------------------------------------------------------------------------
# Schedule-cleaned EPA (@HaydenWinks)
# --------------------------------------------------------------------------
def test_schedule_cleaned_epa_shrinks_toward_league():
    d = _synthetic_dire_frame().copy()
    d["epa"] = 0.30
    out = compute_schedule_adjusted_epa(d)
    assert out["metric"] == "schedule_adjusted_epa"
    assert out["ridge_lambda"] == pytest.approx(15.0)
    # with every play at 0.30 EPA the league mean must land on 0.30
    assert out["league_epa_per_play"] == pytest.approx(0.30, abs=1e-6)
    for row in out["teams"]:
        assert row["raw_epa_per_play"] == pytest.approx(0.30, abs=1e-6)
        assert math.isfinite(row["schedule_cleaned_epa_per_play"])
        # cleaning moves the number only by the opponent allowance it faces
        assert row["schedule_cleaned_epa_per_play"] == pytest.approx(
            row["raw_epa_per_play"] - row["opponent_epa_allowance_faced"], abs=1e-6
        )


def test_paired_adot_drop_flags_a_real_drop():
    d = _synthetic_dire_frame().copy()
    d["pass_attempt"] = 1
    d["rush_attempt"] = 0
    d["receiver_player_name"] = "WR One"
    d["air_yards"] = 12.0
    d.loc[d["week"] <= 3, "air_yards"] = 16.0
    out = detect_paired_adot_drop(d, drop_threshold=1.0)
    assert out["metric"] == "paired_adot_drop"
    assert isinstance(out["flags"], list)


# --------------------------------------------------------------------------
# 2-minute trust index + EZ regression (@boxscorescout)
# --------------------------------------------------------------------------
def _synthetic_two_minute_frame():
    rows = []
    pid = 0
    for team in ("AAA", "BBB"):
        for week in range(1, 8):
            for i in range(10):
                pid += 1
                rows.append(_pbp_row(
                    play_id=pid, posteam=team, week=week, qtr=2, half_seconds_remaining=90 - i,
                    down=1, ydstogo=10, yardline_100=70, drive=week,
                    pass_attempt=1, rush_attempt=0, air_yards=12.0,
                    receiver_player_name=f"WR{i % 3}",
                ))
    return pd.DataFrame(rows)


def test_two_minute_trust_index_is_component_mean():
    out = compute_two_minute_trust_and_ez_regression(_synthetic_two_minute_frame())
    assert out["metric"] == "two_minute_trust_and_ez_regression"
    assert out["team_weeks_observed"] == 14
    teams = out["team_table"]
    assert set(teams) == {"AAA", "BBB"}
    row = teams["AAA"]
    assert row["pass_rate_2min"] == pytest.approx(1.0)
    assert row["trust_index"] == pytest.approx(
        0.5 * row["pass_rate_2min"] + 0.5 * row["past_sticks_rate"], abs=1e-4
    )


def test_two_minute_gate_excludes_thin_team_weeks():
    d = _synthetic_two_minute_frame()
    d.loc[d["posteam"] == "BBB", "play_id"] = d.loc[d["posteam"] == "BBB", "play_id"] + 1000
    thin = d[(d["posteam"] == "BBB") & (d["week"] > 1)].head(3)
    out = compute_two_minute_trust_and_ez_regression(thin)
    assert out["team_weeks_publishable"] == 0


def test_ez_regression_shrinks_small_samples_upward():
    d = _synthetic_two_minute_frame().copy()
    d["yardline_100"] = 12.0
    out = compute_two_minute_trust_and_ez_regression(d)
    assert out["ez_receivers_observed"] > 0
    for row in out["ez_regression"]:
        assert row["shrink_k"] == pytest.approx(25.0)
        assert row["direction"] in {"up", "down"}
        assert 0.0 <= row["shrunk_ez_share"] <= 1.0


def test_two_minute_rejects_missing_columns():
    out = compute_two_minute_trust_and_ez_regression(pd.DataFrame({"week": [1]}))
    assert "error" in out


# --------------------------------------------------------------------------
# ARBY pressure survival index (@PattonAnalytics)
# --------------------------------------------------------------------------
def _synthetic_pressure_frame(n_drives: int = 120):
    rows = []
    pid = 0
    for g in range(n_drives):
        team = "AAA" if g % 2 == 0 else "BBB"
        week = 1 + (g % 7)
        for k in range(1, 5):
            pid += 1
            rows.append(_pbp_row(
                play_id=pid, game_id=f"2026_{week:02d}_{team}_BBB", week=week, posteam=team,
                drive=g, down=min(k, 4), ydstogo=max(2, 11 - k), yardline_100=60 - k,
                pass_attempt=1, rush_attempt=0,
                sack=1 if (g % 5 == 0 and k == 2) else 0,
                qb_hit=1 if (g % 7 == 0 and k == 3) else 0,
                epa=-0.8 if (g % 5 == 0 and k == 2) else 0.1,
            ))
    return pd.DataFrame(rows)


def test_arby_index_splits_walk_forward():
    out = compute_arby_pressure_survival_index(_synthetic_pressure_frame(), train_through_week=3)
    assert out["metric"] == "arby_pressure_survival_index"
    assert "error" not in out, out
    assert out["train_rows"] > 0 and out["test_rows"] > 0
    assert len(out["team_index"]) == 2
    for row in out["team_index"]:
        assert row["arby_index"] == pytest.approx(
            row["observed_pressure_rate"] - row["expected_pressure_rate"], abs=2e-4
        )
        assert row["publishable"] is True


def test_arby_survival_curve_is_monotone_decreasing():
    out = compute_arby_pressure_survival_index(_synthetic_pressure_frame(), train_through_week=3)
    curve = out["survival_curve"]
    assert len(curve) >= 2
    survivals = [p["sack_avoidance_survival"] for p in curve]
    assert all(0.0 <= s <= 1.0 for s in survivals)
    for a, b in zip(survivals, survivals[1:]):
        assert b <= a + 1e-9
    assert all(p["at_risk"] >= 30 for p in curve)


def test_arby_insufficient_split_is_reported_not_raised():
    out = compute_arby_pressure_survival_index(_synthetic_pressure_frame(20), train_through_week=6)
    assert "error" in out
    assert "train_rows" in out and "test_rows" in out


# --------------------------------------------------------------------------
# real-data smoke test
# --------------------------------------------------------------------------
REAL_PBP = ROOT / "intelligence" / "coaching" / "data" / "play_by_play_2026.parquet"


@pytest.mark.skipif(not REAL_PBP.exists(), reason="2026 PBP parquet not on disk")
def test_real_2026_pbp_smoke():
    d = pd.read_parquet(REAL_PBP)
    dire = compute_dire_situation_drive_efficiency(d)
    assert dire["drives_considered"] > 100
    arby = compute_arby_pressure_survival_index(d, train_through_week=3)
    assert "error" not in arby
    assert len(arby["team_index"]) >= 20
    two_min = compute_two_minute_trust_and_ez_regression(d)
    assert two_min["team_weeks_observed"] > 100
    assert two_min["team_weeks_publishable"] > 0
