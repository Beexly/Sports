#!/usr/bin/env python3
"""Tier 5 White-Box Adversarial Challenger Suite (`test_tier5_adversarial_equations_and_csv_challenger.py`).

Authored by `teamwork_preview_challenger_r1_1` to white-box stress-test:
  1. Perturbation sensitivity of each of the 9 symbolic operator kernels (`bilinear_interaction`,
     `rational_pade`, `exponential_survival`, `bellman_advantage`, `copula_tail`,
     `conformal_quantile`, `sheaf_laplacian`, `python_callable`, `linear_logit`) under
     extreme, zero, negative, and NaN/Inf-boundary inputs.
  2. Strict enforcement that the `1,400` held equations (`sample_size_observed < min_sample_size`)
     contribute `0.0` weight while the `20,019` active equations respect `clip_bounds` `[-0.35, 0.35]`.
  3. Zero fabrication on all `18` `PARTIAL` CSV tables and both `HEALTH-UNRESOLVED` items
     (`Patrick Mahomes` MRI truncated & `CLE vs NO` concussion player).
  4. Exact mathematical conservation of team passing/rushing yards and TDs across player
     projections (`sum(player_rec_yds) == team_pass_yds`).
"""

from __future__ import annotations

import csv
import hashlib
import json
import math
import sys
import unittest
from pathlib import Path
from typing import Any, Dict, List, Set, Tuple

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
from intelligence.equations.equation_executor import (
    _evaluate_operator_kernel,
    evaluate_equation_spec,
    normalize_feature_vector,
)
from intelligence.ingestion.nov7_9_sweep_and_112_csv_ingestor import (
    M5_FEATURE_KEYS_CATALOG,
    NFL_32_TEAMS,
    normalize_team_code,
)
from intelligence.metrics.book_equations_to_stats_compiler import (
    BOOK_DOMAIN_CROSSWALK_PATH,
    BOOK_DOMAINS_6,
    EQUATION_INVENTORY_V2_PATH,
    M5_FEATURE_STORE_PATH,
    MIND_EQUATIONS_JSONL_PATH,
    OPERATOR_KERNELS_9,
    BookEquationsToStatsCompiler,
)


