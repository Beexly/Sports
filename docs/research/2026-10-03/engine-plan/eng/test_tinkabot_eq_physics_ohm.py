"""Offline identity tests for tinkabot_eq_physics_ohm. No score. No mint."""
from __future__ import annotations

import unittest

import tinkabot_eq_physics_ohm as m


class TestIdentity(unittest.TestCase):
    def test_stated_identity(self):
        self.assertEqual(m.IDENTITY, "tinkabot")

    def test_only_one_func(self):
        self.assertEqual(tuple(m.COLUMN_BACKED_FUNCS), ("ohms_law",))
        self.assertTrue(callable(m.ohms_law))

    def test_no_forbidden_copies(self):
        for name in (
            "relu",
            "logistic_sigmoid",
            "beer_lambert",
            "hookes_law",
            "softplus",
            "gaussian_pdf",
        ):
            self.assertFalse(hasattr(m, name), name)


class TestOhm(unittest.TestCase):
    def test_stated_form(self):
        self.assertEqual(m.ohms_law(2.0, 5.0), 10.0)
        self.assertEqual(m.ohms_law(0.0, 100.0), 0.0)
        self.assertEqual(m.ohms_law(-1.5, 4.0), -6.0)

    def test_null_missing(self):
        self.assertIsNone(m.ohms_law(None, 1.0))
        self.assertIsNone(m.ohms_law(1.0, None))

    def test_null_bad_r(self):
        self.assertIsNone(m.ohms_law(1.0, 0.0))
        self.assertIsNone(m.ohms_law(1.0, -2.0))


if __name__ == "__main__":
    unittest.main()
