"""Comprehensive unittest & pytest verification suite for GSE Mind Architecture & T1-T8 Mutations.

Verifies:
  1. Module 1: Boltzmann partition function, Helmholtz identity F = U - T*H, constraint-tax
     shift Delta_F = -T ln Omega, temperature clamping, bisection entropy floor, attention
     thermodynamics, H100/4090 B_max thresholds, and In-Writing <|GSE_JSON|> tag dispatch.
  2. Module 2: Roy-Vetterli effective rank erank(Sigma) = exp(H(lambda)) and Gavish-Donoho
     Marchenko-Pastur bulk edge guard across healthy multi-factor, rank-1 collapsed, and
     isotropic sub-MP pure-noise matrices.
  3. Module 3: Barber et al. non-exchangeable conformal quantile, Kish ESS & c_hat <= 12.42
     weight-concentration gate, and online ACI + Conformal PID coverage tracking.
  4. Module 4: Cai et al. backward verifier error-rate debiasing (R_tilde - rho_0)/(1 - rho_0 - rho_1),
     Youden J identifiability gate, and Bellman Q-decay step-product kill switch.
  5. Module 5: Canonical Protobuf-compatible binary frame compiler with RFC 3720 CRC32C
     ('123456789' -> 0xE3069283), SHA-256, permutation invariance, -0.0 normalization,
     NaN/Inf rejection, and bit-flip tamper rejection via zero-copy memoryview.
  6. Module 6: Bayesian Network DAG topological acyclicity, exact Pearl do-calculus interventions,
     and all five reconciled P1 bug guards (target_hhi == 0.0, swallowed DataGapError,
     CLEAR-on-missing-evidence, tau_hat point-fit stamp/wiring, and Python <-> TS parity < 1e-6).
  7. Content-Driven Literature Inference (Mutation Test 2.0 probes M2-T1..M2-T4) +
     Complete T1-T8 Adversarial Mutation Harness proving 100% (8/8) mutant kill rate.
"""

from __future__ import annotations

import os
import sys
import unittest

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from gse_mind_thermodynamics_and_t1_t8_mutations import (
    ACIPIDCoverageController,
    AdversarialMutationHarness,
    CALIBRATION_LEDGER_DISCLOSURE,
    CanonicalSignalFrameCompiler,
    CascadingFailureDAG,
    ConformalGroundError,
    DataGapError,
    FrameIntegrityError,
    GSERuntimeGatePipeline,
    HallucinationKillSwitchError,
    HardcodedFallbackError,
    HomeSignSabotageError,
    InWritingTagDispatcher,
    InvalidCopulaMatrixError,
    LatentCollapseError,
    MAX_CONFORMAL_C_HAT,
    MurphyCalibrationKillSwitchError,
    P1ClearOnMissingEvidenceError,
    P1PipelineParityError,
    P1SwallowedDataGapError,
    P1TargetHHIFallbackError,
    P1TauHatStampError,
    SignalEntryWire,
    TAU_HAT_MANDATORY_STAMP,
    TemporalLookaheadError,
    ThermodynamicMaskError,
    TruthFileCopyLeakError,
    UnidentifiableVerifierError,
    UnmanifestedFixtureError,
    VerifiedSituationalPrinciple,
    WireFormatError,
    build_valid_baseline_bundle,
    compute_crc32c,
    compute_ess_and_c_hat,
    compute_non_exchangeable_conformal_quantile,
    compute_non_stalling_batch_max,
    debias_verifier_rate,
    detect_latent_dimensional_collapse,
    evaluate_attention_thermodynamics,
    evaluate_bellman_q_decay_defense,
    evaluate_masked_boltzmann,
    evaluate_mind_principles,
    gate_t7_no_hardcoded_fallbacks,
    gate_t8_truth_file_copy_guard,
    guard_p1_no_clear_on_missing_evidence,
    guard_p1_no_swallowed_data_gap,
    guard_p1_python_ts_parity,
    guard_p1_target_hhi,
    guard_p1_tau_hat_stamp_and_wiring,
    verify_candidate_extraction,
)


