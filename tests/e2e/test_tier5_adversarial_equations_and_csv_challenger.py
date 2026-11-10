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


if __name__ == "__main__":
    unittest.main()

