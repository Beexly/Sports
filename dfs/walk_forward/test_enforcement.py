#!/usr/bin/env python3
"""Enforcement tests for the location lock and the conformal NO_BET rules.

Run: python dfs/walk_forward/test_enforcement.py
"""
import math
import os
import random
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import conformal_wrappers as C  # noqa: E402


def _row(spread, margin, stamp="settled", week=1):
    return {
        "spread_line": spread,
        "margin": margin,
        "pit_stamp": stamp,
        "season": 2020,
        "week": week,
        "total_line": 44.0,
        "game_id": "t-%s-%s" % (week, stamp),
    }


class TestLocationLock(unittest.TestCase):
    def test_center_equals_spread_line(self):
        for s in (-14.0, -3.5, 0.0, 7.0, 13.5):
            mu = C.locked_center(s)
            self.assertLess(abs(mu - s), 1e-12)

    def test_emitted_intervals_stay_on_the_lock(self):
        rows = [_row(3.5, 3.5 + random.gauss(0, 1), week=i) for i in range(40)]
        res = C.score_rows(rows, min_prior=10)
        self.assertLess(res["max_abs_mean_shift"], 1e-12)
        self.assertTrue(res["location_lock_verified"])

    def test_bsts_json_refused_mean_shift(self):
        path = os.path.join(HERE, "..", "..", "research", "bsts-residual-scale-2026-10-15.json")
        path = os.path.normpath(path)
        if not os.path.exists(path):
            self.skipTest("bsts json not beside the worktree research dir")
        import json
        doc = json.load(open(path, encoding="utf-8"))
        lock = doc["location_lock"]
        self.assertLess(lock["max_abs_mean_shift"], 1e-12)
        self.assertTrue(lock["lock_verified"])
        self.assertGreater(lock["rows_where_bsts_level_trend_shift_refused"], 0)
        self.assertTrue(doc["decision"]["terminal_refusal"])
        self.assertGreaterEqual(doc["primary_zero_mean_bsts_scale_centered"]["delta_vs_baseline_7_154021"], 0.0)


class TestConformalRules(unittest.TestCase):
    def test_n5_quantile_is_no_bet_not_clamped(self):
        scores = [0.2, 0.4, 0.6, 0.8, 1.0]
        q = C.empirical_quantile(scores, 0.90)
        self.assertIsNone(q)
        self.assertNotEqual(q, max(scores))
        k = C.quantile_rank(5, 0.90)
        self.assertIsNone(k)
        self.assertEqual(C.quantile_rank(5, 0.90), None)

    def test_mondrian_n5_emits_no_bet(self):
        # one stratum (|spread|<3.5), exactly 5 prior residuals when the 6th is scored
        rows = [_row(1.0, 1.0 + 0.1 * i, week=i) for i in range(6)]
        res = C.score_rows(rows, min_prior=0)
        # row 0 has 0 priors; rows with stratum n<=5 are NO_BET
        self.assertEqual(res["wrappers"]["mondrian"]["n_bet"], 0)
        self.assertGreater(res["wrappers"]["mondrian"]["n_no_bet"], 0)

    def test_future_and_unstamped_fail_closed(self):
        self.assertFalse(C.pit_stamp_ok(_row(1, 2, stamp="future"), 0, 5))
        self.assertFalse(C.pit_stamp_ok(_row(1, 2, stamp="unstamped"), 0, 5))
        self.assertFalse(C.pit_stamp_ok(_row(1, 2, stamp="settled"), 5, 5))
        rows = [_row(1.0, 2.0, stamp="settled", week=i) for i in range(30)]
        rows[10]["pit_stamp"] = "future"
        rows[11]["pit_stamp"] = "unstamped"
        res = C.score_rows(rows, min_prior=5)
        # those two rows must not be bets
        self.assertGreater(res["wrappers"]["fixed_center"]["n_no_bet"], 2)

    def test_marginal_coverage_on_exchangeable_residuals(self):
        rng = random.Random(20261015)
        coverages = []
        for trial in range(12):
            rows = []
            for i in range(180):
                spread = rng.choice([-7.0, -3.0, 0.0, 3.0, 6.5])
                rows.append(_row(spread, spread + rng.gauss(0, 13.0), week=i))
            res = C.score_rows(rows, min_prior=30)
            cov = res["wrappers"]["fixed_center"]["empirical_coverage"]
            self.assertIsNotNone(cov)
            coverages.append(cov)
        mean_cov = sum(coverages) / len(coverages)
        self.assertGreaterEqual(mean_cov, 0.90)

    def test_quantile_agrees_with_closed_form_half_normal(self):
        rng = random.Random(7)
        sigma = 13.45
        draws = sorted(abs(rng.gauss(0, sigma)) for _ in range(8000))
        q = C.empirical_quantile(draws, 0.90)
        closed = C.half_normal_quantile(sigma, 0.90)
        self.assertLess(abs(q - closed) / closed, 0.03)

    def test_uniform_crps_matches_numeric_integral(self):
        lo, hi, y = -2.0, 4.0, 1.0
        width = hi - lo
        steps = 20000
        dz = (20.0 - (-20.0)) / steps
        acc = 0.0
        z = -20.0
        for _ in range(steps):
            if z < lo:
                f = 0.0
            elif z >= hi:
                f = 1.0
            else:
                f = (z - lo) / width
            ind = 1.0 if y <= z else 0.0
            acc += (f - ind) ** 2 * dz
            z += dz
        closed = C.uniform_crps(lo, hi, y)
        self.assertLess(abs(closed - acc), 0.02)


if __name__ == "__main__":
    unittest.main(verbosity=2)
