"""Offline identity tests for tinkabot_eq_ml_smooth_l1. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_smooth_l1 as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("smooth_l1_loss",))
        self.assertTrue(callable(m.smooth_l1_loss))

    def test_no_forbidden_copies(self):
        for name in ("huber_loss", "nt_xent_loss", "pinball_loss", "mae"):
            self.assertFalse(hasattr(m, name), name)


class TestSmoothL1(unittest.TestCase):
    def test_stated_form(self):
        self.assertAlmostEqual(m.smooth_l1_loss(0.0), 0.0)
        self.assertAlmostEqual(m.smooth_l1_loss(0.5), 0.5 * 0.25)
        self.assertAlmostEqual(m.smooth_l1_loss(-0.5), 0.5 * 0.25)
        self.assertAlmostEqual(m.smooth_l1_loss(1.0), 0.5)
        self.assertAlmostEqual(m.smooth_l1_loss(2.0), 1.5)
        self.assertAlmostEqual(m.smooth_l1_loss(-3.0), 2.5)

    def test_null_missing(self):
        self.assertIsNone(m.smooth_l1_loss(None))


if __name__ == "__main__":
    unittest.main()
