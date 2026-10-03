"""Offline identity tests for tinkabot_eq_ml_intersection_over_union. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_intersection_over_union as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("intersection_over_union",))
        self.assertTrue(callable(m.intersection_over_union))

    def test_no_forbidden_copies(self):
        for name in (
            "generalized_iou",
            "distance_iou",
            "complete_iou",
            "jaccard_index",
            "position_wise_ffn",
            "adam_effective_stepsize",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestIoU(unittest.TestCase):
    def test_stated_form(self):
        self.assertAlmostEqual(m.intersection_over_union(1, 2), 0.5)
        self.assertAlmostEqual(m.intersection_over_union(0, 5), 0.0)
        self.assertAlmostEqual(m.intersection_over_union(3, 3), 1.0)

    def test_null_missing(self):
        self.assertIsNone(m.intersection_over_union(None, 2))
        self.assertIsNone(m.intersection_over_union(1, None))

    def test_null_bad(self):
        self.assertIsNone(m.intersection_over_union(-1, 2))
        self.assertIsNone(m.intersection_over_union(1, 0))
        self.assertIsNone(m.intersection_over_union(3, 2))  # I > U
        self.assertIsNone(m.intersection_over_union(float("nan"), 2))
        self.assertIsNone(m.intersection_over_union(True, 2))
        self.assertIsNone(m.intersection_over_union("1", 2))


if __name__ == "__main__":
    unittest.main()
