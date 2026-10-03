"""Kill test for lingxi_eq_layer_norm. Fails if variance uses D-1 or a term is dropped."""
from __future__ import annotations

import math
import unittest

import lingxi_eq_layer_norm as m


class TestLayerNorm(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("layer_norm",))

    def test_printed_mean_and_sigma(self) -> None:
        got = m.layer_norm([0.0, 2.0], [1.0, 1.0], [0.0, 0.0])
        self.assertEqual(got, [-1.0, 1.0])
        sample = 1.0 / math.sqrt(2.0)
        self.assertNotAlmostEqual(got[0], -sample)

    def test_gain_and_bias_both_apply(self) -> None:
        got = m.layer_norm([0.0, 2.0], [2.0, 3.0], [4.0, 5.0])
        self.assertEqual(got, [2.0, 8.0])
        self.assertNotEqual(got, [3.0, 6.0])
        self.assertNotEqual(got, [-2.0, 3.0])

    def test_nulls(self) -> None:
        self.assertIsNone(m.layer_norm(None, [1.0], [0.0]))
        self.assertIsNone(m.layer_norm([1.0], None, [0.0]))
        self.assertIsNone(m.layer_norm([1.0], [1.0], None))
        self.assertIsNone(m.layer_norm([], [], []))
        self.assertIsNone(m.layer_norm([1.0, 2.0], [1.0], [0.0, 0.0]))
        self.assertIsNone(m.layer_norm([5.0, 5.0], [1.0, 1.0], [0.0, 0.0]))
        self.assertIsNone(m.layer_norm([1.0, None], [1.0, 1.0], [0.0, 0.0]))


if __name__ == "__main__":
    unittest.main()