#!/usr/bin/env python3
"""Comprehensive 4-Tier E2E Verification Suite for Unified 5,000+ Equation Projections,
Week 9 Sunday Settlement, MNF `BUF @ MIN` Dossier Sync, and Storefront Alignment
(`tests/unit/test_unified_5000eq_mnf_projections_and_storefront.py`).

Covers all 8 Features (`F1`–`F8`) specified in `.agents/teamwork/PROJECT.md`:
  - Tier 1 — Feature Coverage (`F1`–`F7`)
  - Tier 2 — Boundary & Corner Cases (Zero IR/Inactive Starters, Dossier Invariants 2 & 3, EB Shrinkage)
  - Tier 3 — Cross-Feature Combinations (Funnel Stage 2 + Spatial Prop Evaluator + Conserved Optimizer)
  - Tier 4 — Real-World Application Scenarios (Subprocess execution of CI Guardrails)
"""

from __future__ import annotations

import inspect
import json
import math
import re
import subprocess
import sys
import unittest
from pathlib import Path
from typing import Any, Dict, List

import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from intelligence.dfs.conserved_nfl_projection_and_equation_optimizer import (
    _empirical_bayes_within_group_weights,
    build_conserved_week9_player_projections,
    compute_conserved_team_environments,
    project_full_nfl_game_box_score_from_dossier,
)
from intelligence.funnel.gse_causal_looped_funnel_engine import (
    CANONICAL_PROJECTIONS_OUT_PATH,
    FunnelSequenceViolationError,
    GSECausalLoopedFunnelEngine,
)
from intelligence.metrics.book_equations_to_stats_compiler import (
    CANONICAL_92_STATS_AND_METRICS,
    COMPILED_STATS_OUTPUT_PATH,
    BookEquationsToStatsCompiler,
)
from intelligence.props.spatial_micro_metrics_prop_and_matchup_evaluator import (
    SpatialMicroMetricsPropAndMatchupEvaluator,
)
def _load_dossier_guard_module():
    import importlib.util

    guard_path = REPO_ROOT / "scripts" / "guardrails" / "connected-workflow-dossier-guard.py"
    spec = importlib.util.spec_from_file_location("connected_workflow_dossier_guard", guard_path)
    assert spec is not None and spec.loader is not None
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


GUARD_MOD = _load_dossier_guard_module()


