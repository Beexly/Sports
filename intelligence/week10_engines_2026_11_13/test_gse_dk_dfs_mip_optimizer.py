"""Pytest & Unittest verification suite for `gse_dk_dfs_mip_optimizer.py`.

Run with either:
  - `pytest -v test_gse_dk_dfs_mip_optimizer.py`
  - `python3 -m unittest -v test_gse_dk_dfs_mip_optimizer.py`
"""

from __future__ import annotations

import os
import sys
import unittest
from typing import List

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from gse_dk_dfs_mip_optimizer import (
    CLASSIC_ROSTER_SIZE,
    CLASSIC_SALARY_CAP,
    SHOWDOWN_ROSTER_SIZE,
    SHOWDOWN_SALARY_CAP,
    WEEK_10_BYE_TEAMS,
    WEEK_10_COMPLETED_TNF_TEAMS,
    WEEK_10_IR_OUT_DISPLAY_NAMES,
    WEEK_10_MUNICH_830AM_CST_TEAMS,
    ClassicOptimizerConfig,
    LateSwapState,
    LateSwapValidationError,
    OptimizationInfeasibleError,
    PlayerPoolEntry,
    ShowdownOptimizerConfig,
    SlateMode,
    apply_week10_slate_hygiene,
    compute_binary_hamming_distance,
    compute_winners_curse_haircut,
    optimize_classic_lineups,
    optimize_showdown_lineups,
    resolve_hvz_overlap_cap,
)


