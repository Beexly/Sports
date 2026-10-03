"""Offline identity tests for tinkabot_eq_ml_relu. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_ml_relu as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("relu",))
        self.assertTrue(callable(m.relu))

    def test_no_forbidden_copies(self):
        for name in (
            "beer_lambert",
            "hookes_law",
            "softplus",
            "gaussian_pdf",
            "jaccard_index",
            "huber_loss",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestRelu(unittest.TestCase):
    def test_stated_form(self):
        self.assertEqual(m.relu(3.0), 3.0)
        self.assertEqual(m.relu(0.0), 0.0)
        self.assertEqual(m.relu(-2.5), 0.0)

    def test_null_missing(self):
        self.assertIsNone(m.relu(None))


if __name__ == "__main__":
    unittest.main()