class TestModule1Thermodynamics(unittest.TestCase):
    """Module 1: Token-Masking Free-Energy & Attention Thermodynamics."""

    def test_helmholtz_identity_and_mask_free_energy_cost(self) -> None:
        logits = np.array([2.4, -0.5, 1.1, 0.3, -1.8, 3.2], dtype=np.float64)
        allowed = [0, 1, 2, 3]
        state = evaluate_masked_boltzmann(logits, allowed, temperature=1.0, entropy_floor=0.2)

        lhs = state.free_energy_valid
        rhs = state.internal_energy_valid - state.effective_temperature * state.entropy_valid
        self.assertAlmostEqual(lhs, rhs, places=12)

        self.assertGreater(state.mask_free_energy_cost, 0.0)
        self.assertAlmostEqual(
            state.mask_free_energy_cost,
            -state.effective_temperature * np.log(state.valid_mass_omega),
            places=12,
        )
        self.assertEqual(state.probabilities[4], 0.0)
        self.assertEqual(state.probabilities[5], 0.0)
        self.assertAlmostEqual(float(np.sum(state.probabilities)), 1.0, places=12)

    def test_temperature_clamping_and_entropy_floor_prevents_logit_collapse(self) -> None:
        spiked = np.array([120.0, 0.0, 0.0, 0.0], dtype=np.float64)
        floor = 0.85
        state = evaluate_masked_boltzmann(
            spiked,
            [0, 1, 2, 3],
            temperature=0.02,
            t_min=0.25,
            t_max=5.0,
            entropy_floor=floor,
        )
        self.assertTrue(state.temperature_clamped)
        self.assertTrue(state.entropy_floor_engaged)
        self.assertGreaterEqual(state.entropy_valid, floor - 1e-9)
        self.assertLess(state.probabilities[0], 0.99)

    def test_single_token_fast_forward_and_empty_mask_fail_closed(self) -> None:
        state = evaluate_masked_boltzmann([1.0, 5.0, -2.0], [1], temperature=0.8)
        self.assertTrue(state.fast_forward)
        self.assertEqual(state.probabilities[1], 1.0)
        self.assertEqual(state.entropy_valid, 0.0)

        with self.assertRaises(ThermodynamicMaskError):
            evaluate_masked_boltzmann([1.0, 2.0], [], temperature=1.0)

        with self.assertRaises(ThermodynamicMaskError):
            evaluate_masked_boltzmann([1.0, float("nan")], [0, 1], temperature=1.0)

    def test_attention_thermodynamics_and_h100_batch_thresholds(self) -> None:
        q = np.array([[20.0, 0.0], [0.5, -0.5], [0.0, 15.0]], dtype=np.float64)
        k = np.array([[20.0, 0.0], [-5.0, 0.0], [0.0, 15.0]], dtype=np.float64)
        rep = evaluate_attention_thermodynamics(q, k, temperature=0.5, row_entropy_floor=0.50)
        self.assertEqual(rep.attention_weights.shape, (3, 3))
        np.testing.assert_allclose(np.sum(rep.attention_weights, axis=1), np.ones(3), atol=1e-12)
        self.assertGreaterEqual(rep.min_row_entropy, 0.50 - 1e-7)
        self.assertGreaterEqual(rep.entropy_floor_interventions, 1)

        b_max_py = compute_non_stalling_batch_max(4.80, t_sync_ms=0.15, t_mask_us=50.0, n_cores=1, t_xfer_us=35.0)
        b_max_cpp = compute_non_stalling_batch_max(4.80, t_sync_ms=0.15, t_mask_us=50.0, n_cores=1, t_xfer_us=5.0)
        self.assertEqual(b_max_py, 54)
        self.assertEqual(b_max_cpp, 84)

    def test_in_writing_tag_dispatcher_ignores_math_curly_braces(self) -> None:
        dispatcher = InWritingTagDispatcher()
        self.assertFalse(dispatcher.step_token("<|GSE_ANALYSIS|>Evaluating set S = {x_1, x_2} "))
        self.assertFalse(dispatcher.step_token("with drag coefficient {0.024}."))
        self.assertTrue(dispatcher.step_token("<|GSE_JSON|>"))
        self.assertTrue(dispatcher.step_token('{"abstained":false}'))
        delib, payload = dispatcher.split_deliberation_and_json()
        self.assertIn("S = {x_1, x_2}", delib)
        self.assertEqual(payload, '{"abstained":false}')


