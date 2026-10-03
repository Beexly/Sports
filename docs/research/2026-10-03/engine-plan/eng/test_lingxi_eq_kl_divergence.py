"""Kill test for lingxi_eq_kl_divergence. Fails if the sum is swapped or scaled."""
from __future__ import annotations

import math
import unittest

import lingxi_eq_kl_divergence as m


class TestKlDivergence(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("kl_divergence",))

    def test_equal_mass_is_zero(self) -> None:
        self.assertEqual(m.kl_divergence([0.5, 0.5], [0.5, 0.5], 1e-12), 0.0)

    def test_printed_sum_not_the_swap(self) -> None:
        q = [0.9, 0.1]
        p = [0.2, 0.8]
        expected = 0.9 * math.log(0.9 / 0.2) + 0.1 * math.log(0.1 / 0.8)
        swapped = 0.2 * math.log(0.2 / 0.9) + 0.8 * math.log(0.8 / 0.1)
        got = m.kl_divergence(q, p, 1e-12)
        self.assertAlmostEqual(got, expected)
        self.assertNotAlmostEqual(got, swapped)

    def test_skip_zero_q(self) -> None:
        self.assertAlmostEqual(
            m.kl_divergence([1.0, 0.0], [0.5, 0.5], 1e-12),
            math.log(2.0),
        )

    def test_p_below_eps_is_null(self) -> None:
        self.assertIsNone(m.kl_divergence([0.5, 0.5], [0.5, 1e-20], 1e-12))
        self.assertIsNone(m.kl_divergence([1.0], [0.5], None))
        self.assertIsNone(m.kl_divergence(None, [0.5], 1e-12))
        self.assertIsNone(m.kl_divergence([0.5], None, 1e-12))
        self.assertIsNone(m.kl_divergence([0.5, 0.5], [0.5], 1e-12))
        self.assertIsNone(m.kl_divergence([], [], 1e-12))
        self.assertIsNone(m.kl_divergence([-0.1, 1.1], [0.5, 0.5], 1e-12))


if __name__ == "__main__":
    unittest.main()