class TestTier1FeatureCoverage(unittest.TestCase):
    """Tier 1 — Core feature coverage across F1 through F7."""

    def test_t1_f1_book_equations_to_stats_compiler_21419_deterministic_routing(self) -> None:
        """F1: Verify BookEquationsToStatsCompiler compiles all 21,419 equations across 503 books
        into the 92 canonical micro-metrics with deterministic routing (zero MD5 fallback).
        """
        compiler_src = inspect.getsource(BookEquationsToStatsCompiler)
        self.assertNotIn(
            "hashlib.md5",
            compiler_src,
            "BookEquationsToStatsCompiler must use deterministic target_layer/family routing, never hashlib.md5.",
        )

        self.assertTrue(
            COMPILED_STATS_OUTPUT_PATH.is_file(),
            f"Missing compiled stats artifact: {COMPILED_STATS_OUTPUT_PATH}",
        )
        payload = json.loads(COMPILED_STATS_OUTPUT_PATH.read_text(encoding="utf-8"))
        summary = payload.get("corpus_and_equation_binding_summary", {})

        self.assertEqual(summary.get("complete_503_corpus_books_count"), 503)
        self.assertEqual(summary.get("mega_sweep_458_books_count"), 458)
        self.assertEqual(summary.get("active_sports_spine_books_count"), 435)
        self.assertEqual(summary.get("quarantined_medical_books_count"), 68)
        self.assertEqual(summary.get("total_equations_compiled"), 21419)
        self.assertEqual(summary.get("active_equations_above_min_sample"), 20019)
        self.assertEqual(summary.get("held_equations_below_min_sample"), 1400)
        self.assertEqual(summary.get("canonical_equation_families_count"), 279)
        self.assertEqual(summary.get("compiled_stats_and_micro_metrics_count"), 92)
        self.assertEqual(summary.get("unmapped_show_and_tell_books_count"), 0)
        self.assertEqual(summary.get("unmapped_show_and_tell_equations_count"), 0)

        # Verify all 32 teams and 15 Week 9 games have all 92 stats compiled
        teams_32 = payload.get("teams_32_compiled_stats", {})
        games_15 = payload.get("week9_games_compiled_stats", {})
        self.assertEqual(len(teams_32), 32)
        self.assertEqual(len(games_15), 15)
        for tm, tm_pkt in teams_32.items():
            stats_92 = tm_pkt.get("compiled_92_stats", {})
            self.assertEqual(
                len(stats_92),
                92,
                f"Team {tm} expected 92 compiled stats, got {len(stats_92)}",
            )
            for k in CANONICAL_92_STATS_AND_METRICS:
                self.assertIn(k, stats_92)

        # Verify deterministic repeatability of equation-to-stat mapping if helper exists
        compiler = BookEquationsToStatsCompiler()
        if hasattr(compiler, "_build_equation_to_stat_mapping"):
            m1 = compiler._build_equation_to_stat_mapping()
            m2 = compiler._build_equation_to_stat_mapping()
            self.assertEqual(m1, m2)
            self.assertEqual(len(m1), 92)

    def test_t1_f2_f3_conserved_projection_team_identities_and_decoupled_ypr(self) -> None:
        """F2 & F3: Verify conserved_nfl_projection_and_equation_optimizer.py enforces strict
        team-level conservation within rounding tolerance and produces decoupled YPR/YPC
        across pass-catchers (Justin Jefferson YPR > Aaron Jones YPR on MIN).
        """
        team_envs = compute_conserved_team_environments()
        self.assertGreaterEqual(len(team_envs), 28, "Expected at least 28 active Week 9 teams in team_envs")

        for tm, env in team_envs.items():
            rec_share_sum = (
                float(env["wr_rec_share"])
                + float(env["te_rec_share"])
                + float(env["rb_rec_share"])
            )
            self.assertAlmostEqual(
                rec_share_sum,
                1.0,
                places=3,
                msg=f"Team {tm} receiving shares do not sum to 1.0: {rec_share_sum}",
            )
            if all(k in env for k in ("wr_td_share", "te_td_share", "rb_td_share")):
                td_share_sum = (
                    float(env["wr_td_share"])
                    + float(env["te_td_share"])
                    + float(env["rb_td_share"])
                )
                self.assertAlmostEqual(
                    td_share_sum,
                    1.0,
                    places=3,
                    msg=f"Team {tm} receiving TD shares do not sum to 1.0: {td_share_sum}",
                )

        mnf_box = project_full_nfl_game_box_score_from_dossier("BUF @ MIN")
        budgets = mnf_box["team_conserved_box_score_budgets"]
        players = mnf_box["player_stat_projections"]

        for tm in ("BUF", "MIN"):
            b = budgets[tm]
            tm_players = [p for p in players if p["team"] == tm]
            tm_skill = [p for p in tm_players if p["position"] in {"RB", "WR", "TE"}]

            sum_rec_yds = sum(float(p["proj_rec_yds"]) for p in tm_skill)
            sum_recs = sum(float(p["proj_receptions"]) for p in tm_skill)
            sum_rush_yds = sum(float(p["proj_rush_yds"]) for p in tm_players)
            sum_rec_tds = sum(float(p["proj_rec_tds"]) for p in tm_skill)

            self.assertLessEqual(
                abs(sum_rec_yds - float(b["conserved_pass_yds"])),
                0.5,
                f"{tm} sum(player_rec_yds)={sum_rec_yds} != conserved_pass_yds={b['conserved_pass_yds']}",
            )
            self.assertLessEqual(
                abs(sum_recs - float(b["conserved_completions"])),
                0.15,
                f"{tm} sum(player_receptions)={sum_recs} != conserved_completions={b['conserved_completions']}",
            )
            self.assertLessEqual(
                abs(sum_rush_yds - float(b["conserved_total_rush_yds"])),
                0.5,
                f"{tm} sum(player_rush_yds)={sum_rush_yds} != conserved_total_rush_yds={b['conserved_total_rush_yds']}",
            )
            self.assertLessEqual(
                abs(sum_rec_tds - float(b["conserved_pass_tds"])),
                0.05,
                f"{tm} sum(player_rec_tds)={sum_rec_tds} != conserved_pass_tds={b['conserved_pass_tds']}",
            )

        # Verify decoupled YPR on MIN: Justin Jefferson YPR > Aaron Jones YPR
        by_name = {p["player"]: p for p in players}
        self.assertIn("Justin Jefferson", by_name)
        self.assertIn("Aaron Jones", by_name)
        jj = by_name["Justin Jefferson"]
        aj = by_name["Aaron Jones"]
        jj_ypr = float(jj["proj_rec_yds"]) / max(0.1, float(jj["proj_receptions"]))
        aj_ypr = float(aj["proj_rec_yds"]) / max(0.1, float(aj["proj_receptions"]))
        self.assertGreater(
            jj_ypr,
            aj_ypr + 1.0,
            f"Expected decoupled YPR with Justin Jefferson ({jj_ypr:.2f}) > Aaron Jones ({aj_ypr:.2f})",
        )

        # Verify James Cook lead back rush efficiency on BUF
        self.assertIn("James Cook", by_name)
        cook = by_name["James Cook"]
        self.assertGreaterEqual(
            float(cook["proj_rush_yds"]),
            65.0,
            f"Expected James Cook projected rushing yards >= 65.0, got {cook['proj_rush_yds']}",
        )

    def test_t1_f3_week9_sunday_settlement_mae_and_7_4_0_record(self) -> None:
        """F3: Verify Week 9 Sunday settled player benchmark achieves MAE < 5.0 DK pts
        (improving significantly on 12.08 legacy MAE) and 7-4-0 (+2.06u) game-line record.
        """
        settlement_path = (
            REPO_ROOT / "data" / "engine" / "settlements" / "week9_sunday_2026-11-08_settlement.json"
        )
        self.assertTrue(settlement_path.is_file(), f"Missing {settlement_path}")
        settlement = json.loads(settlement_path.read_text(encoding="utf-8"))

        plays = settlement.get("stage5_official_plays_summary", {})
        self.assertEqual(plays.get("record"), "7-4-0")
        self.assertEqual(plays.get("wins"), 7)
        self.assertEqual(plays.get("losses"), 4)
        self.assertEqual(plays.get("pushes"), 0)
        self.assertAlmostEqual(float(plays.get("net_units_1u_flat", 0.0)), 2.06, delta=0.05)

        comp = settlement.get("projection_engine_comparison_vs_sunday_actuals", {})
        conserved_mae = float(comp.get("conserved_503_book_engine_mae_dk_pts", 99.0))
        legacy_mae = float(comp.get("legacy_broken_pipeline_mae_dk_pts", 0.0))
        self.assertAlmostEqual(legacy_mae, 12.08, delta=0.5)
        self.assertLess(
            conserved_mae,
            5.0,
            f"Expected upgraded conserved_503_book_engine_mae_dk_pts < 5.0, got {conserved_mae}",
        )

    def test_t1_f4_coach_mind_simulator_compiled_92_stats_and_qb_tier_dropoff(self) -> None:
        """F4: Verify compute_qb_tier_adjusted_epa in gse_coach_mind_simulator.py incorporates
        compiled_92_pocket_survival and preserves QB1_STARTER > QB2_BACKUP > EMERGENCY_QB3_UDFA ordering.
        """
        from scripts.ops.gse_coach_mind_simulator import compute_qb_tier_adjusted_epa

        res_qb1 = compute_qb_tier_adjusted_epa(0.10, "QB1_STARTER", compiled_92_pocket_survival=0.68)
        res_qb2 = compute_qb_tier_adjusted_epa(0.10, "QB2_BACKUP", compiled_92_pocket_survival=0.45)
        res_qb3 = compute_qb_tier_adjusted_epa(0.10, "EMERGENCY_QB3_UDFA", compiled_92_pocket_survival=0.38)
        self.assertGreater(res_qb1["adjusted_off_epa"], res_qb2["adjusted_off_epa"])
        self.assertGreater(res_qb2["adjusted_off_epa"], res_qb3["adjusted_off_epa"])
        self.assertEqual(res_qb2["compiled_92_pocket_survival"], 0.45)

    def test_t1_f5_mnf_buf_min_dossier_zero_discrepancy_and_showdown_cpt(self) -> None:
        """F5: Verify connected_workflow_dossier_buf_min_week9.json and
        mnf_buf_min_conserved_stat_projections_2026_11_09.json are 100% aligned.
        """
        dossier_path = REPO_ROOT / "data" / "engine" / "connected_workflow_dossier_buf_min_week9.json"
        mnf_proj_path = (
            REPO_ROOT / "data" / "projections" / "mnf_buf_min_conserved_stat_projections_2026_11_09.json"
        )
        self.assertTrue(dossier_path.is_file())
        self.assertTrue(mnf_proj_path.is_file())

        # 1. Verify unbroken SHA-256 cryptographic lineage chain via guard
        GUARD_MOD.verify_connected_workflow_json(dossier_path)

        dossier = json.loads(dossier_path.read_text(encoding="utf-8"))
        mnf_proj = json.loads(mnf_proj_path.read_text(encoding="utf-8"))

        s34 = dossier["stage3_4_conserved_post_sim_projections"]
        s5 = dossier["stage5_360_conjunction_gate"]

        # 2. Verify team budgets match between dossier Stage 3/4 and MNF conserved projections
        for tm in ("BUF", "MIN"):
            t_doss = s34["team_post_sim_projections"][tm]
            t_mnf = mnf_proj["team_conserved_box_score_budgets"][tm]
            doss_pass = (
                float(t_doss["pass_yds"]["mean"])
                if isinstance(t_doss.get("pass_yds"), dict)
                else float(t_doss["passing_yards_mean"])
            )
            doss_rush = (
                float(t_doss["rush_yds"]["mean"])
                if isinstance(t_doss.get("rush_yds"), dict)
                else float(t_doss["rushing_yards_mean"])
            )
            self.assertLessEqual(
                abs(doss_pass - float(t_mnf["conserved_pass_yds"])),
                0.5,
                f"{tm} pass_yds.mean mismatch: dossier={doss_pass} vs mnf={t_mnf['conserved_pass_yds']}",
            )
            self.assertLessEqual(
                abs(doss_rush - float(t_mnf["conserved_total_rush_yds"])),
                0.5,
                f"{tm} rush_yds.mean mismatch: dossier={doss_rush} vs mnf={t_mnf['conserved_total_rush_yds']}",
            )

        # 3. Verify strictly monotonic quantiles p10 <= p25 <= p50 <= p75 <= p90 across all Stage 3/4 athletes
        athletes_s34 = s34.get("athlete_post_sim_projections", {})
        self.assertGreaterEqual(len(athletes_s34), 8)
        for a_name, a_obj in athletes_s34.items():
            proj_map = a_obj.get("projections") or a_obj.get("stats") or {}
            for stat_k, stat_v in proj_map.items():
                if isinstance(stat_v, dict) and all(q in stat_v for q in ("p10", "p25", "p50", "p75", "p90")):
                    q_vals = [float(stat_v[q]) for q in ("p10", "p25", "p50", "p75", "p90")]
                    self.assertEqual(
                        q_vals,
                        sorted(q_vals),
                        f"Non-monotonic quantiles for {a_name} {stat_k}: {q_vals}",
                    )

        # 4. Verify Stage 3/4 vs Stage 5 prop mean alignment within <= 0.15
        market_to_stat_keys = {
            "Total Passing Yards (incl. overtime)": ("pass_yds", "passing_yards"),
            "Total Passing Touchdowns (incl. overtime)": ("pass_tds", "passing_tds"),
            "Total Pass Completions (incl. overtime)": ("pass_completions", "completions"),
            "Total Passing Attempts (incl. overtime)": ("pass_attempts",),
            "Total Rushing Yards (incl. overtime)": ("rush_yds", "rushing_yards"),
            "Total Carries (incl. overtime)": ("carries", "rush_attempts"),
            "Total Receiving Yards (incl. overtime)": ("rec_yds", "receiving_yards"),
            "Total Receptions (incl. overtime)": ("receptions",),
        }
        for prop in s5.get("core_prop_evaluations", []):
            a_name = prop.get("athlete")
            m_name = prop.get("market")
            cand_keys = market_to_stat_keys.get(m_name, ())
            if a_name in athletes_s34 and cand_keys:
                proj_map = athletes_s34[a_name].get("projections") or athletes_s34[a_name].get("stats") or {}
                s34_stat = next((proj_map[k] for k in cand_keys if k in proj_map), None)
                if isinstance(s34_stat, dict) and "mean" in s34_stat:
                    diff = abs(float(prop["post_sim_mean"]) - float(s34_stat["mean"]))
                    self.assertLessEqual(
                        diff,
                        0.15,
                        f"Stage 3/4 vs Stage 5 mean discrepancy for {a_name} {m_name}: "
                        f"s5={prop['post_sim_mean']} vs s34={s34_stat['mean']}",
                    )

        # 5. Verify Showdown Captain lineup index 0 has slot == "CPT" for Josh Allen ($15,600)
        sd_lineups = s5.get("optimal_dfs_showdown_lineups", {})
        lu_list = list(sd_lineups.values()) if isinstance(sd_lineups, dict) else list(sd_lineups)
        self.assertGreaterEqual(len(lu_list), 1)
        for lu_obj in lu_list:
            roster = lu_obj.get("roster") or lu_obj.get("lineup") or []
            self.assertEqual(len(roster), 6)
            self.assertEqual(roster[0].get("slot"), "CPT")
            self.assertEqual(roster[0].get("player") or roster[0].get("athlete"), "Josh Allen")
            self.assertEqual(int(roster[0].get("salary", 0)), 15600)
            self.assertLessEqual(int(lu_obj.get("total_salary", 99999)), 50000)

        # 6. Verify Nov 7-9 consolidated research signals (Playcaller WAR, Q52-Q54 splits, James Cook RYOE)
        cons_sig = mnf_proj.get("consolidated_research_signals_2026_11_09", {})
        self.assertEqual(cons_sig.get("playcaller_war_residuals", {}).get("buf_oc_joe_brady_epa_per_play"), 0.07)
        self.assertEqual(cons_sig.get("playcaller_war_residuals", {}).get("min_dc_brian_flores_epa_per_play"), -0.11)
        self.assertEqual(cons_sig.get("situational_and_spatial_anchors", {}).get("min_series_conversion_rate_allowed_pct"), 62.4)
        self.assertEqual(cons_sig.get("situational_and_spatial_anchors", {}).get("buf_avg_drive_start_yardline"), 34.79)
        self.assertEqual(cons_sig.get("situational_and_spatial_anchors", {}).get("james_cook_ryoe_per_att"), 0.99)
        self.assertIn("Q52", cons_sig.get("intel_loop_q52_q54_splits", {}))
        self.assertIn("Q53", cons_sig.get("intel_loop_q52_q54_splits", {}))
        self.assertIn("Q54", cons_sig.get("intel_loop_q52_q54_splits", {}))
        self.assertEqual(s34.get("consolidated_research_signals_2026_11_09"), cons_sig)

    def test_t1_f6_f7_web_storefront_mnf_alignment_and_pricing_integrity(self) -> None:
        """F6 & F7: Verify apps/web storefront files align with MNF BUF @ MIN, repair
        pricing/DFS/methodology defects, and contain zero banned robotic phrases or XX% confidence.
        """
        GUARD_MOD.verify_web_storefront_human_copy()

        writeup_path = REPO_ROOT / "apps" / "web" / "lib" / "writeups" / "coach-writeup-engine.ts"
        bridge_path = REPO_ROOT / "apps" / "web" / "lib" / "engine" / "engine-live-bridge.ts"
        redline_path = REPO_ROOT / "apps" / "web" / "components" / "redline" / "redline-world.tsx"
        pricing_path = REPO_ROOT / "apps" / "web" / "app" / "pricing" / "page.tsx"
        dfs_page_path = REPO_ROOT / "apps" / "web" / "app" / "fantasy" / "dfs" / "page.tsx"
        sealed_path = REPO_ROOT / "apps" / "web" / "components" / "week8" / "sealed-table.tsx"
        packet_path = (
            REPO_ROOT
            / "docs"
            / "predictions"
            / "research"
            / "2026-11-09"
            / "MNF-BUF-MIN-FOUNDER-COMMAND-AND-MONETIZATION-PACKET.md"
        )

        # 1. coach-writeup-engine.ts MNF block check
        writeup_text = writeup_path.read_text(encoding="utf-8")
        mnf_idx = writeup_text.find('"id": "writeup-mnf-401873051"')
        self.assertNotEqual(mnf_idx, -1, "Missing writeup-mnf-401873051 in coach-writeup-engine.ts")
        mnf_block = writeup_text[mnf_idx : mnf_idx + 5500]
        self.assertIn("Buffalo Bills -3.5", mnf_block)
        self.assertIn("72/100", mnf_block)
        self.assertIn("55.5", mnf_block)
        self.assertIn("48.5", mnf_block)
        self.assertIn("Josh Allen", mnf_block)
        self.assertNotIn("Justin Jefferson OVER 82.5", mnf_block)

        # 2. engine-live-bridge.ts MNF SGP & Showdown Captain check
        bridge_text = bridge_path.read_text(encoding="utf-8")
        self.assertIn("BUF @ MIN", bridge_text)
        self.assertIn("Josh Allen", bridge_text)
        self.assertNotIn("Justin Jefferson 80+ Rec Yds", bridge_text)

        # 3. redline-world.tsx MNF & Week 9 Sunday 7-4-0 proof check
        redline_text = redline_path.read_text(encoding="utf-8")
        self.assertIn("36-13-1", redline_text)
        self.assertIn("47-19-1", redline_text)
        self.assertTrue(
            "7-4-0" in redline_text or "Buffalo Bills @ Minnesota Vikings" in redline_text,
            "Expected Week 9 7-4-0 proof or MNF BUF @ MIN preview in redline-world.tsx",
        )

        # 4. pricing/page.tsx conversion link check
        pricing_text = pricing_path.read_text(encoding="utf-8")
        self.assertNotIn(
            "/packages#tnf-all-in-pack",
            pricing_text,
            "pricing/page.tsx must not link to closed #tnf-all-in-pack",
        )

        # 5. fantasy/dfs/page.tsx duplicate sentence & closed pack check
        dfs_text = dfs_page_path.read_text(encoding="utf-8")
        self.assertNotIn(
            "No licensed salary feed is connected. No licensed DFS salary feed is connected to this surface.",
            dfs_text,
            "Duplicate salary feed sentence must be removed from fantasy/dfs/page.tsx",
        )
        self.assertNotIn(
            'getPackageBySlug("tnf-all-in-pack")',
            dfs_text,
            "fantasy/dfs/page.tsx must not render closed tnf-all-in-pack",
        )

        # 6. sealed-table.tsx fake Trench X-Ray check
        sealed_text = sealed_path.read_text(encoding="utf-8")
        self.assertNotIn(
            "Offensive line pass protection +1.34s pocket time · Defensive front pressure rate 28.4%",
            sealed_text,
            "Hardcoded fake Trench X-Ray string must be removed from sealed-table.tsx",
        )

        # 7. Founder MNF Command & Monetization Packet check
        self.assertTrue(
            packet_path.is_file(),
            f"Missing Founder MNF Command & Monetization Packet: {packet_path}",
        )
        packet_text = packet_path.read_text(encoding="utf-8")
        self.assertGreater(len(packet_text), 1500)
        self.assertIn("BUF @ MIN", packet_text)
        self.assertIn("7-4-0", packet_text)

        # 8. Check zero banned phrases and zero XX% confidence strings across storefront files
        for p in (writeup_path, bridge_path, redline_path, pricing_path, dfs_page_path, sealed_path):
            txt = p.read_text(encoding="utf-8")
            for banned in GUARD_MOD.BANNED_WEB_STOREFRONT_PHRASES:
                self.assertNotIn(
                    banned.lower(),
                    txt.lower(),
                    f"Banned phrase '{banned}' found in {p.relative_to(REPO_ROOT)}",
                )
            m = GUARD_MOD.PERCENT_CONF_RE.search(txt)
            self.assertIsNone(
                m,
                f"Forbidden percentage confidence '{m.group(0) if m else ''}' in {p.relative_to(REPO_ROOT)}",
            )


