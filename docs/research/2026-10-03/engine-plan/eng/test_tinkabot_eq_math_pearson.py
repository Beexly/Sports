"""Offline identity tests for tinkabot_eq_math_pearson. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_math_pearson as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("pearson_r",))
        self.assertTrue(callable(m.pearson_r))

    def test_no_forbidden_copies(self):
        for name in ("mish", "focal_loss", "swish", "cosine_similarity", "mae"):
            self.assertFalse(hasattr(m, name), name)


class TestPearson(unittest.TestCase):
    def test_stated_form(self):
        # perfect positive
        self.assertAlmostEqual(m.pearson_r([1.0, 2.0, 3.0], [2.0, 4.0, 6.0]), 1.0)
        # perfect negative
        self.assertAlmostEqual(m.pearson_r([1.0, 2.0, 3.0], [6.0, 4.0, 2.0]), -1.0)
        # known: x=[0,1,2], y=[0,1,1]
        # x̄=1, ȳ=2/3; dx=[-1,0,1]; dy=[-2/3,1/3,1/3]
        # num = (-1)(-2/3)+0+(1)(1/3)=2/3+1/3=1
        # sx=1+0+1=2; sy=(4/9)+(1/9)+(1/9)=6/9=2/3
        # r = 1 / sqrt(2*(2/3)) = 1/sqrt(4/3) = sqrt(3)/2
        self.assertAlmostEqual(
            m.pearson_r([0.0, 1.0, 2.0], [0.0, 1.0, 1.0]),
            (3.0 ** 0.5) / 2.0,
        )

    def test_null_missing(self):
        self.assertIsNone(m.pearson_r(None, [1.0, 2.0]))
        self.assertIsNone(m.pearson_r([1.0, 2.0], None))

    def test_null_bad(self):
        self.assertIsNone(m.pearson_r([1.0], [1.0]))
        self.assertIsNone(m.pearson_r([1.0, 2.0], [1.0]))
        self.assertIsNone(m.pearson_r([1.0, 1.0], [2.0, 3.0]))


if __name__ == "__main__":
    unittest.main()
