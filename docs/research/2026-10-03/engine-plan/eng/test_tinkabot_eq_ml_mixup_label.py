"""Tests for mixup_label (Zhang et al. ICLR 2018 PDF p.2)."""
from __future__ import annotations

import unittest

from tinkabot_eq_ml_mixup_label import COLUMN_BACKED_FUNCS, IDENTITY, mixup_label


class TestMixupLabel(unittest.TestCase):
    def test_identity_and_column(self) -> None:
        self.assertEqual(IDENTITY, "tinkabot")
        self.assertIn("mixup_label", COLUMN_BACKED_FUNCS)

    def test_equal_mix(self) -> None:
        # λ=0.5, y_i=[1,0], y_j=[0,1] → [0.5, 0.5]
        self.assertEqual(mixup_label([1.0, 0.0], [0.0, 1.0], 0.5), [0.5, 0.5])

    def test_endpoints(self) -> None:
        self.assertEqual(mixup_label([1.0, 0.0], [0.0, 1.0], 1.0), [1.0, 0.0])
        self.assertEqual(mixup_label([1.0, 0.0], [0.0, 1.0], 0.0), [0.0, 1.0])

    def test_null_guards(self) -> None:
        self.assertIsNone(mixup_label(None, [0.0], 0.5))
        self.assertIsNone(mixup_label([0.0], None, 0.5))
        self.assertIsNone(mixup_label([0.0], [1.0], None))
        self.assertIsNone(mixup_label([0.0], [1.0], 1.5))
        self.assertIsNone(mixup_label([0.0], [1.0, 2.0], 0.5))
        self.assertIsNone(mixup_label([float("nan")], [0.0], 0.5))
        self.assertIsNone(mixup_label([], [], 0.5))


if __name__ == "__main__":
    unittest.main()
