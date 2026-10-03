"""Offline identity tests for tinkabot_eq_ml_contrastive_loss. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_contrastive_loss as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("contrastive_loss",))
        self.assertTrue(callable(m.contrastive_loss))

    def test_no_forbidden_copies(self):
        for name in ("focal_loss", "triplet_loss", "hinge_loss", "huber_loss"):
            self.assertFalse(hasattr(m, name), name)


class TestContrastiveLoss(unittest.TestCase):
    def test_stated_form(self):
        # Y=0 (similar), D=2 → ½·4 = 2
        self.assertAlmostEqual(m.contrastive_loss(0.0, 2.0, 1.0), 2.0)
        # Y=1 (dissimilar), D=0.5, m=1 → ½·(0.5)² = 0.125
        self.assertAlmostEqual(m.contrastive_loss(1.0, 0.5, 1.0), 0.125)
        # Y=1, D≥m → 0
        self.assertAlmostEqual(m.contrastive_loss(1.0, 1.0, 1.0), 0.0)
        self.assertAlmostEqual(m.contrastive_loss(1.0, 2.0, 1.0), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.contrastive_loss(None, 1.0, 1.0))
        self.assertIsNone(m.contrastive_loss(0.0, None, 1.0))
        self.assertIsNone(m.contrastive_loss(0.0, 1.0, None))

    def test_null_bad(self):
        self.assertIsNone(m.contrastive_loss(0.5, 1.0, 1.0))
        self.assertIsNone(m.contrastive_loss(0.0, -0.1, 1.0))
        self.assertIsNone(m.contrastive_loss(1.0, 1.0, 0.0))
        self.assertIsNone(m.contrastive_loss(1.0, 1.0, -1.0))


if __name__ == "__main__":
    unittest.main()