class TestTier2BoundaryAndCornerCases(unittest.TestCase):
    """Tier 2 — Boundary conditions, roster hygiene, and forensic invariants."""

    def test_t2_zero_inactive_or_ir_players_in_active_week9_projections(self) -> None:
        """Verify zero inactive/IR/excluded players appear as active Week 9 starters across
        MNF projections, Week 9 conserved pool, Funnel Stage 2 projections, and Spatial Prop Evaluator.
        """
        banned_global_inactive = {
            "kyler murray",
            "de'von achane",
            "devon achane",
            "christian kirk",
            "tyreek hill",
        }
        banned_mnf_buf_min = banned_global_inactive | {
            "j.j. mccarthy",
            "jj mccarthy",
            "sam howell",
            "stefon diggs",
        }
        banned_player_team_pairs = {
            ("j.j. mccarthy", "MIN"),
            ("jj mccarthy", "MIN"),
            ("sam howell", "MIN"),
            ("stefon diggs", "HOU"),
            ("christian kirk", "JAX"),
        }

        # 1. MNF BUF @ MIN conserved stat projections
        mnf_path = (
            REPO_ROOT / "data" / "projections" / "mnf_buf_min_conserved_stat_projections_2026_11_09.json"
        )
        mnf_data = json.loads(mnf_path.read_text(encoding="utf-8"))
        for p in mnf_data.get("player_stat_projections", []):
            nm = str(p.get("player") or "").strip().lower()
            self.assertNotIn(nm, banned_mnf_buf_min, f"Inactive player {nm} in MNF projections")

        # 2. Conserved Week 9 player pool
        conserved_pool = build_conserved_week9_player_projections()
        self.assertGreaterEqual(len(conserved_pool), 120)
        for p in conserved_pool:
            nm = str(p.get("player") or p.get("name") or "").strip().lower()
            tm = str(p.get("team") or "").strip().upper()
            self.assertNotIn(nm, banned_global_inactive, f"Inactive player {nm} in conserved pool")
            self.assertNotIn(
                (nm, tm),
                banned_player_team_pairs,
                f"Stale/excluded player-team pair {(nm, tm)} in conserved pool",
            )

        # 3. Canonical Looped Funnel projections JSON
        if CANONICAL_PROJECTIONS_OUT_PATH.is_file():
            funnel_data = json.loads(CANONICAL_PROJECTIONS_OUT_PATH.read_text(encoding="utf-8"))
            for p in funnel_data.get("canonical_player_projections", []):
                nm = str(p.get("player_name") or p.get("player") or "").strip().lower()
                tm = str(p.get("team") or "").strip().upper()
                self.assertNotIn(
                    nm,
                    banned_global_inactive,
                    f"Inactive player {nm} in canonical_looped_funnel_projections",
                )
                self.assertNotIn(
                    (nm, tm),
                    banned_player_team_pairs,
                    f"Stale/excluded player-team pair {(nm, tm)} in canonical_looped_funnel_projections",
                )

        # 4. Spatial Micro-Metrics Prop Evaluator
        evaluator = SpatialMicroMetricsPropAndMatchupEvaluator()
        dossiers = evaluator.compile_full_week9_slate()
        self.assertEqual(len(dossiers), 15)
        for m_str, d in dossiers.items():
            for rb in d.rbs:
                r_low = rb.player_name.strip().lower()
                self.assertNotIn(
                    r_low,
                    banned_global_inactive,
                    f"Inactive RB {rb.player_name} in Spatial Evaluator ({m_str})",
                )
                self.assertNotIn(
                    (r_low, rb.team.upper()),
                    banned_player_team_pairs,
                    f"Stale/excluded RB {(r_low, rb.team.upper())} in Spatial Evaluator ({m_str})",
                )
            for wr in d.wrs_tes:
                w_low = wr.player_name.strip().lower()
                self.assertNotIn(
                    w_low,
                    banned_global_inactive,
                    f"Inactive WR/TE {wr.player_name} in Spatial Evaluator ({m_str})",
                )
                self.assertNotIn(
                    (w_low, wr.team.upper()),
                    banned_player_team_pairs,
                    f"Stale/excluded WR/TE {(w_low, wr.team.upper())} in Spatial Evaluator ({m_str})",
                )
            for qb in d.qbs:
                q_low = qb.player_name.strip().lower()
                self.assertNotIn(
                    q_low,
                    banned_global_inactive,
                    f"Inactive QB {qb.player_name} in Spatial Evaluator ({m_str})",
                )
                self.assertNotIn(
                    (q_low, qb.team.upper()),
                    banned_player_team_pairs,
                    f"Stale/excluded QB {(q_low, qb.team.upper())} in Spatial Evaluator ({m_str})",
                )

    def test_t2_dossier_forensic_invariants_2_and_3_on_mnf_buf_min(self) -> None:
        """Verify INVARIANT_2 (max_prop_win_prob <= 0.780) and INVARIANT_3 (no unpriced prop
        marked publishAllowed: true) hold across all props in connected_workflow_dossier_buf_min_week9.json.
        """
        dossier_path = REPO_ROOT / "data" / "engine" / "connected_workflow_dossier_buf_min_week9.json"
        dossier = json.loads(dossier_path.read_text(encoding="utf-8"))

        violations = GUARD_MOD.validate_dossier_forensic_invariants(dossier)
        self.assertEqual(
            violations,
            [],
            f"Forensic invariant violations on BUF @ MIN dossier: {violations}",
        )

        s5 = dossier["stage5_360_conjunction_gate"]
        all_props = list(s5.get("core_prop_evaluations", [])) + list(
            s5.get("top_15_ranked_prop_plays_at_reference_juice", [])
        )
        self.assertGreaterEqual(len(s5.get("top_15_ranked_prop_plays_at_reference_juice", [])), 10)

        for prop in all_props:
            for k in ("model_prob_over", "model_prob_under", "win_prob_on_lean"):
                if prop.get(k) is not None:
                    self.assertLessEqual(
                        float(prop[k]),
                        0.780 + 1e-6,
                        f"Prop {prop.get('athlete')} {prop.get('market')} {k}={prop[k]} > 0.780",
                    )
            if prop.get("publishAllowed") is True:
                self.assertIsNotNone(
                    prop.get("market_over_american"),
                    f"Unpriced prop {prop.get('athlete')} {prop.get('market')} has publishAllowed=True",
                )
                self.assertIsNotNone(
                    prop.get("market_under_american"),
                    f"Unpriced prop {prop.get('athlete')} {prop.get('market')} has publishAllowed=True",
                )

    def test_t2_empirical_bayes_shrinkage_boundary_cases(self) -> None:
        """Verify _empirical_bayes_within_group_weights handles empty, single-element,
        zero-evidence, and multi-player inputs with exact simplex normalization.
        """
        empty_w = _empirical_bayes_within_group_weights(
            np.array([]), np.array([]), position="RB"
        )
        self.assertEqual(len(empty_w), 0)

        single_w = _empirical_bayes_within_group_weights(
            np.array([14.5]), np.array([6200]), position="RB"
        )
        self.assertEqual(len(single_w), 1)
        self.assertAlmostEqual(float(single_w[0]), 1.0, places=6)

        zero_w = _empirical_bayes_within_group_weights(
            np.array([0.0, 0.0, 0.0]), np.array([3000, 3000, 3000]), position="WR"
        )
        self.assertEqual(len(zero_w), 3)
        self.assertAlmostEqual(float(np.sum(zero_w)), 1.0, places=6)
        self.assertTrue(np.all(zero_w > 0.0))

    def test_t2_funnel_sequence_violation_guard_blocks_out_of_order_calls(self) -> None:
        """Verify GSECausalLoopedFunnelEngine strictly raises FunnelSequenceViolationError
        when callers attempt to bypass Stage 1 or Stage 2 ordering.
        """
        funnel = GSECausalLoopedFunnelEngine()
        with self.assertRaises(FunnelSequenceViolationError):
            funnel.stage2_build_layered_context_situational_simulations_to_canonical_projections(
                write_artifacts=False
            )
        with self.assertRaises(FunnelSequenceViolationError):
            funnel.stage3a_derive_props_totals_winners_losers_and_book_discrepancies(
                write_artifacts=False
            )

    def test_t2_spatial_prop_evaluator_exact_mathematical_formulas_and_boundaries(self) -> None:
        """Verify SpatialMicroMetricsPropAndMatchupEvaluator zero-touch boundary and exact
        TOVS, Box Spacing Delta, and YPRR tier classification formulas.
        """
        self.assertEqual(
            SpatialMicroMetricsPropAndMatchupEvaluator.compute_pff_elusive_rating(
                mtf=0, designed_runs=0, receptions=0.0, yco_per_att=3.5
            ),
            0.0,
        )
        self.assertEqual(
            SpatialMicroMetricsPropAndMatchupEvaluator.compute_true_box_spacing_delta(
                defenders_in_box=7.0, blockers_in_box=0.0, avg_defender_dist_los=4.5
            ),
            0.0,
        )
        tovs = SpatialMicroMetricsPropAndMatchupEvaluator.compute_true_opportunity_value_score(
            rush_attempts=15.0, rz_carries=3.0, gl_carries=1.0, targets=4.0
        )
        # 15*0.6 + 3*1.2 + 1*2.4 + 4*1.5 = 9.0 + 3.6 + 2.4 + 6.0 = 21.0
        self.assertAlmostEqual(tovs, 21.0, places=4)
        self.assertIn("Tier 1", SpatialMicroMetricsPropAndMatchupEvaluator.classify_rb_yprr_tier(1.95))
        self.assertIn("Tier 2", SpatialMicroMetricsPropAndMatchupEvaluator.classify_rb_yprr_tier(1.25))
        self.assertIn("Tier 3", SpatialMicroMetricsPropAndMatchupEvaluator.classify_rb_yprr_tier(0.75))