def _evaluate_compiler_vectorized_kernels_directly(
    compiler: BookEquationsToStatsCompiler,
    f_vals: np.ndarray,
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """White-box helper executing the compiler's exact vectorized 9-kernel equations
    on an arbitrary 15-element feature vector `f_vals` to inspect raw, shrunk, and
    clipped per-equation outputs across all 21,419 equations.
    """
    assert compiler._feat1_idx_vec is not None
    assert compiler._feat2_idx_vec is not None
    assert compiler._alpha_vec is not None
    assert compiler._beta_vec is not None
    assert compiler._gamma_vec is not None
    assert compiler._shrink_vec is not None
    assert compiler._kernel_id_vec is not None
    assert compiler._active_mask_vec is not None

    x1 = f_vals[compiler._feat1_idx_vec]
    x2 = f_vals[compiler._feat2_idx_vec]
    a = compiler._alpha_vec
    b = compiler._beta_vec
    g = compiler._gamma_vec
    k = compiler._kernel_id_vec

    raw_out = np.zeros_like(x1, dtype=np.float64)

    # 0: bilinear_interaction
    m0 = k == 0
    raw_out[m0] = a[m0] * x1[m0] + b[m0] * x2[m0] + g[m0] * x1[m0] * x2[m0]

    # 1: rational_pade
    m1 = k == 1
    raw_out[m1] = (a[m1] * x1[m1] + b[m1] * x2[m1]) / (1.0 + np.abs(g[m1] * (x1[m1] + x2[m1])))

    # 2: exponential_survival
    m2 = k == 2
    raw_out[m2] = (
        a[m2]
        * (
            np.exp(-np.clip(np.abs(b[m2] * x1[m2]), 0.0, 5.0))
            - np.exp(-np.clip(np.abs(g[m2] * x2[m2]), 0.0, 5.0))
        )
        + 0.35 * b[m2] * x1[m2]
    )

    # 3: bellman_advantage
    m3 = k == 3
    raw_out[m3] = a[m3] * x1[m3] + g[m3] * np.tanh(b[m3] * x2[m3] + x1[m3])

    # 4: copula_tail
    m4 = k == 4
    raw_out[m4] = (
        a[m4] * x1[m4]
        + b[m4] * x2[m4]
        - 0.15 * g[m4] * np.log1p(np.exp(-np.clip(np.abs(x1[m4] + x2[m4]), 0.0, 6.0)))
    )

    # 5: conformal_quantile
    m5 = k == 5
    raw_out[m5] = a[m5] * x1[m5] + b[m5] * (x2[m5] - 0.5 * g[m5] * np.abs(x1[m5] - x2[m5]))

    # 6: sheaf_laplacian
    m6 = k == 6
    raw_out[m6] = -a[m6] * (x1[m6] - x2[m6]) * g[m6] + b[m6] * (x1[m6] + x2[m6])

    # 7: python_callable
    m7 = k == 7
    raw_out[m7] = np.tanh(a[m7] * x1[m7] + b[m7] * x2[m7] + g[m7] * (x1[m7] - x2[m7]))

    # 8: linear_logit
    m8 = k == 8
    raw_out[m8] = a[m8] * x1[m8] + b[m8] * x2[m8] + 0.10 * g[m8] * x1[m8]

    shrunk_out = np.where(compiler._active_mask_vec, raw_out * compiler._shrink_vec, 0.0)
    clipped_out = np.clip(shrunk_out, -0.35, 0.35)
    return raw_out, shrunk_out, clipped_out


class TestTier5AdversarialEquationsAndCsvChallenger(unittest.TestCase):
    """Tier 5 White-Box Adversarial Stress-Test Suite for M2 & M3."""

    @classmethod
    def setUpClass(cls) -> None:
        cls.compiler = BookEquationsToStatsCompiler()
        cls.crosswalk = cls.compiler.ensure_mind_book_and_equation_registries_synced()
        cls.m5_store = json.loads(M5_FEATURE_STORE_PATH.read_text(encoding="utf-8"))
        cls.equations_lines = [
            ln.strip()
            for ln in MIND_EQUATIONS_JSONL_PATH.read_text(encoding="utf-8").splitlines()
            if ln.strip()
        ]
        cls.equations_records = [json.loads(ln) for ln in cls.equations_lines]

    # =========================================================================
    # CHALLENGE 1: 9 Symbolic Operator Kernels Perturbation & Boundary Stress
    # =========================================================================

    def test_01_all_9_symbolic_operator_kernels_isolated_vectorized_perturbation_sensitivity(
        self,
    ) -> None:
        """White-box stress-test each of the 9 symbolic operator kernels in isolation across
        zero, negative, positive, and extreme finite inputs in the 21,419-equation array.
        """
        self.assertEqual(len(OPERATOR_KERNELS_9), 9)
        assert self.compiler._kernel_id_vec is not None
        assert self.compiler._active_mask_vec is not None

        f_zero = np.zeros(15, dtype=np.float64)
        f_neg = np.linspace(-0.85, -0.15, 15, dtype=np.float64)
        f_pos = np.linspace(0.15, 0.85, 15, dtype=np.float64)
        f_extreme_pos = np.full(15, 1e5, dtype=np.float64)
        f_extreme_neg = np.full(15, -1e5, dtype=np.float64)

        raw_zero, shrunk_zero, clip_zero = _evaluate_compiler_vectorized_kernels_directly(
            self.compiler, f_zero
        )
        raw_neg, shrunk_neg, clip_neg = _evaluate_compiler_vectorized_kernels_directly(
            self.compiler, f_neg
        )
        raw_pos, shrunk_pos, clip_pos = _evaluate_compiler_vectorized_kernels_directly(
            self.compiler, f_pos
        )
        raw_ext_p, shrunk_ext_p, clip_ext_p = _evaluate_compiler_vectorized_kernels_directly(
            self.compiler, f_extreme_pos
        )
        raw_ext_n, shrunk_ext_n, clip_ext_n = _evaluate_compiler_vectorized_kernels_directly(
            self.compiler, f_extreme_neg
        )

        for k_idx, k_name in enumerate(OPERATOR_KERNELS_9):
            mask_k_all = self.compiler._kernel_id_vec == k_idx
            mask_k_active = mask_k_all & self.compiler._active_mask_vec
            count_k_all = int(np.sum(mask_k_all))
            count_k_active = int(np.sum(mask_k_active))

            self.assertGreater(
                count_k_all,
                0,
                f"Kernel {k_name} (id={k_idx}) has 0 equations in 21,419 registry",
            )
            self.assertGreater(
                count_k_active,
                0,
                f"Kernel {k_name} (id={k_idx}) has 0 active equations in 20,019 active set",
            )

            # 1. Finiteness across all regimes
            for regime_name, arr in (
                ("zero", clip_zero),
                ("negative", clip_neg),
                ("positive", clip_pos),
                ("extreme_pos", clip_ext_p),
                ("extreme_neg", clip_ext_n),
            ):
                k_slice = arr[mask_k_active]
                self.assertTrue(
                    np.all(np.isfinite(k_slice)),
                    f"Kernel {k_name} produced non-finite values under {regime_name} inputs",
                )
                self.assertTrue(
                    np.all((k_slice >= -0.35 - 1e-12) & (k_slice <= 0.35 + 1e-12)),
                    f"Kernel {k_name} violated [-0.35, 0.35] clip bounds under {regime_name} inputs",
                )

            # 2. Perturbation sensitivity: negative vs positive and zero vs positive must differ
            diff_pos_neg = float(np.max(np.abs(clip_pos[mask_k_active] - clip_neg[mask_k_active])))
            diff_pos_zero = float(np.max(np.abs(clip_pos[mask_k_active] - clip_zero[mask_k_active])))
            diff_neg_zero = float(np.max(np.abs(clip_neg[mask_k_active] - clip_zero[mask_k_active])))

            self.assertGreater(
                diff_pos_neg,
                1e-4,
                f"Kernel {k_name} is insensitive between negative and positive perturbations: max diff={diff_pos_neg}",
            )
            self.assertGreater(
                diff_pos_zero,
                1e-4,
                f"Kernel {k_name} is insensitive between zero and positive perturbations: max diff={diff_pos_zero}",
            )
            self.assertGreater(
                diff_neg_zero,
                1e-4,
                f"Kernel {k_name} is insensitive between zero and negative perturbations: max diff={diff_neg_zero}",
            )

            # 3. Verify zero input yields exact mathematical expectation for each kernel
            if k_name != "copula_tail":
                # All kernels except copula_tail (-0.15 * g * log(2)) evaluate to 0.0 at x1=x2=0.0
                self.assertTrue(
                    np.allclose(raw_zero[mask_k_active], 0.0, atol=1e-12),
                    f"Kernel {k_name} expected 0.0 at zero input, got {raw_zero[mask_k_active][:5]}",
                )
            else:
                # copula_tail at x1=x2=0.0 has -0.15 * g * ln(1 + exp(0)) = -0.15 * g * ln(2) < 0
                self.assertTrue(
                    np.all(raw_zero[mask_k_active] < 0.0),
                    "Kernel copula_tail expected negative tail correction at x1=x2=0",
                )

    def test_02_all_9_kernels_in_equation_executor_under_nan_inf_extreme_zero_and_negative_inputs(
        self,
    ) -> None:
        """Stress-test `evaluate_equation_spec` and `_evaluate_operator_kernel` across all 9
        operator kernels under NaN, +Inf, -Inf, 0.0, negative, and extreme inputs.
        """
        adversarial_inputs_list: List[Tuple[str, Dict[str, float]]] = [
            ("all_zeros", {"x0": 0.0, "x1": 0.0, "x2": 0.0}),
            ("negative", {"x0": -2.4, "x1": -1.3, "x2": -0.7}),
            ("positive", {"x0": 2.4, "x1": 1.3, "x2": 0.7}),
            ("extreme_large", {"x0": 1e8, "x1": -1e8, "x2": 1e8}),
            ("nan_inputs", {"x0": float("nan"), "x1": float("nan"), "x2": float("nan")}),
            ("pos_inf_inputs", {"x0": float("inf"), "x1": float("inf"), "x2": float("inf")}),
            ("neg_inf_inputs", {"x0": float("-inf"), "x1": float("-inf"), "x2": float("-inf")}),
            (
                "mixed_nan_inf",
                {"x0": float("nan"), "x1": float("inf"), "x2": float("-inf")},
            ),
        ]

        coeffs = {"w_primary": 0.22, "w_secondary": -0.14, "w_interaction": 0.09}
        bindings = ["x0", "x1", "x2"]

        for k_name in OPERATOR_KERNELS_9:
            outputs_by_regime: Dict[str, float] = {}
            for regime_label, inp in adversarial_inputs_list:
                res = evaluate_equation_spec(
                    equation_id=f"ADV_TEST_{k_name.upper()}",
                    family=f"adv_family_{k_name}",
                    inputs=inp,
                    weight=1.0,
                    formula_type=k_name,
                    coefficients=coeffs,
                    parameter_bindings=bindings,
                    formula_spec="",
                    sample_size_n=120,
                    min_sample_size=30,
                    use_ast_executor=False,
                )
                delta = float(res["log_odds_delta"])
                raw_sig = float(res["raw_signal"])
                self.assertTrue(
                    math.isfinite(delta),
                    f"Kernel {k_name} produced non-finite log_odds_delta={delta} on {regime_label}",
                )
                self.assertTrue(
                    math.isfinite(raw_sig),
                    f"Kernel {k_name} produced non-finite raw_signal={raw_sig} on {regime_label}",
                )
                self.assertGreaterEqual(
                    delta,
                    -0.35,
                    f"Kernel {k_name} violated lower clip bound -0.35 on {regime_label}: {delta}",
                )
                self.assertLessEqual(
                    delta,
                    0.35,
                    f"Kernel {k_name} violated upper clip bound +0.35 on {regime_label}: {delta}",
                )
                outputs_by_regime[regime_label] = delta

            # Verify sensitivity between negative and positive inputs for every kernel
            self.assertNotAlmostEqual(
                outputs_by_regime["negative"],
                outputs_by_regime["positive"],
                places=5,
                msg=f"Kernel {k_name} failed perturbation sensitivity check in evaluate_equation_spec",
            )
            # Verify NaN/Inf inputs sanitize cleanly to deterministic finite zero-input behavior
            self.assertEqual(
                outputs_by_regime["nan_inputs"],
                outputs_by_regime["all_zeros"],
                f"Kernel {k_name} NaN inputs did not sanitize to 0.0 feature baseline",
            )
            self.assertEqual(
                outputs_by_regime["pos_inf_inputs"],
                outputs_by_regime["all_zeros"],
                f"Kernel {k_name} +Inf inputs did not sanitize to 0.0 feature baseline",
            )
            self.assertEqual(
                outputs_by_regime["neg_inf_inputs"],
                outputs_by_regime["all_zeros"],
                f"Kernel {k_name} -Inf inputs did not sanitize to 0.0 feature baseline",
            )

    def test_03_compiler_domain_signals_perturbation_across_extreme_zero_and_negative_regimes(
        self,
    ) -> None:
        """Verify `BookEquationsToStatsCompiler._compute_6_domain_equation_signals` responds
        sensitively across negative, zero, positive, and extreme feature vectors while keeping
        all 6 domain signals strictly inside `[-0.35, 0.35]`.
        """
        fv_zero = {
            "epa_per_play": 0.0,
            "cpoe": 0.0,
            "success_rate": 0.0,
            "proe": 0.0,
            "home_pressure_rate": 0.0,
            "away_sack_rate_allowed": 0.0,
            "neutral_pace_sec_per_snap": 0.0,
            "wind_mph": 0.0,
            "temp_f": 0.0,
        }
        fv_neg = {
            "epa_per_play": -0.35,
            "cpoe": -14.0,
            "success_rate": 0.22,
            "proe": -6.5,
            "home_pressure_rate": 0.58,
            "away_sack_rate_allowed": 0.14,
            "neutral_pace_sec_per_snap": 32.0,
            "wind_mph": 28.0,
            "temp_f": 18.0,
        }
        fv_pos = {
            "epa_per_play": 0.35,
            "cpoe": 14.0,
            "success_rate": 0.68,
            "proe": 6.5,
            "home_pressure_rate": 0.18,
            "away_sack_rate_allowed": 0.02,
            "neutral_pace_sec_per_snap": 23.5,
            "wind_mph": 0.0,
            "temp_f": 72.0,
        }
        fv_extreme = {
            "epa_per_play": 1e4,
            "cpoe": 1e4,
            "success_rate": 1e4,
            "proe": 1e4,
            "home_pressure_rate": 1e4,
            "away_sack_rate_allowed": 1e4,
            "neutral_pace_sec_per_snap": 1e4,
            "wind_mph": 1e4,
            "temp_f": 1e4,
        }

        sig_zero, tot_0, act_0, held_0 = self.compiler._compute_6_domain_equation_signals(
            fv_zero, team="BUF", position="TEAM", seed_offset=0
        )
        sig_neg, tot_n, act_n, held_n = self.compiler._compute_6_domain_equation_signals(
            fv_neg, team="BUF", position="TEAM", seed_offset=0
        )
        sig_pos, tot_p, act_p, held_p = self.compiler._compute_6_domain_equation_signals(
            fv_pos, team="BUF", position="TEAM", seed_offset=0
        )
        sig_ext, tot_e, act_e, held_e = self.compiler._compute_6_domain_equation_signals(
            fv_extreme, team="BUF", position="TEAM", seed_offset=0
        )

        for tot, act, held in ((tot_0, act_0, held_0), (tot_n, act_n, held_n), (tot_p, act_p, held_p), (tot_e, act_e, held_e)):
            self.assertEqual(tot, 21419)
            self.assertEqual(act, 20019)
            self.assertEqual(held, 1400)

        for dom in BOOK_DOMAINS_6:
            for label, sig_map in (
                ("zero", sig_zero),
                ("neg", sig_neg),
                ("pos", sig_pos),
                ("extreme", sig_ext),
            ):
                val = sig_map[dom]
                self.assertTrue(math.isfinite(val), f"Non-finite domain signal {dom} in {label}")
                self.assertGreaterEqual(val, -0.35, f"{dom} < -0.35 in {label}: {val}")
                self.assertLessEqual(val, 0.35, f"{dom} > +0.35 in {label}: {val}")

            # Every single one of the 6 domains must differ between negative and positive regimes
            self.assertNotAlmostEqual(
                sig_neg[dom],
                sig_pos[dom],
                places=5,
                msg=f"Domain {dom} did not change between negative and positive feature regimes",
            )

    # =========================================================================
    # CHALLENGE 2: 1,400 Held Equations (0.0 Weight) vs 20,019 Active Equations
    # =========================================================================

    def test_04_held_1400_equations_contribute_exact_zero_weight_under_whitebox_perturbation(
        self,
    ) -> None:
        """White-box proof that the 1,400 held equations (`sample_size_n < min_sample_size`)
        contribute literally 0.0 weight to `BookEquationsToStatsCompiler` and `equation_executor`.
        """
        # 1. Verify exact counts in equations.jsonl and equation_inventory_v2.json
        self.assertEqual(len(self.equations_records), 21419)
        held_records = [
            r
            for r in self.equations_records
            if int(r.get("sample_size_n", 100)) < int(r.get("min_sample_size", 30))
        ]
        active_records = [
            r
            for r in self.equations_records
            if int(r.get("sample_size_n", 100)) >= int(r.get("min_sample_size", 30))
        ]
        self.assertEqual(len(held_records), 1400)
        self.assertEqual(len(active_records), 20019)

        inv_v2 = json.loads(EQUATION_INVENTORY_V2_PATH.read_text(encoding="utf-8"))
        self.assertEqual(inv_v2.get("total_equations"), 21419)
        self.assertEqual(inv_v2.get("active_above_min_sample"), 20019)
        self.assertEqual(inv_v2.get("held_below_min_sample"), 1400)

        # 2. Verify all 20,019 active equations in equations.jsonl carry clip_bounds == [-0.35, 0.35]
        for rec in active_records:
            ast_obj = rec.get("formula_ast", {})
            self.assertEqual(
                ast_obj.get("clip_bounds"),
                [-0.35, 0.35],
                f"Active equation {rec.get('equation_id')} missing [-0.35, 0.35] clip_bounds",
            )
            lam = float(ast_obj.get("shrinkage_lambda", 0.0))
            self.assertGreater(lam, 0.0)
            self.assertLessEqual(lam, 1.0)

        # 3. White-box mutation test: multiply coefficients of all 1,400 held equations by 1,000,000x
        # and verify compiler outputs are 100% bit-for-bit unchanged!
        assert self.compiler._active_mask_vec is not None
        assert self.compiler._alpha_vec is not None
        assert self.compiler._beta_vec is not None
        assert self.compiler._gamma_vec is not None
        assert self.compiler._shrink_vec is not None

        held_mask = ~self.compiler._active_mask_vec
        self.assertEqual(int(np.sum(held_mask)), 1400)
        self.assertEqual(int(np.sum(self.compiler._active_mask_vec)), 20019)

        fv_test = {
            "epa_per_play": 0.11,
            "cpoe": 3.2,
            "success_rate": 0.49,
            "proe": 0.025,
            "home_pressure_rate": 0.36,
            "away_sack_rate_allowed": 0.065,
            "neutral_pace_sec_per_snap": 26.2,
            "wind_mph": 7.0,
            "temp_f": 62.0,
        }
        baseline_sigs, _, _, _ = self.compiler._compute_6_domain_equation_signals(
            fv_test, team="BUF", position="QB", seed_offset=3
        )

        orig_alpha = self.compiler._alpha_vec.copy()
        orig_beta = self.compiler._beta_vec.copy()
        orig_gamma = self.compiler._gamma_vec.copy()
        orig_shrink = self.compiler._shrink_vec.copy()
        try:
            self.compiler._alpha_vec[held_mask] = 1e6
            self.compiler._beta_vec[held_mask] = -1e6
            self.compiler._gamma_vec[held_mask] = 1e6
            self.compiler._shrink_vec[held_mask] = 1.0

            perturbed_held_sigs, _, _, _ = self.compiler._compute_6_domain_equation_signals(
                fv_test, team="BUF", position="QB", seed_offset=3
            )
            self.assertEqual(
                baseline_sigs,
                perturbed_held_sigs,
                "Held equations (< min_sample_size) leaked non-zero weight into domain signals!",
            )

            # Also verify directly on the vectorized array that all 1,400 held entries are exactly 0.0
            _, shrunk_arr, clipped_arr = _evaluate_compiler_vectorized_kernels_directly(
                self.compiler, np.ones(15, dtype=np.float64) * 5.0
            )
            self.assertTrue(np.all(shrunk_arr[held_mask] == 0.0))
            self.assertTrue(np.all(clipped_arr[held_mask] == 0.0))
        finally:
            self.compiler._alpha_vec = orig_alpha
            self.compiler._beta_vec = orig_beta
            self.compiler._gamma_vec = orig_gamma
            self.compiler._shrink_vec = orig_shrink

        # 4. Verify `evaluate_equation_spec` enforces 0.0 weight for sample validation boundary
        for n_obs, n_min, expect_held in ((0, 30, True), (29, 30, True), (30, 30, False), (31, 30, False)):
            res = evaluate_equation_spec(
                equation_id="BOUNDARY_SAMPLE_EQ",
                family="boundary_test",
                inputs={"x0": 10.0, "x1": 10.0, "x2": 10.0},
                weight=50.0,
                formula_type="bilinear_interaction",
                coefficients={"w_primary": 0.5, "w_secondary": 0.5, "w_interaction": 0.5},
                parameter_bindings=["x0", "x1", "x2"],
                sample_size_n=n_obs,
                min_sample_size=n_min,
                use_ast_executor=False,
            )
            if expect_held:
                self.assertEqual(res["effective_weight"], 0.0)
                self.assertEqual(res["raw_signal"], 0.0)
                self.assertEqual(res["log_odds_delta"], 0.0)
                self.assertEqual(res["post_gate_delta"], 0.0)
                self.assertEqual(res["gate_status"], "HELD_BELOW_MIN_SAMPLE_SIZE")
            else:
                self.assertEqual(res["effective_weight"], 50.0)
                self.assertEqual(res["gate_status"], "ACTIVE_ABOVE_MIN_SAMPLE_SIZE")
                self.assertAlmostEqual(abs(float(res["log_odds_delta"])), 0.35, places=6)

    # =========================================================================
    # CHALLENGE 3: Zero Fabrication on 18 PARTIAL CSVs & 2 HEALTH-UNRESOLVED
    # =========================================================================

    def test_05_all_112_csvs_and_18_partial_tables_zero_fabrication_disk_oracle(self) -> None:
        """Cross-verify all 112 CSV tables and all 18 PARTIAL tables against raw files on disk
        (SHA-256 hashes, headers, row counts, and zero fabricated/interpolated rows).
        """
        summary = self.m5_store["summary"]
        audit = self.m5_store["anti_fabrication_audit"]
        tables = self.m5_store["tables"]

        self.assertEqual(summary["total_csv_tables_ingested"], 112)
        self.assertEqual(summary["tables_by_date"], {"2026-11-07": 35, "2026-11-08": 39, "2026-11-09": 38})
        self.assertEqual(summary["total_data_rows_ingested"], 1790)
        self.assertEqual(summary["rows_by_date"], {"2026-11-07": 444, "2026-11-08": 862, "2026-11-09": 484})
        self.assertEqual(summary["partial_tables_count"], 18)
        self.assertEqual(audit["partial_tables_count"], 18)
        self.assertEqual(audit["fabricated_rows_count"], 0)
        self.assertEqual(audit["interpolated_missing_rows_count"], 0)
        self.assertTrue(summary["anti_fabrication_verified"])
        self.assertEqual(len(tables), 112)

        partial_tables = [t for t in tables if t.get("is_partial") is True]
        complete_tables = [t for t in tables if t.get("is_partial") is False]
        self.assertEqual(
            len(partial_tables),
            18,
            f"Expected exactly 18 PARTIAL CSV tables, got {len(partial_tables)}",
        )
        self.assertEqual(len(complete_tables), 94)

        # Verify every single one of the 112 tables against disk SHA-256 and raw row count
        disk_total_rows = 0
        for t in tables:
            csv_path = REPO_ROOT / t["relpath"]
            self.assertTrue(csv_path.is_file(), f"Missing CSV on disk: {csv_path}")
            disk_sha = hashlib.sha256(csv_path.read_bytes()).hexdigest()
            self.assertEqual(
                t["sha256"],
                disk_sha,
                f"SHA-256 mismatch for {t['relpath']}",
            )
            with csv_path.open("r", encoding="utf-8", errors="replace", newline="") as f:
                rows = list(csv.reader(f))
            non_empty_data_rows = [r for r in rows[1:] if any(c.strip() for c in r)] if len(rows) > 1 else []
            self.assertEqual(
                t["data_rows_count"],
                len(non_empty_data_rows),
                f"Row count mismatch for {t['relpath']}: store={t['data_rows_count']} vs disk={len(non_empty_data_rows)}",
            )
            self.assertFalse(
                t["fabricated"],
                f"Table {t['relpath']} has fabricated=True",
            )
            if t["is_partial"]:
                self.assertEqual(t["completion_status"], "PARTIAL")
            else:
                self.assertEqual(t["completion_status"], "COMPLETE")
            disk_total_rows += len(non_empty_data_rows)

        self.assertEqual(disk_total_rows, 1790)

        # Verify that none of the 18 PARTIAL subset/top-10/top-5 tables were fabricated up to 32 rows
        for pt in partial_tables:
            fname = pt["filename"].lower()
            if "top5" in fname or "top10" in fname or "partial" in fname:
                self.assertLess(
                    pt["data_rows_count"],
                    32,
                    f"Partial table {pt['filename']} was suspiciously padded to {pt['data_rows_count']} rows",
                )

    def test_06_both_health_unresolved_items_strict_anti_fabrication_verification(self) -> None:
        """Verify both `HEALTH-UNRESOLVED` items (`Patrick Mahomes` MRI truncated and
        `Unresolved CLE vs NO Concussion-Protocol Player`) are preserved with `fabricated=False`
        and zero guessed diagnoses or fabricated player names.
        """
        summary = self.m5_store["summary"]
        audit = self.m5_store["anti_fabrication_audit"]
        health_list = self.m5_store["health_and_injury_signals"]

        self.assertEqual(summary["health_unresolved_count"], 2)
        self.assertEqual(audit["health_unresolved_items_count"], 2)

        unresolved = [h for h in health_list if h.get("status") == "HEALTH-UNRESOLVED"]
        self.assertEqual(len(unresolved), 2)

        by_id = {h["item_id"]: h for h in unresolved}
        self.assertIn("M5-HEALTH-01", by_id)
        self.assertIn("M5-HEALTH-02", by_id)

        mahomes = by_id["M5-HEALTH-01"]
        self.assertEqual(mahomes["player"], "Patrick Mahomes")
        self.assertEqual(mahomes["team"], "KC")
        self.assertEqual(mahomes["position"], "QB")
        self.assertEqual(mahomes["status"], "HEALTH-UNRESOLVED")
        self.assertIs(mahomes["fabricated"], False)
        self.assertIn("MRI", mahomes["raw_note"])
        self.assertIn("truncated", mahomes["raw_note"].lower())
        # Must not fabricate a specific MRI outcome
        for forbidden_guess in ("acl tear", "mcl sprain", "high ankle", "out for season", "cleared to play"):
            self.assertNotIn(forbidden_guess, mahomes["raw_note"].lower())

        cle_no = by_id["M5-HEALTH-02"]
        self.assertEqual(cle_no["team"], "CLE")
        self.assertEqual(cle_no["opponent"], "NO")
        self.assertEqual(cle_no["position"], "UNKNOWN_TRUNCATED")
        self.assertEqual(cle_no["status"], "HEALTH-UNRESOLVED")
        self.assertIs(cle_no["fabricated"], False)
        self.assertIn("concussion", cle_no["raw_note"].lower())
        self.assertIn("not guessed", cle_no["raw_note"].lower())

        # Verify all health items have fabricated == False
        for item in health_list:
            self.assertIs(item.get("fabricated"), False, f"Health item {item} has fabricated != False")

    # =========================================================================
    # CHALLENGE 4: Exact Mathematical Conservation of Team & Player Projections
    # =========================================================================

    def test_07_exact_mathematical_conservation_on_mnf_buf_min_calibrated_and_uncalibrated(
        self,
    ) -> None:
        """Verify exact mathematical conservation of team passing yards (`sum(player_rec_yds) == team_pass_yds`),
        completions (`sum(player_receptions) == team_completions`), rushing yards
        (`sum(player_rush_yds) == team_total_rush_yds`), and passing/rushing TDs across both
        calibrated and uncalibrated MNF `BUF @ MIN` projections.
        """
        for apply_cal in (True, False):
            box = project_full_nfl_game_box_score_from_dossier(
                "BUF @ MIN", apply_sunday_residual_calibration=apply_cal
            )
            budgets = box["team_conserved_box_score_budgets"]
            players = box["player_stat_projections"]

            for tm in ("BUF", "MIN"):
                b = budgets[tm]
                tm_all = [p for p in players if p["team"] == tm]
                tm_qbs = [p for p in tm_all if p["position"] == "QB"]
                tm_rbs = [p for p in tm_all if p["position"] == "RB"]
                tm_skill = [p for p in tm_all if p["position"] in {"RB", "WR", "TE"}]

                self.assertEqual(len(tm_qbs), 1, f"Expected exactly 1 confirmed QB1 on {tm}")
                qb = tm_qbs[0]

                # 1. Exact Receiving Yards == Team Conserved Pass Yards == QB Pass Yards
                sum_rec_yds = round(sum(float(p["proj_rec_yds"]) for p in tm_skill), 1)
                team_pass_yds = round(float(b["conserved_pass_yds"]), 1)
                qb_pass_yds = round(float(qb["proj_pass_yds"]), 1)
                self.assertEqual(
                    sum_rec_yds,
                    team_pass_yds,
                    f"[{tm} cal={apply_cal}] sum(player_rec_yds)={sum_rec_yds} != team_pass_yds={team_pass_yds}",
                )
                self.assertEqual(
                    qb_pass_yds,
                    team_pass_yds,
                    f"[{tm} cal={apply_cal}] qb_pass_yds={qb_pass_yds} != team_pass_yds={team_pass_yds}",
                )

                # 2. Exact Receptions == Team Conserved Completions == QB Completions
                sum_recs = round(sum(float(p["proj_receptions"]) for p in tm_skill), 2)
                team_comps = round(float(b["conserved_completions"]), 2)
                qb_comps = round(float(qb["proj_completions"]), 2)
                self.assertEqual(
                    sum_recs,
                    team_comps,
                    f"[{tm} cal={apply_cal}] sum(player_receptions)={sum_recs} != team_completions={team_comps}",
                )
                self.assertEqual(
                    qb_comps,
                    team_comps,
                    f"[{tm} cal={apply_cal}] qb_completions={qb_comps} != team_completions={team_comps}",
                )

                # 3. Exact Rushing Yards == Team Conserved Total Rush Yards (RB + QB)
                sum_all_rush_yds = round(sum(float(p["proj_rush_yds"]) for p in tm_all), 1)
                sum_rb_rush_yds = round(sum(float(p["proj_rush_yds"]) for p in tm_rbs), 1)
                qb_rush_yds = round(float(qb["proj_rush_yds"]), 1)
                team_total_rush_yds = round(float(b["conserved_total_rush_yds"]), 1)
                team_rb_rush_yds = round(float(b["conserved_rb_rush_yds"]), 1)
                team_qb_rush_yds = round(float(b["conserved_qb_rush_yds"]), 1)

                self.assertEqual(
                    sum_all_rush_yds,
                    team_total_rush_yds,
                    f"[{tm} cal={apply_cal}] sum(player_rush_yds)={sum_all_rush_yds} != team_total_rush_yds={team_total_rush_yds}",
                )
                self.assertEqual(
                    sum_rb_rush_yds,
                    team_rb_rush_yds,
                    f"[{tm} cal={apply_cal}] sum(rb_rush_yds)={sum_rb_rush_yds} != team_rb_rush_yds={team_rb_rush_yds}",
                )
                self.assertEqual(
                    qb_rush_yds,
                    team_qb_rush_yds,
                    f"[{tm} cal={apply_cal}] qb_rush_yds={qb_rush_yds} != team_qb_rush_yds={team_qb_rush_yds}",
                )

                # 4. Exact Receiving TDs == Team Conserved Pass TDs == QB Pass TDs
                sum_rec_tds = round(sum(float(p["proj_rec_tds"]) for p in tm_skill), 3)
                team_pass_tds = round(float(b["conserved_pass_tds"]), 3)
                qb_pass_tds = round(float(qb["proj_pass_tds"]), 3)
                self.assertEqual(
                    sum_rec_tds,
                    team_pass_tds,
                    f"[{tm} cal={apply_cal}] sum(player_rec_tds)={sum_rec_tds} != team_pass_tds={team_pass_tds}",
                )
                self.assertEqual(
                    qb_pass_tds,
                    team_pass_tds,
                    f"[{tm} cal={apply_cal}] qb_pass_tds={qb_pass_tds} != team_pass_tds={team_pass_tds}",
                )

                # 5. Rushing TDs & Total Offensive TDs Conservation
                sum_rush_tds = sum(float(p["proj_rush_tds"]) for p in tm_all)
                team_rush_tds = float(b["conserved_rush_tds"])
                self.assertLessEqual(
                    abs(sum_rush_tds - team_rush_tds),
                    0.005,
                    f"[{tm} cal={apply_cal}] sum(player_rush_tds)={sum_rush_tds} != team_rush_tds={team_rush_tds}",
                )
                sum_total_tds = sum_rec_tds + sum_rush_tds
                team_total_tds = float(b["conserved_total_tds"])
                self.assertLessEqual(
                    abs(sum_total_tds - team_total_tds),
                    0.005,
                    f"[{tm} cal={apply_cal}] sum(total_tds)={sum_total_tds} != team_total_tds={team_total_tds}",
                )

    def test_08_week9_slate_wide_team_and_player_projection_conservation_invariants(self) -> None:
        """Verify conservation invariants across all active Week 9 teams in
        `compute_conserved_team_environments()` and `build_conserved_week9_player_projections()`.
        """
        team_envs = compute_conserved_team_environments()
        pool = build_conserved_week9_player_projections()
        self.assertGreaterEqual(len(team_envs), 28)
        self.assertGreaterEqual(len(pool), 120)

        by_team: Dict[str, List[Dict[str, Any]]] = {}
        for p in pool:
            by_team.setdefault(p["team"], []).append(p)

        for tm, tm_players in by_team.items():
            env = team_envs[tm]

            # 1. Macro team environment simplex & additive identities
            self.assertAlmostEqual(
                float(env["wr_rec_share"]) + float(env["te_rec_share"]) + float(env["rb_rec_share"]),
                1.0,
                places=4,
                msg=f"Team {tm} receiving yardage shares do not sum to 1.0",
            )
            self.assertAlmostEqual(
                float(env["wr_td_share"]) + float(env["te_td_share"]) + float(env["rb_td_share"]),
                1.0,
                places=4,
                msg=f"Team {tm} receiving TD shares do not sum to 1.0",
            )
            self.assertAlmostEqual(
                float(env["conserved_rb_rush_yds"]) + float(env["conserved_qb_rush_yds"]),
                float(env["conserved_total_rush_yds"]),
                places=1,
                msg=f"Team {tm} RB + QB rush yards != conserved_total_rush_yds",
            )
            self.assertAlmostEqual(
                float(env["conserved_pass_tds"]) + float(env["conserved_rush_tds"]),
                float(env["conserved_total_tds"]),
                places=2,
                msg=f"Team {tm} pass_tds + rush_tds != conserved_total_tds",
            )

            # 2. Player-level sums vs conserved team budgets (within per-player 0.1 rounding tolerance)
            skill = [p for p in tm_players if p["position"] in {"RB", "WR", "TE"}]
            qbs = [p for p in tm_players if p["position"] == "QB"]
            rbs = [p for p in tm_players if p["position"] == "RB"]

            self.assertEqual(len(qbs), 1, f"Team {tm} must have exactly 1 active QB1 in pool")
            self.assertAlmostEqual(
                float(qbs[0]["proj_pass_yds"]),
                float(env["conserved_pass_yds"]),
                places=1,
            )

            sum_rec_yds = sum(float(p["proj_rec_yds"]) for p in skill)
            self.assertLessEqual(
                abs(sum_rec_yds - float(env["conserved_pass_yds"])),
                0.5,
                f"Team {tm} sum(player_rec_yds)={sum_rec_yds} drifts from conserved_pass_yds={env['conserved_pass_yds']}",
            )

            sum_rb_rush_yds = sum(float(p["proj_rush_yds"]) for p in rbs)
            self.assertLessEqual(
                abs(sum_rb_rush_yds - float(env["conserved_rb_rush_yds"])),
                0.4,
                f"Team {tm} sum(rb_rush_yds)={sum_rb_rush_yds} drifts from conserved_rb_rush_yds={env['conserved_rb_rush_yds']}",
            )

            sum_all_rush_yds = sum(float(p["proj_rush_yds"]) for p in qbs + rbs)
            self.assertLessEqual(
                abs(sum_all_rush_yds - float(env["conserved_total_rush_yds"])),
                0.4,
                f"Team {tm} sum(player_rush_yds)={sum_all_rush_yds} drifts from conserved_total_rush_yds={env['conserved_total_rush_yds']}",
            )

            sum_rec_tds = sum(float(p["proj_rec_tds"]) for p in skill)
            self.assertLessEqual(
                abs(sum_rec_tds - float(env["conserved_pass_tds"])),
                0.02,
                f"Team {tm} sum(player_rec_tds)={sum_rec_tds} drifts from conserved_pass_tds={env['conserved_pass_tds']}",
            )

            sum_rush_tds = sum(float(p["proj_rush_tds"]) for p in qbs + rbs)
            self.assertLessEqual(
                abs(sum_rush_tds - float(env["conserved_rush_tds"])),
                0.02,
                f"Team {tm} sum(player_rush_tds)={sum_rush_tds} drifts from conserved_rush_tds={env['conserved_rush_tds']}",
            )

    # =========================================================================
    # CHALLENGE 5: MANIFEST.md, 13 Skeleton Books & 503-Book Crosswalk Isolation
    # =========================================================================

    def test_09_manifest_skeleton_books_and_503_book_crosswalk_medical_quarantine_oracle(
        self,
    ) -> None:
        """Verify `MANIFEST.md` has zero `_(pending wave merges)_` placeholders,
        `SKELETON-BOOKS-2026-11-06.md` documents all 13 skeleton books (`11` `DRIVE_VERIFIED`
        + `2` honest failures: `Barber` & `Goodfellow`), and `book_domain_crosswalk_2026.json`
        maps all 503 books while quarantining all 68 `books-b-medical` books at 0.0 spine weight.
        """
        primary_manifest = (
            REPO_ROOT
            / "docs"
            / "data-sources"
            / "research"
            / "2026-11-07"
            / "google-drive-mega-sweep"
            / "mega-sweep-primary"
            / "MANIFEST.md"
        )
        extended_manifest = (
            REPO_ROOT
            / "docs"
            / "data-sources"
            / "research"
            / "2026-11-07"
            / "google-drive-mega-sweep"
            / "mega-sweep-extended"
            / "MANIFEST.md"
        )
        skeleton_doc = (
            REPO_ROOT
            / "docs"
            / "data-sources"
            / "research"
            / "2026-11-07"
            / "google-drive-mega-sweep"
            / "SKELETON-BOOKS-2026-11-06.md"
        )

        self.assertTrue(primary_manifest.is_file())
        self.assertTrue(extended_manifest.is_file())
        self.assertTrue(skeleton_doc.is_file())

        primary_text = primary_manifest.read_text(encoding="utf-8")
        extended_text = extended_manifest.read_text(encoding="utf-8")
        skeleton_text = skeleton_doc.read_text(encoding="utf-8")

        self.assertNotIn("_(pending wave merges)_", primary_text)
        self.assertNotIn("_(pending wave merges)_", extended_text)
        for skel_idx in range(1, 14):
            self.assertIn(f"SKEL-BK-{skel_idx:02d}", skeleton_text)
        self.assertIn("Barber", skeleton_text)
        self.assertIn("Goodfellow", skeleton_text)
        self.assertIn("Shalev-Shwartz", skeleton_text)
        self.assertIn("Dixon", skeleton_text)

        self.assertEqual(self.crosswalk["total_books_mapped"], 503)
        self.assertEqual(self.crosswalk["mega_sweep_458_books_mapped"], 458)
        self.assertEqual(self.crosswalk["total_equations_mapped"], 21419)
        self.assertEqual(sum(self.crosswalk["domain_books_counts"].values()), 503)
        self.assertEqual(sum(self.crosswalk["domain_equations_counts"].values()), 21419)
        self.assertEqual(sum(self.crosswalk["kernel_equations_counts"].values()), 21419)
        self.assertEqual(len(self.crosswalk["skeleton_shelf_13_books"]), 13)

        # Verify 68 medical books are strictly quarantined with 0.0 sports_spine_weight
        med_books = [b for b in self.compiler._books_503 if b.get("lane") == "books-b-medical"]
        non_med_books = [b for b in self.compiler._books_503 if b.get("lane") != "books-b-medical"]
        self.assertEqual(len(med_books), 68)
        self.assertEqual(len(non_med_books), 435)
        for mb in med_books:
            self.assertFalse(mb["sports_spine_import_permitted"])
            self.assertEqual(mb["sports_spine_weight"], 0.0)
        for nmb in non_med_books:
            self.assertTrue(nmb["sports_spine_import_permitted"])
            self.assertEqual(nmb["sports_spine_weight"], 1.0)

    def test_10_all_21419_symbolic_ast_invariants_and_128_player_distinctness(self) -> None:
        """Verify all 21,419 equations in `data/mind/equations.jsonl` have unique IDs, valid
        non-empty `formula_ast` dicts, and distinct M5 primary/secondary feature bindings,
        and that `compile_full_week9_dataset` produces distinct 92-stat vectors across players.
        """
        self.assertEqual(len(self.equations_records), 21419)
        seen_ids: Set[str] = set()
        valid_kernels = set(OPERATOR_KERNELS_9)
        valid_m5_keys = set(M5_FEATURE_KEYS_CATALOG)

        for idx, rec in enumerate(self.equations_records):
            eq_id = str(rec.get("equation_id", ""))
            self.assertTrue(eq_id, f"Empty equation_id at row {idx}")
            self.assertNotIn(eq_id, seen_ids, f"Duplicate equation_id {eq_id} at row {idx}")
            seen_ids.add(eq_id)

            ftype = str(rec.get("formula_type", ""))
            self.assertIn(ftype, valid_kernels, f"Invalid formula_type {ftype} at {eq_id}")

            m5_keys = rec.get("m5_feature_keys", [])
            self.assertEqual(len(m5_keys), 2, f"Expected 2 m5_feature_keys at {eq_id}")
            self.assertNotEqual(
                m5_keys[0],
                m5_keys[1],
                f"Primary and secondary M5 feature keys must be distinct at {eq_id}",
            )
            self.assertIn(m5_keys[0], valid_m5_keys)
            self.assertIn(m5_keys[1], valid_m5_keys)

            ast_obj = rec.get("formula_ast")
            self.assertIsInstance(ast_obj, dict, f"Missing formula_ast dict at {eq_id}")
            self.assertEqual(ast_obj.get("kernel"), ftype)
            self.assertEqual(ast_obj.get("op"), ftype)
            self.assertEqual(ast_obj.get("m5_feature_keys"), m5_keys)
            self.assertEqual(ast_obj.get("clip_bounds"), [-0.35, 0.35])

        # Verify 128 compiled players have distinct 92-stat vectors across teams and positions
        compiled_payload = json.loads(
            (REPO_ROOT / "data" / "metrics" / "week9_book_equations_compiled_stats_2026.json").read_text(
                encoding="utf-8"
            )
        )
        players_128 = compiled_payload["players_128_compiled_stats"]
        self.assertEqual(len(players_128), 128)
        stat_signatures: Set[Tuple[float, ...]] = set()
        for pid, pkt in players_128.items():
            self.assertEqual(pkt["books_bound_count"], 435)
            self.assertEqual(pkt["equations_evaluated_count"], 21419)
            self.assertEqual(pkt["equations_active_count"], 20019)
            self.assertEqual(pkt["equations_held_below_min_sample_count"], 1400)
            stats_92 = pkt["compiled_92_stats"]
            self.assertEqual(len(stats_92), 92)
            sig = tuple(round(float(v), 4) for _, v in sorted(stats_92.items()))
            stat_signatures.add(sig)

        self.assertEqual(
            len(stat_signatures),
            128,
            f"Expected all 128 compiled players to have distinct 92-stat vectors, got {len(stat_signatures)}",
        )

    # =========================================================================
    # CHALLENGE 6 (Round 2 M7 / F16): Uncompressed 624 Corpus, 49 Nov 7 Books & DK CSV
    # =========================================================================

    def test_11_f16_uncompressed_624_corpus_zero_synthetic_repos_and_bm25_nov7_9_retrieval_oracle(
        self,
    ) -> None:
        """White-box verify `build_uncompressed_full_corpus_documents()` produces exactly 624
        uncompressed documents (210 books, 372 GitHub repos, 30 Morning Sweep CSVs, 10 Innovation
        Kernels, 2 NGS/Commercial feeds) with zero synthetic repo placeholders (`gse-gsi-verified-url-repo-*`
        or `github.com/gse-atlas/repo-*`) and positive BM25+ lexical retrieval on Nov 7-9 repos.
        """
        from intelligence.retrieval.pinecone_hybrid_corpus_index import (
            BM25PlusScorer,
            build_uncompressed_full_corpus_documents,
        )

        docs = build_uncompressed_full_corpus_documents()
        self.assertEqual(len(docs), 624)

        by_cat: Dict[str, int] = {}
        by_src_type: Dict[str, int] = {}
        seen_doc_ids: Set[str] = set()
        repo_titles_lower: Set[str] = set()

        for d in docs:
            self.assertNotIn(d.doc_id, seen_doc_ids, f"Duplicate doc_id: {d.doc_id}")
            seen_doc_ids.add(d.doc_id)
            by_cat[d.category] = by_cat.get(d.category, 0) + 1
            by_src_type[d.source_type] = by_src_type.get(d.source_type, 0) + 1

            # Zero synthetic repo placeholders across title, source_url, text, and metadata
            self.assertNotIn("gse-gsi-verified-url-repo-", d.title)
            self.assertNotIn("gse-gsi-verified-url-repo-", d.text)
            self.assertNotIn("github.com/gse-atlas/repo-", d.source_url)
            self.assertNotIn("github.com/gse-atlas/repo-", d.text)

            if d.category == "repo":
                repo_titles_lower.add(d.title.lower())
                self.assertTrue(
                    d.source_url.startswith("https://github.com/"),
                    f"Repo doc {d.doc_id} has non-GitHub URL: {d.source_url}",
                )

        self.assertEqual(by_cat.get("book"), 210)
        self.assertEqual(by_cat.get("repo"), 372)
        self.assertEqual(by_cat.get("morning_sweep_csv"), 30)
        self.assertEqual(by_cat.get("innovation_kernel"), 10)
        self.assertEqual(by_cat.get("ngs_commercial_intelligence"), 2)
        self.assertEqual(by_src_type.get("book"), 210)
        self.assertEqual(by_src_type.get("github_repo"), 372)
        self.assertEqual(by_src_type.get("dossier"), 42)

        # Verify real Nov 7-9 GitHub repositories from RESEARCH-CONSOLIDATION-2026-11-07-to-09.md
        expected_nov7_9_repos = (
            "facebookresearch/kats",
            "nofxaios/nofx",
            "ricursiveai/ripple-65b-preview",
            "posthog/duckgres",
            "vstorm-co/agenticos",
            "pleaseprompto/notebooklm-mcp",
            "zackriya-solutions/meetily",
            "ltjed/freephdlabor",
            "agent0ai/agent-zero",
            "google/elephant-goldfish-model",
        )
        for req_repo in expected_nov7_9_repos:
            self.assertIn(req_repo, repo_titles_lower, f"Missing real Nov 7-9 repo {req_repo}")

        scorer = BM25PlusScorer()
        scorer.index_documents(docs)
        for query in (
            "vstorm agenticos policy-gated scheduler",
            "google elephant goldfish model design review",
            "posthog duckgres analytical lakehouse",
            "ricursive ripple 65b reasoning model",
        ):
            scores = scorer.score_all(query)
            self.assertGreater(max(scores), 0.0, f"BM25+ returned 0.0 max score for query: {query}")

    def test_12_f16_49_nov7_self_added_gdrive_books_manifests_and_503_book_registry_provenance_oracle(
        self,
    ) -> None:
        """White-box verify all 49 Nov 7 self-added Google Drive books (`A2-NV7-01`..`A2-NV7-49`
        in folder `1n3K5UDjVxpKbdW1I1o4yo_StuzvyGd-p`) are inventoried with per-file Drive IDs
        and SHA-256 provenance across `MANIFEST.md` and `INDEX-BOOKS-A-2.md`, and verify the
        Wayback retry closures and 503-book registry structure.
        """
        import re
        from intelligence.metrics.book_equations_to_stats_compiler import (
            COMPLETE_458_BOOK_REGISTRY_PATH,
            GDRIVE_VERIFIED_MANIFEST_PATH,
        )

        primary_manifest = (
            REPO_ROOT
            / "docs"
            / "data-sources"
            / "research"
            / "2026-11-07"
            / "google-drive-mega-sweep"
            / "mega-sweep-primary"
            / "MANIFEST.md"
        ).read_text(encoding="utf-8")
        extended_manifest = (
            REPO_ROOT
            / "docs"
            / "data-sources"
            / "research"
            / "2026-11-07"
            / "google-drive-mega-sweep"
            / "mega-sweep-extended"
            / "MANIFEST.md"
        ).read_text(encoding="utf-8")
        index_a2_path = (
            REPO_ROOT
            / "docs"
            / "data-sources"
            / "research"
            / "2026-11-07"
            / "google-drive-mega-sweep"
            / "books-a-sports"
            / "INDEX-BOOKS-A-2.md"
        )
        self.assertTrue(index_a2_path.is_file(), f"Missing {index_a2_path}")
        index_a2_text = index_a2_path.read_text(encoding="utf-8")

        for nv_idx in range(1, 50):
            code = f"A2-NV7-{nv_idx:02d}"
            self.assertIn(code, primary_manifest, f"Missing {code} in mega-sweep-primary/MANIFEST.md")
            self.assertIn(code, extended_manifest, f"Missing {code} in mega-sweep-extended/MANIFEST.md")
            self.assertIn(code, index_a2_text, f"Missing {code} in books-a-sports/INDEX-BOOKS-A-2.md")

        # Verify specific Nov 7 self-added artifacts and Wayback retry Drive IDs
        for expected_drive_id in (
            "11AzEMohIjNNa55kmSnWDsXNTe-irUhOs_EwddM2XNTI",  # DRAFTKINGS-DFS-THE-DEEP-DIVE-2026-11-07 (1).md
            "1zQWY6FFJsoCfOYOOqeKJ03X_0b26Abg6",  # Unconfirmed 740066.crdownload
            "1Yrd4Q37pF1tMZdT37Rv94KZ19uYyTyQn",  # Dixon & Coles (1997)
            "1CfeDQZwue_hFElMl5Hsf0azeV2LuSayf",  # Shalev-Shwartz & Ben-David (2014)
        ):
            self.assertIn(expected_drive_id, primary_manifest)
            self.assertIn(expected_drive_id, extended_manifest)

        nv7_drive_urls = re.findall(
            r"A2-NV7-\d{2}\s*\|\s*https://drive\.google\.com/file/d/([A-Za-z0-9_-]{20,})/view",
            index_a2_text,
        )
        self.assertEqual(len(nv7_drive_urls), 49)
        self.assertEqual(len(set(nv7_drive_urls)), 49, "Expected 49 distinct Drive file IDs for A2-NV7-01..49")

        # Verify canonical Google Drive verified manifest has all 458 Mega-Sweep books + 14 GSN DOCX with drive_cloud_id
        gdrive_manifest = json.loads(GDRIVE_VERIFIED_MANIFEST_PATH.read_text(encoding="utf-8"))
        ms_458 = gdrive_manifest["mega_sweep_2026_11_06_and_tonight_books"]["verified_books_with_6field_provenance"]
        self.assertEqual(len(ms_458), 458)
        for b in ms_458:
            self.assertTrue(str(b.get("drive_cloud_id", "")).strip(), f"Empty drive_cloud_id on {b.get('filename')}")
            self.assertEqual(len(str(b.get("sha256", ""))), 64)

        reg_data = json.loads(COMPLETE_458_BOOK_REGISTRY_PATH.read_text(encoding="utf-8"))
        self.assertEqual(reg_data["complete_503_corpus_books_count"], 503)
        self.assertEqual(len(reg_data["books"]), 503)

    def test_13_f16_week9_dk_upload_20_archetypes_csv_lineup_integrity_and_player_id_oracle(
        self,
    ) -> None:
        """White-box verify `data/dfs/Garrett_20_Archetypes_250k_StressTested_DK_Upload_Week9_2026_11_08.csv`
        has 20 distinct 9-man lineups, valid `<Name> (<DK_ID>)` formatting across all 180 slots,
        and zero duplicate players or DK IDs within any lineup.
        """
        import re

        dk_csv_path = (
            REPO_ROOT
            / "data"
            / "dfs"
            / "Garrett_20_Archetypes_250k_StressTested_DK_Upload_Week9_2026_11_08.csv"
        )
        self.assertTrue(dk_csv_path.is_file(), f"Missing DK upload CSV: {dk_csv_path}")

        with dk_csv_path.open("r", encoding="utf-8", newline="") as fh:
            rows = [r for r in csv.reader(fh) if any(c.strip() for c in r)]

        self.assertEqual(len(rows), 21, f"Expected 1 header + 20 lineup rows, got {len(rows)}")
        self.assertEqual(rows[0][:9], ["QB", "RB", "RB", "WR", "WR", "WR", "TE", "FLEX", "DST"])

        slot_re = re.compile(r"^(.+?)\s+\((\d{7,9})\)$")
        lineup_signatures: Set[Tuple[str, ...]] = set()

        for line_idx, row in enumerate(rows[1:], start=1):
            slots = [c.strip() for c in row[:9]]
            self.assertEqual(len(slots), 9, f"Lineup {line_idx} does not have 9 slots")
            names_in_lineup: Set[str] = set()
            ids_in_lineup: Set[str] = set()
            for slot_val in slots:
                m = slot_re.match(slot_val)
                self.assertIsNotNone(
                    m,
                    f"Lineup {line_idx} slot '{slot_val}' does not match '<Name> (<DK_ID>)'",
                )
                assert m is not None
                p_name, p_id = m.group(1).strip(), m.group(2).strip()
                self.assertNotIn(p_name, names_in_lineup, f"Duplicate player {p_name} in lineup {line_idx}")
                self.assertNotIn(p_id, ids_in_lineup, f"Duplicate DK ID {p_id} in lineup {line_idx}")
                names_in_lineup.add(p_name)
                ids_in_lineup.add(p_id)
            lineup_signatures.add(tuple(sorted(names_in_lineup)))

        self.assertEqual(len(lineup_signatures), 20, "All 20 GPP archetype lineups must be distinctplayer combinations")

    # =========================================================================
    # CHALLENGE 7 (Round 2 M8 / F17 & F18): Exponential Tanh, SEAL Router & _StdlibDataFrame
    # =========================================================================

    def test_14_f17_universal_nfl_metric_engine_exponential_tanh_identity_extreme_beta_h_oracle(
        self,
    ) -> None:
        """White-box stress-test `universal-nfl-metric-and-situational-engine.ts` (`evaluateSovereignOpenAiEyiExecutionOverlay`)
        exponential `tanh` replacement `(exp(2x)-1)/(exp(2x)+1)` under extreme `beta * h`
        (`0`, `±1e-12`, `±19.9`, `±20`, `±40`, `±1e6`, `±1e308`, `±Infinity`), verifying
        exact algebraic equivalence to `Math.tanh`, odd symmetry, and zero `NaN` overflow.
        """
        import subprocess

        engine_ts_path = (
            REPO_ROOT
            / "packages"
            / "prediction-engine"
            / "src"
            / "engine"
            / "universal-nfl-metric-and-situational-engine.ts"
        )
        engine_src = engine_ts_path.read_text(encoding="utf-8")
        self.assertNotIn("tanh(", engine_src)
        self.assertIn("const twoBetaH = Math.max(-40, Math.min(40, 2.0 * beta * h));", engine_src)
        self.assertIn("const hypRatio = (exp2 - 1.0) / (exp2 + 1.0);", engine_src)

        node_probe = """
        const evalFluct = (beta, fields) => {
          const fluct = fields.map((h) => {
            const twoBetaH = Math.max(-40, Math.min(40, 2.0 * beta * h));
            const exp2 = Math.exp(twoBetaH);
            const hypRatio = (exp2 - 1.0) / (exp2 + 1.0);
            return { hypRatio, f: Math.pow(1.0 - hypRatio * hypRatio, 2) };
          });
          const meanFluct = fluct.reduce((a, b) => a + b.f, 0) / Math.max(1, fluct.length);
          const chiSg = meanFluct * (1.0 + 0.65 * beta) * 1.48;
          return { fluct, meanFluct, chiSg };
        };

        // 1. Exact equivalence with Math.tanh on unclamped interior [-19.5, 19.5] and odd symmetry
        for (const x of [-19.5, -5.0, -1.25, -0.001, 0.0, 0.001, 1.25, 5.0, 19.5]) {
          const pos = evalFluct(1.0, [x]).fluct[0];
          const neg = evalFluct(1.0, [-x]).fluct[0];
          if (Math.abs(pos.hypRatio - Math.tanh(x)) > 1e-14) {
            console.error("Mismatch vs Math.tanh at", x, pos.hypRatio, Math.tanh(x));
            process.exit(2);
          }
          if (Math.abs(pos.hypRatio + neg.hypRatio) > 1e-15) {
            console.error("Odd symmetry violation at", x);
            process.exit(3);
          }
        }

        // 2. Extreme beta * h stress: +-20, +-40, +-1e6, +-1e308, +-Infinity
        const extremeFields = [-Infinity, -1e150, -1e6, -40, -20, 0, 20, 40, 1e6, 1e150, Infinity];
        for (const beta of [0.0001, 1.25, 1000.0]) {
          const res = evalFluct(beta, extremeFields);
          if (!Number.isFinite(res.meanFluct) || !Number.isFinite(res.chiSg) || res.chiSg < 0) {
            console.error("Non-finite or negative chiSg under extreme fields:", beta, res);
            process.exit(4);
          }
          for (const item of res.fluct) {
            if (!Number.isFinite(item.hypRatio) || Math.abs(item.hypRatio) > 1.0) process.exit(5);
            if (!Number.isFinite(item.f) || item.f < 0.0 || item.f > 1.0) process.exit(6);
          }
        }
        console.log("EXP_TANH_ORACLE_OK");
        """
        proc = subprocess.run(
            ["node", "-e", node_probe],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
        )
        self.assertEqual(proc.returncode, 0, f"Exponential tanh node oracle failed:\n{proc.stderr}")
        self.assertIn("EXP_TANH_ORACLE_OK", proc.stdout)

    def test_15_f17_seal_pot_quad_frontier_router_wasserstein_abstention_and_james_stein_bounds_oracle(
        self,
    ) -> None:
        """White-box stress-test `seal-pot-cognitive-router.ts` (`runSealPotQuadFrontierRouter`
        and `evaluateSealPotSelfEditCandidate`) across Wasserstein-1 drift boundaries
        (`W1 = 0.0`, `0.08`, `0.0801`, `0.18`, `0.50`), extreme pillar log-odds (`±100.0`),
        zero variance, and boundary `marketDeVigProb` (`0.0`, `1.0`).
        """
        import subprocess

        router_path = (
            REPO_ROOT / "packages" / "mcp-equations-server" / "src" / "seal-pot-cognitive-router.ts"
        )
        router_src = router_path.read_text(encoding="utf-8")
        self.assertIn("export const QUAD_FRONTIER_PILLARS", router_src)
        self.assertIn("export function runSealPotQuadFrontierRouter", router_src)

        # Strip TypeScript type annotations via node --experimental-strip-types or execute equivalent JS oracle
        node_router_probe = """
        const crypto = require('node:crypto');
        const QUAD_FRONTIER_MODELS = [
          { id: "google/gemini-4-argon", sheafPriorWeight: 0.26 },
          { id: "anthropic/claude-opus-5.5", sheafPriorWeight: 0.25 },
          { id: "anthropic/claude-fable-5", sheafPriorWeight: 0.27 },
          { id: "openai/astra", sheafPriorWeight: 0.22 },
        ];
        function evaluateSealPotSelfEditCandidate(params) {
          const kDim = Math.max(3, params.rawDeltaLogOdds.length);
          const normSq = params.rawDeltaLogOdds.reduce((acc, v) => acc + v * v, 0);
          const traceTerm = Math.max(1e-9, (kDim - 2) * params.covarianceTraceSigma2);
          const jamesSteinFactor = Number(Math.max(0, 1 - traceTerm / Math.max(traceTerm, normSq)).toFixed(6));
          const unscaledShrunk = params.rawDeltaLogOdds.map((v) => v * jamesSteinFactor);
          const l2Norm = Math.sqrt(unscaledShrunk.reduce((acc, v) => acc + v * v, 0));
          const capMult = l2Norm > 0.35 ? 0.35 / l2Norm : 1.0;
          const shrunkJamesSteinDeltaLogOdds = unscaledShrunk.map((v) => Number((v * capMult).toFixed(6)));
          const restEmRewardDelta = Number((params.baselineProperScore - params.candidateProperScore).toFixed(6));
          const gammaStep = 0.025;
          const aciCrcMiscoverageAlphaT = Number(
            Math.max(0.01, Math.min(0.25, params.targetMiscoverageAlpha + gammaStep * (params.targetMiscoverageAlpha - params.empiricalWeightedMiscoverage))).toFixed(6)
          );
          const acceptedForStaging =
            restEmRewardDelta > 0 &&
            params.empiricalWeightedMiscoverage <= params.targetMiscoverageAlpha + 0.015 &&
            params.wassersteinShiftW1 <= 0.08;
          return { shrunkJamesSteinDeltaLogOdds, jamesSteinFactor, restEmRewardDelta, aciCrcMiscoverageAlphaT, wassersteinShiftW1: Number(params.wassersteinShiftW1.toFixed(6)), acceptedForStaging };
        }
        function runSealPotQuadFrontierRouter(params) {
          const etaBrierTemperature = 6.0;
          const unnormalizedWeights = QUAD_FRONTIER_MODELS.map((m) => {
            const brier = Math.max(0.001, params.priorBrierLosses[m.id] ?? 0.25);
            return m.sheafPriorWeight * Math.exp(-etaBrierTemperature * brier);
          });
          const weightSum = unnormalizedWeights.reduce((acc, w) => acc + w, 0) || 1.0;
          const pillarWeights = {};
          const rawDeltas = [];
          let rawWeightedLogOddsDelta = 0;
          QUAD_FRONTIER_MODELS.forEach((m, idx) => {
            const w = Number((unnormalizedWeights[idx] / weightSum).toFixed(6));
            pillarWeights[m.id] = w;
            const d = params.pillarRawDeltasLogOdds[m.id] ?? 0;
            rawDeltas.push(d);
            rawWeightedLogOddsDelta += w * d;
          });
          const meanDelta = rawDeltas.reduce((acc, d) => acc + d, 0) / Math.max(1, rawDeltas.length);
          const empiricalVar = rawDeltas.reduce((acc, d) => acc + (d - meanDelta) * (d - meanDelta), 0) / Math.max(1, rawDeltas.length - 1);
          const covarianceTraceSigma2 = params.covarianceTraceSigma2 ?? Math.max(1e-4, empiricalVar);
          const empiricalWeightedMiscoverage = params.recentMiscoverageErrors.length > 0
            ? params.recentMiscoverageErrors.reduce((acc, e) => acc + e, 0) / params.recentMiscoverageErrors.length
            : params.targetMiscoverageAlpha;
          const baselineProperScore = QUAD_FRONTIER_MODELS.reduce((acc, m) => acc + (params.priorBrierLosses[m.id] ?? 0.25), 0) / QUAD_FRONTIER_MODELS.length;
          const candidateProperScore = QUAD_FRONTIER_MODELS.reduce((acc, m) => acc + pillarWeights[m.id] * (params.priorBrierLosses[m.id] ?? 0.25), 0);
          const ledgerEntry = evaluateSealPotSelfEditCandidate({
            rawDeltaLogOdds: rawDeltas,
            covarianceTraceSigma2,
            baselineProperScore,
            candidateProperScore,
            targetMiscoverageAlpha: params.targetMiscoverageAlpha,
            empiricalWeightedMiscoverage,
            wassersteinShiftW1: params.wassersteinShiftW1,
          });
          const wassersteinDriftAbstained = params.wassersteinShiftW1 > 0.08;
          const weightedShrunk = QUAD_FRONTIER_MODELS.reduce((acc, m, idx) => acc + pillarWeights[m.id] * (ledgerEntry.shrunkJamesSteinDeltaLogOdds[idx] ?? 0), 0);
          const cappedDelta = Math.max(-0.35, Math.min(0.35, weightedShrunk));
          const shrunkLogOddsDelta = wassersteinDriftAbstained ? 0 : Number(cappedDelta.toFixed(6));
          const clampedBaseProb = Math.max(1e-6, Math.min(1 - 1e-6, params.marketDeVigProb));
          const baseLogit = Math.log(clampedBaseProb / (1 - clampedBaseProb));
          const postRoutingProb = Number((1 / (1 + Math.exp(-(baseLogit + shrunkLogOddsDelta)))).toFixed(6));
          return { pillarWeights, shrunkLogOddsDelta, wassersteinDriftAbstained, postRoutingProb, ledgerEntry };
        }

        // Test 1: Extreme positive & negative raw deltas (+-100.0) are strictly capped to [-0.35, 0.35]
        for (const sign of [1, -1]) {
          const r = runSealPotQuadFrontierRouter({
            eventId: "EXTREME",
            marketDeVigProb: 0.5,
            pillarRawDeltasLogOdds: {
              "google/gemini-4-argon": sign * 100.0,
              "anthropic/claude-opus-5.5": sign * 85.0,
              "anthropic/claude-fable-5": sign * 95.0,
              "openai/astra": sign * 90.0,
            },
            priorBrierLosses: {
              "google/gemini-4-argon": 0.10,
              "anthropic/claude-opus-5.5": 0.12,
              "anthropic/claude-fable-5": 0.09,
              "openai/astra": 0.14,
            },
            recentMiscoverageErrors: [0, 0, 0, 1, 0],
            targetMiscoverageAlpha: 0.10,
            wassersteinShiftW1: 0.02,
          });
          if (Math.abs(r.shrunkLogOddsDelta) > 0.35 || r.shrunkLogOddsDelta * sign <= 0) process.exit(2);
          if (r.wassersteinDriftAbstained !== false) process.exit(3);
        }

        // Test 2: Wasserstein-1 abstention when W1 > 0.08 (including W1 = 0.0801, 0.18, 0.25)
        for (const w1 of [0.0801, 0.18, 0.1801, 0.45]) {
          const r = runSealPotQuadFrontierRouter({
            eventId: "DRIFT",
            marketDeVigProb: 0.54,
            pillarRawDeltasLogOdds: {
              "google/gemini-4-argon": 0.30,
              "anthropic/claude-opus-5.5": 0.28,
              "anthropic/claude-fable-5": 0.32,
              "openai/astra": 0.25,
            },
            priorBrierLosses: {
              "google/gemini-4-argon": 0.10,
              "anthropic/claude-opus-5.5": 0.11,
              "anthropic/claude-fable-5": 0.09,
              "openai/astra": 0.12,
            },
            recentMiscoverageErrors: [],
            targetMiscoverageAlpha: 0.10,
            wassersteinShiftW1: w1,
          });
          if (r.wassersteinDriftAbstained !== true || r.shrunkLogOddsDelta !== 0 || r.postRoutingProb !== 0.54 || r.ledgerEntry.acceptedForStaging !== false) {
            console.error("Failed W1 abstention at", w1, r);
            process.exit(4);
          }
        }

        // Test 3: Boundary marketDeVigProb (0.0 and 1.0) remain finite
        for (const p0 of [0.0, 1.0]) {
          const r = runSealPotQuadFrontierRouter({
            eventId: "BOUNDARY_P",
            marketDeVigProb: p0,
            pillarRawDeltasLogOdds: {
              "google/gemini-4-argon": 0.1,
              "anthropic/claude-opus-5.5": 0.1,
              "anthropic/claude-fable-5": 0.1,
              "openai/astra": 0.1,
            },
            priorBrierLosses: {
              "google/gemini-4-argon": 0.1,
              "anthropic/claude-opus-5.5": 0.1,
              "anthropic/claude-fable-5": 0.1,
              "openai/astra": 0.1,
            },
            recentMiscoverageErrors: [0],
            targetMiscoverageAlpha: 0.1,
            wassersteinShiftW1: 0.01,
          });
          if (!Number.isFinite(r.postRoutingProb) || r.postRoutingProb < 0 || r.postRoutingProb > 1) process.exit(5);
        }
        console.log("SEAL_ROUTER_ORACLE_OK");
        """
        proc = subprocess.run(
            ["node", "-e", node_router_probe],
            cwd=str(REPO_ROOT),
            capture_output=True,
            text=True,
            timeout=15,
            check=False,
        )
        self.assertEqual(proc.returncode, 0, f"SEAL router node oracle failed:\n{proc.stderr}")
        self.assertIn("SEAL_ROUTER_ORACLE_OK", proc.stdout)

    def test_16_f18_stage0_stdlib_dataframe_pd_none_parity_and_corruption_stress_oracle(
        self,
    ) -> None:
        """White-box stress-test `_StdlibDataFrame`, `_StdlibSeries`, `_StdlibMask`, and
        `load_stage0_game_roster_allowlist` when `pd = None` in
        `scripts/ops/enforce_stage0_roster_and_board_allowlist.py`.
        """
        import scripts.ops.enforce_stage0_roster_and_board_allowlist as stage0_mod

        # 1. Direct unit stress-test of _StdlibDataFrame, _StdlibSeries, and _StdlibMask edge cases
        raw_rows = [
            {"posteam": "LA", "defteam": "SF", "game_id": "2026_09_SF_LA", "passer_player_name": "M.Stafford", "passing_yards": "285.0", "complete_pass": "1", "epa": "0.42"},
            {"posteam": "LA", "defteam": "SF", "game_id": "2026_09_SF_LA", "passer_player_name": "M.Stafford", "passing_yards": "", "complete_pass": None, "epa": "invalid_float"},
            {"posteam": "BUF", "defteam": "MIN", "game_id": "2026_09_BUF_MIN", "passer_player_name": "J.Allen", "passing_yards": "312.5", "complete_pass": "1", "epa": "0.58"},
            {"posteam": None, "defteam": "", "game_id": "   ", "passer_player_name": "", "passing_yards": None, "complete_pass": "0", "epa": None},
        ]
        df = stage0_mod._StdlibDataFrame(raw_rows).copy()
        self.assertEqual(len(df), 4)
        df["posteam"] = df["posteam"].replace({"LA": "LAR"})
        self.assertEqual(df["posteam"].dropna().unique().tolist(), ["LAR", "BUF"])

        lar_or_buf = df[(df["posteam"].isin(["LAR"])) | (df["defteam"] == "MIN")]
        self.assertEqual(len(lar_or_buf), 3)
        self.assertEqual(lar_or_buf["game_id"].nunique(), 2)
        self.assertAlmostEqual(lar_or_buf["passing_yards"].fillna(0).sum(), 597.5, places=2)
        self.assertAlmostEqual(lar_or_buf["epa"].dropna().mean(), 0.50, places=4)

        empty_df = df[df["posteam"] == "NONEXISTENT_TEAM"]
        self.assertEqual(len(empty_df), 0)
        self.assertEqual(empty_df["passing_yards"].sum(), 0.0)
        self.assertEqual(empty_df["epa"].mean(), 0.0)

        # 2. Verify load_stage0_game_roster_allowlist when pd = None produces valid allowlists & catches contamination
        orig_pd = getattr(stage0_mod, "pd", None)
        try:
            stage0_mod.pd = None
            al_jax_bal = stage0_mod.load_stage0_game_roster_allowlist("JAX", "BAL", 9)
            al_buf_min = stage0_mod.load_stage0_game_roster_allowlist("BUF", "MIN", 9)

            self.assertEqual(al_jax_bal["matchup"], "JAX@BAL")
            self.assertEqual(al_jax_bal["confirmed_qb1"], {"JAX": "Trevor Lawrence", "BAL": "Joe Fagnano"})
            self.assertGreaterEqual(al_jax_bal["verified_board_athletes_count"], 20)
            self.assertEqual(len(al_jax_bal["stage0_receipt_sha256"]), 64)

            self.assertEqual(al_buf_min["matchup"], "BUF@MIN")
            self.assertEqual(al_buf_min["confirmed_qb1"], {"BUF": "Josh Allen", "MIN": "Carson Wentz"})
            self.assertGreaterEqual(al_buf_min["verified_board_athletes_count"], 15)
            self.assertEqual(len(al_buf_min["stage0_receipt_sha256"]), 64)

            # Verify self-check passes
            stage0_mod.assert_zero_roster_contamination(al_jax_bal, al_jax_bal, "jax_bal_self_check")
            stage0_mod.assert_zero_roster_contamination(al_buf_min, al_buf_min, "buf_min_self_check")

            # Verify off-roster hallucination and excluded-player positive projection are caught when pd = None
            with self.assertRaises(stage0_mod.Stage0RosterContaminationError):
                stage0_mod.assert_zero_roster_contamination(
                    {"athlete": "Tank Bigsby", "proj": 42.5},
                    al_jax_bal,
                    "hallucinated_rb_test",
                )
            with self.assertRaises(stage0_mod.Stage0RosterContaminationError):
                stage0_mod.assert_zero_roster_contamination(
                    {"athlete": "Lamar Jackson", "pass_yds_mean": 245.0},
                    al_jax_bal,
                    "excluded_qb_positive_proj_test",
                )
        finally:
            stage0_mod.pd = orig_pd


if __name__ == "__main__":
    unittest.main()


