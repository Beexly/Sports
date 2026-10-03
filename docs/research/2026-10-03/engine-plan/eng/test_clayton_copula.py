"""Offline tests for clayton_copula. No score. No mint."""
from __future__ import annotations

import unittest

import clayton_copula as m


class TestClayton(unittest.TestCase):
    def test_printed_form(self):
        self.assertEqual(m.clayton_copula(1.0, 1.0, 1.0), 1.0)
        self.assertAlmostEqual(m.clayton_copula(0.5, 0.5, 1.0), 1.0 / 3.0)

    def test_independence_printed(self):
        self.assertEqual(m.clayton_copula(0.5, 0.4, 0.0), 0.2)

    def test_nulls(self):
        self.assertIsNone(m.clayton_copula(None, 0.5, 1.0))
        self.assertIsNone(m.clayton_copula(0.5, None, 1.0))
        self.assertIsNone(m.clayton_copula(0.5, 0.5, None))
        self.assertIsNone(m.clayton_copula(0.0, 0.5, 1.0))
        self.assertIsNone(m.clayton_copula(1.1, 0.5, 1.0))
        self.assertIsNone(m.clayton_copula(0.5, 0.5, -2.0))


if __name__ == "__main__":
    unittest.main()
