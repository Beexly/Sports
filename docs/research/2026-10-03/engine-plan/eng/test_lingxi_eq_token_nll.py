"""Kill test for lingxi_eq_token_nll. Fails if the leading minus is dropped."""
from __future__ import annotations

import math
import unittest

import lingxi_eq_token_nll as m


class TestTokenNll(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("token_nll",))

    def test_two_halves_not_the_unsigned_sum(self) -> None:
        got = m.token_nll([0.5, 0.5])
        self.assertAlmostEqual(got, -2.0 * math.log(0.5))
        self.assertAlmostEqual(got, 2.0 * math.log(2.0))
        self.assertNotAlmostEqual(got, 2.0 * math.log(0.5))

    def test_certain_tokens_are_zero(self) -> None:
        self.assertEqual(m.token_nll([1.0, 1.0]), 0.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.token_nll(None))
        self.assertIsNone(m.token_nll([]))
        self.assertIsNone(m.token_nll([0.5, 0.0]))
        self.assertIsNone(m.token_nll([0.5, None]))
        self.assertIsNone(m.token_nll([-0.1]))


if __name__ == "__main__":
    unittest.main()