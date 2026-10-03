"""Offline identity tests for tinkabot_eq_ml_logistic_sigmoid. No score. No mint."""
from __future__ import annotations

import math
import unittest

import tinkabot_eq_ml_logistic_sigmoid as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("logistic_sigmoid",))
        self.assertTrue(callable(m.logistic_sigmoid))

    def test_no_forbidden_copies(self):
        for name in (
            "relu",
            "softplus",
            "beer_lambert",
            "hookes_law",
            "gaussian_pdf",
            "huber_loss",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestSigmoid(unittest.TestCase):
    def test_stated_form(self):
        self.assertEqual(m.logistic_sigmoid(0.0), 0.5)
        self.assertAlmostEqual(
            m.logistic_sigmoid(2.0),
            1.0 / (1.0 + math.exp(-2.0)),
            places=12,
        )
        self.assertAlmostEqual(
            m.logistic_sigmoid(-2.0),
            1.0 / (1.0 + math.exp(2.0)),
            places=12,
        )

    def test_null_missing(self):
        self.assertIsNone(m.logistic_sigmoid(None))


if __name__ == "__main__":
    unittest.main()
