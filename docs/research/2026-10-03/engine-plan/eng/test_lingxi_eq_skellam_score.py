"""Kill test for lingxi_eq_skellam_score.

Fails if the 2 in front of sinh is dropped, sinh is swapped for sin or cosh,
the rating difference is reversed, or alpha is applied only inside sinh.
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_skellam_score as m


class TestSkellamMovScore(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("skellam_mov_score",))

    def test_equal_ratings_scale_by_alpha(self) -> None:
        # sinh(0) = 0, so the printed factor is alpha * margin, not the raw margin.
        self.assertEqual(m.skellam_mov_score(2.0, 1.0, 0.0, 0.0, 2.0), 2.0)
        self.assertNotEqual(m.skellam_mov_score(2.0, 1.0, 0.0, 0.0, 2.0), 1.0)

    def test_printed_two_sinh_not_sin_or_cosh(self) -> None:
        got = m.skellam_mov_score(3.0, 1.0, 1.0, 0.0, 1.0)
        printed = 2.0 - 2.0 * math.sinh(1.0)
        self.assertAlmostEqual(got, printed, places=12)
        self.assertNotAlmostEqual(got, 2.0 - math.sinh(1.0), places=6)
        self.assertNotAlmostEqual(got, 2.0 - 2.0 * math.sin(1.0), places=6)
        self.assertNotAlmostEqual(got, 2.0 - 2.0 * math.cosh(1.0), places=6)
        self.assertNotAlmostEqual(got, 2.0 - 2.0 * math.sinh(-1.0), places=6)
        self.assertNotAlmostEqual(got, -printed, places=6)

    def test_nulls(self) -> None:
        self.assertIsNone(m.skellam_mov_score(None, 1.0, 0.0, 0.0, 1.0))
        self.assertIsNone(m.skellam_mov_score(1.0, None, 0.0, 0.0, 1.0))
        self.assertIsNone(m.skellam_mov_score(1.0, 0.0, None, 0.0, 1.0))
        self.assertIsNone(m.skellam_mov_score(1.0, 0.0, 0.0, None, 1.0))
        self.assertIsNone(m.skellam_mov_score(1.0, 0.0, 0.0, 0.0, None))
        self.assertIsNone(m.skellam_mov_score(1.0, 0.0, 0.0, 0.0, 0.0))
        self.assertIsNone(m.skellam_mov_score(1.0, 0.0, 0.0, 0.0, -1.0))
        self.assertIsNone(m.skellam_mov_score(float("nan"), 0.0, 0.0, 0.0, 1.0))
        self.assertIsNone(m.skellam_mov_score(1.0, 0.0, float("inf"), 0.0, 1.0))


if __name__ == "__main__":
    unittest.main()