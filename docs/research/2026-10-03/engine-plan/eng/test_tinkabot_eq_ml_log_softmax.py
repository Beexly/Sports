"""Tests for log_softmax (Goodfellow et al. 2016 §6.2.2.2)."""
from __future__ import annotations

import math
import unittest

from tinkabot_eq_ml_log_softmax import COLUMN_BACKED_FUNCS, IDENTITY, log_softmax


class TestLogSoftmax(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("log_softmax", COLUMN_BACKED_FUNCS)

    def test_two_equal(self) -> None:
        out = log_softmax([0.0, 0.0])
        self.assertIsNotNone(out)
        self.assertAlmostEqual(out[0], -math.log(2.0), places=12)
        self.assertAlmostEqual(out[1], -math.log(2.0), places=12)

    def test_basic(self) -> None:
        # z=[1,0] → log(e/(e+1)), log(1/(e+1))
        out = log_softmax([1.0, 0.0])
        self.assertIsNotNone(out)
        denom = math.exp(1.0) + 1.0
        self.assertAlmostEqual(out[0], math.log(math.exp(1.0) / denom), places=10)
        self.assertAlmostEqual(out[1], math.log(1.0 / denom), places=10)

    def test_sums_to_one_in_exp(self) -> None:
        out = log_softmax([2.0, -1.0, 0.5])
        self.assertIsNotNone(out)
        self.assertAlmostEqual(sum(math.exp(x) for x in out), 1.0, places=10)

    def test_null_guards(self) -> None:
        self.assertIsNone(log_softmax(None))
        self.assertIsNone(log_softmax([]))
        self.assertIsNone(log_softmax([1.0, float("nan")]))
        self.assertIsNone(log_softmax("bad"))


if __name__ == "__main__":
    unittest.main()
