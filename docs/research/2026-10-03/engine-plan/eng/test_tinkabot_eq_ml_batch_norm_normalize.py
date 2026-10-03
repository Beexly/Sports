"""Tests for batch_norm_normalize (Ioffe & Szegedy 2015 Alg. 1)."""
from __future__ import annotations

import unittest

from tinkabot_eq_ml_batch_norm_normalize import (
    COLUMN_BACKED_FUNCS,
    IDENTITY,
    batch_norm_normalize,
)


class TestBatchNormNormalize(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("batch_norm_normalize", COLUMN_BACKED_FUNCS)

    def test_basic(self) -> None:
        # x=3, μ=1, σ²=1, ε≈0 → 2
        self.assertAlmostEqual(batch_norm_normalize(3.0, 1.0, 1.0, 1e-12), 2.0, places=5)

    def test_zero_centered(self) -> None:
        self.assertAlmostEqual(batch_norm_normalize(1.0, 1.0, 4.0, 0.0), None)  # eps<=0
        self.assertAlmostEqual(batch_norm_normalize(1.0, 1.0, 4.0, 1e-12), 0.0, places=5)

    def test_null_guards(self) -> None:
        self.assertIsNone(batch_norm_normalize(None, 0.0, 1.0))
        self.assertIsNone(batch_norm_normalize(1.0, None, 1.0))
        self.assertIsNone(batch_norm_normalize(1.0, 0.0, -0.1))
        self.assertIsNone(batch_norm_normalize(1.0, 0.0, 1.0, 0.0))
        self.assertIsNone(batch_norm_normalize(float("nan"), 0.0, 1.0))


if __name__ == "__main__":
    unittest.main()
