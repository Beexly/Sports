"""Offline identity tests for tinkabot_eq_physics_exponential_decay. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_physics_exponential_decay as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("exponential_decay",))
        self.assertTrue(callable(m.exponential_decay))

    def test_no_forbidden_copies(self):
        for name in (
            "rbf_kernel",
            "hinge_loss",
            "prelu",
            "minkowski_distance",
            "manhattan_distance",
            "chebyshev_distance",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestDecay(unittest.TestCase):
    def test_stated_form(self):
        self.assertEqual(m.exponential_decay(1.0, 1.0, 0.0), 1.0)
        self.assertAlmostEqual(m.exponential_decay(100.0, 1.0, 1.0), 100.0 * math.exp(-1.0))
        self.assertEqual(m.exponential_decay(0.0, 2.0, 5.0), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.exponential_decay(None, 1.0, 1.0))
        self.assertIsNone(m.exponential_decay(1.0, None, 1.0))
        self.assertIsNone(m.exponential_decay(1.0, 1.0, None))

    def test_null_bad(self):
        self.assertIsNone(m.exponential_decay(-1.0, 1.0, 1.0))
        self.assertIsNone(m.exponential_decay(1.0, 0.0, 1.0))
        self.assertIsNone(m.exponential_decay(1.0, -1.0, 1.0))
        self.assertIsNone(m.exponential_decay(1.0, 1.0, -1.0))


if __name__ == "__main__":
    unittest.main()
