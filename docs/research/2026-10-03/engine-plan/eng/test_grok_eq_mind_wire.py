"""Tests for the 14:00 CT equation wire. No picks."""
from __future__ import annotations

import math
import unittest

from grok_eq_adam import adam_moments, adam_step
from grok_eq_bayes_term import bayes_binomial_term
from grok_eq_horn_schunck import brightness_constancy_residual
from grok_eq_lstm_cell import lstm_cell_step
from grok_eq_rescorla_wagner import rescorla_wagner_basic
from grok_eq_signal_weight import weighted_signal


class MindWireTest(unittest.TestCase):
    def test_brightness_zero_when_constraint_holds(self):
        self.assertEqual(brightness_constancy_residual(1.0, 2.0, -5.0, 1.0, 2.0), 0.0)

    def test_brightness_rejects_nonfinite(self):
        self.assertIsNone(brightness_constancy_residual(1.0, math.nan, 0.0, 0.0, 0.0))

    def test_adam_moments_match_printed_update(self):
        m, v = adam_moments(0.0, 0.0, 2.0, 0.5, 0.5)
        self.assertEqual(m, 1.0)
        self.assertEqual(v, 2.0)

    def test_adam_step(self):
        self.assertAlmostEqual(adam_step(1.0, 0.1, 1.0, 4.0, 0.0 + 1e-8), 1.0 - 0.1 * 1.0 / (2.0 + 1e-8))

    def test_adam_rejects_bad_beta(self):
        self.assertIsNone(adam_moments(0.0, 0.0, 1.0, 1.0, 0.5))

    def test_rescorla(self):
        d1, d2 = rescorla_wagner_basic(0.5, 0.25, 1.0, 1.0, 1.0, 0.0, 0.0)
        self.assertEqual(d1, 0.5)
        self.assertEqual(d2, 0.25)

    def test_bayes_term(self):
        self.assertAlmostEqual(bayes_binomial_term(0.5, 0.5, 2, 1), 0.125)

    def test_lstm_initial_step(self):
        s, y = lstm_cell_step(0.0, 1.0, 0.0, 1.0, math.tanh, math.tanh)
        self.assertAlmostEqual(s, 0.0)
        self.assertAlmostEqual(y, 0.0)

    def test_weight_requires_simplex(self):
        self.assertAlmostEqual(weighted_signal([2.0, 4.0], [0.25, 0.75]), 3.5)
        self.assertIsNone(weighted_signal([2.0, 4.0], [0.25, 0.25]))
        self.assertIsNone(weighted_signal([2.0, None], [0.5, 0.5]))


if __name__ == "__main__":
    unittest.main()
