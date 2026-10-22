"""Offline tests for jensen_shannon_divergence. No score. No mint."""
from __future__ import annotations

import unittest
import math

import jensen_shannon_divergence as m


class TestJS(unittest.TestCase):
    def test_identical(self):
        p = [0.5, 0.5]
        self.assertAlmostEqual(m.jensen_shannon_divergence(p, p), 0.0)

    def test_printed_form(self):
        # Simple case: Bernoulli 0.5 and 1.0
        p = [0.5, 0.5]
        q = [1.0, 0.0]
        js = m.jensen_shannon_divergence(p, q)
        # H(mid) - 0.5*(H(p)+H(q))
        # mid = [0.75, 0.25], H(mid) ≈ 0.811, H(p)=ln2≈0.693, H(q)=0
        expected = 0.21576155433883565
        self.assertAlmostEqual(js, expected, places=5)

    def test_nulls(self):
        self.assertIsNone(m.jensen_shannon_divergence(None, [0.5, 0.5]))
        self.assertIsNone(m.jensen_shannon_divergence([0.5, 0.5], None))
        self.assertIsNone(m.jensen_shannon_divergence([0.5], [0.5, 0.5]))
        self.assertIsNone(m.jensen_shannon_divergence([1.1, -0.1], [0.5, 0.5]))
        self.assertIsNone(m.jensen_shannon_divergence([0.3, 0.3], [0.5, 0.5]))  # not sum to 1


if __name__ == "__main__":
    unittest.main()
