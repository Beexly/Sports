"""Regression suite verifying the elimination of fake projections, IR player leaks,
missing module imports, ASCII checksums, and uncalibrated multipliers across the Week 9 spine.
"""

from __future__ import annotations

import json
from pathlib import Path
import sys
import unittest

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))


class TestNoFakeProjectionsOrIRPlayers(unittest.TestCase):
    """End-to-end verification of all 8 forensic root-cause fixes."""

    def test_1_all_previously_broken_modules_import_cleanly(self) -> None:
        from intelligence.external_charting.morning_sweep_2026_11_08 import (
            load_all_nov8_morning_sweep_summary,
        )
        from intelligence.trends.nfl_multi_horizon_trends_and_pre_game_vision_engine import (
            WEEK9_MATCHUPS,
        )
        from intelligence.ingestion.sunday_0320am_x_api_1000_posts_week9_engine import (
            get_sunday_0320am_x_api_signal_tensor,
        )
        from intelligence.metrics.book_equations_to_stats_compiler import (
            BookEquationsToStatsCompiler,
        )
        import intelligence.trends.scores24_pfr_pff_ngs_unified_trend_engine as s24_mod
        from intelligence.reasoning.layers.layer_registry import ALL_26_LAYERS_META
        from intelligence.reasoning.reasoning_workflow_assembler import (
            execute_reasoning_workflow,
        )
        from intelligence.funnel.gse_causal_looped_funnel_engine import (
            GSECausalLoopedFunnelEngine,
        )
        from intelligence.dfs.dk_200pt_situational_dfs_and_projection_engine import (
            evaluate_360_degree_picks_props_parlays_and_sgps,
        )
        from scripts.ops.run_0730_cst_fresh_pull_and_email_dispatch import (
            pull_fresh_0730_cst_data,
        )

        self.assertEqual(len(ALL_26_LAYERS_META), 26)
        self.assertEqual(len(WEEK9_MATCHUPS), 15)
        self.assertIsNotNone(BookEquationsToStatsCompiler)
        self.assertIsNotNone(s24_mod)
        self.assertIsNotNone(execute_reasoning_workflow)
        self.assertIsNotNone(GSECausalLoopedFunnelEngine)
        self.assertIsNotNone(evaluate_360_degree_picks_props_parlays_and_sgps)
        self.assertIsNotNone(pull_fresh_0730_cst_data)

        x_sig = get_sunday_0320am_x_api_signal_tensor("2026_09_DET_MIA")
        self.assertEqual(x_sig["total_posts"], 0)
        self.assertTrue(x_sig["synthetic_social_posts_disabled"])
        self.assertEqual(load_all_nov8_morning_sweep_summary()["csv_files_count"], 39)

    def test_2_malik_davis_and_alec_pierce_ir_blocked_everywhere(self) -> None:
        from intelligence.dfs.dfs_and_fantasy_accuracy_engine import (
            SUB_FLOOR_ROLE_TRAP_DENYLIST,
            VERIFIED_VACATED_ROLE_CATALYSTS,
        )

        self.assertNotIn("malik davis", VERIFIED_VACATED_ROLE_CATALYSTS)
        self.assertIn("malik davis", SUB_FLOOR_ROLE_TRAP_DENYLIST)
        self.assertIn("alec pierce", SUB_FLOOR_ROLE_TRAP_DENYLIST)

        # Verify Stage-0 bypass was removed from build_week9_dual_slate_dfs_packets.py
        pkt_builder_src = (
            REPO_ROOT / "scripts" / "dfs" / "build_week9_dual_slate_dfs_packets.py"
        ).read_text(encoding="utf-8")
        self.assertNotIn('out.loc[_sf_mask, "status"] = ""', pkt_builder_src)
        self.assertNotIn("12.41 * 1.55", pkt_builder_src)

        # Verify roster truth JSON excludes Malik Davis, Alec Pierce, and backup QBs
        rt_data = json.loads(
            (
                REPO_ROOT
                / "data"
                / "nflverse"
                / "week9_live_roster_transactions_and_starters_2026.json"
            ).read_text(encoding="utf-8")
        )
        excluded_names = {
            str(x.get("name", "")).lower() for x in rt_data.get("excluded_players", [])
        }
        for must_exclude in (
            "malik davis",
            "alec pierce",
            "drew lock",
            "jameis winston",
            "marcus mariota",
        ):
            self.assertIn(must_exclude, excluded_names)
        self.assertEqual(rt_data.get("situational_multipliers_unfitted"), {})

        # Verify cached DFS JSON pools contain zero Malik Davis or Alec Pierce entries
        for rel_json in (
            "data/dfs/gse_post_game_sim_player_projections_week9_2026_11_07.json",
            "data/dfs/gse_dedicated_curated_dfs_player_pool_week9_2026_11_07.json",
        ):
            raw_txt = (REPO_ROOT / rel_json).read_text(encoding="utf-8").lower()
            self.assertNotIn("malik davis", raw_txt)
            self.assertNotIn("alec pierce", raw_txt)

    def test_3_det_mia_line_and_team_total_conservation(self) -> None:
        from intelligence.dfs.dfs_and_fantasy_accuracy_engine import (
            VERIFIED_VACATED_ROLE_CATALYSTS,
        )
        from intelligence.dfs.dk_200pt_situational_dfs_and_projection_engine import (
            evaluate_360_degree_picks_props_parlays_and_sgps,
        )
        from intelligence.simulation.release_0740_cst_live_week9_simulations import (
            WEEK9_LIVE_SLATE_SPECS,
        )

        det_mia = next(
            g for g in WEEK9_LIVE_SLATE_SPECS if g["game_id"] == "2026_09_DET_MIA"
        )
        self.assertEqual(det_mia["book_spread_home"], 7.0)
        self.assertEqual(det_mia["book_total"], 40.5)
        self.assertIn("QB1", det_mia["home_inj"])

        self.assertLessEqual(
            VERIFIED_VACATED_ROLE_CATALYSTS["ollie gordon"]["dk_projection"], 12.0
        )
        self.assertLessEqual(
            VERIFIED_VACATED_ROLE_CATALYSTS["greg dulcich"]["dk_projection"], 7.0
        )

        res_360 = evaluate_360_degree_picks_props_parlays_and_sgps(
            {"game_id": "2026_09_DET_MIA", "away_team": "DET", "home_team": "MIA"},
            {"final_reasoning_delta": 0.04},
        )
        selections = [t["selection"] for t in res_360["evaluated_tickets"]]
        self.assertIn("DET -7.0", selections)
        self.assertNotIn("DET -3.5", selections)
        self.assertFalse(any("Ollie Gordon" in s for s in selections))

    def test_4_no_ascii_ord_checksum_in_causal_funnel(self) -> None:
        from intelligence.context.context_packet_builder import build_context_packet
        from intelligence.funnel.gse_causal_looped_funnel_engine import (
            execute_pass1_foundational_and_arxiv_equations,
        )
        from intelligence.reasoning.reasoning_workflow_assembler import (
            execute_reasoning_workflow,
            validate_reasoning_trace_schema,
        )

        funnel_src = (
            REPO_ROOT / "intelligence" / "funnel" / "gse_causal_looped_funnel_engine.py"
        ).read_text(encoding="utf-8")
        self.assertNotIn("ord(c)", funnel_src)

        # Verify Pass 1 uses real net EPA differential from Nov 8 sfdata-epa-previews
        p1_det_mia = execute_pass1_foundational_and_arxiv_equations(
            home_team="MIA",
            away_team="DET",
            pass_block_win_rate=0.58,
        )
        self.assertIn("pass1_composite_log_odds_delta", p1_det_mia)
        self.assertLess(p1_det_mia["eq_arxiv_1807_09236_btl_shrunk_rating_diff"], 0.0)

        # Verify 26-layer ContextPacket and 5-Track ReasoningTrace execute cleanly for 2026_09_DET_MIA
        pkt = build_context_packet(
            game_id="2026_09_DET_MIA", as_of_utc="2026-11-08T12:00:00Z", persist=False
        )
        trace = execute_reasoning_workflow(pkt, write_to_disk=False)
        validate_reasoning_trace_schema(trace)
        self.assertEqual(len(pkt["layers"]), 26)

    def test_5_tournament_lineups_obey_max_tes_1_and_honest_cvar(self) -> None:
        from scripts.ops.run_0730_cst_fresh_pull_and_email_dispatch import (
            _build_two_wave_tournament_lineups_with_exposure_and_hamming_guards,
            pull_fresh_0730_cst_data,
        )

        manifest = pull_fresh_0730_cst_data()
        self.assertEqual(
            manifest["row_counts"]["nov8_morning_sweep_csv_files_count"], 39
        )
        self.assertIsNotNone(manifest["injury_report_completeness_warning"])
        self.assertIn(
            "STALE_INJURY_REPORT_WARNING",
            manifest["injury_report_completeness_warning"],
        )

        tourney = _build_two_wave_tournament_lineups_with_exposure_and_hamming_guards(
            {}, seed=42, num_sims=2000
        )
        lineups = tourney["two_wave_tournament_lineups"]
        self.assertEqual(len(lineups), 3)
        for lu in lineups:
            self.assertTrue(lu["valid_dk_9_slot_roster"])
            self.assertLessEqual(lu["total_salary"], 50000)
            self.assertGreaterEqual(lu["total_salary"], 49000)
            positions = [r["position"] for r in lu["roster"]]
            players = [r["player"].lower() for r in lu["roster"]]
            # Strictly 1 TE per lineup (zero double-TE FLEX punts)
            self.assertEqual(positions.count("TE"), 1)
            self.assertNotIn("malik davis", players)
            self.assertNotIn("alec pierce", players)
            self.assertNotIn("greg dulcich", players)
            # Honest simulation CVaR (no fake 371.82 inflation)
            self.assertLess(lu["cvar_099_championship_dk_pts"], 300.0)

    def test_6_zero_forged_roster_or_web_bridge_contamination(self) -> None:
        # 1. rosters_2026.csv must never mark Malik Davis as ACT
        rosters_txt = (REPO_ROOT / "data" / "nflverse" / "rosters_2026.csv").read_text(encoding="utf-8")
        self.assertNotIn("Malik Davis,DAL,RB,ACT", rosters_txt)
        self.assertIn("Malik Davis,DAL,RB,INA", rosters_txt)

        # 2. Stage-0 allowlist must not inject fake 25-carry / 115-yard stats into 0-carry RBs
        stage0_src = (
            REPO_ROOT / "scripts" / "ops" / "enforce_stage0_roster_and_board_allowlist.py"
        ).read_text(encoding="utf-8")
        self.assertNotIn('carries"] = 25', stage0_src)
        self.assertNotIn('rush_yds"] = 115.0', stage0_src)

        # 3. Connected game workflow must not hardcode carry/target floors for Malik Davis or Greg Dulcich
        wf_src = (
            REPO_ROOT / "scripts" / "ops" / "gse_connected_game_workflow.py"
        ).read_text(encoding="utf-8")
        self.assertNotIn("base_t = max(base_t, 6.8)", wf_src)
        self.assertNotIn("base_c = max(base_c, 18.5)", wf_src)
        self.assertNotIn("base_c = max(base_c, 11.5)", wf_src)

        # 4. Two-wave iterative engine must not fabricate 1,000 synthetic @RapSheet/@AdamSchefter posts
        tw_src = (
            REPO_ROOT
            / "intelligence"
            / "dfs"
            / "two_wave_200pt_full_information_iterative_perfection_engine.py"
        ).read_text(encoding="utf-8")
        self.assertNotIn("while len(posts) < 1000:", tw_src)

        # 5. Live web TypeScript bridges must be free of Malik Davis, [PULLED_EXCLUDED], DET -3.5, and Malik Willis on MIA
        for rel in (
            "apps/web/lib/fantasy/dfs-slate.ts",
            "apps/web/lib/engine/engine-live-bridge.ts",
            "apps/web/lib/writeups/coach-writeup-engine.ts",
        ):
            ts_txt = (REPO_ROOT / rel).read_text(encoding="utf-8")
            self.assertNotIn("Malik Davis", ts_txt, f"Found Malik Davis in {rel}")
            self.assertNotIn("PULLED_EXCLUDED", ts_txt, f"Found PULLED_EXCLUDED in {rel}")
            self.assertNotIn("DET -3.5", ts_txt, f"Found stale DET -3.5 in {rel}")
            self.assertNotIn(
                "Jared Goff and Malik Willis headline",
                ts_txt,
                f"Found Malik Willis as MIA QB in {rel}",
            )

    def test_7_conserved_nfl_projections_and_diversified_equation_optimizer(self) -> None:
        from intelligence.dfs.conserved_nfl_projection_and_equation_optimizer import (
            build_conserved_week9_player_projections,
            compute_conserved_team_environments,
            optimize_diversified_conserved_dk_portfolio,
        )

        envs = compute_conserved_team_environments()
        self.assertGreaterEqual(len(envs), 24)
        # Verify DET (23.75 implied pts) vs MIA (16.75 implied pts) environment asymmetry
        self.assertGreater(envs["DET"]["implied_team_points"], envs["MIA"]["implied_team_points"])
        self.assertGreater(envs["DET"]["conserved_total_tds"], envs["MIA"]["conserved_total_tds"])

        pool = build_conserved_week9_player_projections()
        by_name = {p["player"]: p for p in pool}

        # Verify IR/INA and unconfirmed backup QBs are completely excluded
        self.assertNotIn("Malik Davis", by_name)
        self.assertNotIn("Drew Lock", by_name)

        # Verify Miami low-total players are naturally suppressed by team-total conservation (no manual hacks)
        self.assertLessEqual(by_name["Ollie Gordon II"]["proj_dk_pts"], 11.5)
        self.assertLessEqual(by_name["Greg Dulcich"]["proj_dk_pts"], 7.5)

        # Verify team receiving yards across RB + WR + TE conserve the team's passing yards budget
        for tm in ("DET", "MIA", "DAL", "PHI", "HOU", "LAC"):
            tm_rec_yds = sum(
                p["proj_rec_yds"]
                for p in pool
                if p["team"] == tm and p["position"] in {"RB", "WR", "TE"}
            )
            self.assertAlmostEqual(
                tm_rec_yds,
                envs[tm]["conserved_pass_yds"],
                delta=4.0,
                msg=f"Team {tm} receiving yards ({tm_rec_yds}) did not conserve pass yards ({envs[tm]['conserved_pass_yds']})",
            )

        # Verify 10-lineup diversified portfolio obeys salary, max_tes=1, starter floors, and exposure caps
        portfolio = optimize_diversified_conserved_dk_portfolio(num_lineups=10, num_sims=2000, seed=42)
        self.assertEqual(portfolio["portfolio_size"], 10)
        for p_name, exp in portfolio["player_exposures"].items():
            self.assertLessEqual(exp, 0.45, f"Player {p_name} exceeded 45% exposure cap: {exp}")

        for lu in portfolio["lineups"]:
            self.assertGreaterEqual(lu["total_salary"], 48500)
            self.assertLessEqual(lu["total_salary"], 50000)
            positions = [r["position"] for r in lu["roster"]]
            self.assertEqual(positions.count("TE"), 1)
            for r in lu["roster"]:
                if r["position"] in {"RB", "WR"}:
                    self.assertGreaterEqual(r["proj_dk_pts"], 8.5)
                elif r["position"] == "TE":
                    self.assertGreaterEqual(r["proj_dk_pts"], 7.5)
                elif r["position"] == "QB":
                    self.assertGreaterEqual(r["proj_dk_pts"], 15.0)

    def test_8_regenerated_dk_upload_csvs_and_all_15_dossiers_clean_on_disk(self) -> None:
        from collections import Counter
        import importlib.util

        guard_spec = importlib.util.spec_from_file_location(
            "connected_workflow_dossier_guard",
            str(REPO_ROOT / "scripts" / "guardrails" / "connected-workflow-dossier-guard.py"),
        )
        assert guard_spec is not None and guard_spec.loader is not None
        guard_mod = importlib.util.module_from_spec(guard_spec)
        guard_spec.loader.exec_module(guard_mod)

        # 1. Verify both DraftKings Upload CSVs on disk
        for rel_csv, expected_lineups in (
            ("data/dfs/Garrett_Personal_And_Hybrids_DK_Upload_Week9_2026_11_08.csv", 13),
            ("data/dfs/Dad_Top20_DK_Upload_MainSlate_Week9_2026_11_08.csv", 20),
        ):
            csv_path = REPO_ROOT / rel_csv
            lines = [ln.strip() for ln in csv_path.read_text(encoding="utf-8").splitlines() if ln.strip()]
            self.assertEqual(lines[0], "QB,RB,RB,WR,WR,WR,TE,FLEX,DST")
            data_rows = lines[1:]
            self.assertEqual(len(data_rows), expected_lineups, f"Expected {expected_lineups} lineups in {rel_csv}")
            counts: Counter[str] = Counter()
            for row in data_rows:
                low_row = row.lower()
                self.assertNotIn("drew lock", low_row)
                self.assertNotIn("malik davis", low_row)
                self.assertNotIn("alec pierce", low_row)
                cells = [c.strip() for c in row.split(",")]
                self.assertEqual(len(cells), 9)
                for cell in cells:
                    counts[cell] += 1
            max_exp = max(c / len(data_rows) for c in counts.values())
            self.assertLessEqual(max_exp, 0.405, f"Max exposure {max_exp} exceeded 40% in {rel_csv}")

        # 2. Verify all 15 Week 9 Connected Workflow Dossiers on disk
        dossier_paths = sorted((REPO_ROOT / "data" / "engine").glob("connected_workflow_dossier_*_week9.json"))
        self.assertEqual(len(dossier_paths), 15)
        for dp in dossier_paths:
            raw_txt = dp.read_text(encoding="utf-8")
            low_txt = raw_txt.lower()
            self.assertNotIn("malik davis", low_txt, f"Malik Davis leaked into {dp.name}")
            self.assertNotIn("alec pierce", low_txt, f"Alec Pierce leaked into {dp.name}")
            d_obj = json.loads(raw_txt)
            guard_mod.verify_connected_workflow_json(dp)
            violations = guard_mod.validate_dossier_forensic_invariants(d_obj)
            self.assertEqual(violations, [], f"Dossier {dp.name} failed forensic invariants: {violations}")

        # 3. Verify DET@MIA dossier specifically enforces conserved Miami stats on disk
        det_mia_d = json.loads(
            (REPO_ROOT / "data" / "engine" / "connected_workflow_dossier_det_mia_week9.json").read_text(encoding="utf-8")
        )
        mia_athletes = det_mia_d["stage3_4_conserved_post_sim_projections"]["athlete_post_sim_projections"]
        self.assertLessEqual(mia_athletes["Ollie Gordon II"]["projections"]["rush_yds"]["mean"], 60.0)
        self.assertLessEqual(mia_athletes["Greg Dulcich"]["projections"]["rec_yds"]["mean"], 35.0)

    def test_9_week9_sunday_settlement_and_mnf_buf_min_projections_verified(self) -> None:
        from intelligence.dfs.conserved_nfl_projection_and_equation_optimizer import (
            CORPUS_503_BOOKS_NFL_STAT_PROJECTION_ARCHITECTURE,
            project_full_nfl_game_box_score_from_dossier,
        )

        self.assertEqual(len(CORPUS_503_BOOKS_NFL_STAT_PROJECTION_ARCHITECTURE["laws_of_nfl_stat_projection"]), 5)

        settlement_path = (
            REPO_ROOT / "data" / "engine" / "settlements" / "week9_sunday_2026-11-08_settlement.json"
        )
        self.assertTrue(settlement_path.is_file())
        settlement = json.loads(settlement_path.read_text(encoding="utf-8"))
        self.assertEqual(settlement["completed_games_count"], 14)
        self.assertEqual(settlement["stage5_official_plays_summary"]["record"], "7-4-0")
        self.assertGreater(settlement["stage5_official_plays_summary"]["net_units_1u_flat"], 2.0)

        comp = settlement["projection_engine_comparison_vs_sunday_actuals"]
        self.assertLess(
            comp["conserved_503_book_engine_mae_dk_pts"],
            comp["legacy_broken_pipeline_mae_dk_pts"],
        )
        self.assertLess(
            comp["conserved_503_book_engine_rmse_dk_pts"],
            comp["legacy_broken_pipeline_rmse_dk_pts"],
        )

        mnf = project_full_nfl_game_box_score_from_dossier("BUF @ MIN", apply_sunday_residual_calibration=True)
        self.assertEqual(mnf["confirmed_qb1"]["BUF"], "Josh Allen")
        self.assertEqual(mnf["confirmed_qb1"]["MIN"], "Carson Wentz")
        mnf_names = {p["player"].lower() for p in mnf["player_stat_projections"]}
        self.assertIn("josh allen", mnf_names)
        self.assertIn("carson wentz", mnf_names)
        self.assertNotIn("kyler murray", mnf_names)

        for tm in ("BUF", "MIN"):
            b = mnf["team_conserved_box_score_budgets"][tm]
            self.assertAlmostEqual(b["sum_skill_rec_yds"], b["conserved_pass_yds"], delta=1.0)
            self.assertAlmostEqual(b["sum_skill_receptions"], b["conserved_completions"], delta=0.5)
            self.assertAlmostEqual(b["sum_team_rush_yds"], b["conserved_total_rush_yds"], delta=1.0)


if __name__ == "__main__":
    unittest.main()


