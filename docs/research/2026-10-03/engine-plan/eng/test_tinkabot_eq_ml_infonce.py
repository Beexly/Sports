"""Offline identity tests for tinkabot_eq_ml_infonce. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_ml_infonce as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("infonce_loss",))
        self.assertTrue(callable(m.infonce_loss))

    def test_no_forbidden_copies(self):
        for name in (
            "contrastive_loss",
            "tversky_index",
            "jensen_shannon_divergence",
            "focal_loss",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestInfoNCE(unittest.TestCase):
    def test_stated_form(self):
        # f_pos=2, others=[2] → −log(2/4)=log(2)
        self.assertAlmostEqual(m.infonce_loss(2.0, [2.0]), math.log(2.0))
        # f_pos=1, others=[1,1,1] → −log(1/4)=log(4)
        self.assertAlmostEqual(m.infonce_loss(1.0, [1.0, 1.0, 1.0]), math.log(4.0))

    def test_null_missing(self):
        self.assertIsNone(m.infonce_loss(None, [1.0]))
        self.assertIsNone(m.infonce_loss(1.0, None))

    def test_null_bad(self):
        self.assertIsNone(m.infonce_loss(0.0, [1.0]))
        self.assertIsNone(m.infonce_loss(1.0, []))
        self.assertIsNone(m.infonce_loss(1.0, [1.0, 0.0]))
        self.assertIsNone(m.infonce_loss(1.0, [1.0, None]))


if __name__ == "__main__":
    unittest.main()
