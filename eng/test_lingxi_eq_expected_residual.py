"""Kill tests for lingxi_eq_expected_residual. One source path. No score."""
from __future__ import annotations

import unittest

from lingxi_eq_expected_residual import residual_actual_minus_expected


class TestExpectedResidual(unittest.TestCase):
    def test_identity(self) -> None:
        self.assertEqual(residual_actual_minus_expected(10.0, 7.0), 3.0)
        self.assertEqual(residual_actual_minus_expected(0.0, 0.0), 0.0)
        self.assertAlmostEqual(residual_actual_minus_expected(1.0, 0.25), 0.75)

    def test_null_missing(self) -> None:
        self.assertIsNone(residual_actual_minus_expected(None, 1.0))
        self.assertIsNone(residual_actual_minus_expected(1.0, None))
        self.assertIsNone(residual_actual_minus_expected(None, None))

    def test_null_non_numeric(self) -> None:
        self.assertIsNone(residual_actual_minus_expected("x", 1.0))
        self.assertIsNone(residual_actual_minus_expected(1.0, []))


if __name__ == "__main__":
    unittest.main()