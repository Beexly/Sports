"""Kill test for lingxi_eq_scaled_dot_product_attention.

Fails if scale 1/√d_k is dropped, if softmax is skipped, if only
the scalar scale factor is returned, or if QK^T is not applied to V.
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_scaled_dot_product_attention as m


class TestScaledDotProductAttention(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(
            tuple(m.COLUMN_BACKED_FUNCS), ("scaled_dot_product_attention",)
        )

    def test_printed_eye_two_by_two(self) -> None:
        # Q=K=V=I_2, d_k=2 → scores = I/√2; softmax rows; out = weights @ I
        eye = [[1.0, 0.0], [0.0, 1.0]]
        out = m.scaled_dot_product_attention(eye, eye, eye, 2.0)
        self.assertIsNotNone(out)
        assert out is not None
        s0 = 1.0 / math.sqrt(2.0)
        e0 = math.exp(s0)
        e1 = math.exp(0.0)
        w00 = e0 / (e0 + e1)
        w01 = e1 / (e0 + e1)
        self.assertAlmostEqual(out[0][0], w00)
        self.assertAlmostEqual(out[0][1], w01)
        # Kill: unscaled softmax(QK^T) would use score 1.0 not 1/√2
        e0_u = math.exp(1.0)
        e1_u = math.exp(0.0)
        w00_u = e0_u / (e0_u + e1_u)
        self.assertNotAlmostEqual(out[0][0], w00_u)
        # Kill: scale-only identity must not match matrix output
        self.assertNotAlmostEqual(out[0][0], 1.0 / math.sqrt(2.0))

    def test_d_k_changes_output(self) -> None:
        q = [[1.0, 0.0]]
        k = [[1.0, 0.0], [0.0, 1.0]]
        v = [[10.0], [20.0]]
        out_a = m.scaled_dot_product_attention(q, k, v, 1.0)
        out_b = m.scaled_dot_product_attention(q, k, v, 4.0)
        self.assertIsNotNone(out_a)
        self.assertIsNotNone(out_b)
        assert out_a is not None and out_b is not None
        self.assertNotAlmostEqual(out_a[0][0], out_b[0][0])

    def test_nulls(self) -> None:
        q = [[1.0, 0.0]]
        k = [[1.0, 0.0], [0.0, 1.0]]
        v = [[10.0], [20.0]]
        self.assertIsNone(m.scaled_dot_product_attention(None, k, v, 2.0))
        self.assertIsNone(m.scaled_dot_product_attention(q, None, v, 2.0))
        self.assertIsNone(m.scaled_dot_product_attention(q, k, None, 2.0))
        self.assertIsNone(m.scaled_dot_product_attention(q, k, v, None))
        self.assertIsNone(m.scaled_dot_product_attention(q, k, v, 0.0))
        self.assertIsNone(m.scaled_dot_product_attention(q, k, v, -1.0))
        # shape mismatch Q last dim vs K last dim
        self.assertIsNone(
            m.scaled_dot_product_attention([[1.0, 2.0, 3.0]], k, v, 2.0)
        )
        # K rows vs V rows
        self.assertIsNone(
            m.scaled_dot_product_attention(q, k, [[10.0]], 2.0)
        )


if __name__ == "__main__":
    unittest.main()