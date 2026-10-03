"""Kill test for lingxi_eq_plackett_luce.

Fails if the sum stops one place early, alpha is left out of the exp,
or the winner and loser signs are swapped.
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_plackett_luce as m


class TestPlackettLuceScore(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("plackett_luce_score",))

    def test_two_player_tie_ratings_signs(self) -> None:
        self.assertEqual(m.plackett_luce_score([0.0, 0.0], 1, 1.0), 0.5)
        self.assertEqual(m.plackett_luce_score([0.0, 0.0], 2, 1.0), -0.5)
        self.assertEqual(m.plackett_luce_score([0.0, 0.0], 1, 2.0), 1.0)
        self.assertNotEqual(m.plackett_luce_score([0.0, 0.0], 1, 2.0), 0.5)

    def test_alpha_inside_exp(self) -> None:
        # First rating 0, second ln 2, alpha 2: 2 * (1 - 1/5) = 1.6.
        # Dropping alpha inside exp yields 4/3.
        got = m.plackett_luce_score([0.0, math.log(2.0)], 1, 2.0)
        self.assertAlmostEqual(got, 1.6, places=12)
        self.assertNotAlmostEqual(got, 4.0 / 3.0, places=6)
        self.assertNotAlmostEqual(got, -1.6, places=6)

    def test_three_player_second_place_not_short_sum(self) -> None:
        ratings = [0.0, math.log(2.0), 0.0]
        got = m.plackett_luce_score(ratings, 2, 1.0)
        self.assertAlmostEqual(got, -1.0 / 6.0, places=12)
        self.assertAlmostEqual(m.plackett_luce_score(ratings, 1, 1.0), 0.75, places=12)

    def test_nulls(self) -> None:
        self.assertIsNone(m.plackett_luce_score(None, 1, 1.0))
        self.assertIsNone(m.plackett_luce_score([0.0, 0.0], None, 1.0))
        self.assertIsNone(m.plackett_luce_score([0.0, 0.0], 1, None))
        self.assertIsNone(m.plackett_luce_score([0.0, 0.0], 1, 0.0))
        self.assertIsNone(m.plackett_luce_score([0.0, 0.0], 1, -1.0))
        self.assertIsNone(m.plackett_luce_score([0.0], 1, 1.0))
        self.assertIsNone(m.plackett_luce_score([0.0, 0.0], 0, 1.0))
        self.assertIsNone(m.plackett_luce_score([0.0, 0.0], 3, 1.0))
        self.assertIsNone(m.plackett_luce_score([0.0, float("nan")], 1, 1.0))


if __name__ == "__main__":
    unittest.main()