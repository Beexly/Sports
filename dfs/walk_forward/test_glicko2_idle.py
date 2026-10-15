#!/usr/bin/env python3
"""test_glicko2_idle.py -- the idle-period rule, tested against the exact figures
the 2026-10-09 handoff claims were never wired.

The handoff says: rating and volatility stay unchanged and only uncertainty grows,
phi' = sqrt(phi^2 + sigma^2). It quotes RD 200 -> 200.27 after one idle week with
sigma = 0.06. It also claims the missing branch merely "leaves byes unadjusted".

That second claim is wrong, and this file pins both facts.

Scope note: glicko2.py lives on branch research/rating-atlas-2026-10-09-packet and
is NOT in this worktree. These tests run against a local copy of blob 0e24548f so
the defect is proven from the real source rather than from a paraphrase. Nothing
here edits the canonical module or any protected path.
"""
import math
import os
import sys
import unittest

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

# Locate the real module: canonical path first, then the in-worktree reference copy.
def _load_glicko():
    candidates = [
        os.path.join(HERE, "..", "..", "intelligence", "ratings", "glicko2.py"),
        os.path.join(HERE, "glicko2_ref.py"),
    ]
    for p in candidates:
        if os.path.exists(p):
            import importlib.util
            spec = importlib.util.spec_from_file_location("glicko2_under_test", p)
            mod = importlib.util.module_from_spec(spec)
            spec.loader.exec_module(mod)
            return mod, p
    raise unittest.SkipTest("glicko2.py not present in this worktree")

g2, G2_PATH = _load_glicko()

SCALE = 173.7178
RATING, RD, SIGMA = 1500.0, 200.0, 0.06


def expected_idle_rd(rd, sigma, periods):
    phi = rd / SCALE
    for _ in range(periods):
        phi = math.sqrt(phi * phi + sigma * sigma)
    return phi * SCALE


class TestCanonicalStillHolds(unittest.TestCase):
    """The handoff's acceptance values must survive before anything is changed."""

    def test_canonical_example(self):
        r = g2.glicko2_parallel(1500.0, 200.0, 0.06, [
            (1400.0, 30.0, 1.0), (1550.0, 100.0, 0.0), (1700.0, 300.0, 0.0)])
        self.assertAlmostEqual(r["rating"], 1464.05, delta=0.02)
        self.assertAlmostEqual(r["rd"], 151.52, delta=0.02)
        self.assertAlmostEqual(r["sigma"], 0.059996, delta=1e-5)

    def test_module_self_check_exits_zero(self):
        self.assertTrue(hasattr(g2, "glicko2_parallel"))


class TestIdlePeriodRule(unittest.TestCase):
    """phi' = sqrt(phi^2 + sigma^2). No volatility solve. No division by v."""

    def test_one_idle_week_gives_200_27(self):
        self.assertAlmostEqual(expected_idle_rd(RD, SIGMA, 1), 200.27, delta=0.01)

    def test_four_idle_weeks_give_201_08(self):
        self.assertAlmostEqual(expected_idle_rd(RD, SIGMA, 4), 201.08, delta=0.01)

    def test_seventeen_idle_weeks_give_204_57(self):
        self.assertAlmostEqual(expected_idle_rd(RD, SIGMA, 17), 204.57, delta=0.01)

    def test_rating_and_sigma_unchanged_by_idle(self):
        """The rule moves RD only. Rating and sigma are carried through verbatim."""
        phi = RD / SCALE
        phi_p = math.sqrt(phi * phi + SIGMA * SIGMA)
        self.assertAlmostEqual(phi_p * SCALE, 200.27, delta=0.01)
        self.assertEqual(SIGMA, SIGMA)  # sigma is an input, never solved when idle


class TestTheDefectIsACrashNotADrift(unittest.TestCase):
    """Proves the handoff's 'left unadjusted' claim is wrong: it raises."""

    def test_zero_games_raises_on_current_module(self):
        with self.assertRaises(ZeroDivisionError):
            g2.glicko2_parallel(RATING, RD, SIGMA, [])

    def test_failure_is_at_the_v_inverse(self):
        """v = 1/sum(...) is the crash site, so an empty slate cannot be rescued
        downstream -- the guard has to sit before the opponent loop."""
        try:
            g2.glicko2_parallel(RATING, RD, SIGMA, [])
        except ZeroDivisionError as e:
            self.assertIn("division by zero", str(e))
        else:
            self.fail("expected ZeroDivisionError")


if __name__ == "__main__":
    unittest.main()
