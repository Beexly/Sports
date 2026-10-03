"""Offline identity tests for tinkabot_eq_ml_nt_xent. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_ml_nt_xent as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("nt_xent_loss",))
        self.assertTrue(callable(m.nt_xent_loss))

    def test_no_forbidden_copies(self):
        for name in ("infonce_loss", "pinball_loss", "contrastive_loss", "kendall"):
            self.assertFalse(hasattr(m, name), name)


class TestNTxent(unittest.TestCase):
    def test_stated_form(self):
        # s+=1, others=[1], τ=1 → −log(e/(e+e))=log(2)
        self.assertAlmostEqual(m.nt_xent_loss(1.0, [1.0], 1.0), math.log(2.0))
        # s+=0, others=[0,0], τ=1 → −log(1/3)=log(3)
        self.assertAlmostEqual(m.nt_xent_loss(0.0, [0.0, 0.0], 1.0), math.log(3.0))

    def test_null_missing(self):
        self.assertIsNone(m.nt_xent_loss(None, [0.0], 1.0))
        self.assertIsNone(m.nt_xent_loss(0.0, None, 1.0))
        self.assertIsNone(m.nt_xent_loss(0.0, [0.0], None))

    def test_null_bad(self):
        self.assertIsNone(m.nt_xent_loss(0.0, [], 1.0))
        self.assertIsNone(m.nt_xent_loss(0.0, [0.0], 0.0))
        self.assertIsNone(m.nt_xent_loss(0.0, [0.0], -1.0))
        self.assertIsNone(m.nt_xent_loss(0.0, [0.0, None], 1.0))


if __name__ == "__main__":
    unittest.main()
