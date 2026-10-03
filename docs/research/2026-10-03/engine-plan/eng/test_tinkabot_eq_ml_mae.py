"""Offline identity tests for tinkabot_eq_ml_mae. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_mae as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("mean_absolute_error",))
        self.assertTrue(callable(m.mean_absolute_error))

    def test_no_forbidden_copies(self):
        for name in (
            "wave_speed",
            "photon_energy",
            "newtons_second_law",
            "huber_loss",
            "binary_log_loss",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestMAE(unittest.TestCase):
    def test_stated_form(self):
        # |1-2|+|2-2|+|3-5| = 1+0+2 = 3; /3 = 1
        self.assertEqual(m.mean_absolute_error([1.0, 2.0, 3.0], [2.0, 2.0, 5.0]), 1.0)
        self.assertEqual(m.mean_absolute_error([0.0], [0.0]), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.mean_absolute_error(None, [1.0]))
        self.assertIsNone(m.mean_absolute_error([1.0], None))

    def test_null_bad(self):
        self.assertIsNone(m.mean_absolute_error([], []))
        self.assertIsNone(m.mean_absolute_error([1.0], [1.0, 2.0]))


if __name__ == "__main__":
    unittest.main()
