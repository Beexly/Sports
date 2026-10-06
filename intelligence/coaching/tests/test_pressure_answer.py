# PROVENANCE — gse-intelligence-build / coaching / tests / test_pressure_answer.py
# Tests for coaching/pressure_answer.py (buildable-systems.md #24).
# Structural tests use a stubbed load_table (hermetic); the BAL 2023–2024
# test pins the REAL computed values and documents a divergence: the corpus
# claims answer_delta_w > 0 "exactly" for BAL 2023–2024, but under the
# implemented definitions (trailing baseline, outcome-proxy pass-rush rank)
# 2024 reproduces 3/3 while 2023 is 0/5. The corpus claim needs the research's
# exact rank/baseline definitions to verify — flagged, not papered over.
"""Tests: pressure-answer adaptation (anti-leakage, top-5 logic, gaps)."""
from __future__ import annotations

import os
import sys
import unittest
from unittest.mock import patch

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", ".."))

from coaching import load as L
from coaching import pressure_answer as pa


def _stub_tables():
    sched = [
        {"season": 2024, "week": 1, "team": "BAL", "opponent": "LV"},
        {"season": 2024, "week": 2, "team": "BAL", "opponent": "KC"},
        {"season": 2024, "week": 3, "team": "BAL", "opponent": "DAL"},
        {"season": 2024, "week": 4, "team": "BAL", "opponent": "BUF"},
    ]
    press = []
    # KC: elite trailing proxy; LV weak; DAL mid; BUF mid.
    prox = {"KC": 0.12, "LV": 0.03, "DAL": 0.06, "BUF": 0.05}
    for wk in (1, 2, 3):
        for team, p in prox.items():
            press.append({"season": 2024, "week": wk, "team": team,
                          "trail4_proxy": p})
    qg = [
        {"season": 2024, "week": 1, "team": "BAL", "quick_game_rate": 0.50},
        {"season": 2024, "week": 2, "team": "BAL", "quick_game_rate": 0.60},
        {"season": 2024, "week": 3, "team": "BAL", "quick_game_rate": 0.70},
        {"season": 2024, "week": 4, "team": "BAL", "quick_game_rate": 0.90},
    ]
    tables = {"schedule.csv": sched, "def_pressure_weekly.csv": press,
              "weekly_tendencies.csv": qg}

    def fake(name, coerce=True):
        return tables[name]
    return patch.object(L, "load_table", side_effect=fake)


class TestAnswerDelta(unittest.TestCase):
    def test_baseline_excludes_current_week(self):
        with _stub_tables():
            # BAL weeks 1-2 prior mean = 0.55; week 3 = 0.70 -> +0.15.
            d = pa.answer_delta(2024, 3, "BAL")
            self.assertAlmostEqual(d, 0.15, places=9)

    def test_needs_minimum_baseline(self):
        with _stub_tables():
            # Week 2 has only 1 prior week (< MIN_BASELINE_WEEKS=2).
            self.assertIsNone(pa.answer_delta(2024, 2, "BAL"))

    def test_missing_week_is_none(self):
        with _stub_tables():
            self.assertIsNone(pa.answer_delta(2024, 9, "BAL"))


class TestTop5(unittest.TestCase):
    def test_ranking_order(self):
        with _stub_tables():
            top = pa._top_rush_teams(2024, 2, n=2)
            self.assertEqual(top, ["KC", "DAL"])

    def test_uses_strictly_prior_weeks(self):
        # Entering week 2, only week-1 proxies are visible.
        with _stub_tables():
            self.assertIn("KC", pa._top_rush_teams(2024, 2, n=1))

    def test_faced_top5_true_false_none(self):
        with _stub_tables():
            # Week 1: no prior proxy exists -> None (never a guess).
            self.assertIsNone(pa.faced_top5_rush(2024, 1, "BAL", n=1))
            # Week 2: BAL faced KC; KC is the top-1 rush entering week 2.
            self.assertTrue(pa.faced_top5_rush(2024, 2, "BAL", n=1))
            # Week 3: BAL faced DAL; DAL is not top-1 -> False.
            self.assertFalse(pa.faced_top5_rush(2024, 3, "BAL", n=1))

    def test_bye_week_is_none(self):
        with _stub_tables():
            self.assertIsNone(pa.faced_top5_rush(2024, 9, "BAL"))


class TestProfile(unittest.TestCase):
    def test_profile_shape(self):
        with _stub_tables():
            p = pa.pressure_answer_profile(2024, "BAL", n=1)
            # Week 3 follows week-2 KC (top-1 rush): delta = 0.70-0.55 = +0.15.
            # Week 2 follows week-1 LV (not top-1): excluded. Week 4 follows
            # week-3 DAL (not top-1): excluded.
            self.assertEqual(p["n_post_rush_weeks"], 1)
            self.assertEqual(p["hit_rate"], 1.0)
            self.assertAlmostEqual(p["mean_answer_delta"], 0.15, places=9)
            self.assertEqual(p["weeks"][0]["vs_top5_rush"], "KC")


class TestRealDataDivergence(unittest.TestCase):
    """Pins the real computed values; documents the corpus divergence."""

    def test_bal_2024_matches_template(self):
        p = pa.pressure_answer_profile(2024, "BAL")
        self.assertEqual(p["n_post_rush_weeks"], 3)
        self.assertEqual(p["hit_rate"], 1.0)

    def test_bal_2023_diverges_from_corpus_claim(self):
        # Corpus claims answer_delta_w > 0 "exactly" for BAL 2023–2024.
        # Under the implemented definitions (trailing baseline, sack+hit
        # proxy rank) 2023 computes 0/5 positive. This test pins the
        # observed value so the divergence is visible, not hidden.
        p = pa.pressure_answer_profile(2023, "BAL")
        self.assertEqual(p["n_post_rush_weeks"], 5)
        self.assertEqual(p["hit_rate"], 0.0)


if __name__ == "__main__":
    unittest.main()
