"""Identity tests for lingxi_eq_scaled_dot_product_attention."""
from __future__ import annotations

import math
import unittest

import numpy as np

from lingxi_eq_scaled_dot_product_attention import scaled_dot_product_attention


class TestScaledDotProductAttention(unittest.TestCase):
    def test_identity_two_by_two(self) -> None:
        # Q=K=V = I_2, d_k=2 -> scores = I / sqrt(2); softmax rows; out finite
        eye = np.eye(2)
        out = scaled_dot_product_attention(eye, eye, eye, 2.0)
        self.assertIsNotNone(out)
        assert out is not None
        self.assertEqual(out.shape, (2, 2))
        # Row 0: scores [1/sqrt(2), 0] -> softmax
        s0 = 1.0 / math.sqrt(2.0)
        e0 = math.exp(s0)
        e1 = math.exp(0.0)
        w00 = e0 / (e0 + e1)
        w01 = e1 / (e0 + e1)
        # out[0] = [w00, w01] @ I = [w00, w01]
        self.assertAlmostEqual(float(out[0, 0]), w00)
        self.assertAlmostEqual(float(out[0, 1]), w01)

    def test_null_bad_d_k(self) -> None:
        q = np.ones((1, 2))
        k = np.ones((1, 2))
        v = np.ones((1, 3))
        self.assertIsNone(scaled_dot_product_attention(q, k, v, None))
        self.assertIsNone(scaled_dot_product_attention(q, k, v, 0.0))
        self.assertIsNone(scaled_dot_product_attention(q, k, v, -1.0))

    def test_null_shape_mismatch(self) -> None:
        q = np.ones((2, 3))
        k = np.ones((4, 2))  # last dim != q last dim
        v = np.ones((4, 5))
        self.assertIsNone(scaled_dot_product_attention(q, k, v, 3.0))

    def test_null_missing_matrix(self) -> None:
        q = np.ones((2, 2))
        self.assertIsNone(scaled_dot_product_attention(None, q, q, 2.0))
        self.assertIsNone(scaled_dot_product_attention(q, None, q, 2.0))
        self.assertIsNone(scaled_dot_product_attention(q, q, None, 2.0))

    def test_d_k_supplied_not_inferred(self) -> None:
        # Using a different positive d_k than the last dim still computes
        q = np.array([[1.0, 0.0]])
        k = np.array([[1.0, 0.0], [0.0, 1.0]])
        v = np.array([[10.0], [20.0]])
        out_a = scaled_dot_product_attention(q, k, v, 1.0)
        out_b = scaled_dot_product_attention(q, k, v, 4.0)
        self.assertIsNotNone(out_a)
        self.assertIsNotNone(out_b)
        assert out_a is not None and out_b is not None
        self.assertFalse(np.allclose(out_a, out_b))


if __name__ == "__main__":
    unittest.main()