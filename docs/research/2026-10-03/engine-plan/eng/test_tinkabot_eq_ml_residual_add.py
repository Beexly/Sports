"""Offline identity tests for tinkabot_eq_ml_residual_add. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_residual_add as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("residual_add",))
        self.assertTrue(callable(m.residual_add))

    def test_no_forbidden_copies(self):
        for name in (
            "intersection_over_union",
            "position_wise_ffn",
            "adam_effective_stepsize",
            "positional_encoding",
            "attention_scale",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestResidualAdd(unittest.TestCase):
    def test_stated_form(self):
        self.assertAlmostEqual(m.residual_add(0.5, 2.0), 2.5)
        self.assertAlmostEqual(m.residual_add(0.0, 3.0), 3.0)
        self.assertAlmostEqual(m.residual_add(-1.0, 1.0), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.residual_add(None, 1.0))
        self.assertIsNone(m.residual_add(1.0, None))

    def test_null_bad(self):
        self.assertIsNone(m.residual_add(float("nan"), 1.0))
        self.assertIsNone(m.residual_add(1.0, float("inf")))
        self.assertIsNone(m.residual_add("1", 1.0))
        self.assertIsNone(m.residual_add(True, 1.0))


if __name__ == "__main__":
    unittest.main()