class TestModule2LatentCollapse(unittest.TestCase):
    """Module 2: Latent-Space Dimensional Collapse Detector."""

    def test_healthy_multifactor_embeddings_pass(self) -> None:
        rng = np.random.default_rng(20261113)
        n, d = 240, 24
        noise = rng.normal(0.0, 0.35, size=(n, d))
        factors = rng.normal(0.0, 2.2, size=(n, 5))
        loadings = rng.normal(0.0, 1.0, size=(5, d))
        x = factors @ loadings + noise

        diag = detect_latent_dimensional_collapse(x, min_erank=3.5, min_signal_spikes=3)
        self.assertGreater(diag.effective_rank, 4.0)
        self.assertGreaterEqual(diag.num_signal_spikes, 3)

    def test_rank_one_anisotropic_collapse_rejected(self) -> None:
        rng = np.random.default_rng(42)
        v = rng.normal(0.0, 1.0, size=(120, 1))
        w = rng.normal(0.0, 1.0, size=(1, 16))
        collapsed = v @ w
        with self.assertRaises(LatentCollapseError):
            detect_latent_dimensional_collapse(collapsed, min_erank=2.5)

    def test_isotropic_pure_noise_sub_mp_bulk_rejected(self) -> None:
        rng = np.random.default_rng(99)
        pure_noise = rng.normal(0.0, 1.0, size=(300, 30))
        with self.assertRaises(LatentCollapseError):
            detect_latent_dimensional_collapse(
                pure_noise,
                min_erank=5.0,
                min_signal_spikes=1,
                noise_sigma2=1.0,
                tracy_widom_margin=0.45,
                enforce_mp_signal_guard=True,
            )


class TestModule3NonExchangeableConformal(unittest.TestCase):
    """Module 3: Non-Exchangeable Conformal Grounding & ACI/PID Coverage Controller."""

    def test_c_hat_diagnostic_boundary_12_42(self) -> None:
        ess_u, c_u = compute_ess_and_c_hat(np.ones(100))
        self.assertAlmostEqual(ess_u, 100.0, places=9)
        self.assertAlmostEqual(c_u, 1.0, places=9)

        # Construct weight vector just below 12.42 vs above 12.42
        w_deg = np.full(50, 1e-5, dtype=np.float64)
        w_deg[-1] = 1.0
        _, c_deg = compute_ess_and_c_hat(w_deg)
        self.assertGreater(c_deg, MAX_CONFORMAL_C_HAT)

        scores = np.linspace(0.1, 2.0, 50)
        with self.assertRaises(ConformalGroundError):
            compute_non_exchangeable_conformal_quantile(scores, w_deg, alpha=0.10)

    def test_aci_pid_controller_adapts_under_distribution_shift(self) -> None:
        rng = np.random.default_rng(7)
        ctrl = ACIPIDCoverageController(target_alpha=0.10, gamma_aci=0.05, k_p=0.30, k_i=0.20, decay_factor=0.985)
        ctrl.seed_calibration(rng.uniform(0.2, 1.0, size=60))

        stream = np.concatenate([rng.uniform(0.2, 1.0, size=60), rng.uniform(1.1, 1.9, size=140)])
        for s in stream:
            rec = ctrl.step(float(s))
            self.assertLessEqual(rec.c_hat, MAX_CONFORMAL_C_HAT)

        final_cov = ctrl.history[-1].empirical_coverage
        self.assertGreater(final_cov, 0.82)
        self.assertLess(final_cov, 0.96)


