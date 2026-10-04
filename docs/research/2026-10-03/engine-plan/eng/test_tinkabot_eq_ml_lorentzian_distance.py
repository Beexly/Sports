"""Tests for lorentzian_distance."""
from __future__ import annotations

import math
import unittest

from tinkabot_eq_ml_lorentzian_distance import (
    COLUMN_BACKED_FUNCS,
    IDENTITY,
    lorentzian_distance,
)


class TestLorentzianDistance(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("lorentzian_distance", COLUMN_BACKED_FUNCS)

    def test_identical(self) -> None:
        self.assertAlmostEqual(lorentzian_distance([1.0, 2.0], [1.0, 2.0]), 0.0)

    def test_basic(self) -> None:
        # log(1+|1-4|)+log(1+|2-0|)=log(4)+log(3)
        expected = math.log(4.0) + math.log(3.0)
        self.assertAlmostEqual(lorentzian_distance([1.0, 2.0], [4.0, 0.0]), expected)

    def test_1d(self) -> None:
        self.assertAlmostEqual(lorentzian_distance([0.0], [0.0]), 0.0)
        self.assertAlmostEqual(lorentzian_distance([0.0], [e := math.e - 1]), 1.0)

    def test_null_guards(self) -> None:
        self.assertIsNone(lorentzian_distance(None, [1.0]))
        self.assertIsNone(lorentzian_distance([1.0], [1.0, 0.0]))
        self.assertIsNone(lorentzian_distance([], []))
        self.assertIsNone(lorentzian_distance([float("nan")], [1.0]))


if __name__ == "__main__":
    unittest.main()
