"""Kill test for lingxi_eq_attention_head_dim.

Fails if inverted to h/d_model, if 1/√d_model (attention scale) is
returned, or if √d_model embedding scale is returned.
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_attention_head_dim as m


class TestAttentionHeadDim(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("attention_head_dim",))

    def test_printed_ratio(self) -> None:
        got = m.attention_head_dim(512.0, 8.0)
        self.assertEqual(got, 64.0)
        self.assertNotAlmostEqual(got, 8.0 / 512.0)
        self.assertNotAlmostEqual(got, 1.0 / math.sqrt(512.0))
        self.assertNotAlmostEqual(got, math.sqrt(512.0))
        self.assertNotAlmostEqual(got, 512.0**-0.5)

    def test_nulls(self) -> None:
        self.assertIsNone(m.attention_head_dim(None, 8))
        self.assertIsNone(m.attention_head_dim(512, None))
        self.assertIsNone(m.attention_head_dim(0, 8))
        self.assertIsNone(m.attention_head_dim(512, 0))
        self.assertIsNone(m.attention_head_dim(512, 1.5))
        self.assertIsNone(m.attention_head_dim(512, float("nan")))


if __name__ == "__main__":
    unittest.main()