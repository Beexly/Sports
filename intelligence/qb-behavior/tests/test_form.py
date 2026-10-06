# PROVENANCE: tests for qb_behavior/form.py — implements
# corpus-intelligence/deep/c01/buildable-systems.md #1 (per-QB rolling
# EPA/dropback). The anti-leakage test is the spec's acceptance gate
# (test_snap_share_excludes_the_current_week).
"""Tests: rolling form is trailing-only, trade-following, windowed, gated."""
from __future__ import annotations

import os
import sys
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from qb_behavior.form import (QBForm, WINDOW_GAMES, form_ahead_of, form_for,
                              rolling_form, to_weekly_increments)


def _row(qb, season, week, db, epa, team="X"):
    return {"qb_id": qb, "season": season, "week": week,
            "db": db, "epa": epa, "team": team}


class TestAntiLeakage(unittest.TestCase):
    def test_current_week_excluded(self):
        # A monster Week 5 must NOT appear in the Week 5 form.
        rows = [_row("qb1", 2024, w, 35, 3.5) for w in range(1, 5)]
        rows.append(_row("qb1", 2024, 5, 40, 40.0))  # +1.0 EPA/db monster game
        t = rolling_form(rows, cumulative=False)
        f = t[("qb1", 2024, 5)]
        self.assertAlmostEqual(f.form_epa, 3.5 * 4 / (35 * 4), places=9)
        self.assertEqual(f.n_games, 4)
        # ...but it IS in the Week 6 form.
        rows.append(_row("qb1", 2024, 6, 35, 0.0))
        t = rolling_form(rows, cumulative=False)
        f6 = t[("qb1", 2024, 6)]
        self.assertAlmostEqual(f6.form_epa, (3.5 * 4 + 40.0) / (35 * 4 + 40), places=9)

    def test_first_game_has_no_form(self):
        t = rolling_form([_row("qb1", 2024, 1, 35, 3.5)], cumulative=False)
        f = t[("qb1", 2024, 1)]
        self.assertIsNone(f.form_epa)
        self.assertEqual(f.n_games, 0)
        self.assertIsNotNone(f.gap_note)


class TestTradeFollowing(unittest.TestCase):
    def test_team_change_continues_series(self):
        rows = ([_row("qb1", 2024, w, 35, 3.5, team="A") for w in range(1, 9)]
                + [_row("qb1", 2024, w, 35, -3.5, team="B") for w in range(9, 14)])
        t = rolling_form(rows, min_db=10, cumulative=False)
        f = t[("qb1", 2024, 13)]
        # All 12 prior games count, both teams: (8*3.5 - 4*3.5) / (12*35).
        self.assertEqual(f.n_games, 12)
        self.assertAlmostEqual(f.form_epa, 14.0 / 420.0, places=9)


class TestWindow(unittest.TestCase):
    def test_sixteen_game_window(self):
        rows = [_row("qb1", 2024, w, 35, 7.0) for w in range(1, 11)]
        rows += [_row("qb1", 2024, w, 35, -7.0) for w in range(11, 26)]
        t = rolling_form(rows, min_db=10, cumulative=False)
        f = t[("qb1", 2024, 25)]
        # Only the last 16 games (weeks 9..24) count: 2 @ +7.0, 14 @ -7.0.
        self.assertEqual(f.n_games, WINDOW_GAMES)
        self.assertAlmostEqual(f.form_epa, (2 * 7.0 - 14 * 7.0) / (16 * 35), places=9)

    def test_season_carryover(self):
        rows = [_row("qb1", 2023, w, 35, 3.5) for w in range(15, 19)]
        rows += [_row("qb1", 2024, 1, 35, 3.5)]
        t = rolling_form(rows, min_db=10, cumulative=False)
        f = t[("qb1", 2024, 1)]
        self.assertEqual(f.n_games, 4)  # 2023 weeks 15-18 carry over
        self.assertAlmostEqual(f.form_epa, 0.1, places=9)


