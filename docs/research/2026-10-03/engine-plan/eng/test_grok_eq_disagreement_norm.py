"""Offline tests for disagreement_norm. No score. No mint."""
from __future__ import annotations

import unittest
import math

import grok_eq_disagreement_norm as m


class TestDisagreement(unittest.TestCase):
    def test_identical(self):
        self.assertAlmostEqual(m.disagreement_norm([1.0, 1.0, 1.0]), 0.0)

    def test_simple(self):
        # [0, 2] mean 1, centered [-1, 1], norm sqrt(2)
        self.assertAlmostEqual(m.disagreement_norm([0.0, 2.0]), math.sqrt(2.0))

    def test_nulls(self):
        self.assertIsNone(m.disagreement_norm(None))
        self.assertIsNone(m.disagreement_norm([]))
        self.assertIsNone(m.disagreement_norm([1.0, float("nan")]))
        self.assertIsNone(m.disagreement_norm([1.0, float("inf")]))
        self.assertIsNone(m.disagreement_norm("not a list"))


if __name__ == "__main__":
    unittest.main()
