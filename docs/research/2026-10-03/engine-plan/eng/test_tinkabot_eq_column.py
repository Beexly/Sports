"""Offline unit tests for tinkabot_eq_column. No score, no mint, no parquet."""
from __future__ import annotations

import unittest

from tinkabot_eq_column import (
    adot_minus_deep,
    availability_defense_edge,
    availability_group_sum,
    availability_offense_edge,
    clean_vs_sens_epa,
    cpoe_plus_p2s,
    home_minus_away,
    market_elo_residual,
    offset_family_eta,
    proe_or_null,
    protection_stress_edge,
    qb_pit_plus_elo_res,
    row_column_edges,
    scramble_vs_epa,
    under_center_diff,
    under_center_rate,
)


class TestTinkabotEqColumn(unittest.TestCase):
    def test_home_minus_away_null(self):
        self.assertIsNone(home_minus_away(None, 1.0))
        self.assertIsNone(home_minus_away(1.0, None))
        self.assertEqual(home_minus_away(2.0, 0.5), 1.5)

    def test_under_center(self):
        self.assertEqual(under_center_rate(0.6), 0.4)
        self.assertIsNone(under_center_rate(None))
        self.assertAlmostEqual(under_center_diff(0.7, 0.5), -0.2)

    def test_availability(self):
        self.assertEqual(availability_offense_edge(1.0, 2.0, 3.0), 6.0)
        self.assertEqual(availability_defense_edge(4.0, 5.0), 9.0)
        self.assertEqual(availability_group_sum(1, 2, 3, 4, 5), 15.0)
        self.assertIsNone(availability_group_sum(1, None, 3, 4, 5))

    def test_champion_family(self):
        self.assertEqual(market_elo_residual(0.2, 0.1), 0.1)
        self.assertEqual(qb_pit_plus_elo_res(0.05, 0.02), 0.07)
        eta = offset_family_eta(0.1, 1.0, 0.0, 0.05, 0.02)
        self.assertAlmostEqual(eta, 0.1 + 1.0 + 0.05 + 0.02)
        eta_n = offset_family_eta(0.1, 1.0, 1.0, 0.05, 0.02)
        self.assertAlmostEqual(eta_n, 0.1 + 0.0 + 0.05 + 0.02)

    def test_learn_joined_composites(self):
        self.assertAlmostEqual(clean_vs_sens_epa(0.3, 0.1), 0.2)
        self.assertEqual(adot_minus_deep(8.0, 0.2), 7.8)
        self.assertEqual(cpoe_plus_p2s(0.01, 0.02), 0.03)
        self.assertEqual(scramble_vs_epa(0.1, 0.05), 0.05)
        self.assertEqual(protection_stress_edge(0.2, 0.1), 0.1)

    def test_proe_floor(self):
        self.assertIsNone(proe_or_null(0.05, 24.0))
        self.assertEqual(proe_or_null(0.05, 25.0), 0.05)

    def test_row_edges(self):
        out = row_column_edges({"h_hhi": 0.4, "a_hhi": 0.3, "h_only": 1.0})
        self.assertAlmostEqual(out["hhi_edge"], 0.1)
        self.assertEqual(set(out), {"hhi_edge"})


if __name__ == "__main__":
    unittest.main()
