"""Tests for kendall_tau (Kendall 1938)."""
from __future__ import annotations

import unittest

from tinkabot_eq_ml_kendall_tau import COLUMN_BACKED_FUNCS, IDENTITY, kendall_tau


class TestKendallTau(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("kendall_tau", COLUMN_BACKED_FUNCS)

    def test_perfect_positive(self) -> None:
        self.assertAlmostEqual(kendall_tau([1.0, 2.0, 3.0], [10.0, 20.0, 30.0]), 1.0)

    def test_perfect_negative(self) -> None:
        self.assertAlmostEqual(kendall_tau([1.0, 2.0, 3.0], [30.0, 20.0, 10.0]), -1.0)

    def test_mixed(self) -> None:
        # n=3, pairs: (1,2) concordant×2, (2,3) discordant → (2−1)/3 = +1/3
        self.assertAlmostEqual(kendall_tau([1.0, 2.0, 3.0], [1.0, 3.0, 2.0]), 1.0 / 3.0)

    def test_null_guards(self) -> None:
        self.assertIsNone(kendall_tau(None, [1.0, 2.0]))
        self.assertIsNone(kendall_tau([1.0], [1.0]))
        self.assertIsNone(kendall_tau([1.0, 2.0], [3.0, float("nan")]))
        self.assertIsNone(kendall_tau([], []))


if __name__ == "__main__":
    unittest.main()
