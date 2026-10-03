"""Kill test for lingxi_eq_nesterov_lookahead.

Fails if θ+v (momentum param / NAG Eq.4) is returned, if μv alone
is returned, or if Nesterov velocity μv−εg is returned.
"""
from __future__ import annotations

import unittest

import lingxi_eq_nesterov_lookahead as m


class TestNesterovLookahead(unittest.TestCase):
    def test_stated_identity(self) -> None:
        self.assertEqual(m.IDENTITY, "lingxi")
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("nesterov_lookahead",))

    def test_printed_lookahead(self) -> None:
        # θ=10, μ=0.9, v=2 → 10 + 1.8 = 11.8
        got = m.nesterov_lookahead(10.0, 0.9, 2.0)
        self.assertAlmostEqual(got, 11.8)
        self.assertNotAlmostEqual(got, 10.0 + 2.0)  # not θ+v
        self.assertNotAlmostEqual(got, 0.9 * 2.0)  # not μv alone
        self.assertNotAlmostEqual(got, 0.9 * 2.0 - 0.1 * 1.0)  # not velocity

    def test_nulls(self) -> None:
        self.assertIsNone(m.nesterov_lookahead(None, 0.9, 1.0))
        self.assertIsNone(m.nesterov_lookahead(1.0, 1.5, 1.0))
        self.assertIsNone(m.nesterov_lookahead(1.0, -0.1, 1.0))
        self.assertIsNone(m.nesterov_lookahead(1.0, 0.9, float("nan")))


if __name__ == "__main__":
    unittest.main()
