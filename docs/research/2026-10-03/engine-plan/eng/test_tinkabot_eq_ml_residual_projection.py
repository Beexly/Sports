"""Offline identity tests for tinkabot_eq_ml_residual_projection. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_residual_projection as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("residual_projection",))
        self.assertTrue(callable(m.residual_projection))

    def test_no_forbidden_copies(self):
        for name in ("residual_add", "iou_loss", "intersection_over_union"):
            self.assertFalse(hasattr(m, name), name)


class TestResidualProjection(unittest.TestCase):
    def test_stated_form(self):
        # F=0.5, Ws=2, x=3 → 0.5 + 6 = 6.5
        self.assertAlmostEqual(m.residual_projection(0.5, 2.0, 3.0), 6.5)
        self.assertAlmostEqual(m.residual_projection(0.0, 1.0, 4.0), 4.0)
        self.assertAlmostEqual(m.residual_projection(1.0, 0.0, 9.0), 1.0)

    def test_null_missing(self):
        self.assertIsNone(m.residual_projection(None, 1.0, 1.0))
        self.assertIsNone(m.residual_projection(1.0, None, 1.0))
        self.assertIsNone(m.residual_projection(1.0, 1.0, None))

    def test_null_bad(self):
        self.assertIsNone(m.residual_projection(float("nan"), 1.0, 1.0))
        self.assertIsNone(m.residual_projection(1.0, float("inf"), 1.0))
        self.assertIsNone(m.residual_projection("1", 1.0, 1.0))
        self.assertIsNone(m.residual_projection(True, 1.0, 1.0))


if __name__ == "__main__":
    unittest.main()