def build_realistic_week10_pool() -> List[PlayerPoolEntry]:
    """Construct a rich Week 10 Sunday 12:00 PM CST Main Slate pool plus contaminated traps."""
    active_players = [
        # Game 1: BUF @ IND (12:00 PM CST)
        PlayerPoolEntry("buf_qb1", "Josh Allen", "BUF", "IND", ("QB",), 7800, 24.6, 0.19, projection_std=5.8, kickoff_epoch_cst=1000.0),
        PlayerPoolEntry("buf_rb1", "James Cook", "BUF", "IND", ("RB",), 6800, 17.4, 0.16, projection_std=4.5, kickoff_epoch_cst=1000.0),
        PlayerPoolEntry("buf_wr1", "Khalil Shakir", "BUF", "IND", ("WR",), 6000, 15.8, 0.14, projection_std=4.1, kickoff_epoch_cst=1000.0),
        PlayerPoolEntry("buf_wr2", "Keon Coleman", "BUF", "IND", ("WR",), 4900, 12.9, 0.07, projection_std=4.6, kickoff_epoch_cst=1000.0),
        PlayerPoolEntry("buf_te1", "Dalton Kincaid", "BUF", "IND", ("TE",), 4800, 13.4, 0.11, projection_std=3.8, kickoff_epoch_cst=1000.0),
        PlayerPoolEntry("buf_dst", "Bills", "BUF", "IND", ("DST",), 3200, 8.4, 0.09, projection_std=3.2, kickoff_epoch_cst=1000.0),
        PlayerPoolEntry("ind_qb1", "Joe Flacco", "IND", "BUF", ("QB",), 5300, 17.5, 0.06, projection_std=4.4, kickoff_epoch_cst=1000.0),
        PlayerPoolEntry("ind_rb1", "Jonathan Taylor", "IND", "BUF", ("RB",), 7600, 19.8, 0.22, projection_std=4.9, kickoff_epoch_cst=1000.0),
        PlayerPoolEntry("ind_wr1", "Josh Downs", "IND", "BUF", ("WR",), 5800, 15.9, 0.15, projection_std=4.0, kickoff_epoch_cst=1000.0),
        PlayerPoolEntry("ind_wr2", "Alec Pierce", "IND", "BUF", ("WR",), 4300, 11.2, 0.04, projection_std=5.0, kickoff_epoch_cst=1000.0),
        PlayerPoolEntry("ind_te1", "Mo Alie-Cox", "IND", "BUF", ("TE",), 2700, 6.8, 0.02, projection_std=2.8, kickoff_epoch_cst=1000.0),
        PlayerPoolEntry("ind_dst", "Colts", "IND", "BUF", ("DST",), 2600, 6.2, 0.03, projection_std=3.0, kickoff_epoch_cst=1000.0),
        # Game 2: SF @ JAX (12:00 PM CST)
        PlayerPoolEntry("sf_qb1", "Brock Purdy", "SF", "JAX", ("QB",), 6500, 21.8, 0.13, projection_std=4.9, kickoff_epoch_cst=1000.0),
        PlayerPoolEntry("sf_rb1", "Christian McCaffrey", "SF", "JAX", ("RB",), 8700, 23.5, 0.28, projection_std=5.1, kickoff_epoch_cst=1000.0),
        PlayerPoolEntry("sf_wr1", "Jauan Jennings", "SF", "JAX", ("WR",), 5600, 15.6, 0.12, projection_std=4.3, kickoff_epoch_cst=1000.0),
        PlayerPoolEntry("sf_wr2", "Ricky Pearsall", "SF", "JAX", ("WR",), 4600, 12.4, 0.06, projection_std=4.2, kickoff_epoch_cst=1000.0),
        PlayerPoolEntry("sf_te1", "George Kittle", "SF", "JAX", ("TE",), 6100, 16.9, 0.15, projection_std=4.5, kickoff_epoch_cst=1000.0),
        PlayerPoolEntry("sf_dst", "49ers", "SF", "JAX", ("DST",), 3400, 9.1, 0.12, projection_std=3.3, kickoff_epoch_cst=1000.0),
        PlayerPoolEntry("jax_qb1", "Trevor Lawrence", "JAX", "SF", ("QB",), 5600, 18.2, 0.05, projection_std=4.7, kickoff_epoch_cst=1000.0),
        PlayerPoolEntry("jax_rb1", "Travis Etienne", "JAX", "SF", ("RB",), 5900, 15.1, 0.08, projection_std=4.1, kickoff_epoch_cst=1000.0),
        PlayerPoolEntry("jax_wr1", "Brian Thomas Jr.", "JAX", "SF", ("WR",), 6300, 16.8, 0.11, projection_std=4.8, kickoff_epoch_cst=1000.0),
        PlayerPoolEntry("jax_te1", "Evan Engram", "JAX", "SF", ("TE",), 5000, 14.2, 0.10, projection_std=3.6, kickoff_epoch_cst=1000.0),
        PlayerPoolEntry("jax_dst", "Jaguars", "JAX", "SF", ("DST",), 2500, 5.9, 0.02, projection_std=2.9, kickoff_epoch_cst=1000.0),
        # Game 3: MIN @ TEN (12:00 PM CST)
        PlayerPoolEntry("min_rb1", "Aaron Jones", "MIN", "TEN", ("RB",), 6400, 16.9, 0.17, projection_std=4.0, kickoff_epoch_cst=1000.0),
        PlayerPoolEntry("min_wr1", "Justin Jefferson", "MIN", "TEN", ("WR",), 8800, 23.9, 0.26, projection_std=5.5, kickoff_epoch_cst=1000.0),
        PlayerPoolEntry("min_te1", "T.J. Hockenson", "MIN", "TEN", ("TE",), 4500, 13.1, 0.09, projection_std=3.7, kickoff_epoch_cst=1000.0),
        PlayerPoolEntry("min_dst", "Vikings", "MIN", "TEN", ("DST",), 3700, 9.8, 0.18, projection_std=3.4, kickoff_epoch_cst=1000.0),
        PlayerPoolEntry("ten_rb1", "Tony Pollard", "TEN", "MIN", ("RB",), 5700, 14.8, 0.07, projection_std=4.1, kickoff_epoch_cst=1000.0),
        PlayerPoolEntry("ten_wr1", "Calvin Ridley", "TEN", "MIN", ("WR",), 5500, 14.5, 0.08, projection_std=4.6, kickoff_epoch_cst=1000.0),
        PlayerPoolEntry("ten_te1", "Chig Okonkwo", "TEN", "MIN", ("TE",), 3100, 8.6, 0.03, projection_std=3.1, kickoff_epoch_cst=1000.0),
        # Game 4: LAC @ ARI — Late Afternoon Window (3:05 PM CST, kickoff_epoch_cst=2000.0)
        PlayerPoolEntry("lac_qb1", "Justin Herbert", "LAC", "ARI", ("QB",), 6100, 21.2, 0.09, projection_std=4.8, kickoff_epoch_cst=2000.0),
        PlayerPoolEntry("lac_rb1", "J.K. Dobbins", "LAC", "ARI", ("RB",), 6200, 16.5, 0.11, projection_std=4.3, kickoff_epoch_cst=2000.0),
        PlayerPoolEntry("lac_wr1", "Ladd McConkey", "LAC", "ARI", ("WR",), 5700, 16.4, 0.10, projection_std=4.4, kickoff_epoch_cst=2000.0),
        PlayerPoolEntry("lac_wr2", "Quentin Johnston", "LAC", "ARI", ("WR",), 4400, 12.1, 0.05, projection_std=4.5, kickoff_epoch_cst=2000.0),
        PlayerPoolEntry("lac_te1", "Will Dissly", "LAC", "ARI", ("TE",), 3300, 9.9, 0.06, projection_std=3.2, kickoff_epoch_cst=2000.0),
        PlayerPoolEntry("lac_dst", "Chargers", "LAC", "ARI", ("DST",), 3000, 7.9, 0.07, projection_std=3.1, kickoff_epoch_cst=2000.0),
        PlayerPoolEntry("ari_qb1", "Kyler Murray", "ARI", "LAC", ("QB",), 6400, 21.0, 0.08, projection_std=5.3, kickoff_epoch_cst=2000.0),
        PlayerPoolEntry("ari_rb1", "James Conner", "ARI", "LAC", ("RB",), 6500, 17.2, 0.12, projection_std=4.2, kickoff_epoch_cst=2000.0),
        PlayerPoolEntry("ari_wr1", "Marvin Harrison Jr.", "ARI", "LAC", ("WR",), 6200, 16.2, 0.09, projection_std=4.9, kickoff_epoch_cst=2000.0),
        PlayerPoolEntry("ari_te1", "Trey McBride", "ARI", "LAC", ("TE",), 5900, 16.7, 0.14, projection_std=4.0, kickoff_epoch_cst=2000.0),
        PlayerPoolEntry("ari_dst", "Cardinals", "ARI", "LAC", ("DST",), 2700, 6.6, 0.03, projection_std=3.0, kickoff_epoch_cst=2000.0),
    ]

    # Intentional high-projection traps that MUST be purged by hard Week 10 slate hygiene:
    hygiene_traps = [
        # Bye teams: CHI, DEN, PHI, TB
        PlayerPoolEntry("trap_chi", "D'Andre Swift", "CHI", "BYE", ("RB",), 4000, 45.0, 0.05),
        PlayerPoolEntry("trap_den", "Bo Nix", "DEN", "BYE", ("QB",), 4000, 45.0, 0.05),
        PlayerPoolEntry("trap_phi", "Saquon Barkley", "PHI", "BYE", ("RB",), 4000, 45.0, 0.05),
        PlayerPoolEntry("trap_tb", "Baker Mayfield", "TB", "BYE", ("QB",), 4000, 45.0, 0.05),
        # Completed TNF: WAS, NYG
        PlayerPoolEntry("trap_was", "Jayden Daniels", "WAS", "NYG", ("QB",), 4000, 45.0, 0.05),
        PlayerPoolEntry("trap_nyg", "Malik Nabers", "NYG", "WAS", ("WR",), 4000, 45.0, 0.05),
        # Sunday 8:30 AM CST Munich: NE, DET
        PlayerPoolEntry("trap_ne", "Drake Maye", "NE", "DET", ("QB",), 4000, 45.0, 0.05),
        PlayerPoolEntry("trap_det", "Jahmyr Gibbs", "DET", "NE", ("RB",), 4000, 45.0, 0.05),
        # All 9 Week 10 IR/OUT players
        PlayerPoolEntry("trap_ir1", "Lamar Jackson", "BAL", "CIN", ("QB",), 4000, 55.0, 0.05),
        PlayerPoolEntry("trap_ir2", "Puka Nacua", "LAR", "MIA", ("WR",), 4000, 55.0, 0.05),
        PlayerPoolEntry("trap_ir3", "Davante Adams", "NYJ", "HOU", ("WR",), 4000, 55.0, 0.05),
        PlayerPoolEntry("trap_ir4", "Josh Jacobs", "GB", "NO", ("RB",), 4000, 55.0, 0.05),
        PlayerPoolEntry("trap_ir5", "TreVeyon Henderson", "CIN", "BAL", ("RB",), 4000, 55.0, 0.05),
        PlayerPoolEntry("trap_ir6", "Malik Willis", "GB", "NO", ("QB",), 4000, 55.0, 0.05),
        PlayerPoolEntry("trap_ir7", "Sam Darnold", "MIN", "TEN", ("QB",), 4000, 55.0, 0.05),
        PlayerPoolEntry("trap_ir8", "Gardner Minshew II", "LV", "KC", ("QB",), 4000, 55.0, 0.05),
        PlayerPoolEntry("trap_ir9", "Michael Wilson", "ARI", "LAC", ("WR",), 4000, 55.0, 0.05),
        # Explicit injury tag trap + duplicate pool row trap
        PlayerPoolEntry("trap_out_tag", "Generic Injured WR", "BUF", "IND", ("WR",), 3500, 50.0, 0.03, injury_status="OUT"),
        PlayerPoolEntry("buf_wr1_dup", "Khalil Shakir", "BUF", "IND", ("WR",), 6000, 15.8, 0.14),
    ]
    return active_players + hygiene_traps