class TestTier3CrossFeatureCombinations(unittest.TestCase):
    """Tier 3 — Cross-module consistency between Funnel Stage 2, Prop Evaluator, and Conserved Optimizer."""

    def test_t3_funnel_stage2_prop_evaluator_and_conserved_optimizer_cross_consistency(self) -> None:
        """Verify Funnel Stage 2, Spatial Prop Evaluator, and Conserved Optimizer agree on
        active Week 9 MNF QB1s (Carson Wentz for MIN, Josh Allen for BUF) and produce
        matchup-conditioned, non-constant projections.
        """
        # 1. Conserved Optimizer MNF BUF @ MIN
        mnf_box = project_full_nfl_game_box_score_from_dossier("BUF @ MIN")
        self.assertEqual(mnf_box["confirmed_qb1"]["BUF"], "Josh Allen")
        self.assertEqual(mnf_box["confirmed_qb1"]["MIN"], "Carson Wentz")

        # 2. Spatial Prop Evaluator MNF BUF @ MIN
        evaluator = SpatialMicroMetricsPropAndMatchupEvaluator()
        slate = evaluator.compile_full_week9_slate()
        buf_min_dossier = slate["BUF@MIN"]
        qb_names = {q.player_name for q in buf_min_dossier.qbs}
        self.assertIn("Josh Allen", qb_names)
        self.assertIn("Carson Wentz", qb_names)
        self.assertNotIn("J.J. McCarthy", qb_names)

        # 3. Funnel Stage 2 projections
        funnel = GSECausalLoopedFunnelEngine()
        funnel.stage1_compile_equations_to_metrics_to_stats(write_artifacts=False)
        s2 = funnel.stage2_build_layered_context_situational_simulations_to_canonical_projections(
            write_artifacts=False
        )
        games_proj = s2["games_projections"]
        self.assertEqual(len(games_proj), 15)

        buf_min_g = games_proj["2026_09_BUF_MIN"]
        self.assertEqual(buf_min_g["away_qb1"], "Josh Allen")
        self.assertEqual(buf_min_g["home_qb1"], "Carson Wentz")

        # Verify game total shifts are matchup-specific (not a constant +1.08 across all 15 games)
        total_shifts = [
            round(float(g["canonical_projected_total_pts"]) - float(g["book_total_line"]), 2)
            for g in games_proj.values()
        ]
        self.assertGreater(
            len(set(total_shifts)),
            3,
            f"Expected matchup-specific total shifts across 15 games, got {total_shifts}",
        )

        # Verify player projections in Stage 2 are distinct across players (not affine position clones)
        rbs_s2 = [
            float(p["canonical_median_dk_pts"])
            for p in s2["canonical_player_projections"]
            if p["position"] == "RB"
        ]
        self.assertGreater(len(set(rbs_s2)), 5)


