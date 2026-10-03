"""Tests for jeffreys_divergence (Nowozin et al. Table 1)."""
from __future__ import annotations

import math
import unittest

from tinkabot_eq_ml_jeffreys_divergence import (
    COLUMN_BACKED_FUNCS,
    IDENTITY,
    jeffreys_divergence,
)


class TestJeffreysDivergence(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("jeffreys_divergence", COLUMN_BACKED_FUNCS)

    def test_identical(self) -> None:
        self.assertAlmostEqual(jeffreys_divergence([0.5, 0.5], [0.5, 0.5]), 0.0)

    def test_basic(self) -> None:
        # (0.9-0.1)log(0.9/0.1) + (0.1-0.9)log(0.1/0.9) = 2*(0.8)*log(9)
        expected = 2.0 * 0.8 * math.log(9.0)
        self.assertAlmostEqual(
            jeffreys_divergence([0.9, 0.1], [0.1, 0.9]), expected, places=10
        )

    def test_symmetric(self) -> None:
        a = jeffreys_divergence([0.7, 0.3], [0.4, 0.6])
        b = jeffreys_divergence([0.4, 0.6], [0.7, 0.3])
        self.assertIsNotNone(a)
        self.assertAlmostEqual(a, b, places=12)

    def test_null_guards(self) -> None:
        self.assertIsNone(jeffreys_divergence(None, [0.5, 0.5]))
        self.assertIsNone(jeffreys_divergence([0.5], [0.5, 0.5]))
        self.assertIsNone(jeffreys_divergence([0.0, 1.0], [0.5, 0.5]))
        self.assertIsNone(jeffreys_divergence([0.5, float("nan")], [0.5, 0.5]))
        self.assertIsNone(jeffreys_divergence([], []))


if __name__ == "__main__":
    unittest.main()
