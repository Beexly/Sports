"""Offline identity tests for tinkabot_eq_ml_focal_loss. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_ml_focal_loss as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("focal_loss",))
        self.assertTrue(callable(m.focal_loss))

    def test_no_forbidden_copies(self):
        for name in ("swish", "softmax", "elu", "gelu", "binary_log_loss"):
            self.assertFalse(hasattr(m, name), name)


class TestFocalLoss(unittest.TestCase):
    def test_stated_form(self):
        # y=1, p=0.8, γ=0 → −log(0.8)  (reduces to CE)
        self.assertAlmostEqual(m.focal_loss(1.0, 0.8, 0.0), -math.log(0.8))
        # y=1, p=0.8, γ=2 → −(0.2)^2 log(0.8)
        self.assertAlmostEqual(
            m.focal_loss(1.0, 0.8, 2.0),
            -((0.2) ** 2) * math.log(0.8),
        )
        # y=0, p=0.2, γ=2 → p_t=0.8 → same as above
        self.assertAlmostEqual(
            m.focal_loss(0.0, 0.2, 2.0),
            -((0.2) ** 2) * math.log(0.8),
        )

    def test_null_missing(self):
        self.assertIsNone(m.focal_loss(None, 0.5, 2.0))
        self.assertIsNone(m.focal_loss(1.0, None, 2.0))
        self.assertIsNone(m.focal_loss(1.0, 0.5, None))

    def test_null_bad(self):
        self.assertIsNone(m.focal_loss(0.5, 0.5, 2.0))
        self.assertIsNone(m.focal_loss(1.0, 0.0, 2.0))
        self.assertIsNone(m.focal_loss(1.0, 1.0, 2.0))
        self.assertIsNone(m.focal_loss(1.0, 0.5, -1.0))


if __name__ == "__main__":
    unittest.main()