class TestModule4ProcessRewardDefense(unittest.TestCase):
    """Module 4: Process-Reward Hallucination Defense (Cai et al. + Bellman Q-Decay)."""

    def test_cai_et_al_verifier_debiasing_exact_inversion(self) -> None:
        true_r = 0.72
        rho_0, rho_1 = 0.12, 0.08
        r_tilde = (1.0 - rho_1) * true_r + rho_0 * (1.0 - true_r)
        recovered = debias_verifier_rate(r_tilde, rho_0, rho_1)
        self.assertAlmostEqual(recovered, true_r, places=12)

        with self.assertRaises(UnidentifiableVerifierError):
            debias_verifier_rate(0.5, 0.60, 0.40)

    def test_bellman_q_decay_kill_switch_catches_poisoned_step_and_cumulative_drift(self) -> None:
        audit = evaluate_bellman_q_decay_defense(
            [0.94, 0.92, 0.95, 0.93],
            rho_0=0.05,
            rho_1=0.03,
            gamma=0.98,
            min_step_prob=0.70,
            min_root_q=0.60,
        )
        self.assertGreater(audit.root_bellman_q, 0.65)

        with self.assertRaises(HallucinationKillSwitchError):
            evaluate_bellman_q_decay_defense(
                [0.95, 0.45, 0.96, 0.95],
                rho_0=0.12,
                rho_1=0.08,
                min_step_prob=0.55,
            )

        with self.assertRaises(HallucinationKillSwitchError):
            evaluate_bellman_q_decay_defense(
                [0.72, 0.72, 0.72, 0.72, 0.72],
                rho_0=0.05,
                rho_1=0.05,
                gamma=0.97,
                min_step_prob=0.55,
                min_root_q=0.40,
            )


class TestModule5CanonicalWireFrame(unittest.TestCase):
    """Module 5: Deterministic Binary Wire-Format / Canonical Protobuf Frame Compiler."""

    def test_crc32c_rfc3720_standard_vector(self) -> None:
        self.assertEqual(compute_crc32c(b"123456789"), 0xE3069283)

    def test_permutation_invariance_neg_zero_normalization_and_zero_copy_decode(self) -> None:
        sigs_a = [
            SignalEntryWire("wind_speed_mph", -0.0, -1, 0.25),
            SignalEntryWire("altitude_feet", 5280.0, +1, 0.40),
        ]
        sigs_b = [
            {"signal_id": "altitude_feet", "value": 5280.0, "home_sign": +1, "weight": 0.40},
            {"signal_id": "wind_speed_mph", "value": +0.0, "home_sign": -1, "weight": 0.25},
        ]
        frame_a = CanonicalSignalFrameCompiler.compile_frame(
            game_id="2026_10_DEN_LV",
            as_of_unix_ms=1794165000000,
            manifest_sha256="abc123def456",
            signals=sigs_a,
        )
        frame_b = CanonicalSignalFrameCompiler.compile_frame(
            game_id="2026_10_DEN_LV",
            as_of_unix_ms=1794165000000,
            manifest_sha256="abc123def456",
            signals=sigs_b,
        )
        self.assertEqual(frame_a, frame_b)

        decoded = CanonicalSignalFrameCompiler.decode_frame(memoryview(frame_a))
        self.assertEqual(decoded.game_id, "2026_10_DEN_LV")
        self.assertEqual([s.signal_id for s in decoded.signals], ["altitude_feet", "wind_speed_mph"])
        self.assertIsInstance(decoded.payload_view, memoryview)

    def test_bitflip_tampering_and_nan_rejected_fail_closed(self) -> None:
        frame = bytearray(
            CanonicalSignalFrameCompiler.compile_frame(
                game_id="2026_10_HOU_KC",
                as_of_unix_ms=1794165000000,
                manifest_sha256="deadbeef",
                signals=[SignalEntryWire("rest_differential_days", 3.0, +1, 0.15)],
            )
        )
        tampered_payload = bytearray(frame)
        tampered_payload[-3] ^= 0x01
        with self.assertRaises(FrameIntegrityError):
            CanonicalSignalFrameCompiler.decode_frame(tampered_payload)

        tampered_sha = bytearray(frame)
        tampered_sha[20] ^= 0x80
        with self.assertRaises(FrameIntegrityError):
            CanonicalSignalFrameCompiler.decode_frame(tampered_sha)

        with self.assertRaises(WireFormatError):
            CanonicalSignalFrameCompiler.compile_frame(
                game_id="2026_10_HOU_KC",
                as_of_unix_ms=1794165000000,
                manifest_sha256="deadbeef",
                signals=[SignalEntryWire("rest_differential_days", float("nan"), +1, 0.15)],
            )


