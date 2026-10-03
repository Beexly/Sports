"""Offline identity tests for tinkabot_eq_ml_positional_encoding. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_ml_positional_encoding as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("positional_encoding",))
        self.assertTrue(callable(m.positional_encoding))

    def test_no_forbidden_copies(self):
        for name in (
            "attention_scale",
            "scaled_dot_product_attention",
            "adam_bias_corrected_m",
            "word_information_preserved",
            "matthews_corrcoef",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestPositionalEncoding(unittest.TestCase):
    def test_stated_form(self):
        # pos=0, dim=0 → sin(0)=0
        self.assertAlmostEqual(m.positional_encoding(0, 0, 512), 0.0)
        # pos=0, dim=1 → cos(0)=1
        self.assertAlmostEqual(m.positional_encoding(0, 1, 512), 1.0)
        # pos=1, dim=0 (i=0): sin(1/10000^0)=sin(1)
        self.assertAlmostEqual(m.positional_encoding(1, 0, 512), math.sin(1.0))
        # pos=1, dim=2 (i=1): sin(1/10000^{2/512})
        angle = 1.0 / (10000.0 ** (2 / 512))
        self.assertAlmostEqual(m.positional_encoding(1, 2, 512), math.sin(angle))
        self.assertAlmostEqual(m.positional_encoding(1, 3, 512), math.cos(angle))

    def test_null_missing(self):
        self.assertIsNone(m.positional_encoding(None, 0, 512))
        self.assertIsNone(m.positional_encoding(0, None, 512))
        self.assertIsNone(m.positional_encoding(0, 0, None))

    def test_null_bad(self):
        self.assertIsNone(m.positional_encoding(0, -1, 512))
        self.assertIsNone(m.positional_encoding(0, 1.5, 512))
        self.assertIsNone(m.positional_encoding(0, 0, 0))
        self.assertIsNone(m.positional_encoding(0, 0, -8))
        self.assertIsNone(m.positional_encoding(float("nan"), 0, 512))
        self.assertIsNone(m.positional_encoding("0", 0, 512))
        self.assertIsNone(m.positional_encoding(True, 0, 512))


if __name__ == "__main__":
    unittest.main()