class TestTier4RealWorldApplicationScenarios(unittest.TestCase):
    """Tier 4 — End-to-end subprocess execution of repository CI guardrails."""

    def test_t4_connected_workflow_dossier_guard_subprocess_exits_zero(self) -> None:
        """Execute scripts/guardrails/connected-workflow-dossier-guard.py as a subprocess and assert exit code 0."""
        proc = subprocess.run(
            [sys.executable, str(REPO_ROOT / "scripts" / "guardrails" / "connected-workflow-dossier-guard.py")],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            timeout=60,
        )
        self.assertEqual(
            proc.returncode,
            0,
            f"connected-workflow-dossier-guard.py failed (exit {proc.returncode}):\n"
            f"STDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}",
        )

    def test_t4_mobile_lint_rules_subprocess_exits_zero(self) -> None:
        """Execute node apps/mobile/scripts/lint-rules.js as a subprocess and assert exit code 0."""
        proc = subprocess.run(
            ["node", str(REPO_ROOT / "apps" / "mobile" / "scripts" / "lint-rules.js")],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            timeout=60,
        )
        self.assertEqual(
            proc.returncode,
            0,
            f"apps/mobile/scripts/lint-rules.js failed (exit {proc.returncode}):\n"
            f"STDOUT:\n{proc.stdout}\nSTDERR:\n{proc.stderr}",
        )


if __name__ == "__main__":
    unittest.main()
