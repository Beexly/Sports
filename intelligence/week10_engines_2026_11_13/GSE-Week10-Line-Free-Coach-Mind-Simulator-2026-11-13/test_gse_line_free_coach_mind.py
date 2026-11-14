#!/usr/bin/env python3
"""Unit & Property Test Suite for GSE Line-Free NFL Coach-Mind Simulator (Week 10).

Module: test_gse_line_free_coach_mind.py

Compatible with BOTH ``pytest -v`` and ``python3 -m unittest -v`` / direct CLI execution.
Verifies:
1. Zero-Market-Contamination Type Boundary (``TypeError`` on any odds, spread, total,
   moneyline, vig, or implied-probability injection at top-level, nested dicts,
   runtime mutation, or simulation kwargs + AST static firewall inspection).
2. Authentic Coordinator Archetypes (all 14 named tactical minds: Kyle Shanahan,
   Sean McVay, Andy Reid, Steve Spagnuolo, Vic Fangio, Mike Macdonald, Brian Flores,
   Todd Monken, Jim Harbaugh, Jesse Minter, Dan Campbell, Kevin O'Connell,
   Jeff Hafley, DeMeco Ryans) and behavioral differentiation across personnel,
   motion/condensed splits, Cover-0 simulated pressures vs. Quarters/Cover-6 shells,
   4th-down causal aggressiveness, and trailing script elasticity.
3. Snap-by-Snap State Machine invariants: seeded determinism, Sinkhorn-Knopp optimal
   transport injury reallocation (L1 <= 1e-6, tau = 0.42, QB_QUESTIONABLE = 0.0947),
   Two-Minute Warning clock stop, Rule 4 Victory Formation deterministic kneeldown
   absorber, and EDGE#2 Overtime two-possession + sudden-death mechanics.
4. All 13 remaining 2026 Week 10 matchups, verified starter/IR landmines, post-seal
   SHA-256 immutability, and strict ``00-TRUTH-FILE`` compliance.
"""

from __future__ import annotations

import ast
import copy
import inspect
import json
from pathlib import Path
import sys
import unittest
from typing import Any, Dict

import numpy as np

HERE = Path(__file__).resolve().parent
if str(HERE) not in sys.path:
    sys.path.insert(0, str(HERE))

import gse_line_free_coach_mind_week10_simulator as sim  # noqa: E402
from gse_line_free_coach_mind_week10_simulator import (  # noqa: E402
    COACH_TACTICAL_REGISTRY,
    PROMPT_REQUIRED_14_COACHES,
    QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF,
    SEALED_FOURTH_DOWN_TAU,
    W10_FIXTURES_CANONICAL_SHA256,
    PostSealMarketLine,
    PureFootballMatchupInput,
    SealedCoachMindDistribution,
    assert_truth_file_compliant,
    assert_zero_market_contamination,
    build_week10_13_pure_matchups,
    build_week10_post_seal_market_lines,
    can_victory_formation_kneel_out_scalar,
    compare_sealed_distribution_to_market,
    format_conviction_xx_over_100,
    run_week10_13_game_slate,
    simulate_matchup_line_free,
    sinkhorn_reallocate_skill_shares,
)


def _sample_clean_matchup_kwargs() -> Dict[str, Any]:
    return {
        "espn_id": "401873060",
        "kickoff_utc": "2026-11-15T18:00Z",
        "away_team": "MIN",
        "home_team": "GB",
        "venue": "Lambeau Field",
        "is_dome": False,
        "is_neutral_site": False,
        "wind_mph": 10.0,
        "temp_celsius": 5.0,
        "away_time_zones_crossed": 0.0,
        "away_off_coach": "Kevin O'Connell",
        "away_def_coach": "Brian Flores",
        "home_off_coach": "Matt LaFleur",
        "home_def_coach": "Jonathan Gannon",
        "away_qb_starter": "Kirk Cousins",
        "home_qb_starter": "Jordan Love",
        "away_key_skill": {"RB1": "Aaron Jones Sr.", "WR1": "Justin Jefferson", "TE1": "Josh Oliver"},
        "home_key_skill": {"RB1": "Kaleb Johnson", "WR1": "Christian Watson", "TE1": "Tucker Kraft"},
        "away_base_off_epa": 0.030,
        "away_base_def_epa": -0.085,
        "home_base_off_epa": 0.065,
        "home_base_def_epa": -0.025,
        "away_ol_pass_block_win": 0.44,
        "away_ol_run_block_win": 0.42,
        "home_ol_pass_block_win": 0.46,
        "home_ol_run_block_win": 0.43,
        "away_qb_pressure_to_sack": 0.088,
        "home_qb_pressure_to_sack": 0.145,
        "away_injuries": ("QB_TRADE_SHORT_WEEK",),
        "home_injuries": ("SKILL_ALPHA_IR",),
        "scratched_roles_away": ("TE1",),
        "scratched_roles_home": ("RB1",),
        "football_notes": {"surface": "grass"},
    }


