"""Identity tests for lingxi_eq_cell_shares."""
from __future__ import annotations

import unittest

from lingxi_eq_cell_shares import (
    early_mid_pass_share,
    early_mid_rush_share,
    early_short_pass_share,
    fourth_short_pass_share,
    third_long_pass_share,
    third_long_rush_share,
)


class TestCellShares(unittest.TestCase):
    def test_early_mid(self) -> None:
        row = {
            "pass_rate_cells__early|mid__n_pass": 30.0,
            "pass_rate_cells__early|mid__n_rush": 20.0,
            "pass_rate_cells__early|mid__n_plays": 50.0,
        }
        self.assertAlmostEqual(early_mid_pass_share(row), 0.6)
        self.assertAlmostEqual(early_mid_rush_share(row), 0.4)

    def test_third_long(self) -> None:
        row = {
            "pass_rate_cells__third|long__n_pass": 40.0,
            "pass_rate_cells__third|long__n_rush": 10.0,
            "pass_rate_cells__third|long__n_plays": 50.0,
        }
        self.assertAlmostEqual(third_long_pass_share(row), 0.8)
        self.assertAlmostEqual(third_long_rush_share(row), 0.2)

    def test_early_short_null_zero_plays(self) -> None:
        row = {
            "pass_rate_cells__early|short__n_pass": 0.0,
            "pass_rate_cells__early|short__n_plays": 0.0,
        }
        self.assertIsNone(early_short_pass_share(row))

    def test_fourth_short_missing(self) -> None:
        self.assertIsNone(fourth_short_pass_share({}))


if __name__ == "__main__":
    unittest.main()