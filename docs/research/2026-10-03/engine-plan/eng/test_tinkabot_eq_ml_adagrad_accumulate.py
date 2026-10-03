"""Offline identity tests for tinkabot_eq_ml_adagrad_accumulate. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_adagrad_accumulate as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("adagrad_accumulate",))
        self.assertTrue(callable(m.adagrad_accumulate))

    def test_no_forbidden_copies(self):
        for name in ("adagrad_step", "adam_moments", "adam_step", "label_smoothing"):
            self.assertFalse(hasattr(m, name), name)


class TestAdagradAccumulate(unittest.TestCase):
    def test_stated_form(self):
        self.assertAlmostEqual(m.adagrad_accumulate(0.0, 3.0), 9.0)
        self.assertAlmostEqual(m.adagrad_accumulate(4.0, 2.0), 8.0)
        self.assertAlmostEqual(m.adagrad_accumulate(1.0, -2.0), 5.0)

    def test_null_missing(self):
        self.assertIsNone(m.adagrad_accumulate(None, 1.0))
        self.assertIsNone(m.adagrad_accumulate(1.0, None))

    def test_null_bad(self):
        self.assertIsNone(m.adagrad_accumulate(-0.1, 1.0))
        self.assertIsNone(m.adagrad_accumulate(float("nan"), 1.0))
        self.assertIsNone(m.adagrad_accumulate(True, 1.0))
        self.assertIsNone(m.adagrad_accumulate(1.0, "1"))


if __name__ == "__main__":
    unittest.main()
