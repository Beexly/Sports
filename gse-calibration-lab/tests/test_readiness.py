"""
Readiness + false-GREEN detection tests.

The false-GREEN check is the one piece of this repo that could prevent an
unearned public claim, so its boundaries are pinned exactly.
"""

from __future__ import annotations

import unittest

from gsecal.readiness import (
    VersionStratum,
    convergence_path,
    false_green_risk,
    project_pooled_after,
    rows_needed_for_floor,
)

# The four figures recorded in AGENTS.md (quoted, not measured here).
RECORDED = [
    VersionStratum("v5.2.7", 245, 0.1089, deployed=True),
    VersionStratum("v5.2.6", 110, 0.0587),
    VersionStratum("v5.1.0", 74, 0.0729),
    VersionStratum("v5.0.0", 29, 0.1531),
]


class TestFalseGreenDetection(unittest.TestCase):
    def test_recorded_state_is_honestly_red(self) -> None:
        r = false_green_risk(RECORDED, pooled_ece=0.0524)
        self.assertFalse(r.at_risk)
        self.assertIn("HONESTLY RED", r.verdict())

    def test_false_green_is_detected(self) -> None:
        """Pooled passes, deployed model's own rows fail -> must flag."""
        r = false_green_risk(RECORDED, pooled_ece=0.0499)
        self.assertTrue(r.gate_would_pass)
        self.assertFalse(r.deployed_would_pass)
        self.assertTrue(r.at_risk)
        self.assertIn("FALSE GREEN", r.verdict())

    def test_margin_quantifies_how_close_that_is(self) -> None:
        r = false_green_risk(RECORDED, pooled_ece=0.0524)
        self.assertAlmostEqual(r.margin_to_false_green, 0.0024, delta=1e-9)
        self.assertGreater(r.margin_to_false_green, 0)

    def test_honestly_green_when_both_clear(self) -> None:
        strata = [VersionStratum("v9", 300, 0.03, deployed=True), VersionStratum("v8", 100, 0.04)]
        self.assertIn("HONESTLY GREEN", false_green_risk(strata, pooled_ece=0.032).verdict())

    def test_conservative_red_when_only_pooled_fails(self) -> None:
        """Deployed clears but retired versions hold the pool back — errs safe."""
        strata = [VersionStratum("new", 100, 0.02, deployed=True), VersionStratum("old", 400, 0.20)]
        v = false_green_risk(strata, pooled_ece=0.16).verdict()
        self.assertIn("CONSERVATIVE RED", v)

    def test_unknown_when_no_deployed_version_marked(self) -> None:
        strata = [VersionStratum("a", 100, 0.02), VersionStratum("b", 100, 0.03)]
        self.assertIn("UNKNOWN", false_green_risk(strata, pooled_ece=0.025).verdict())

    def test_boundary_equal_to_floor_passes_like_production(self) -> None:
        """Production uses > floor, so exactly-at-floor passes. Mirror that."""
        strata = [VersionStratum("v", 100, 0.05, deployed=True)]
        self.assertTrue(false_green_risk(strata, pooled_ece=0.05).deployed_would_pass)


class TestRowsNeeded(unittest.TestCase):
    def test_unreachable_when_future_quality_not_below_floor(self) -> None:
        for future in (0.05, 0.06, 0.10):
            r = rows_needed_for_floor(current_n=245, current_ece=0.1089, assumed_future_ece=future)
            with self.subTest(future=future):
                self.assertFalse(r.reachable)
                self.assertIsNone(r.rows_needed)
                self.assertIn("More data is not the lever", r.reason)

    def test_reachable_when_future_quality_beats_floor(self) -> None:
        r = rows_needed_for_floor(current_n=245, current_ece=0.1089, assumed_future_ece=0.04)
        self.assertTrue(r.reachable)
        self.assertEqual(r.rows_needed, 1444)

    def test_better_future_quality_needs_fewer_rows(self) -> None:
        a = rows_needed_for_floor(current_n=245, current_ece=0.1089, assumed_future_ece=0.04)
        b = rows_needed_for_floor(current_n=245, current_ece=0.1089, assumed_future_ece=0.02)
        self.assertLess(b.rows_needed, a.rows_needed)

    def test_already_below_floor_needs_nothing(self) -> None:
        r = rows_needed_for_floor(current_n=100, current_ece=0.03, assumed_future_ece=0.03)
        self.assertTrue(r.reachable)
        self.assertEqual(r.rows_needed, 0)

    def test_no_current_rows_is_unreachable_not_zero(self) -> None:
        r = rows_needed_for_floor(current_n=0, current_ece=0.1, assumed_future_ece=0.01)
        self.assertFalse(r.reachable)

    def test_projection_actually_reaches_the_floor(self) -> None:
        """The returned m must satisfy the inequality it claims to solve."""
        n, e_now, e_future, floor = 245, 0.1089, 0.04, 0.05
        m = rows_needed_for_floor(
            current_n=n, current_ece=e_now, assumed_future_ece=e_future, floor=floor
        ).rows_needed
        self.assertLessEqual((n * e_now + m * e_future) / (n + m), floor + 1e-12)


class TestConvergence(unittest.TestCase):
    def test_waiting_makes_it_worse_when_deployed_is_worst(self) -> None:
        """The central claim: accumulating v5.2.7 rows drags the figure UP."""
        path = convergence_path(RECORDED, deployed_label="v5.2.7", steps=[0, 500, 3000])
        values = [v for _, v in path]
        self.assertEqual(values, sorted(values), "expected monotonically increasing")
        self.assertGreater(values[-1], values[0])

    def test_converges_toward_the_deployed_version_own_ece(self) -> None:
        path = convergence_path(RECORDED, deployed_label="v5.2.7", steps=[100_000])
        self.assertAlmostEqual(path[0][1], 0.1089, delta=0.001)

    def test_waiting_helps_when_deployed_is_better_than_the_pool(self) -> None:
        strata = [VersionStratum("new", 100, 0.02, deployed=True), VersionStratum("old", 400, 0.20)]
        values = [v for _, v in convergence_path(strata, deployed_label="new", steps=[0, 1000, 10000])]
        self.assertEqual(values, sorted(values, reverse=True))

    def test_unknown_label_raises(self) -> None:
        with self.assertRaises(ValueError):
            convergence_path(RECORDED, deployed_label="nope", steps=[10])


class TestProjectionIsConservative(unittest.TestCase):
    def test_projection_returns_weighted_mean_which_bounds_pooled_above(self) -> None:
        """Weighted mean >= pooled always (decomposition.py identity), so a
        projection that clears the floor guarantees the pooled value does."""
        projected = project_pooled_after(RECORDED, new_label="v5.2.7", new_n=0, new_ece=0.1089)
        self.assertAlmostEqual(projected, 0.0938, delta=0.0001)
        self.assertGreater(projected, 0.0524)  # the pooled figure it bounds


if __name__ == "__main__":
    unittest.main()
