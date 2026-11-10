"""End-to-end verification of Stage 1–4 Corpus Provenance, Honest Executor, Sweeps & Week 9 Calibration."""

from __future__ import annotations

import json
import sys
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from intelligence.coaching.ol_provider import (
    get_cfbd_opponent_adjusted_line_yards,
    map_ol_or_roster_role_to_epa_dropoff_bucket,
)
from intelligence.dfs.conserved_nfl_projection_and_equation_optimizer import (
    compute_conserved_team_environments,
)


class TestWave3UnifiedArchAndHonestCorpusE2E(unittest.TestCase):
    def test_503_book_provenance_has_472_unique_drive_ids_zero_collisions(self) -> None:
        reg_path = REPO_ROOT / "data" / "mind" / "complete_458_book_registry.json"
        payload = json.loads(reg_path.read_text(encoding="utf-8"))
        books = payload["books"]
        self.assertEqual(len(books), 503)
        shelf_and_docx = [b for b in books if not b.get("is_monograph_citation_alias")]
        self.assertEqual(len(shelf_and_docx), 472)
        unique_ids = {b["drive_id"] for b in shelf_and_docx if b.get("drive_id")}
        self.assertEqual(len(unique_ids), 472)

    def test_645k_equations_and_101k_situational_masters_manifest_and_quarantine(self) -> None:
        manifest = json.loads(
            (REPO_ROOT / "data" / "mind" / "extraction_masters_manifest_2026_11_10.json").read_text(encoding="utf-8")
        )
        self.assertGreaterEqual(manifest["equations_master"]["total_records"], 645864)
        self.assertGreaterEqual(manifest["situational_master"]["total_records"], 101965)
        repairs = manifest["verified_repairs"]
        self.assertEqual(repairs["udlbook_doubled_backslash_defects_remaining"], 0)
        self.assertGreaterEqual(repairs["little_book_of_semaphores_equation_rows"], 196)
        self.assertGreater(repairs["nice_ng232_head_injury_situational_rows"], 50)

        honest = json.loads(
            (REPO_ROOT / "data" / "mind" / "honest_executor_master_audit_2026_11_10.json").read_text(encoding="utf-8")
        )
        self.assertTrue(honest["zero_fabricated_bindings"])
        self.assertGreater(honest["parsed_valid_ast_total"], 100000)

        quarantine = json.loads(
            (REPO_ROOT / "data" / "mind" / "legacy_21419_template_quarantine_audit_2026_11_10.json").read_text(
                encoding="utf-8"
            )
        )
        self.assertEqual(quarantine["quarantine_status"], "TEMPLATE_QUARANTINED_EVIDENCE")
        self.assertTrue(quarantine["nothing_deleted"])
        self.assertEqual(quarantine["total_legacy_rows_quarantined"], 21419)

    def test_x_and_ig_sweeps_preserve_honest_degradations_and_conflicts(self) -> None:
        sweeps = json.loads(
            (REPO_ROOT / "data" / "mind" / "sweeps_2026_11_09_pm_and_11_10_am_verified_store.json").read_text(
                encoding="utf-8"
            )
        )
        x_sw = sweeps["x_for_you_sweep_2026_11_09_pm"]
        deg = x_sw["honest_degradations_preserved"]
        self.assertEqual(deg["feed_permalink_gap"]["inventoried_no_id_count"], 70)
        handles = [r["handle"] for r in deg["rate_limited_watchlist_accounts"]]
        self.assertIn("SumerSports", handles)
        self.assertIn("run_the_sims", handles)
        self.assertEqual(deg["preserved_capture_conflicts"][0]["adopted"], False)

        ig_sw = sweeps["instagram_for_you_sweep_2026_11_10_am"]["actionable_finds_wired"]
        self.assertEqual(ig_sw["AM_01_claude_fable_5_2_routing_rule"]["paid_plan_extra_usage_window_closes"], "2026-11-16")
        self.assertAlmostEqual(ig_sw["AM_05_saltline_cached_input_economics"]["input_to_output_ratio"], 164.8, places=1)

    def test_cfbd_line_yards_optimizer_wiring_and_stage4_week9_calibration(self) -> None:
        buf_ly = get_cfbd_opponent_adjusted_line_yards("BUF")
        self.assertGreater(buf_ly["carries"], 100)
        self.assertEqual(map_ol_or_roster_role_to_epa_dropoff_bucket("LT"), "OL")

        envs = compute_conserved_team_environments()
        self.assertIn("BUF", envs)
        self.assertIn("cfbd_trench_edge", envs["BUF"])
        self.assertIn("nflfastr_pr618_v_kickoff_ep", envs["BUF"])

        autopsy = json.loads(
            (
                REPO_ROOT / "data" / "audits" / "week9_mnf_buf_min_autopsy_and_78_props_settlement_2026_11_10.json"
            ).read_text(encoding="utf-8")
        )
        self.assertEqual(autopsy["final_score"]["display"], "BUF 23, MIN 6")
        self.assertEqual(autopsy["props_78_board_settlement_summary"]["total_props_settled"], 78)

        cal = json.loads(
            (
                REPO_ROOT / "data" / "calibration" / "week9_settled_15_games_dma_aci_calibration_2026_11_10.json"
            ).read_text(encoding="utf-8")
        )
        self.assertEqual(cal["settled_games_included"], 15)

    def test_stage6_week10_projections_conserved_and_held_at_pass(self) -> None:
        w10 = json.loads(
            (
                REPO_ROOT / "data" / "projections" / "week10_unified_conserved_stat_projections_2026_11_10.json"
            ).read_text(encoding="utf-8")
        )
        self.assertEqual(w10["games_count"], 14)
        self.assertEqual(w10["players_count"], 224)
        self.assertEqual(w10["five_stage_gate_enforcement"]["publishAllowed_on_any_row"], False)
        munich_found = False
        for g in w10["games"]:
            self.assertEqual(g["decision"], "PASS")
            self.assertFalse(g["publishAllowed"])
            away_t = g["teams"][g["away_team"]]
            home_t = g["teams"][g["home_team"]]
            self.assertTrue(away_t["c0_c6_all_identities_satisfied"])
            self.assertTrue(home_t["c0_c6_all_identities_satisfied"])
            if g["matchup"] == "NE @ DET":
                munich_found = True
                self.assertTrue(g["international_munich_spot"])
                self.assertLess(away_t["circadian_cpi"], -0.45)
        self.assertTrue(munich_found)
        for p in w10["player_projections"]:
            self.assertEqual(p["decision"], "PASS")
            self.assertFalse(p["publishAllowed"])


if __name__ == "__main__":
    unittest.main()