class TestZeroMarketContaminationBoundary(unittest.TestCase):
    """Verify PureFootballMatchupInput physically blocks all market/odds contamination."""

    def test_top_level_market_kwargs_raise_type_error(self) -> None:
        forbidden_payloads = [
            {"spread": -3.5},
            {"spread_line": -3.5},
            {"listed_spread": 2.5},
            {"total": 44.5},
            {"total_line": 44.5},
            {"over_under": 47.5},
            {"odds": -110},
            {"american_odds": -115},
            {"decimal_odds": 1.91},
            {"moneyline": -165},
            {"implied_prob": 0.545},
            {"implied_probability": 0.612},
            {"market_close": -4.5},
            {"vig": 0.045},
            {"clv": 0.02},
            {"ticket_pct": 0.68},
            {"money_pct": 0.74},
            {"draftkings_line": -3.5},
        ]
        for bad in forbidden_payloads:
            with self.subTest(bad_field=list(bad.keys())[0]):
                kw = _sample_clean_matchup_kwargs()
                kw.update(bad)
                with self.assertRaises(TypeError) as ctx:
                    PureFootballMatchupInput(**kw)
                self.assertIn("ZERO_MARKET_CONTAMINATION_VIOLATION", str(ctx.exception))

    def test_nested_market_contamination_raises_type_error(self) -> None:
        for nested_bad in (
            {"spread_line": -3.5},
            {"implied_prob": 0.58},
            {"deep": [{"market_total": 45.5}]},
            {"sub": {"pinnacle_vig": 0.036}},
        ):
            with self.subTest(nested=nested_bad):
                kw = _sample_clean_matchup_kwargs()
                kw["football_notes"] = nested_bad
                with self.assertRaises(TypeError):
                    PureFootballMatchupInput(**kw)

                raw_map = _sample_clean_matchup_kwargs()
                raw_map["football_notes"] = nested_bad
                with self.assertRaises(TypeError):
                    PureFootballMatchupInput.from_mapping(raw_map)

    def test_post_construction_mutation_and_sim_kwargs_raise_type_error(self) -> None:
        clean = PureFootballMatchupInput(**_sample_clean_matchup_kwargs())
        with self.assertRaises(TypeError):
            clean.spread = -3.5  # type: ignore[attr-defined]
        with self.assertRaises(TypeError):
            clean.away_base_off_epa = 0.99  # type: ignore[misc]
        with self.assertRaises(TypeError):
            clean.football_notes["total_line"] = 42.5  # type: ignore[index]

        with self.assertRaises(TypeError) as ctx:
            simulate_matchup_line_free(clean, n_sims=200, seed=7, spread_line=-3.5)
        self.assertIn("ZERO_MARKET_CONTAMINATION_VIOLATION", str(ctx.exception))

    def test_ast_static_firewall_in_simulation_function(self) -> None:
        src = inspect.getsource(simulate_matchup_line_free)
        tree = ast.parse(src)
        referenced_names = {node.id for node in ast.walk(tree) if isinstance(node, ast.Name)}
        forbidden_refs = {
            "PostSealMarketLine",
            "build_week10_post_seal_market_lines",
            "compare_sealed_distribution_to_market",
            "FA_ATS_URL",
            "SBR_W10_URL",
        }
        self.assertEqual(referenced_names & forbidden_refs, set())


