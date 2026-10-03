"""Kill test for lingxi_eq_bleu_brevity_penalty.

Fails if the long-candidate branch is penalized, the exponent is
inverted to e^(1-c/r), or equal lengths do not score 1.
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_bleu_brevity_penalty as m


class TestBleuBrevityPenalty(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("bleu_brevity_penalty",))

    def test_long_candidate_is_one(self) -> None:
        self.assertEqual(m.bleu_brevity_penalty(12.0, 10.0), 1.0)
        self.assertNotEqual(m.bleu_brevity_penalty(12.0, 10.0), math.exp(1.0 - 10.0 / 12.0))

    def test_short_candidate_printed_exp(self) -> None:
        got = m.bleu_brevity_penalty(10.0, 12.0)
        self.assertAlmostEqual(got, math.exp(1.0 - 12.0 / 10.0))
        self.assertNotAlmostEqual(got, math.exp(1.0 - 10.0 / 12.0))
        self.assertNotEqual(got, 1.0)

    def test_equal_length_is_one(self) -> None:
        self.assertEqual(m.bleu_brevity_penalty(15.0, 15.0), 1.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.bleu_brevity_penalty(None, 10.0))
        self.assertIsNone(m.bleu_brevity_penalty(10.0, None))
        self.assertIsNone(m.bleu_brevity_penalty(0.0, 10.0))
        self.assertIsNone(m.bleu_brevity_penalty(10.0, 0.0))
        self.assertIsNone(m.bleu_brevity_penalty(-1.0, 10.0))
        self.assertIsNone(m.bleu_brevity_penalty(float("nan"), 10.0))


if __name__ == "__main__":
    unittest.main()