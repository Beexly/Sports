"""Identity tests for lingxi_eq_cell_shares — every exported name is called."""
from __future__ import annotations

import unittest

from lingxi_eq_cell_shares import (
    early_mid_pass_share,
    early_mid_rush_share,
    early_short_pass_share,
    early_short_rush_share,
    fourth_long_pass_share,
    fourth_long_rush_share,
    fourth_mid_pass_share,
    fourth_mid_rush_share,
    fourth_short_pass_share,
    fourth_short_rush_share,
    third_long_pass_share,
    third_long_rush_share,
    third_mid_pass_share,
    third_mid_rush_share,
    third_short_pass_share,
    third_short_rush_share,
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

    def test_early_short(self) -> None:
        row = {
            "pass_rate_cells__early|short__n_pass": 15.0,
            "pass_rate_cells__early|short__n_rush": 35.0,
            "pass_rate_cells__early|short__n_plays": 50.0,
        }
        self.assertAlmostEqual(early_short_pass_share(row), 0.3)
        self.assertAlmostEqual(early_short_rush_share(row), 0.7)

    def test_third_long(self) -> None:
        row = {
            "pass_rate_cells__third|long__n_pass": 40.0,
            "pass_rate_cells__third|long__n_rush": 10.0,
            "pass_rate_cells__third|long__n_plays": 50.0,
        }
        self.assertAlmostEqual(third_long_pass_share(row), 0.8)
        self.assertAlmostEqual(third_long_rush_share(row), 0.2)

    def test_third_mid(self) -> None:
        row = {
            "pass_rate_cells__third|mid__n_pass": 25.0,
            "pass_rate_cells__third|mid__n_rush": 25.0,
            "pass_rate_cells__third|mid__n_plays": 50.0,
        }
        self.assertAlmostEqual(third_mid_pass_share(row), 0.5)
        self.assertAlmostEqual(third_mid_rush_share(row), 0.5)

    def test_third_short(self) -> None:
        row = {
            "pass_rate_cells__third|short__n_pass": 10.0,
            "pass_rate_cells__third|short__n_rush": 40.0,
            "pass_rate_cells__third|short__n_plays": 50.0,
        }
        self.assertAlmostEqual(third_short_pass_share(row), 0.2)
        self.assertAlmostEqual(third_short_rush_share(row), 0.8)

    def test_fourth_long(self) -> None:
        row = {
            "pass_rate_cells__fourth|long__n_pass": 45.0,
            "pass_rate_cells__fourth|long__n_rush": 5.0,
            "pass_rate_cells__fourth|long__n_plays": 50.0,
        }
        self.assertAlmostEqual(fourth_long_pass_share(row), 0.9)
        self.assertAlmostEqual(fourth_long_rush_share(row), 0.1)

    def test_fourth_mid(self) -> None:
        row = {
            "pass_rate_cells__fourth|mid__n_pass": 20.0,
            "pass_rate_cells__fourth|mid__n_rush": 30.0,
            "pass_rate_cells__fourth|mid__n_plays": 50.0,
        }
        self.assertAlmostEqual(fourth_mid_pass_share(row), 0.4)
        self.assertAlmostEqual(fourth_mid_rush_share(row), 0.6)

    def test_fourth_short(self) -> None:
        row = {
            "pass_rate_cells__fourth|short__n_pass": 5.0,
            "pass_rate_cells__fourth|short__n_rush": 45.0,
            "pass_rate_cells__fourth|short__n_plays": 50.0,
        }
        self.assertAlmostEqual(fourth_short_pass_share(row), 0.1)
        self.assertAlmostEqual(fourth_short_rush_share(row), 0.9)

    def test_early_short_null_zero_plays(self) -> None:
        row = {
            "pass_rate_cells__early|short__n_pass": 0.0,
            "pass_rate_cells__early|short__n_plays": 0.0,
        }
        self.assertIsNone(early_short_pass_share(row))

    def test_third_mid_null_zero_plays(self) -> None:
        row = {
            "pass_rate_cells__third|mid__n_pass": 0.0,
            "pass_rate_cells__third|mid__n_rush": 0.0,
            "pass_rate_cells__third|mid__n_plays": 0.0,
        }
        self.assertIsNone(third_mid_pass_share(row))
        self.assertIsNone(third_mid_rush_share(row))

    def test_fourth_short_missing(self) -> None:
        self.assertIsNone(fourth_short_pass_share({}))
        self.assertIsNone(fourth_short_rush_share({}))


if __name__ == "__main__":
    unittest.main()