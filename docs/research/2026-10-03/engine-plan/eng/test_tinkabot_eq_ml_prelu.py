"""Offline identity tests for tinkabot_eq_ml_prelu. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_prelu as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("prelu",))
        self.assertTrue(callable(m.prelu))

    def test_no_forbidden_copies(self):
        for name in (
            "manhattan_distance",
            "chebyshev_distance",
            "minkowski_distance",
            "leaky_relu",
            "relu",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestPrelu(unittest.TestCase):
    def test_stated_form(self):
        self.assertEqual(m.prelu(3.0, 0.25), 3.0)
        self.assertEqual(m.prelu(-4.0, 0.25), -1.0)
        self.assertEqual(m.prelu(0.0, 0.5), 0.0)
        self.assertEqual(m.prelu(-2.0, -0.5), 1.0)

    def test_null_missing(self):
        self.assertIsNone(m.prelu(None, 0.25))
        self.assertIsNone(m.prelu(1.0, None))


if __name__ == "__main__":
    unittest.main()
