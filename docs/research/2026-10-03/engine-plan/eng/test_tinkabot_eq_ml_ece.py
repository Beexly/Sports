"""Offline identity tests for tinkabot_eq_ml_ece. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_ece as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("expected_calibration_error",))
        self.assertTrue(callable(m.expected_calibration_error))

    def test_no_forbidden_copies(self):
        for name in (
            "bleu_score",
            "bleu_brevity_penalty",
            "rouge_n",
            "rouge_l_recall",
            "rouge_s_skip2_recall",
            "matthews_corrcoef",
            "jensen_shannon_divergence",
            "margin_ranking_loss",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestEce(unittest.TestCase):
    def test_stated_form(self):
        # Eq. (3): one bin, gap 0.3, weight 1.
        self.assertAlmostEqual(
            m.expected_calibration_error([10], [0.8], [0.5], 10),
            0.3,
        )
        # two bins: (4/10)*|1.0-0.9| + (6/10)*|0.5-0.5|
        self.assertAlmostEqual(
            m.expected_calibration_error([4, 6], [1.0, 0.5], [0.9, 0.5], 10),
            0.04,
        )
        # absolute gap, not a signed difference
        self.assertAlmostEqual(
            m.expected_calibration_error([5], [0.2], [0.7], 5),
            0.5,
        )
        # perfect calibration
        self.assertAlmostEqual(
            m.expected_calibration_error([5, 5], [0.2, 0.9], [0.2, 0.9], 10),
            0.0,
        )

    def test_null_missing(self):
        self.assertIsNone(m.expected_calibration_error(None, [0.5], [0.5], 1))
        self.assertIsNone(m.expected_calibration_error([1], None, [0.5], 1))
        self.assertIsNone(m.expected_calibration_error([1], [0.5], None, 1))
        self.assertIsNone(m.expected_calibration_error([1], [0.5], [0.5], None))

    def test_null_bad(self):
        self.assertIsNone(m.expected_calibration_error([], [], [], 1))
        self.assertIsNone(m.expected_calibration_error([1], [0.5], [0.5], 0))
        self.assertIsNone(m.expected_calibration_error([1], [0.5], [0.5], -2))
        self.assertIsNone(m.expected_calibration_error([-1], [0.5], [0.5], 1))
        self.assertIsNone(m.expected_calibration_error([1, 1], [0.5], [0.5, 0.5], 2))
        self.assertIsNone(m.expected_calibration_error([float("nan")], [0.5], [0.5], 1))
        self.assertIsNone(m.expected_calibration_error([1], [0.5], [0.5], float("inf")))
        self.assertIsNone(m.expected_calibration_error("1", [0.5], [0.5], 1))


if __name__ == "__main__":
    unittest.main()
