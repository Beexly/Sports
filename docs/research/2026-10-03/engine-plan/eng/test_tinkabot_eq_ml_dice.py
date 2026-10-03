"""Offline identity tests for tinkabot_eq_ml_dice. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_dice as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("dice_coefficient",))
        self.assertTrue(callable(m.dice_coefficient))

    def test_no_forbidden_copies(self):
        for name in (
            "huber_loss",
            "binary_log_loss",
            "shannon_entropy",
            "nosofsky_similarity",
            "brier_skill",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestDice(unittest.TestCase):
    def test_stated_form(self):
        # h=2, a=3, b=5 → 2*2/(3+5)=4/8=0.5
        self.assertEqual(m.dice_coefficient(2.0, 3.0, 5.0), 0.5)
        # identical sets: h=a=b → 1.0
        self.assertEqual(m.dice_coefficient(4.0, 4.0, 4.0), 1.0)
        # no overlap
        self.assertEqual(m.dice_coefficient(0.0, 2.0, 3.0), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.dice_coefficient(None, 1.0, 1.0))
        self.assertIsNone(m.dice_coefficient(1.0, None, 1.0))
        self.assertIsNone(m.dice_coefficient(1.0, 1.0, None))

    def test_null_bad_counts(self):
        self.assertIsNone(m.dice_coefficient(-1.0, 2.0, 2.0))
        self.assertIsNone(m.dice_coefficient(1.0, -1.0, 2.0))
        self.assertIsNone(m.dice_coefficient(1.0, 0.0, 0.0))
        self.assertIsNone(m.dice_coefficient(3.0, 2.0, 2.0))  # h > a


if __name__ == "__main__":
    unittest.main()
