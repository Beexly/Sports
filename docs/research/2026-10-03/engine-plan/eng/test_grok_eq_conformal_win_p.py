"""Fail-closed tests for grok_eq_conformal_win_p."""
from __future__ import annotations

import math
import unittest

from grok_eq_conformal_win_p import conformal_win_p_value


class TestConformalWinP(unittest.TestCase):
    def test_basic_equal_scores(self) -> None:
        # All equal, tau=0.5, n=2 cal +1 =3, each contributes 0.5, total 1.5 /3 =0.5
        p = conformal_win_p_value([1.0, 1.0], 1.0, 0.5)
        self.assertAlmostEqual(p, 0.5)

    def test_strict_less(self) -> None:
        # Candidate higher, all cal < , tau=1, count=2+1=3 /3 =1
        p = conformal_win_p_value([0.0, 0.0], 1.0, 1.0)
        self.assertAlmostEqual(p, 1.0)

    def test_fail_closed_empty(self) -> None:
        self.assertIsNone(conformal_win_p_value([], 1.0))
        self.assertIsNone(conformal_win_p_value(None, 1.0))

    def test_fail_closed_bad_tau(self) -> None:
        self.assertIsNone(conformal_win_p_value([1.0], 1.0, -0.1))
        self.assertIsNone(conformal_win_p_value([1.0], 1.0, 1.1))

    def test_fail_closed_nonfinite(self) -> None:
        self.assertIsNone(conformal_win_p_value([1.0, math.nan], 1.0))
        self.assertIsNone(conformal_win_p_value([1.0], math.inf))


if __name__ == "__main__":
    unittest.main()
