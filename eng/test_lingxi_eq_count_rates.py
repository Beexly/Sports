"""Identity tests for lingxi_eq_count_rates."""
from __future__ import annotations

import unittest

from lingxi_eq_count_rates import def_pressure_proxy_from_counts


class TestCountRates(unittest.TestCase):
    def test_def_pressure(self) -> None:
        row = {"def_pressure_weekly__pressures": 25.0, "def_pressure_weekly__db": 100.0}
        self.assertAlmostEqual(def_pressure_proxy_from_counts(row), 0.25)

    def test_def_pressure_zero_db(self) -> None:
        row = {"def_pressure_weekly__pressures": 1.0, "def_pressure_weekly__db": 0.0}
        self.assertIsNone(def_pressure_proxy_from_counts(row))

    def test_missing(self) -> None:
        self.assertIsNone(def_pressure_proxy_from_counts({}))


if __name__ == "__main__":
    unittest.main()