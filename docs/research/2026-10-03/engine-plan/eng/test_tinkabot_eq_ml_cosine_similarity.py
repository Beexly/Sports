"""Offline identity tests for tinkabot_eq_ml_cosine_similarity. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_ml_cosine_similarity as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("cosine_similarity",))
        self.assertTrue(callable(m.cosine_similarity))

    def test_no_forbidden_copies(self):
        for name in (
            "tanh",
            "snells_law_n2",
            "kinetic_energy",
            "ohms_law",
            "logistic_sigmoid",
            "relu",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestCosine(unittest.TestCase):
    def test_stated_form(self):
        self.assertEqual(m.cosine_similarity(1.0, 0.0, 1.0, 0.0), 1.0)
        self.assertEqual(m.cosine_similarity(1.0, 0.0, 0.0, 1.0), 0.0)
        # (3,4)·(3,4) / (5*5) = 1
        self.assertEqual(m.cosine_similarity(3.0, 4.0, 3.0, 4.0), 1.0)
        # (1,0)·(1,1) / (1*√2) = 1/√2
        self.assertAlmostEqual(
            m.cosine_similarity(1.0, 0.0, 1.0, 1.0),
            1.0 / math.sqrt(2.0),
            places=12,
        )

    def test_null_missing(self):
        self.assertIsNone(m.cosine_similarity(None, 0.0, 1.0, 0.0))
        self.assertIsNone(m.cosine_similarity(1.0, None, 1.0, 0.0))
        self.assertIsNone(m.cosine_similarity(1.0, 0.0, None, 0.0))
        self.assertIsNone(m.cosine_similarity(1.0, 0.0, 1.0, None))

    def test_null_zero_norm(self):
        self.assertIsNone(m.cosine_similarity(0.0, 0.0, 1.0, 0.0))
        self.assertIsNone(m.cosine_similarity(1.0, 0.0, 0.0, 0.0))


if __name__ == "__main__":
    unittest.main()
