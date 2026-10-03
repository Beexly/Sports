"""Missing-value checks for the 0fcf38d modules. No picks."""
from __future__ import annotations

import math
import unittest

from grok_eq_adam import adam_step
from grok_eq_bayes_term import bayes_binomial_term
from grok_eq_horn_schunck import brightness_constancy_residual
from grok_eq_lstm_cell import lstm_cell_step
from grok_eq_rescorla_wagner import rescorla_wagner_basic
from grok_eq_signal_weight import weighted_signal


class MissingValueTest(unittest.TestCase):
    def test_brightness_nonzero_residual(self):
        self.assertEqual(brightness_constancy_residual(1.0, 0.0, 0.0, 2.0, 0.0), 2.0)

    def test_adam_step_rejects_nonpositive_alpha_and_eps(self):
        self.assertIsNone(adam_step(1.0, 0.0, 1.0, 1.0, 1e-8))
        self.assertIsNone(adam_step(1.0, 0.1, 1.0, 1.0, 0.0))
        self.assertIsNone(adam_step(1.0, 0.1, 1.0, -1.0, 1e-8))

    def test_bayes_boundaries(self):
        self.assertEqual(bayes_binomial_term(0.0, 0.5, 2, 1), 0.0)
        self.assertIsNone(bayes_binomial_term(1.1, 0.5, 1, 1))
        self.assertIsNone(bayes_binomial_term(0.5, 0.5, -1, 1))

    def test_rescorla_rejects_negative_alpha(self):
        self.assertIsNone(rescorla_wagner_basic(-0.1, 0.2, 1.0, 1.0, 1.0, 0.0, 0.0))

    def test_lstm_rejects_nonfinite_gate(self):
        self.assertIsNone(lstm_cell_step(0.0, 1.0, 1.0, 1.0, lambda z: math.nan, math.tanh))

    def test_weight_rejects_negative(self):
        self.assertIsNone(weighted_signal([1.0, 1.0], [-0.2, 1.2]))


if __name__ == "__main__":
    unittest.main()