class TestModule6DAGAndFiveP1Guards(unittest.TestCase):
    """Module 6: Cascading Failure DAG & Five Reconciled P1 Bug Guards."""

    def test_cascading_failure_dag_do_calculus_zeroes_corrupted_emission(self) -> None:
        dag = CascadingFailureDAG.build_default_gse_mind_dag()
        self.assertEqual(len(dag.topological_order()), 8)

        unguarded = dag.marginal_probabilities({"fail_closed_gate_armed": 0})
        guarded = dag.marginal_probabilities({"fail_closed_gate_armed": 1})
        self.assertGreater(unguarded["corrupted_pick_emission"], 0.08)
        self.assertEqual(guarded["corrupted_pick_emission"], 0.0)

        with self.assertRaises(ValueError):
            dag.add_node("data_gap", ("corrupted_pick_emission",), {(0,): 0.1, (1,): 0.2})

    def test_p1_guard_1_target_hhi_zero_fallback_blocked(self) -> None:
        self.assertAlmostEqual(guard_p1_target_hhi(0.285, n_receivers=5), 0.285)
        with self.assertRaises(P1TargetHHIFallbackError):
            guard_p1_target_hhi(0.0)
        with self.assertRaises(P1TargetHHIFallbackError):
            guard_p1_target_hhi(0.10, n_receivers=5)

    def test_p1_guard_2_no_swallowed_data_gap(self) -> None:
        with self.assertRaises(P1SwallowedDataGapError):
            guard_p1_no_swallowed_data_gap(lambda: 0.5, recorded_gap_events=["missing_week5_ol"], returned_status="PASS")
        with self.assertRaises(DataGapError):
            guard_p1_no_swallowed_data_gap(lambda: (_ for _ in ()).throw(DataGapError("ol_gap")))

    def test_p1_guard_3_no_clear_on_missing_evidence(self) -> None:
        with self.assertRaises(P1ClearOnMissingEvidenceError):
            guard_p1_no_clear_on_missing_evidence("CLEAR", [])
        self.assertEqual(guard_p1_no_clear_on_missing_evidence("UNCHECKED", []), "UNCHECKED")
        self.assertEqual(
            guard_p1_no_clear_on_missing_evidence(
                "CLEAR",
                [{"source": "nflverse_injuries_2026_w10", "source_manifest_sha256": "f00d1234"}],
            ),
            "CLEAR",
        )

    def test_p1_guard_4_tau_hat_stamp_and_wiring(self) -> None:
        tau_val = guard_p1_tau_hat_stamp_and_wiring(
            {"tau_hat": 0.0677},
            {"tau_hat": 0.0677},
            f"Coaching adjustment ({TAU_HAT_MANDATORY_STAMP})",
        )
        self.assertAlmostEqual(tau_val, 0.0677)
        with self.assertRaises(P1TauHatStampError):
            guard_p1_tau_hat_stamp_and_wiring({}, {"tau_hat": 0.0677}, TAU_HAT_MANDATORY_STAMP)
        with self.assertRaises(P1TauHatStampError):
            guard_p1_tau_hat_stamp_and_wiring(
                {"tau_hat": 0.0677},
                {"tau_hat": 0.0677},
                f"{TAU_HAT_MANDATORY_STAMP} Verified walk-forward pre-kickoff model.",
            )

    def test_p1_guard_5_python_ts_parity_under_1e_6(self) -> None:
        diff = guard_p1_python_ts_parity(
            {"win_prob": 0.6123451, "edge": 0.0341002},
            {"win_prob": 0.6123455, "edge": 0.0341000},
        )
        self.assertLess(diff, 1e-6)
        with self.assertRaises(P1PipelineParityError):
            guard_p1_python_ts_parity({"win_prob": 0.612340}, {"win_prob": 0.612350})


