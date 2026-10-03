"""Offline identity tests for tinkabot_eq_ml_diou. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_diou as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("distance_iou",))
        self.assertTrue(callable(m.distance_iou))

    def test_no_forbidden_copies(self):
        for name in ("generalized_iou", "jaccard", "odd_total", "bass"):
            self.assertFalse(hasattr(m, name), name)


class TestDIoU(unittest.TestCase):
    def test_stated_form(self):
        # Perfect overlap, same center: IoU=1, d²=0 → 1
        self.assertAlmostEqual(m.distance_iou(1.0, 0.0, 4.0), 1.0)
        # IoU=0.5, d²=1, c²=4 → 0.5−0.25=0.25
        self.assertAlmostEqual(m.distance_iou(0.5, 1.0, 4.0), 0.25)

    def test_null_missing(self):
        self.assertIsNone(m.distance_iou(None, 0.0, 1.0))
        self.assertIsNone(m.distance_iou(0.5, None, 1.0))
        self.assertIsNone(m.distance_iou(0.5, 0.0, None))

    def test_null_bad(self):
        self.assertIsNone(m.distance_iou(-0.1, 0.0, 1.0))
        self.assertIsNone(m.distance_iou(1.1, 0.0, 1.0))
        self.assertIsNone(m.distance_iou(0.5, -1.0, 1.0))
        self.assertIsNone(m.distance_iou(0.5, 0.0, 0.0))


if __name__ == "__main__":
    unittest.main()
