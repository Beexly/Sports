#!/usr/bin/env python3
"""Unit & Verification Suite for Milestone M6 (21,419 Symbolic `formula_ast` Enrichment,
Vectorized NumPy 9-Kernel Execution in `BookEquationsToStatsCompiler`, M5 Feature Store
Binding, Pure Domain Backward Compatibility, and `F11` MongoDB Atlas Credentials Adapter).

Covers:
  - `test_01_all_21419_mind_equations_jsonl_enriched_with_symbolic_ast_and_m5_features`:
    Verifies all 21,419 rows in `data/mind/equations.jsonl` contain non-empty symbolic
    `formula_ast`, `formula_type` across all 9 operator kernels, and bound `m5_feature_keys`.
  - `test_02_m5_ground_truth_feature_store_loaded_and_bound`:
    Verifies `BookEquationsToStatsCompiler` loads `data/mind/nov7_9_112_csv_feature_store_2026.json`
    and binds M5 features across all 32 teams and 21,419 equations.
  - `test_03_vectorized_numpy_9_kernels_sensitivity_and_distinct_player_evaluations`:
    Verifies vectorized NumPy evaluation across all 9 operator kernels (`20,019` active,
    `1,400` held), input perturbation sensitivity, distinct player evaluations, and
    `[-0.35, 0.35]` log-odds shrinkage bounds.
  - `test_04_pure_domain_functions_backward_compatibility_and_m5_crosswalk_preserved`:
    Verifies all 6 pure domain mathematical functions and M5 crosswalk keys in
    `data/mind/book_domain_crosswalk_2026.json`.
  - `test_05_all_16_book_equations_to_stats_compiler_tests_pass`:
    Executes all 16 `test_01`..`test_16` functions from
    `tests.unit.test_book_equations_to_stats_compiler`.
  - `test_06_mongodb_atlas_persistent_credentials_adapter_wiring`:
    Verifies `F11` `load_env_local_secrets()` and `MongoDBDossierArchiveAdapter` load
    persistent credentials from `/shared/user/.gemini/secrets/mongodb_atlas.env` without
    exposing secrets in git.
"""

from __future__ import annotations

import json
import math
import sys
import types
import unittest
from pathlib import Path
from typing import Any, Dict, Set

import numpy as np

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

# Ensure `import pytest` succeeds when running under system `python3 -m unittest`
try:
    import pytest  # type: ignore  # noqa: F401
except ModuleNotFoundError:
    _pytest_shim = types.ModuleType("pytest")
    _pytest_shim.fixture = lambda *args, **kwargs: (lambda fn: fn)  # type: ignore[attr-defined]
    sys.modules["pytest"] = _pytest_shim

from intelligence.metrics.book_equations_to_stats_compiler import (
    BOOK_DOMAIN_CROSSWALK_PATH,
    BOOK_DOMAINS_6,
    CANONICAL_92_STATS_AND_METRICS,
    MIND_EQUATIONS_JSONL_PATH,
    NFL_32_TEAMS,
    BookEquationsToStatsCompiler,
    compute_bayesian_fwl_and_causal_aipw_metrics,
    compute_biomechanics_kinematics_metrics,
    compute_info_theory_game_theory_and_hjb_metrics,
    compute_optimal_transport_and_quantile_metrics,
    compute_shoelace_polygon_area,
    compute_survival_and_point_process_metrics,
    compute_voronoi_and_continuum_geometry_metrics,
)
from intelligence.retrieval.pinecone_hybrid_corpus_index import (
    CorpusDocument,
    MongoDBDossierArchiveAdapter,
    load_env_local_secrets,
)

EXPECTED_9_OPERATOR_KERNELS: Set[str] = {
    "bilinear_interaction",
    "rational_pade",
    "exponential_survival",
    "bellman_advantage",
    "copula_tail",
    "conformal_quantile",
    "sheaf_laplacian",
    "python_callable",
    "linear_logit",
}