class TestContentDrivenInferenceAndT1T8Mutations(unittest.TestCase):
    """GSE Mind Architecture Mutation Test 2.0 (M2-T1..M2-T4) + T1-T8 Adversarial Gate Suite."""

    def test_gse_mind_content_driven_inference_and_conflict_deadband(self) -> None:
        row_024 = VerifiedSituationalPrinciple(
            item_id="P-101",
            source_doc_hash="sha_steam_1",
            principle_name="Market Steam Drift",
            numeric_claim="0.024 pts/hr",
            parsed_float_magnitude=0.024,
            unit_scale_denominator=1.0,
            evidence_quote="Market steam velocity shifts closing margin by 0.024 pts/hr.",
            evidence_span=(0, 60),
            mechanism_quote="Sharp syndicate order flow reprices consensus lines rapidly.",
            mechanism_span=(61, 121),
            applicable_context_fields=("market_steam_velocity_pts_hr",),
            influence_direction="positive",
            claim_type="causal",
        )
        row_048 = VerifiedSituationalPrinciple(
            **{
                **row_024.__dict__,
                "numeric_claim": "0.048 pts/hr",
                "parsed_float_magnitude": 0.048,
                "evidence_quote": "Market steam velocity shifts closing margin by 0.048 pts/hr.",
            }
        )
        res_base = evaluate_mind_principles({"market_steam_velocity_pts_hr": 2.0}, [row_024])
        res_mut = evaluate_mind_principles({"market_steam_velocity_pts_hr": 2.0}, [row_048])
        self.assertEqual(len(res_mut.audit_trail), len(res_base.audit_trail))
        self.assertAlmostEqual(res_mut.total_delta, res_base.total_delta * 2.0, places=9)
        self.assertIn("0.048", res_mut.rendered_prose)
        self.assertNotIn("0.024", res_mut.rendered_prose)

        row_opposing = VerifiedSituationalPrinciple(
            **{**row_024.__dict__, "item_id": "P-102", "influence_direction": "negative"}
        )
        res_conflict = evaluate_mind_principles({"market_steam_velocity_pts_hr": 2.0}, [row_024, row_opposing])
        self.assertEqual(res_conflict.total_delta, 0.0)
        self.assertEqual(res_conflict.audit_trail[0]["resolution_status"], "CONFLICT_NEUTRALIZED")

        abstract = (
            "Wind speeds above 15 mph alter trajectory significantly in open stadiums. "
            "Crosswind aerodynamic shear increases lateral ball dispersion."
        )
        admitted_t2, code_t2 = verify_candidate_extraction(
            abstract,
            {
                "evidence_quote": "Wind speeds above 15 mph alter trajectory significantly",
                "mechanism_quote": "Crosswind aerodynamic shear increases lateral ball dispersion.",
                "numeric_claim": "0.035",
                "applicable_context_fields": ["wind_speed_mph"],
            },
        )
        self.assertFalse(admitted_t2)
        self.assertEqual(code_t2, "L2_NUMERIC_CONTAINMENT_FAIL")

        nfl_opt_abstract = (
            "Under the No Free Lunch theorem, uniform averaging across all cost functions yields 0.00 gain. "
            "No Free Lunch optimization bounds preclude universal superiority without structural priors."
        )
        admitted_t3, code_t3 = verify_candidate_extraction(
            nfl_opt_abstract,
            {
                "evidence_quote": "Under the No Free Lunch theorem, uniform averaging across all cost functions yields 0.00 gain.",
                "mechanism_quote": "No Free Lunch optimization bounds preclude universal superiority without structural priors.",
                "numeric_claim": "0.00",
                "applicable_context_fields": ["reverse_line_movement_divergence_pct"],
            },
        )
        self.assertFalse(admitted_t3)
        self.assertEqual(code_t3, "L4_MECHANISM_ENTAILMENT_FAIL")

        empty_res = evaluate_mind_principles({"altitude_feet": 5280.0, "wind_speed_mph": 18.0}, [])
        self.assertEqual(empty_res.total_delta, 0.0)
        self.assertEqual(empty_res.rendered_prose, "")
        self.assertEqual(len(empty_res.audit_trail), 0)

    def test_baseline_bundle_passes_all_t1_t8_gates(self) -> None:
        baseline = build_valid_baseline_bundle()
        res = GSERuntimeGatePipeline.validate_all(baseline)
        self.assertEqual(res["status"], "VALIDATED")
        self.assertGreater(res["murphy_bss"], 0.20)

    def test_t1_mutant_missing_ol_starters_killed(self) -> None:
        mut = AdversarialMutationHarness.mutate_t1_missing_ol_starters(build_valid_baseline_bundle())
        with self.assertRaises(DataGapError):
            GSERuntimeGatePipeline.validate_all(mut)

    def test_t2_mutant_future_timestamp_lookahead_killed(self) -> None:
        mut = AdversarialMutationHarness.mutate_t2_future_lookahead(build_valid_baseline_bundle())
        with self.assertRaises(TemporalLookaheadError):
            GSERuntimeGatePipeline.validate_all(mut)

    def test_t3_mutant_homesign_flip_sabotage_killed(self) -> None:
        mut = AdversarialMutationHarness.mutate_t3_homesign_sabotage(build_valid_baseline_bundle())
        with self.assertRaises(HomeSignSabotageError):
            GSERuntimeGatePipeline.validate_all(mut)

    def test_t4_mutant_murphy_rel_gt_res_killed(self) -> None:
        mut = AdversarialMutationHarness.mutate_t4_murphy_uncalibrated(build_valid_baseline_bundle())
        with self.assertRaises(MurphyCalibrationKillSwitchError):
            GSERuntimeGatePipeline.validate_all(mut)

    def test_t5_mutant_non_psd_copula_killed(self) -> None:
        mut = AdversarialMutationHarness.mutate_t5_non_psd_copula(build_valid_baseline_bundle())
        with self.assertRaises(InvalidCopulaMatrixError):
            GSERuntimeGatePipeline.validate_all(mut)

    def test_t6_mutant_hallucinated_fixture_row_killed(self) -> None:
        mut = AdversarialMutationHarness.mutate_t6_hallucinated_fixture_row(build_valid_baseline_bundle())
        with self.assertRaises(UnmanifestedFixtureError):
            GSERuntimeGatePipeline.validate_all(mut)

    def test_t7_mutant_hardcoded_fallbacks_and_stub_killed(self) -> None:
        mut = AdversarialMutationHarness.mutate_t7_hardcoded_fallback(build_valid_baseline_bundle())
        with self.assertRaises(HardcodedFallbackError):
            GSERuntimeGatePipeline.validate_all(mut)

        for magic in (0.58, -0.26, 0.5238):
            b = build_valid_baseline_bundle()
            b.evaluator_fn = lambda _x, m=magic: m
            with self.assertRaises(HardcodedFallbackError):
                gate_t7_no_hardcoded_fallbacks(b)

        b_stub = build_valid_baseline_bundle()
        b_stub.evaluator_fn = lambda _x: 0.6123
        with self.assertRaises(HardcodedFallbackError):
            gate_t7_no_hardcoded_fallbacks(b_stub)

    def test_t8_mutant_truth_file_copy_leaks_killed(self) -> None:
        mut = AdversarialMutationHarness.mutate_t8_truth_file_copy_leak(build_valid_baseline_bundle())
        with self.assertRaises(TruthFileCopyLeakError):
            GSERuntimeGatePipeline.validate_all(mut)

        bad_copies = [
            f"Model 62-23-1 run (Confidence: 74/100). {CALIBRATION_LEDGER_DISCLOSURE}",
            f"Model pick with 74% confidence (74/100). {CALIBRATION_LEDGER_DISCLOSURE}",
            f"Sunday guaranteed win (Confidence: 74/100). {CALIBRATION_LEDGER_DISCLOSURE}",
            f"Edge backed by NGS tracking (Confidence: 74/100). {CALIBRATION_LEDGER_DISCLOSURE}",
            "Clean prose (Confidence: 74/100) missing ledger link.",
        ]
        for copy_text in bad_copies:
            with self.assertRaises(TruthFileCopyLeakError):
                gate_t8_truth_file_copy_guard(copy_text)

    def test_complete_t1_to_t8_adversarial_mutation_kill_rate_100_percent(self) -> None:
        records, kill_rate = AdversarialMutationHarness.run_all_mutations()
        self.assertEqual(len(records), 8)
        self.assertAlmostEqual(kill_rate, 1.0, places=12)
        for rec in records:
            self.assertTrue(rec.killed, msg=f"Mutant {rec.vector_id} survived: {rec}")
            self.assertEqual(rec.caught_exception, rec.expected_exception)


if __name__ == "__main__":
    unittest.main(verbosity=2)
