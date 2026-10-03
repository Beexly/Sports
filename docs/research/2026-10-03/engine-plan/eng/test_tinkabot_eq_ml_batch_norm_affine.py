"""Tests for batch_norm_affine (Ioffe & Szegedy 2015 Alg. 1)."""
from __future__ import annotations

import unittest

from tinkabot_eq_ml_batch_norm_affine import (
    COLUMN_BACKED_FUNCS,
    IDENTITY,
    batch_norm_affine,
)


class TestBatchNormAffine(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("batch_norm_affine", COLUMN_BACKED_FUNCS)

    def test_basic(self) -> None:
        self.assertAlmostEqual(batch_norm_affine(1.0, 2.0, -0.5), 1.5)

    def test_identity_params(self) -> None:
        self.assertAlmostEqual(batch_norm_affine(0.3, 1.0, 0.0), 0.3)

    def test_null_guards(self) -> None:
        self.assertIsNone(batch_norm_affine(None, 1.0, 0.0))
        self.assertIsNone(batch_norm_affine(1.0, None, 0.0))
        self.assertIsNone(batch_norm_affine(1.0, 1.0, None))
        self.assertIsNone(batch_norm_affine(float("nan"), 1.0, 0.0))


if __name__ == "__main__":
    unittest.main()