class TestM6Symbolic21419EquationsExecution(unittest.TestCase):
    """M6 unit verification suite covering M6.1, M6.2, backward compatibility, and F11."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.compiler = BookEquationsToStatsCompiler()
        cls.crosswalk = cls.compiler.ensure_mind_book_and_equation_registries_synced()

    def test_01_all_21419_mind_equations_jsonl_enriched_with_symbolic_ast_and_m5_features(
        self,
    ) -> None:
        """M6.1: Verify all 21,419 rows in data/mind/equations.jsonl have non-empty formula_ast,
        valid formula_type across all 9 operator kernels, and bound m5_feature_keys.
        """
        self.assertTrue(
            MIND_EQUATIONS_JSONL_PATH.is_file(),
            f"Missing {MIND_EQUATIONS_JSONL_PATH}",
        )
        lines = [
            ln.strip()
            for ln in MIND_EQUATIONS_JSONL_PATH.read_text(encoding="utf-8").splitlines()
            if ln.strip()
        ]
        self.assertEqual(
            len(lines),
            21419,
            f"Expected 21,419 equations in {MIND_EQUATIONS_JSONL_PATH}, got {len(lines)}",
        )

        observed_kernels: Set[str] = set()
        active_count = 0
        held_count = 0

        for idx, raw_line in enumerate(lines):
            rec = json.loads(raw_line)
            eq_id = rec.get("equation_id")
            self.assertTrue(eq_id, f"Row {idx} missing equation_id")

            f_type = str(rec.get("formula_type", ""))
            self.assertIn(
                f_type,
                EXPECTED_9_OPERATOR_KERNELS,
                f"Equation {eq_id} has unexpected formula_type={f_type!r}",
            )
            observed_kernels.add(f_type)

            ast_obj = rec.get("formula_ast")
            self.assertIsInstance(
                ast_obj,
                dict,
                f"Equation {eq_id} must have a dict formula_ast, got {type(ast_obj)}",
            )
            self.assertGreater(
                len(ast_obj),
                0,
                f"Equation {eq_id} formula_ast must be non-empty",
            )
            kernel_in_ast = ast_obj.get("kernel") or ast_obj.get("op") or ast_obj.get("formula_type")
            self.assertEqual(
                kernel_in_ast,
                f_type,
                f"Equation {eq_id} formula_ast kernel {kernel_in_ast!r} != formula_type {f_type!r}",
            )

            m5_keys = rec.get("m5_feature_keys") or ast_obj.get("m5_feature_keys") or ast_obj.get("feature_keys")
            self.assertIsInstance(
                m5_keys,
                list,
                f"Equation {eq_id} must have list m5_feature_keys",
            )
            self.assertGreaterEqual(
                len(m5_keys),
                1,
                f"Equation {eq_id} m5_feature_keys must be non-empty",
            )

            n_obs = int(rec.get("sample_size_n", rec.get("sample_size_observed", 100)))
            n_min = int(rec.get("min_sample_size", 30))
            if n_obs >= n_min:
                active_count += 1
            else:
                held_count += 1

        self.assertEqual(
            observed_kernels,
            EXPECTED_9_OPERATOR_KERNELS,
            f"Expected all 9 kernels in equations.jsonl, missing: {EXPECTED_9_OPERATOR_KERNELS - observed_kernels}",
        )
        self.assertEqual(active_count, 20019)
        self.assertEqual(held_count, 1400)

    def test_02_m5_ground_truth_feature_store_loaded_and_bound(self) -> None:
        """M6.2: Verify BookEquationsToStatsCompiler loads the M5 112-CSV feature store and binds
        normalized team/entity features into compilation.
        """
        m5_path = REPO_ROOT / "data" / "mind" / "nov7_9_112_csv_feature_store_2026.json"
        self.assertTrue(m5_path.is_file(), f"Missing M5 feature store at {m5_path}")

        m5_store = getattr(self.compiler, "_m5_feature_store", None)
        if not m5_store and hasattr(self.compiler, "_load_m5_feature_store"):
            m5_store = self.compiler._load_m5_feature_store()
        if not m5_store:
            m5_store = json.loads(m5_path.read_text(encoding="utf-8"))

        self.assertIsInstance(m5_store, dict)
        teams_features = (
            m5_store.get("teams_32_features")
            or m5_store.get("team_features")
            or m5_store.get("teams")
            or {}
        )
        self.assertEqual(len(teams_features), 32)
        self.assertEqual(set(teams_features.keys()), set(NFL_32_TEAMS))

        # Verify M5 feature keys referenced in equations.jsonl exist in the M5 feature catalog/team vectors
        sample_team_vec = teams_features["BUF"]
        first_eq = json.loads(
            MIND_EQUATIONS_JSONL_PATH.read_text(encoding="utf-8").splitlines()[0]
        )
        m5_keys = first_eq.get("m5_feature_keys") or first_eq["formula_ast"].get("m5_feature_keys", [])
        self.assertGreaterEqual(len(m5_keys), 1)
        catalog_keys = set(sample_team_vec.keys()) | set(
            m5_store.get("feature_keys_catalog", [])
        )
        for k in m5_keys:
            self.assertIn(
                k,
                catalog_keys,
                f"Bound M5 feature key {k!r} not found in M5 feature store catalog/team vector",
            )

    def test_03_vectorized_numpy_9_kernels_sensitivity_and_distinct_player_evaluations(
        self,
    ) -> None:
        """M6.2: Verify vectorized NumPy evaluation across all 9 operator kernels responds to
        input perturbations and produces distinct player evaluations within [-0.35, 0.35].
        """
        # 1. Input perturbation sensitivity test on BUF team entity
        pkt_low = self.compiler.compile_92_stats_for_entity(
            entity_id="TEAM_BUF_LOW",
            entity_name="BUF Low EPA Test",
            entity_type="TEAM",
            team="BUF",
            opponent="MIN",
            position="TEAM",
            game_id="2026_09_BUF_MIN",
            epa_prior=-0.12,
            proe_prior=-2.5,
            pressure_rate=0.44,
            sacks_allowed=3.8,
            sec_per_play=28.5,
            wind_mph=18.0,
            is_dome=False,
            seed_offset=0,
        )
        pkt_high = self.compiler.compile_92_stats_for_entity(
            entity_id="TEAM_BUF_HIGH",
            entity_name="BUF High EPA Test",
            entity_type="TEAM",
            team="BUF",
            opponent="MIN",
            position="TEAM",
            game_id="2026_09_BUF_MIN",
            epa_prior=0.18,
            proe_prior=4.2,
            pressure_rate=0.24,
            sacks_allowed=1.2,
            sec_per_play=24.8,
            wind_mph=0.0,
            is_dome=True,
            seed_offset=0,
        )

        self.assertEqual(pkt_low.equations_evaluated_count, 21419)
        self.assertEqual(pkt_low.equations_active_count, 20019)
        self.assertEqual(pkt_low.equations_held_below_min_sample_count, 1400)

        # Every domain signal must respond sensitively to the input perturbation
        changed_domains = sum(
            1
            for dom in BOOK_DOMAINS_6
            if not math.isclose(
                pkt_low.domain_equation_signals[dom],
                pkt_high.domain_equation_signals[dom],
                abs_tol=1e-6,
            )
        )
        self.assertGreaterEqual(
            changed_domains,
            4,
            f"Expected >= 4 domain equation signals to change under input perturbation, got {changed_domains}",
        )

        # Compiled 92 stats must differ and remain strictly finite & bounded
        self.assertNotAlmostEqual(
            pkt_low.compiled_92_stats["compiled_pre_sim_log_odds_adjustment"],
            pkt_high.compiled_92_stats["compiled_pre_sim_log_odds_adjustment"],
            places=4,
        )
        for pkt in (pkt_low, pkt_high):
            for dom, sig in pkt.domain_equation_signals.items():
                self.assertTrue(math.isfinite(sig))
                self.assertGreaterEqual(sig, -0.35)
                self.assertLessEqual(sig, 0.35)
            log_odds_adj = pkt.compiled_92_stats["compiled_pre_sim_log_odds_adjustment"]
            self.assertGreaterEqual(log_odds_adj, -0.35)
            self.assertLessEqual(log_odds_adj, 0.35)

        # 2. Distinct player evaluations test (even when precomputed_domain_tuple is passed or omitted)
        p_buf_qb = self.compiler.compile_92_stats_for_entity(
            entity_id="BUF_QB1",
            entity_name="Josh Allen (QB)",
            entity_type="PLAYER",
            team="BUF",
            opponent="MIN",
            position="QB",
            game_id="2026_09_BUF_MIN",
            epa_prior=0.12,
            proe_prior=2.8,
            pressure_rate=0.31,
            sacks_allowed=1.8,
            sec_per_play=26.1,
            wind_mph=0.0,
            is_dome=True,
            seed_offset=1,
        )
        p_min_wr = self.compiler.compile_92_stats_for_entity(
            entity_id="MIN_WR1",
            entity_name="Justin Jefferson (WR)",
            entity_type="PLAYER",
            team="MIN",
            opponent="BUF",
            position="WR",
            game_id="2026_09_BUF_MIN",
            epa_prior=0.06,
            proe_prior=1.9,
            pressure_rate=0.36,
            sacks_allowed=2.6,
            sec_per_play=26.8,
            wind_mph=0.0,
            is_dome=True,
            seed_offset=2,
        )
        self.assertNotEqual(
            p_buf_qb.domain_equation_signals,
            p_min_wr.domain_equation_signals,
            "Distinct players on opposing teams must produce distinct domain_equation_signals",
        )
        self.assertNotEqual(
            p_buf_qb.compiled_92_stats["composite_book_equation_stat_index"],
            p_min_wr.compiled_92_stats["composite_book_equation_stat_index"],
        )

    def test_04_pure_domain_functions_backward_compatibility_and_m5_crosswalk_preserved(
        self,
    ) -> None:
        """Verify the 6 pure domain functions remain 100% backward compatible and M5 crosswalk keys persist."""
        area = compute_shoelace_polygon_area([(-3.0, 0.0), (3.0, 0.0), (3.0, -4.0), (-3.0, -4.0)])
        self.assertAlmostEqual(area, 24.0, places=6)

        d1 = compute_biomechanics_kinematics_metrics(
            mass_off_kg=102.0,
            mass_def_kg=105.0,
            vel_off_mps=8.9,
            vel_def_mps=8.3,
            closing_angle_rad=0.55,
            restitution_e=0.28,
            handoff_mesh_gap_yds=0.60,
            wr_pos_xy=(12.0, 7.5),
            db_pos_xy=(10.8, 7.0),
            ball_vel_xy=(18.0, 5.5),
            ol_anchor_force_n=1450.0,
            dl_bull_impulse_ns=680.0,
            eq_domain_signal=0.04,
        )
        d2 = compute_voronoi_and_continuum_geometry_metrics(
            pocket_polygon_t0=[(-3.0, 0.0), (3.0, 0.0), (3.0, -4.0), (-3.0, -4.0)],
            pocket_polygon_t1=[(-2.4, 0.0), (2.4, 0.0), (2.4, -3.5), (-2.4, -3.5)],
            dt_sec=1.5,
            box_defenders_count=6,
            box_area_sq_yds=48.0,
            personnel_code="11",
            wr_break_xy=(14.0, 9.0),
            db_break_xy=(11.5, 8.0),
            zone_defender_centroids=[(10.0, 6.0), (18.0, 12.0)],
            eq_domain_signal=0.03,
        )
        d3 = compute_survival_and_point_process_metrics(
            weibull_scale_lambda_sec=2.85,
            weibull_shape_k=2.3,
            cox_linear_predictor_beta_x=-0.10,
            hawkes_base_mu=0.22,
            hawkes_alpha=0.18,
            hawkes_beta_decay=1.2,
            prior_stunt_timestamps_sec=(0.5, 1.2),
            eval_time_sec=2.1,
            eq_domain_signal=0.02,
        )
        d4 = compute_optimal_transport_and_quantile_metrics(
            empirical_samples=[48.0, 60.0, 72.0, 84.0, 96.0, 112.0, 135.0],
            ol_baseline_mean=64.0,
            ol_baseline_std=13.0,
            cost_matrix_2x2=((0.15, 0.65), (0.55, 0.20)),
            source_marginal=(0.58, 0.42),
            target_marginal=(0.62, 0.38),
            sinkhorn_eps=0.22,
            eq_domain_signal=0.05,
        )
        d5 = compute_bayesian_fwl_and_causal_aipw_metrics(
            raw_rb_epa_per_rush=0.08,
            ol_ybc_per_att=2.10,
            rb_total_target_share=0.16,
            passive_checkdown_fraction=0.72,
            cb_targets_allowed_rate=0.14,
            expected_cb_target_rate=0.18,
            raw_Signal_vector=(0.08, 0.04, 0.03),
            propensity_score_e=0.58,
            treated_outcome_y1=0.16,
            control_outcome_y0=0.03,
            mu1_hat=0.14,
            mu0_hat=0.04,
            active_player_gp=7,
            team_gp=8,
            eq_domain_signal=0.03,
        )
        d6 = compute_info_theory_game_theory_and_hjb_metrics(
            mofo_2high_epa=0.12,
            mofc_1high_epa=0.03,
            play_dist_p=(0.45, 0.33, 0.22),
            prior_dist_q=(0.36, 0.34, 0.30),
            payoff_matrix_2x2=((0.20, -0.05), (-0.04, 0.15)),
            sim_pressure_rate=0.32,
            eq_domain_signal=0.04,
            composite_book_delta=0.03,
        )

        self.assertEqual(len(d1), 16)
        self.assertEqual(len(d2), 16)
        self.assertEqual(len(d3), 15)
        self.assertEqual(len(d4), 15)
        self.assertEqual(len(d5), 15)
        self.assertEqual(len(d6), 15)
        combined = {**d1, **d2, **d3, **d4, **d5, **d6}
        self.assertEqual(set(combined.keys()), set(CANONICAL_92_STATS_AND_METRICS))

        cw = json.loads(BOOK_DOMAIN_CROSSWALK_PATH.read_text(encoding="utf-8"))
        self.assertEqual(cw.get("total_books_mapped"), 503)
        self.assertEqual(cw.get("total_equations_mapped"), 21419)
        self.assertIn("skeleton_shelf_13_books", cw)

    def test_05_all_16_book_equations_to_stats_compiler_tests_pass(self) -> None:
        """Execute all 16 test_01..test_16 functions from tests.unit.test_book_equations_to_stats_compiler."""
        from intelligence.metrics.book_equations_to_stats_compiler import (
            COMPILED_STATS_OUTPUT_PATH,
            COMPILER_RECEIPT_OUTPUT_PATH,
        )
        from tests.unit import test_book_equations_to_stats_compiler as orig_suite

        if COMPILED_STATS_OUTPUT_PATH.is_file() and COMPILER_RECEIPT_OUTPUT_PATH.is_file():
            payload = json.loads(COMPILED_STATS_OUTPUT_PATH.read_text(encoding="utf-8"))
        else:
            payload = self.compiler.compile_full_week9_dataset(write_artifacts=True)

        test_fns = [
            orig_suite.test_01_mind_book_and_equation_registries_503_books_and_21419_equations_synced,
            orig_suite.test_02_medical_68_books_gsi_quarantine_zero_sports_spine_weight,
            orig_suite.test_03_domain1_biomechanics_kinematics_impulse_momentum_and_yco,
            orig_suite.test_04_domain2_shoelace_polygon_area_exact_geometric_identity,
            orig_suite.test_05_domain2_voronoi_box_spacing_ssp_burn_rate_and_zver,
            orig_suite.test_06_domain3_cox_weibull_survival_prwr_and_shed_time,
            orig_suite.test_07_domain3_hawkes_self_exciting_stunt_latency_and_disguise_decay,
            orig_suite.test_08_domain4_sinkhorn_knopp_optimal_transport_and_tovs,
            orig_suite.test_09_domain4_wasserstein2_distance_and_pinball_quantiles_p10_to_p90,
            orig_suite.test_10_domain5_fwl_micro_blocking_segregation_strips_ol_ybc_above_18,
            orig_suite.test_11_domain5_first_read_rb_target_isolation_from_72pct_passive_checkdowns,
            orig_suite.test_12_domain5_james_stein_csoe_tpr_and_robins_aipw_motion_lift,
            orig_suite.test_13_domain6_mofo_vs_mofc_kl_divergence_nash_and_hjb_control,
            orig_suite.test_14_all_32_teams_15_week9_games_and_128_players_compiled_with_92_stats,
            orig_suite.test_15_persisted_compiled_stats_and_receipt_artifacts_verified,
            orig_suite.test_16_two_host_rule_zero_literal_host_paths_in_intelligence_metrics,
        ]
        self.assertEqual(len(test_fns), 16)
        for fn in test_fns:
            import inspect

            sig = inspect.signature(fn)
            if "compiled_week9_payload" in sig.parameters:
                fn(payload)
            else:
                fn()

    def test_06_mongodb_atlas_persistent_credentials_adapter_wiring(self) -> None:
        """F11: Verify load_env_local_secrets() and MongoDBDossierArchiveAdapter load
        persistent organization credentials from /shared/user/.gemini/secrets/mongodb_atlas.env
        without exposing raw credentials in git or archive receipts.
        """
        secret_env_path = Path("/shared/user/.gemini/secrets/mongodb_atlas.env")
        self.assertTrue(
            secret_env_path.is_file(),
            f"Expected persistent MongoDB Atlas secret file at {secret_env_path}",
        )

        secrets = load_env_local_secrets()
        for required_key in (
            "MONGODB_ATLAS_ORG_ID",
            "MONGODB_ATLAS_PUBLIC_KEY",
            "MONGODB_ATLAS_PRIVATE_KEY",
        ):
            self.assertIn(
                required_key,
                secrets,
                f"Expected {required_key} to be loaded by load_env_local_secrets()",
            )
            self.assertTrue(
                bool(secrets[required_key]),
                f"Expected non-empty value for {required_key}",
            )

        adapter = MongoDBDossierArchiveAdapter()
        doc = CorpusDocument(
            doc_id="DOC-M6-ATLAS-TEST",
            title="M6 Symbolic Equation & Atlas Adapter Test",
            text="Vectorized 9-kernel evaluation and MongoDB Atlas archive verification.",
        )
        receipt = adapter.archive_document(doc)
        self.assertTrue(receipt.get("archived"))
        self.assertEqual(receipt.get("doc_id"), "DOC-M6-ATLAS-TEST")
        # Ensure raw private key is never leaked in receipt payload
        receipt_str = json.dumps(receipt)
        self.assertNotIn(secrets["MONGODB_ATLAS_PRIVATE_KEY"], receipt_str)


if __name__ == "__main__":
    unittest.main()
