"""Tests for pearson_corr (Pearson product-moment)."""
from __future__ import annotations

import unittest

from tinkabot_eq_ml_pearson_corr import COLUMN_BACKED_FUNCS, IDENTITY, pearson_corr


class TestPearsonCorr(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("pearson_corr", COLUMN_BACKED_FUNCS)

    def test_perfect_positive(self) -> None:
        self.assertAlmostEqual(pearson_corr([1.0, 2.0, 3.0], [2.0, 4.0, 6.0]), 1.0, places=12)

    def test_perfect_negative(self) -> None:
        self.assertAlmostEqual(pearson_corr([1.0, 2.0, 3.0], [6.0, 4.0, 2.0]), -1.0, places=12)

    def test_uncorrelated(self) -> None:
        # orthogonal around means: [−1,0,1] vs [1,−2,1] → r=0
        self.assertAlmostEqual(pearson_corr([-1.0, 0.0, 1.0], [1.0, -2.0, 1.0]), 0.0, places=12)

    def test_null_guards(self) -> None:
        self.assertIsNone(pearson_corr(None, [1.0, 2.0]))
        self.assertIsNone(pearson_corr([1.0], [1.0]))
        self.assertIsNone(pearson_corr([1.0, 1.0], [2.0, 3.0]))  # zero var x
        self.assertIsNone(pearson_corr([1.0, 2.0], [3.0, float("nan")]))
        self.assertIsNone(pearson_corr([], []))


if __name__ == "__main__":
    unittest.main()
