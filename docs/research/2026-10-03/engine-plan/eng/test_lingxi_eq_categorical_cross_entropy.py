"""Kill test for lingxi_eq_categorical_cross_entropy. Fails if this is KL."""
from __future__ import annotations

import math
import unittest

import lingxi_eq_categorical_cross_entropy as m


class TestCategoricalCrossEntropy(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("categorical_cross_entropy",))

    def test_uniform_is_not_kl(self) -> None:
        got = m.categorical_cross_entropy([0.5, 0.5], [0.5, 0.5])
        self.assertAlmostEqual(got, math.log(2.0))
        self.assertNotAlmostEqual(got, 0.0)

    def test_one_hot(self) -> None:
        self.assertAlmostEqual(
            m.categorical_cross_entropy([1.0, 0.0], [0.25, 0.75]),
            -math.log(0.25),
        )
        self.assertEqual(m.categorical_cross_entropy([1.0, 0.0], [1.0, 0.5]), 0.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.categorical_cross_entropy(None, [0.5]))
        self.assertIsNone(m.categorical_cross_entropy([0.5], None))
        self.assertIsNone(m.categorical_cross_entropy([], []))
        self.assertIsNone(m.categorical_cross_entropy([1.0, 0.0], [1.0]))
        self.assertIsNone(m.categorical_cross_entropy([0.5, 0.5], [0.0, 1.0]))
        self.assertIsNone(m.categorical_cross_entropy([-0.1, 1.1], [0.5, 0.5]))


if __name__ == "__main__":
    unittest.main()