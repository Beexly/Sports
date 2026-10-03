"""Offline identity tests for tinkabot_eq_ml_pinball. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_pinball as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("pinball_loss",))
        self.assertTrue(callable(m.pinball_loss))

    def test_no_forbidden_copies(self):
        for name in ("infonce_loss", "tversky_index", "huber_loss", "mae"):
            self.assertFalse(hasattr(m, name), name)


class TestPinball(unittest.TestCase):
    def test_stated_form(self):
        # τ=0.5, u=2 → 0.5*2=1
        self.assertAlmostEqual(m.pinball_loss(2.0, 0.5), 1.0)
        # τ=0.5, u=-2 → -2*(0.5-1)=1
        self.assertAlmostEqual(m.pinball_loss(-2.0, 0.5), 1.0)
        # τ=0.9, u=1 → 0.9
        self.assertAlmostEqual(m.pinball_loss(1.0, 0.9), 0.9)
        # τ=0.9, u=-1 → -1*(0.9-1)=0.1
        self.assertAlmostEqual(m.pinball_loss(-1.0, 0.9), 0.1)

    def test_null_missing(self):
        self.assertIsNone(m.pinball_loss(None, 0.5))
        self.assertIsNone(m.pinball_loss(1.0, None))

    def test_null_bad(self):
        self.assertIsNone(m.pinball_loss(1.0, 0.0))
        self.assertIsNone(m.pinball_loss(1.0, 1.0))
        self.assertIsNone(m.pinball_loss(1.0, -0.1))


if __name__ == "__main__":
    unittest.main()
