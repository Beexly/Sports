"""Tests for reverse_kl (Nowozin et al. arXiv:1606.00709 Table 1)."""
from __future__ import annotations

import math
import unittest

from tinkabot_eq_ml_reverse_kl import COLUMN_BACKED_FUNCS, IDENTITY, reverse_kl


class TestReverseKl(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("reverse_kl", COLUMN_BACKED_FUNCS)

    def test_identical(self) -> None:
        self.assertAlmostEqual(reverse_kl([0.5, 0.5], [0.5, 0.5]), 0.0)

    def test_basic(self) -> None:
        # q=[1,0], p=[0.5,0.5] → 1*log(2) = log 2
        self.assertAlmostEqual(reverse_kl([1.0, 0.0], [0.5, 0.5]), math.log(2.0))

    def test_null_guards(self) -> None:
        self.assertIsNone(reverse_kl(None, [0.5, 0.5]))
        self.assertIsNone(reverse_kl([0.5], [0.5, 0.5]))
        self.assertIsNone(reverse_kl([1.0, 0.0], [0.0, 1.0]))  # q>0 p=0
        self.assertIsNone(reverse_kl([-0.1, 1.1], [0.5, 0.5]))


if __name__ == "__main__":
    unittest.main()
