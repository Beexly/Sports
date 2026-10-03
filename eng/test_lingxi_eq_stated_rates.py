"""Identity checks for lingxi_eq_stated_rates.py. Not an engine score."""
import math
import unittest

from lingxi_eq_stated_rates import (
    early_long_pass_share,
    early_long_rush_share,
    proe_raw_from_rates,
    tempo_pace_iqr,
    wopr_from_shares,
)


class TestStatedRates(unittest.TestCase):
    def test_proe_raw(self):
        row = {
            "proe_early_neutral__pass_rate_actual": 0.55,
            "proe_early_neutral__pass_rate_expected": 0.40,
        }
        self.assertAlmostEqual(proe_raw_from_rates(row), 0.15)

    def test_proe_raw_null(self):
        self.assertIsNone(proe_raw_from_rates({"proe_early_neutral__pass_rate_actual": 0.5}))

    def test_wopr(self):
        row = {"top_share": 0.30, "top_ay_share": 0.40}
        self.assertAlmostEqual(wopr_from_shares(row), 1.5 * 0.30 + 0.7 * 0.40)

    def test_pace_iqr(self):
        row = {"tempo__pace_p75": 30.0, "tempo__pace_p25": 22.0}
        self.assertAlmostEqual(tempo_pace_iqr(row), 8.0)

    def test_early_long_shares(self):
        row = {
            "pass_rate_cells__early|long__n_pass": 40.0,
            "pass_rate_cells__early|long__n_rush": 10.0,
            "pass_rate_cells__early|long__n_plays": 50.0,
        }
        self.assertAlmostEqual(early_long_pass_share(row), 0.8)
        self.assertAlmostEqual(early_long_rush_share(row), 0.2)

    def test_zero_plays_null(self):
        row = {
            "pass_rate_cells__early|long__n_pass": 0.0,
            "pass_rate_cells__early|long__n_rush": 0.0,
            "pass_rate_cells__early|long__n_plays": 0.0,
        }
        self.assertIsNone(early_long_pass_share(row))
        self.assertIsNone(early_long_rush_share(row))


if __name__ == "__main__":
    unittest.main()
