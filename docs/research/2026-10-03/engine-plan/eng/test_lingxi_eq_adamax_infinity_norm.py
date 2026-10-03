"""Kill test for lingxi_eq_adamax_infinity_norm.

Fails if replaced by β₂·u+|g|, by Adam v_t = β₂v+(1−β₂)g²,
by max without β₂ (when decay would win), or by m̂/v̂ bias ratios.
"""
from __future__ import annotations

import unittest

import lingxi_eq_adamax_infinity_norm as m


class TestAdamaxInfinityNorm(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(
            tuple(m.COLUMN_BACKED_FUNCS), ("adamax_infinity_norm",)
        )

    def test_printed_abs_g_wins(self) -> None:
        # u=2, β2=0.9 → 1.8; |g|=3 → max(1.8, 3)=3
        got = m.adamax_infinity_norm(2.0, 0.9, -3.0)
        self.assertEqual(got, 3.0)
        self.assertNotAlmostEqual(got, 0.9 * 2.0 + abs(-3.0))
        self.assertNotAlmostEqual(got, 0.9 * 2.0 + (1.0 - 0.9) * 9.0)
        self.assertNotAlmostEqual(got, 2.0 / (1.0 - 0.9**1))

    def test_decay_wins_kills_unscaled_max(self) -> None:
        # u=10, β2=0.5 → 5; |g|=4 → max(5, 4)=5
        # unscaled max(u,|g|)=max(10,4)=10 must not match
        got = m.adamax_infinity_norm(10.0, 0.5, 4.0)
        self.assertEqual(got, 5.0)
        self.assertNotAlmostEqual(got, max(10.0, 4.0))
        self.assertNotAlmostEqual(got, 0.5 * 10.0 + (1.0 - 0.5) * 16.0)

    def test_nulls(self) -> None:
        self.assertIsNone(m.adamax_infinity_norm(None, 0.9, 1.0))
        self.assertIsNone(m.adamax_infinity_norm(1.0, None, 1.0))
        self.assertIsNone(m.adamax_infinity_norm(1.0, 0.9, None))
        self.assertIsNone(m.adamax_infinity_norm(1.0, 1.0, 1.0))
        self.assertIsNone(m.adamax_infinity_norm(1.0, -0.1, 1.0))
        self.assertIsNone(m.adamax_infinity_norm(-0.1, 0.9, 1.0))
        self.assertIsNone(m.adamax_infinity_norm(1.0, 0.9, float("nan")))


if __name__ == "__main__":
    unittest.main()