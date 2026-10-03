"""Kill test for lingxi_eq_transformer_lrate.

Fails if d_model^{−0.5} is dropped, if min is replaced by product/sum,
or if only the warmup branch or only the inverse-sqrt branch is used
when the other should win.
"""
from __future__ import annotations

import math
import unittest

import lingxi_eq_transformer_lrate as m


class TestTransformerLrate(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("transformer_lrate",))

    def test_warmup_branch(self) -> None:
        # d=512, step=1, warm=4000 → min(1^{-0.5}, 1*4000^{-1.5}) = 4000^{-1.5}
        d, step, warm = 512.0, 1.0, 4000.0
        got = m.transformer_lrate(d, step, warm)
        expected = (d**-0.5) * (step * (warm**-1.5))
        self.assertAlmostEqual(got, expected)
        # Kill: missing d_model factor
        self.assertNotAlmostEqual(got, step * (warm**-1.5))
        # Kill: always using inv-sqrt step (would be d^{-0.5}*1)
        self.assertNotAlmostEqual(got, (d**-0.5) * (step**-0.5))

    def test_decay_branch(self) -> None:
        # After warmup, inv-sqrt step wins: step=16000, warm=4000
        d, step, warm = 512.0, 16000.0, 4000.0
        got = m.transformer_lrate(d, step, warm)
        expected = (d**-0.5) * (step**-0.5)
        self.assertAlmostEqual(got, expected)
        warmup_term = step * (warm**-1.5)
        self.assertLess(step**-0.5, warmup_term)
        self.assertNotAlmostEqual(got, (d**-0.5) * warmup_term)
        # Kill: product of both terms
        self.assertNotAlmostEqual(
            got, (d**-0.5) * (step**-0.5) * warmup_term
        )

    def test_nulls(self) -> None:
        self.assertIsNone(m.transformer_lrate(None, 1, 4000))
        self.assertIsNone(m.transformer_lrate(512, None, 4000))
        self.assertIsNone(m.transformer_lrate(512, 1, None))
        self.assertIsNone(m.transformer_lrate(0, 1, 4000))
        self.assertIsNone(m.transformer_lrate(512, 0, 4000))
        self.assertIsNone(m.transformer_lrate(512, 1.5, 4000))
        self.assertIsNone(m.transformer_lrate(512, 1, float("nan")))


if __name__ == "__main__":
    unittest.main()