class TestCoordinatorArchetypesAndStateMachine(unittest.TestCase):
    """Verify all 14 named coaches & tactical differentiation in the PBP engine."""

    def test_all_14_named_coaches_present_and_valid(self) -> None:
        self.assertEqual(len(PROMPT_REQUIRED_14_COACHES), 14)
        for coach_name in PROMPT_REQUIRED_14_COACHES:
            self.assertIn(coach_name, COACH_TACTICAL_REGISTRY)
            arch = COACH_TACTICAL_REGISTRY[coach_name]
            self.assertAlmostEqual(sum(arch.personnel_rates), 1.0, places=6)
            self.assertGreaterEqual(arch.motion_rate, 0.0)
            self.assertLessEqual(arch.motion_rate, 1.0)

    def test_dan_campbell_fourth_down_vs_conservative_coach(self) -> None:
        kw_campbell = _sample_clean_matchup_kwargs()
        kw_campbell["away_off_coach"] = "Jim Harbaugh"
        kw_campbell["away_def_coach"] = "Jesse Minter"
        kw_campbell["home_off_coach"] = "Dan Campbell"
        kw_campbell["home_def_coach"] = "Vic Fangio"
        kw_campbell["away_injuries"] = ()
        kw_campbell["home_injuries"] = ()
        kw_campbell["scratched_roles_away"] = ()
        kw_campbell["scratched_roles_home"] = ()
        kw_campbell["away_base_off_epa"] = 0.04
        kw_campbell["home_base_off_epa"] = 0.04
        kw_campbell["away_base_def_epa"] = -0.02
        kw_campbell["home_base_def_epa"] = -0.02
        kw_campbell["is_neutral_site"] = True

        res = simulate_matchup_line_free(PureFootballMatchupInput(**kw_campbell), n_sims=2500, seed=101)
        tel = res["state_machine_telemetry"]
        # Dan Campbell (home) goes for 4th down significantly more often than Jim Harbaugh (away)
        self.assertGreater(tel["home_4th_down_go_rate"], tel["away_4th_down_go_rate"] + 0.08)
        # Jim Harbaugh uses heavy 21 + 13 personnel far more frequently than Sean McVay / Dan Campbell
        harbaugh_heavy = tel["away_personnel_rates"]["21"] + tel["away_personnel_rates"]["13"]
        campbell_heavy = tel["home_personnel_rates"]["21"] + tel["home_personnel_rates"]["13"]
        self.assertGreater(harbaugh_heavy, campbell_heavy)

    def test_flores_spagnuolo_cover0_vs_fangio_macdonald_minter_split_safety(self) -> None:
        kw = _sample_clean_matchup_kwargs()
        kw["away_off_coach"] = "Kyle Shanahan"
        kw["away_def_coach"] = "Brian Flores"  # Cover-0 blitz architect
        kw["home_off_coach"] = "Sean McVay"
        kw["home_def_coach"] = "Vic Fangio"  # Quarters / Cover-6 architect
        res = simulate_matchup_line_free(PureFootballMatchupInput(**kw), n_sims=2000, seed=202)
        tel = res["state_machine_telemetry"]

        # Flores Cover-0 simulated pressure > Fangio Cover-0
        self.assertGreater(
            tel["away_def_shell_rates"]["cover0_sim_pressure"],
            tel["home_def_shell_rates"]["cover0_sim_pressure"] + 0.15,
        )
        # Fangio split-safety Quarters/Cover-6 > Flores split-safety
        self.assertGreater(
            tel["home_def_shell_rates"]["split_safety_quarters_cover6"],
            tel["away_def_shell_rates"]["split_safety_quarters_cover6"] + 0.15,
        )
        # Shanahan & McVay both realize high pre-snap motion (> 0.65)
        self.assertGreater(tel["away_motion_rate_realized"], 0.68)
        self.assertGreater(tel["home_motion_rate_realized"], 0.70)
        # Trailing script elasticity is strictly positive for both coaches
        se = res["script_elasticity"]
        self.assertGreater(se["away_realized_script_elasticity"], 0.04)
        self.assertGreater(se["home_realized_script_elasticity"], 0.04)

    def test_victory_formation_rule4_automaton_and_determinism(self) -> None:
        # 1st down at 1:55 remaining in Q4 with 0 defensive timeouts -> deterministic kneelout (3 kneels: 1:55->1:13.4->0:31.8->0:00)
        ko_zero_to = can_victory_formation_kneel_out_scalar(115.0, defensive_timeouts=0, down=1)
        self.assertTrue(ko_zero_to["can_kneel_out"])
        self.assertEqual(ko_zero_to["remaining_seconds"], 0.0)

        # Same clock (1:55) with 3 defensive timeouts -> cannot kneel out on 4 downs
        ko_three_to = can_victory_formation_kneel_out_scalar(115.0, defensive_timeouts=3, down=1)
        self.assertFalse(ko_three_to["can_kneel_out"])
        self.assertGreater(ko_three_to["remaining_seconds"], 90.0)

        # Determinism check across two identical seeded runs
        m = PureFootballMatchupInput(**_sample_clean_matchup_kwargs())
        r1 = simulate_matchup_line_free(m, n_sims=1500, seed=99999)
        r2 = simulate_matchup_line_free(m, n_sims=1500, seed=99999)
        self.assertEqual(r1.seal_sha256, r2.seal_sha256)
        self.assertEqual(r1["mean_margin"], r2["mean_margin"])
        self.assertEqual(r1["key_number_mass"], r2["key_number_mass"])
        self.assertGreater(r1["state_machine_telemetry"]["victory_formation_kneel_game_rate"], 0.30)
        self.assertGreater(r1["state_machine_telemetry"]["edge2_overtime_rate"], 0.01)

    def test_sinkhorn_knopp_injury_reallocation_and_qb_dropoff(self) -> None:
        self.assertEqual(SEALED_FOURTH_DOWN_TAU, 0.42)
        self.assertEqual(QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF, 0.0947)

        sk_healthy = sinkhorn_reallocate_skill_shares(())
        sk_lar_ir = sinkhorn_reallocate_skill_shares(("WR1", "WR2"))
        self.assertLessEqual(sk_healthy["l1_marginal_error"], 1e-6)
        self.assertLessEqual(sk_lar_ir["l1_marginal_error"], 1e-6)
        self.assertAlmostEqual(sum(sk_lar_ir["shares_by_role"].values()), 1.0, places=7)
        # Scratching WR1 & WR2 reallocates target share heavily to WR3, TE1, and RB1
        self.assertGreater(
            sk_lar_ir["shares_by_role"]["TE1"],
            sk_healthy["shares_by_role"]["TE1"] + 0.08,
        )



    def test_elite_defense_suppresses_scoring_and_physical_realism(self) -> None:
        kw_vs_elite = _sample_clean_matchup_kwargs()
        kw_vs_elite["home_base_def_epa"] = -0.105  # Elite defense facing away offense
        kw_vs_weak = _sample_clean_matchup_kwargs()
        kw_vs_weak["home_base_def_epa"] = +0.055   # Weak defense facing away offense

        r_elite = simulate_matchup_line_free(PureFootballMatchupInput(**kw_vs_elite), n_sims=2000, seed=777)
        r_weak = simulate_matchup_line_free(PureFootballMatchupInput(**kw_vs_weak), n_sims=2000, seed=777)

        # Facing an elite negative-EPA defense must strictly suppress away points & EPA/drive
        self.assertLess(r_elite["away_mean_score"], r_weak["away_mean_score"] - 2.0)
        self.assertLess(
            r_elite["drive_epa"]["away_epa_per_drive"],
            r_weak["drive_epa"]["away_epa_per_drive"],
        )
        # Scrimmage plays & game total must reside in authentic NFL physical bounds
        plays = r_elite["state_machine_telemetry"]["mean_scrimmage_plays_combined"]
        self.assertGreaterEqual(plays, 112.0)
        self.assertLessEqual(plays, 146.0)
        tot_mean = r_elite["total_quantiles"]["mean_total"]
        self.assertGreaterEqual(tot_mean, 34.0)
        self.assertLessEqual(tot_mean, 58.0)


