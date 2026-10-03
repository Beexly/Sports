"""Tests for jensen_shannon (Nowozin et al. arXiv:1606.00709 Table 1)."""
from __future__ import annotations

import math
import unittest

from tinkabot_eq_ml_jensen_shannon import COLUMN_BACKED_FUNCS, IDENTITY, jensen_shannon


class TestJensenShannon(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("jensen_shannon", COLUMN_BACKED_FUNCS)

    def test_identical(self) -> None:
        self.assertAlmostEqual(jensen_shannon([0.5, 0.5], [0.5, 0.5]), 0.0)

    def test_disjoint(self) -> None:
        # p=[1,0], q=[0,1] → each term: 1*log(2)+0 + 0 + 1*log(2) = 2 log 2; /2 = log 2
        self.assertAlmostEqual(jensen_shannon([1.0, 0.0], [0.0, 1.0]), math.log(2.0))

    def test_null_guards(self) -> None:
        self.assertIsNone(jensen_shannon(None, [0.5, 0.5]))
        self.assertIsNone(jensen_shannon([0.5], [0.5, 0.5]))
        self.assertIsNone(jensen_shannon([-0.1, 1.1], [0.5, 0.5]))
        self.assertIsNone(jensen_shannon([], []))


if __name__ == "__main__":
    unittest.main()
