"""Offline identity tests for tinkabot_eq_ml_shannon_entropy. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_ml_shannon_entropy as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("shannon_entropy",))
        self.assertTrue(callable(m.shannon_entropy))

    def test_no_forbidden_copies(self):
        for name in (
            "temperature_scale",
            "brier_skill",
            "epa_success",
            "red_zone",
            "two_minute",
            "share_hhi",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestShannonEntropy(unittest.TestCase):
    def test_fair_coin_nats(self):
        # K=1, two equal probs: H = -2*(0.5*log(0.5)) = -log(0.5) = log(2)
        self.assertAlmostEqual(m.shannon_entropy([0.5, 0.5], 1.0), math.log(2.0))

    def test_bits_via_k(self):
        # K = 1/ln(2) converts natural log form to bits; fair coin → 1 bit
        k_bits = 1.0 / math.log(2.0)
        self.assertAlmostEqual(m.shannon_entropy([0.5, 0.5], k_bits), 1.0)

    def test_skip_zero(self):
        # [1.0, 0.0] → only p=1 contributes; 1*log(1)=0 → H=0
        self.assertEqual(m.shannon_entropy([1.0, 0.0], 1.0), 0.0)

    def test_null_bad_k(self):
        self.assertIsNone(m.shannon_entropy([0.5, 0.5], None))
        self.assertIsNone(m.shannon_entropy([0.5, 0.5], 0.0))
        self.assertIsNone(m.shannon_entropy([0.5, 0.5], -1.0))

    def test_null_bad_p(self):
        self.assertIsNone(m.shannon_entropy([1.5, 0.5], 1.0))
        self.assertIsNone(m.shannon_entropy([-0.1, 0.5], 1.0))
        self.assertIsNone(m.shannon_entropy(None, 1.0))

    def test_certain_outcome(self):
        self.assertEqual(m.shannon_entropy([1.0], 1.0), 0.0)


if __name__ == "__main__":
    unittest.main()
