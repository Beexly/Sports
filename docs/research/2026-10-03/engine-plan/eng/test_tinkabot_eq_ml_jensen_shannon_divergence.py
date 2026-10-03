"""Offline identity tests for tinkabot_eq_ml_jensen_shannon_divergence. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_ml_jensen_shannon_divergence as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("jensen_shannon_divergence",))
        self.assertTrue(callable(m.jensen_shannon_divergence))

    def test_no_forbidden_copies(self):
        for name in ("shannon_entropy", "kl_divergence", "contrastive_loss", "jensen_shannon"):
            self.assertFalse(hasattr(m, name), name)


class TestJS(unittest.TestCase):
    def test_stated_form(self):
        self.assertAlmostEqual(m.jensen_shannon_divergence([0.5, 0.5], [0.5, 0.5]), 0.0)
        self.assertAlmostEqual(
            m.jensen_shannon_divergence([1.0, 0.0], [0.0, 1.0]),
            math.log(2.0),
        )

    def test_null_missing(self):
        self.assertIsNone(m.jensen_shannon_divergence(None, [0.5, 0.5]))
        self.assertIsNone(m.jensen_shannon_divergence([0.5, 0.5], None))

    def test_null_bad(self):
        self.assertIsNone(m.jensen_shannon_divergence([0.5], [0.5, 0.5]))
        self.assertIsNone(m.jensen_shannon_divergence([0.6, 0.6], [0.5, 0.5]))
        self.assertIsNone(m.jensen_shannon_divergence([-0.1, 1.1], [0.5, 0.5]))


if __name__ == "__main__":
    unittest.main()
