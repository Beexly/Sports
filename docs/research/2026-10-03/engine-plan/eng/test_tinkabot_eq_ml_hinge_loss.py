"""Offline identity tests for tinkabot_eq_ml_hinge_loss. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_hinge_loss as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("hinge_loss",))
        self.assertTrue(callable(m.hinge_loss))

    def test_no_forbidden_copies(self):
        for name in (
            "minkowski_distance",
            "manhattan_distance",
            "chebyshev_distance",
            "euclidean_distance",
            "prelu",
            "huber_loss",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestHinge(unittest.TestCase):
    def test_stated_form(self):
        # y=1, t=2 → max(0, 1-2)=0
        self.assertEqual(m.hinge_loss(1.0, 2.0), 0.0)
        # y=1, t=0.5 → max(0, 0.5)=0.5
        self.assertEqual(m.hinge_loss(1.0, 0.5), 0.5)
        # y=-1, t=-2 → max(0, 1-(-1)(-2))=max(0,1-2)=0
        self.assertEqual(m.hinge_loss(-1.0, -2.0), 0.0)
        # y=-1, t=0.5 → max(0, 1-(-0.5))=1.5
        self.assertEqual(m.hinge_loss(-1.0, 0.5), 1.5)

    def test_null_missing(self):
        self.assertIsNone(m.hinge_loss(None, 1.0))
        self.assertIsNone(m.hinge_loss(1.0, None))

    def test_null_bad(self):
        self.assertIsNone(m.hinge_loss(0.0, 1.0))
        self.assertIsNone(m.hinge_loss(2.0, 1.0))


if __name__ == "__main__":
    unittest.main()
