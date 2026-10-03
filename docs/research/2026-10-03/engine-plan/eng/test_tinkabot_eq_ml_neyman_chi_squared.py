"""Tests for neyman_chi_squared (Nowozin et al. Table 1)."""
from __future__ import annotations

import unittest

from tinkabot_eq_ml_neyman_chi_squared import (
    COLUMN_BACKED_FUNCS,
    IDENTITY,
    neyman_chi_squared,
)


class TestNeymanChiSquared(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("neyman_chi_squared", COLUMN_BACKED_FUNCS)

    def test_identical(self) -> None:
        self.assertAlmostEqual(neyman_chi_squared([0.5, 0.5], [0.5, 0.5]), 0.0)

    def test_basic(self) -> None:
        # (0.9-0.1)²/0.1 + (0.1-0.9)²/0.9 = 6.4 + 0.711... = 7.111...
        expected = (0.8 ** 2) / 0.1 + ((-0.8) ** 2) / 0.9
        self.assertAlmostEqual(
            neyman_chi_squared([0.9, 0.1], [0.1, 0.9]), expected, places=10
        )

    def test_not_pearson(self) -> None:
        # Pearson would divide by p; Neyman by q — values differ
        p, q = [0.8, 0.2], [0.5, 0.5]
        neyman = neyman_chi_squared(p, q)
        pearson = (0.3 ** 2) / 0.8 + ((-0.3) ** 2) / 0.2
        self.assertIsNotNone(neyman)
        self.assertNotAlmostEqual(neyman, pearson, places=6)

    def test_null_guards(self) -> None:
        self.assertIsNone(neyman_chi_squared(None, [0.5, 0.5]))
        self.assertIsNone(neyman_chi_squared([0.5], [0.5, 0.5]))
        self.assertIsNone(neyman_chi_squared([0.5, 0.5], [0.0, 1.0]))
        self.assertIsNone(neyman_chi_squared([-0.1, 1.1], [0.5, 0.5]))
        self.assertIsNone(neyman_chi_squared([], []))


if __name__ == "__main__":
    unittest.main()
