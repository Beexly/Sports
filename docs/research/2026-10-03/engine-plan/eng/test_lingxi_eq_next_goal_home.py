"""Kill test for lingxi_eq_next_goal_home.

Fails if the exponential decay is dropped, the home and away intensities
are swapped, or the exponent sign is flipped.
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_next_goal_home as m


class TestNextGoalHome(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("next_goal_home_value",))

    def test_zero_time_is_zero_not_share(self) -> None:
        got = m.next_goal_home_value(1.0, 1.0, 0.0)
        self.assertEqual(got, 0.0)
        self.assertNotEqual(got, 0.5)

    def test_printed_decay_not_swap_or_sign(self) -> None:
        # (1/4) * (1 - exp(-4*ln 2)) = 15/64.
        got = m.next_goal_home_value(1.0, 3.0, math.log(2.0))
        self.assertAlmostEqual(got, 15.0 / 64.0, places=12)
        self.assertNotAlmostEqual(got, 0.25, places=6)
        self.assertNotAlmostEqual(got, 45.0 / 64.0, places=6)
        self.assertNotAlmostEqual(got, 0.25 * (1.0 - math.exp(4.0 * math.log(2.0))), places=6)

    def test_away_only_intensity_is_zero(self) -> None:
        self.assertEqual(m.next_goal_home_value(0.0, 2.0, 1.0), 0.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.next_goal_home_value(None, 1.0, 1.0))
        self.assertIsNone(m.next_goal_home_value(1.0, None, 1.0))
        self.assertIsNone(m.next_goal_home_value(1.0, 1.0, None))
        self.assertIsNone(m.next_goal_home_value(-1.0, 1.0, 1.0))
        self.assertIsNone(m.next_goal_home_value(1.0, -1.0, 1.0))
        self.assertIsNone(m.next_goal_home_value(1.0, 1.0, -0.1))
        self.assertIsNone(m.next_goal_home_value(0.0, 0.0, 1.0))
        self.assertIsNone(m.next_goal_home_value(float("nan"), 1.0, 1.0))


if __name__ == "__main__":
    unittest.main()