class TestWeek10SlateAndPostSealGovernance(unittest.TestCase):
    """Verify the 13 Week 10 fixtures, verified starters, post-seal comparator & 00-TRUTH-FILE."""

    def test_week10_13_fixtures_and_verified_starters(self) -> None:
        self.assertEqual(len(W10_FIXTURES_CANONICAL_SHA256), 64)
        matchups = build_week10_13_pure_matchups()
        self.assertEqual(len(matchups), 13)

        expected_order = [
            "NE@DET",
            "KC@ATL",
            "HOU@CLE",
            "MIN@GB",
            "JAX@TEN",
            "MIA@IND",
            "CAR@NO",
            "BUF@NYJ",
            "SEA@LV",
            "LAR@ARI",
            "SF@DAL",
            "PIT@CIN",
            "LAC@BAL",
        ]
        actual_order = [f"{m.away_team}@{m.home_team}" for m in matchups]
        self.assertEqual(actual_order, expected_order)

        by_id = {f"{m.away_team}@{m.home_team}": m for m in matchups}
        self.assertTrue(by_id["NE@DET"].is_neutral_site)
        self.assertIn("TreVeyon Henderson OUT", by_id["NE@DET"].away_key_skill["RB1"])
        self.assertEqual(by_id["LAC@BAL"].home_qb_starter, "Jacoby Brissett")
        self.assertEqual(by_id["LAC@BAL"].home_def_coach, "Jesse Minter")
        self.assertEqual(by_id["HOU@CLE"].home_off_coach, "Todd Monken")
        self.assertEqual(by_id["MIA@IND"].away_def_coach, "Jeff Hafley")
        self.assertEqual(by_id["MIA@IND"].away_qb_starter, "Kyle McCord")
        self.assertEqual(by_id["SEA@LV"].away_qb_starter, "Drew Lock")
        self.assertEqual(by_id["SEA@LV"].home_qb_starter, "Fernando Mendoza")
        self.assertEqual(by_id["LAR@ARI"].home_qb_starter, "Carson Beck")
        self.assertEqual(by_id[" LAR@ARI".strip()].scratched_roles_away, ("WR1", "WR2"))
        self.assertEqual(by_id["MIN@GB"].away_qb_starter, "Kirk Cousins")
        self.assertIn("Josh Jacobs OUT", by_id["MIN@GB"].home_key_skill["RB1"])

    def test_post_seal_market_comparison_preserves_seal_and_truth_file(self) -> None:
        matchups = build_week10_13_pure_matchups()
        mkt_lines = build_week10_post_seal_market_lines()
        m_kc = [m for m in matchups if m.away_team == "KC"][0]

        sealed = simulate_matchup_line_free(m_kc, n_sims=1000, seed=4242)
        orig_sha = sealed.seal_sha256
        assert_zero_market_contamination(sealed.to_plain_dict(), allow_sealed_sim_totals=True)

        # Sealed distribution blocks mutation
        with self.assertRaises(TypeError):
            sealed.market_writeback = -3.5  # type: ignore[attr-defined]
        with self.assertRaises(ValueError):
            sealed.margins[0] = 999

        comp = compare_sealed_distribution_to_market(sealed, mkt_lines["KC@ATL"])
        self.assertEqual(sealed.seal_sha256, orig_sha)
        self.assertTrue(comp["seal_preserved_unchanged"])
        self.assertRegex(comp["side_conviction_score"], r"^\d{2}/100$")
        self.assertRegex(comp["total_conviction_score"], r"^\d{2}/100$")
        assert_truth_file_compliant(json.dumps(comp))

    def test_truth_file_validator_catches_violations(self) -> None:
        self.assertEqual(format_conviction_xx_over_100(74.4), "74/100")
        assert_truth_file_compliant(
            "Conviction 76/100. Every pick is on the public ledger, wins and losses: https://galaxysportsedge.com/calibration"
        )
        with self.assertRaises(ValueError):
            assert_truth_file_compliant("Confidence: 78.5% on this game.")
        with self.assertRaises(ValueError):
            assert_truth_file_compliant("Historical record " + "62" + "-23-1.")
        with self.assertRaises(ValueError):
            assert_truth_file_compliant("Public card featuring Next Gen Stats separation.")


if __name__ == "__main__":
    unittest.main(verbosity=2)
