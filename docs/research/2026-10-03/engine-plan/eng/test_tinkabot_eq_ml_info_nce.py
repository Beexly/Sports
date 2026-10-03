"""Tests for info_nce (van den Oord et al. 2018 Eq. 4)."""
from __future__ import annotations

import math
import unittest

from tinkabot_eq_ml_info_nce import COLUMN_BACKED_FUNCS, IDENTITY, info_nce


class TestInfoNce(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("info_nce", COLUMN_BACKED_FUNCS)

    def test_two_equal(self) -> None:
        # f_+=1, scores=[1,1] → −log(0.5) = log(2)
        self.assertAlmostEqual(info_nce(1.0, [1.0, 1.0]), math.log(2.0))

    def test_perfect(self) -> None:
        # only positive mass → −log(1) = 0
        self.assertAlmostEqual(info_nce(2.0, [2.0]), 0.0)

    def test_null_guards(self) -> None:
        self.assertIsNone(info_nce(None, [1.0]))
        self.assertIsNone(info_nce(1.0, None))
        self.assertIsNone(info_nce(1.0, []))
        self.assertIsNone(info_nce(1.0, [1.0, 0.0]))
        self.assertIsNone(info_nce(1.0, [2.0, 3.0]))  # pos not in scores
        self.assertIsNone(info_nce(-1.0, [-1.0]))


if __name__ == "__main__":
    unittest.main()