class TestGSEDKDFSMipOptimizer(unittest.TestCase):
    """Comprehensive verification of Week 10 slate hygiene, Classic MILP, and Showdown MILP."""

    def test_01_week10_hygiene_blocks_bye_tnf_munich_and_all_ir_out_players(self) -> None:
        raw_pool = build_realistic_week10_pool()
        report = apply_week10_slate_hygiene(raw_pool, mode=SlateMode.CLASSIC_SUNDAY_MAIN)

        surviving_teams = {p.team for p in report.eligible_pool}
        surviving_names = {p.name for p in report.eligible_pool}

        self.assertTrue(surviving_teams.isdisjoint(WEEK_10_BYE_TEAMS))
        self.assertTrue(surviving_teams.isdisjoint(WEEK_10_COMPLETED_TNF_TEAMS))
        self.assertTrue(surviving_teams.isdisjoint(WEEK_10_MUNICH_830AM_CST_TEAMS))

        for banned_name in WEEK_10_IR_OUT_DISPLAY_NAMES:
            self.assertNotIn(banned_name, surviving_names)
        self.assertNotIn("Gardner Minshew II", surviving_names)
        self.assertNotIn("Generic Injured WR", surviving_names)

        reasons = report.blocked_by_reason
        self.assertEqual(reasons.get("WEEK10_BYE_TEAM"), 4)
        self.assertEqual(reasons.get("COMPLETED_TNF_SLATE"), 2)
        self.assertEqual(reasons.get("MUNICH_830AM_CST_SLATE"), 2)
        self.assertEqual(reasons.get("WEEK10_IR_OUT_LIST"), 9)
        self.assertEqual(reasons.get("INJURY_STATUS_TAG"), 1)
        self.assertEqual(reasons.get("DUPLICATE_POOL_ENTRY"), 1)

    def test_02_classic_roster_cap_positions_and_zero_duplicates(self) -> None:
        pool = build_realistic_week10_pool()
        pool.append(
            PlayerPoolEntry("sf_gadget", "Deebo Utility", "SF", "JAX", ("WR", "RB"), 5400, 18.5, 0.08)
        )
        lineups, _ = optimize_classic_lineups(pool, num_lineups=1)
        self.assertEqual(len(lineups), 1)
        lu = lineups[0]

        self.assertEqual(len(lu.slots), CLASSIC_ROSTER_SIZE)
        self.assertLessEqual(lu.total_salary, CLASSIC_SALARY_CAP)
        self.assertEqual(len(lu.player_id_set), CLASSIC_ROSTER_SIZE)

        slot_counts = {}
        for s in lu.slots:
            slot_counts[s.slot] = slot_counts.get(s.slot, 0) + 1
            if s.slot == "FLEX":
                self.assertTrue(
                    bool({"RB", "WR", "TE"}.intersection(s.player.positions)),
                    "FLEX slot must hold RB, WR, or TE.",
                )
            else:
                self.assertIn(s.slot, s.player.positions)

        self.assertEqual(slot_counts, {"QB": 1, "RB": 2, "WR": 3, "TE": 1, "FLEX": 1, "DST": 1})
        self.assertGreaterEqual(lu.distinct_games_count, 2)
        self.assertLessEqual(max(lu.team_counts.values()), 8)

    def test_03_classic_te_in_flex_supported_per_2026_milly_empirical_finding(self) -> None:
        pool = build_realistic_week10_pool()
        boosted = [
            PlayerPoolEntry(
                p.player_id,
                p.name,
                p.team,
                p.opponent,
                p.positions,
                p.salary,
                29.5 if p.player_id in {"sf_te1", "ari_te1"} else p.projected_points,
                p.projected_ownership,
            )
            for p in pool
        ]
        lineups, _ = optimize_classic_lineups(
            boosted,
            num_lineups=1,
            config=ClassicOptimizerConfig(ownership_penalty_weight=0.0, dup_log_penalty_weight=0.0),
        )
        flex_entry = next(s for s in lineups[0].slots if s.slot == "FLEX")
        self.assertIn("TE", flex_entry.player.positions)

    def test_04_classic_min_two_games_blocks_single_game_all_in_trap(self) -> None:
        trap_pool = [
            PlayerPoolEntry("b_qb", "Josh Allen", "BUF", "IND", ("QB",), 6000, 35.0, 0.10),
            PlayerPoolEntry("b_rb1", "James Cook", "BUF", "IND", ("RB",), 5000, 35.0, 0.10),
            PlayerPoolEntry("b_wr1", "Khalil Shakir", "BUF", "IND", ("WR",), 5000, 35.0, 0.10),
            PlayerPoolEntry("b_wr2", "Keon Coleman", "BUF", "IND", ("WR",), 5000, 35.0, 0.10),
            PlayerPoolEntry("b_te", "Dalton Kincaid", "BUF", "IND", ("TE",), 4500, 35.0, 0.10),
            PlayerPoolEntry("i_rb1", "Jonathan Taylor", "IND", "BUF", ("RB",), 5500, 35.0, 0.10),
            PlayerPoolEntry("i_wr1", "Josh Downs", "IND", "BUF", ("WR",), 5000, 35.0, 0.10),
            PlayerPoolEntry("i_wr2", "Alec Pierce", "IND", "BUF", ("WR",), 4500, 35.0, 0.10),
            PlayerPoolEntry("i_dst", "Colts", "IND", "BUF", ("DST",), 3000, 35.0, 0.10),
            PlayerPoolEntry("sf_dst", "49ers", "SF", "JAX", ("DST",), 3000, 10.0, 0.05),
            PlayerPoolEntry("sf_wr", "Jauan Jennings", "SF", "JAX", ("WR",), 4500, 11.0, 0.05),
        ]
        lineups, _ = optimize_classic_lineups(trap_pool, num_lineups=1)
        self.assertGreaterEqual(lineups[0].distinct_games_count, 2)
        self.assertTrue(any(s.player.game_id == "JAX@SF" for s in lineups[0].slots))

    def test_05_classic_qb_double_stack_bringback_and_opp_dst_exclusion(self) -> None:
        pool = build_realistic_week10_pool()
        cfg = ClassicOptimizerConfig(
            min_qb_stack=2,
            min_bringback=1,
            disallow_qb_vs_opp_dst=True,
        )
        lineups, _ = optimize_classic_lineups(pool, num_lineups=3, config=cfg)
        for lu in lineups:
            qb = next(s.player for s in lu.slots if s.slot == "QB")
            dst = next(s.player for s in lu.slots if s.slot == "DST")
            same_team_pass_catchers = [
                s.player
                for s in lu.slots
                if s.slot != "QB"
                and s.player.team == qb.team
                and bool({"WR", "TE"}.intersection(s.player.positions))
            ]
            opp_bringbacks = [
                s.player
                for s in lu.slots
                if s.player.team == qb.opponent
                and bool({"RB", "WR", "TE"}.intersection(s.player.positions))
            ]
            self.assertGreaterEqual(len(same_team_pass_catchers), 2)
            self.assertGreaterEqual(len(opp_bringbacks), 1)
            self.assertNotEqual(dst.team, qb.opponent)

    def test_06_ownership_leverage_penalty_shifts_from_chalk_to_low_owned_pivot(self) -> None:
        pool = build_realistic_week10_pool()
        pool.extend(
            [
                PlayerPoolEntry("chalk_wr", "Chalk Alpha WR", "LAC", "ARI", ("WR",), 5200, 18.2, 0.42),
                PlayerPoolEntry("lev_wr", "Leverage Pivot WR", "LAC", "ARI", ("WR",), 5200, 18.0, 0.04),
            ]
        )
        raw_lu, _ = optimize_classic_lineups(
            pool,
            num_lineups=1,
            config=ClassicOptimizerConfig(
                ownership_penalty_weight=0.0,
                dup_log_penalty_weight=0.0,
                max_cumulative_ownership=2.50,
            ),
        )
        lev_lu, _ = optimize_classic_lineups(
            pool,
            num_lineups=1,
            config=ClassicOptimizerConfig(
                ownership_penalty_weight=6.0,
                dup_log_penalty_weight=1.5,
                max_cumulative_ownership=1.05,
                min_sub_10pct_skill_players=3,
            ),
        )
        self.assertLessEqual(lev_lu[0].cumulative_ownership, 1.05)
        self.assertLess(lev_lu[0].cumulative_ownership, raw_lu[0].cumulative_ownership)
        low_own_count = sum(
            1 for s in lev_lu[0].slots if s.slot != "DST" and s.effective_ownership < 0.10
        )
        self.assertGreaterEqual(low_own_count, 3)

    def test_07_multi_lineup_portfolio_hamming_distance_and_hvz_slate_defaults(self) -> None:
        self.assertEqual(resolve_hvz_overlap_cap(9, num_games_on_slate=11, max_overlap=None, min_unique_players=None, min_hamming_distance=None), 4)
        self.assertEqual(resolve_hvz_overlap_cap(9, num_games_on_slate=3, max_overlap=None, min_unique_players=None, min_hamming_distance=None), 7)
        self.assertEqual(resolve_hvz_overlap_cap(9, num_games_on_slate=6, max_overlap=None, min_unique_players=None, min_hamming_distance=None), 6)

        pool = build_realistic_week10_pool()
        cfg = ClassicOptimizerConfig(min_hamming_distance=6)
        lineups, _ = optimize_classic_lineups(pool, num_lineups=5, config=cfg)
        self.assertEqual(len(lineups), 5)

        for idx_a in range(len(lineups)):
            for idx_b in range(idx_a + 1, len(lineups)):
                d_h = compute_binary_hamming_distance(
                    lineups[idx_a].player_ids, lineups[idx_b].player_ids
                )
                self.assertGreaterEqual(d_h, 6)

    def test_08_per_player_late_swap_locks_early_games_and_reoptimizes_late_flex(self) -> None:
        pool = build_realistic_week10_pool()
        swap_state = LateSwapState(
            locked_slot_assignments={
                "buf_qb1": "QB",
                "buf_wr1": "WR",
                "ind_wr1": "WR",
                "min_rb1": "RB",
                "min_dst": "DST",
            },
            current_time_epoch_cst=1500.0,
        )
        lineups, _ = optimize_classic_lineups(pool, num_lineups=1, late_swap=swap_state)
        lu = lineups[0]
        by_slot_ids = {s.player.player_id: s.slot for s in lu.slots}

        self.assertEqual(by_slot_ids["buf_qb1"], "QB")
        self.assertEqual(by_slot_ids["min_dst"], "DST")

        for s in lu.slots:
            if s.player.player_id not in swap_state.locked_slot_assignments:
                self.assertEqual(s.player.kickoff_epoch_cst, 2000.0)

        with self.assertRaises(LateSwapValidationError):
            optimize_classic_lineups(
                pool,
                num_lineups=1,
                late_swap=LateSwapState(locked_slot_assignments={"buf_qb1": "DST"}),
            )

    def test_09_showdown_captain_15x_salary_points_correlation_and_diversity(self) -> None:
        showdown_pool = [
            p for p in build_realistic_week10_pool() if p.team in {"LAC", "ARI"}
        ]
        cfg = ShowdownOptimizerConfig(
            pair_pass_catcher_cpt_with_qb=True,
            min_qb_cpt_pass_catchers=1,
            min_bringback_opponents=1,
            min_hamming_distance=2,
        )
        lineups, report = optimize_showdown_lineups(showdown_pool, num_lineups=4, config=cfg)
        self.assertNotIn("Michael Wilson", {p.name for p in report.eligible_pool})
        self.assertEqual(len(lineups), 4)

        for lu in lineups:
            self.assertEqual(len(lu.slots), SHOWDOWN_ROSTER_SIZE)
            self.assertLessEqual(lu.total_salary, SHOWDOWN_SALARY_CAP)
            self.assertEqual(len(lu.player_id_set), SHOWDOWN_ROSTER_SIZE)

            cpt = lu.slots[0]
            utils = lu.slots[1:]
            self.assertEqual(cpt.slot, "CPT")
            self.assertTrue(all(u.slot == "UTIL" for u in utils))

            self.assertEqual(cpt.effective_salary, int(round(1.5 * cpt.player.salary)))
            self.assertAlmostEqual(
                cpt.effective_projected_points, 1.5 * cpt.player.projected_points, places=4
            )
            self.assertEqual(set(lu.team_counts.keys()), {"LAC", "ARI"})
            self.assertLessEqual(max(lu.team_counts.values()), 5)

            if bool({"WR", "TE"}.intersection(cpt.player.positions)):
                self.assertTrue(
                    any(
                        u.player.team == cpt.player.team and "QB" in u.player.positions
                        for u in utils
                    )
                )

        for a in range(len(lineups)):
            for b in range(a + 1, len(lineups)):
                d_h = compute_binary_hamming_distance(
                    lineups[a].player_ids, lineups[b].player_ids
                )
                self.assertGreaterEqual(d_h, 2)

    def test_10_winners_curse_haircut_and_infeasibility_guard(self) -> None:
        haircut = compute_winners_curse_haircut(lineup_std=12.0, candidate_pool_size=5000)
        self.assertGreater(haircut, 45.0)
        self.assertLess(haircut, 55.0)

        tiny_pool = build_realistic_week10_pool()[:4]
        with self.assertRaises(OptimizationInfeasibleError):
            optimize_classic_lineups(tiny_pool, num_lineups=1, apply_week10_hygiene=False)

    def test_11_classic_max_8_players_from_single_team_hard_cap(self) -> None:
        # 9 BUF players across every position at $4k/40pts + 1 JAX WR at $4k/10pts
        # Without bring-back constraint, a naive solver would take all 9 BUF players if allowed;
        # max_players_per_team=8 + min_games=2 forces <= 8 BUF players.
        nine_buf_pool = [
            PlayerPoolEntry("b1", "BUF QB", "BUF", "IND", ("QB",), 4000, 40.0, 0.05),
            PlayerPoolEntry("b2", "BUF RB1", "BUF", "IND", ("RB",), 4000, 40.0, 0.05),
            PlayerPoolEntry("b3", "BUF RB2", "BUF", "IND", ("RB",), 4000, 40.0, 0.05),
            PlayerPoolEntry("b4", "BUF RB3", "BUF", "IND", ("RB",), 4000, 40.0, 0.05),
            PlayerPoolEntry("b5", "BUF WR1", "BUF", "IND", ("WR",), 4000, 40.0, 0.05),
            PlayerPoolEntry("b6", "BUF WR2", "BUF", "IND", ("WR",), 4000, 40.0, 0.05),
            PlayerPoolEntry("b7", "BUF WR3", "BUF", "IND", ("WR",), 4000, 40.0, 0.05),
            PlayerPoolEntry("b8", "BUF TE1", "BUF", "IND", ("TE",), 4000, 40.0, 0.05),
            PlayerPoolEntry("b9", "BUF DST", "BUF", "IND", ("DST",), 3000, 40.0, 0.05),
            PlayerPoolEntry("j1", "JAX WR1", "JAX", "SF", ("WR",), 4000, 12.0, 0.05),
        ]
        lineups, _ = optimize_classic_lineups(
            nine_buf_pool,
            num_lineups=1,
            config=ClassicOptimizerConfig(min_bringback=0),
        )
        self.assertLessEqual(lineups[0].team_counts.get("BUF", 0), 8)
        self.assertGreaterEqual(lineups[0].distinct_games_count, 2)

    def test_12_showdown_late_swap_cpt_and_util_slot_pinning(self) -> None:
        showdown_pool = [
            p for p in build_realistic_week10_pool() if p.team in {"LAC", "ARI"}
        ]
        swap = LateSwapState(
            locked_slot_assignments={"ari_te1": "CPT", "ari_qb1": "UTIL"},
            excluded_player_ids=frozenset({"lac_dst"}),
        )
        lineups, _ = optimize_showdown_lineups(showdown_pool, num_lineups=1, late_swap=swap)
        lu = lineups[0]
        self.assertEqual(lu.slots[0].player.player_id, "ari_te1")
        self.assertIn("ari_qb1", {s.player.player_id for s in lu.slots[1:]})
        self.assertNotIn("lac_dst", lu.player_id_set)


if __name__ == "__main__":
    unittest.main(verbosity=2)