class TestGating(unittest.TestCase):
    def test_below_min_dropbacks_withheld(self):
        rows = [_row("qb1", 2024, w, 10, 5.0) for w in range(1, 6)]
        t = rolling_form(rows, min_db=100, cumulative=False)
        f = t[("qb1", 2024, 5)]
        self.assertIsNone(f.form_epa)
        self.assertIn("100", f.gap_note or "")

    def test_availability_scales_with_workload(self):
        rows = [_row("qb1", 2024, w, 35, 3.5) for w in range(1, 18)]
        t = rolling_form(rows, cumulative=False)
        full = t[("qb1", 2024, 17)]
        self.assertEqual(full.availability, 1.0)
        rows2 = [_row("qb2", 2024, w, 10, 1.0) for w in range(1, 18)]
        t2 = rolling_form(rows2, cumulative=False)
        part = t2[("qb2", 2024, 17)]
        self.assertLess(part.availability, 0.5)
        self.assertGreater(part.availability, 0.0)


class TestLookup(unittest.TestCase):
    def test_form_for_missing_returns_none(self):
        t = rolling_form([_row("qb1", 2024, 1, 35, 3.5)], cumulative=False)
        self.assertIsNone(form_for("nope", 2024, 1, t))
        self.assertIsInstance(form_for("qb1", 2024, 1, t), QBForm)

    def test_form_ahead_of_future_week(self):
        rows = [_row("qb1", 2024, w, 35, 3.5) for w in range(1, 5)]
        f = form_ahead_of("qb1", 2024, 5, rows, min_db=10, cumulative=False)
        self.assertIsNotNone(f)
        self.assertAlmostEqual(f.form_epa, 0.1, places=9)
        self.assertEqual(f.n_games, 4)
        self.assertEqual(f.week, 5)
        # Unknown QB -> None, never a guess.
        self.assertIsNone(form_ahead_of("nope", 2024, 5, rows, cumulative=False))


class TestCumulativeGrain(unittest.TestCase):
    """qb_weekly.csv grain: season-to-date db + mean EPA/db, differenced."""

    def _cum(self, qb, season, week, db_cum, epa_mean):
        return {"qb_id": qb, "season": season, "week": week,
                "db": db_cum, "epa": epa_mean}

    def test_differencing_recovers_weekly(self):
        # Week1: 35 db @ +0.20; Week2 cum: 70 db @ +0.10 -> week2 = 35 db, 0 EPA.
        rows = [self._cum("qb1", 2024, 1, 35, 0.20),
                self._cum("qb1", 2024, 2, 70, 0.10),
                self._cum("qb1", 2024, 3, 105, 0.10)]
        inc = to_weekly_increments(rows)
        by_w = {d["week"]: d for d in inc}
        self.assertAlmostEqual(by_w[1]["db"], 35)
        self.assertAlmostEqual(by_w[1]["epa"], 7.0)
        self.assertAlmostEqual(by_w[2]["db"], 35)
        self.assertAlmostEqual(by_w[2]["epa"], 0.0, places=9)

    def test_rolling_form_on_cumulative_grain(self):
        rows = [self._cum("qb1", 2024, w, 35 * w, 0.10) for w in range(1, 5)]
        t = rolling_form(rows, min_db=10)  # cumulative=True (default)
        f = t[("qb1", 2024, 4)]
        # Weeks 1..3 prior: 105 db, total EPA 10.5 -> 0.10/db.
        self.assertAlmostEqual(f.form_epa, 0.10, places=9)
        self.assertEqual(f.n_dropbacks, 105)

    def test_first_appearance_differences_against_zero(self):
        # QB below the 50-db floor in weeks 1-2, appears week 3 with 60 cum db.
        rows = [self._cum("qb2", 2024, 3, 60, 0.05),
                self._cum("qb2", 2024, 4, 95, 0.05)]
        inc = to_weekly_increments(rows)
        by_w = {d["week"]: d for d in inc}
        self.assertAlmostEqual(by_w[3]["db"], 60)
        self.assertAlmostEqual(by_w[3]["epa"], 3.0)


if __name__ == "__main__":
    unittest.main()
