#!/usr/bin/env python3
"""
test_gse_one_mind_os.py — Comprehensive Verification Suite for the GSE "One-Mind" Autonomous OS
"""

from __future__ import annotations

import ast
import datetime
import json
import subprocess
import tempfile
import unittest
from pathlib import Path

from gse_one_mind_autonomous_os import (
    CANONICAL_NET_UNITS,
    CANONICAL_SEALED_HASH_FIXTURE,
    CST_TZ,
    FOUNDING_ALL_ACCESS_MONTHLY_CENTS,
    MAX_ABS_DELTA_LOG_ODDS,
    NUM_MCP_DOMAINS,
    PROB_PER_POINT,
    PUBLIC_CALIBRATION_LEDGER_URL,
    QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF,
    SEALED_TAU,
    WIDE_EVENT_SCHEMA_CODE,
    WIDE_EVENT_SCHEMA_ID,
    ClaimMatrixArtifact,
    ClaimMatrixIncompleteError,
    DataGapError,
    Glicko2TeamRating,
    IndependentAuditSubmission,
    InductiveGateError,
    MindGuardian,
    NeonSleepWindowViolationError,
    OperationalLedgerState,
    PairedAuditError,
    SealInvarianceError,
    SecondWriterForbiddenError,
    SecretLeakError,
    SloCircuitOpenError,
    TemporalLeakageError,
    TuesdayToTuesdayBusinessOS,
    assert_00_truth_public_copy,
    compute_murphy_brier_partition,
    enforce_autonomous_action_boundary,
    evaluate_asymmetric_copula_joint_prob,
    sha256_hex,
    shin_devig_probabilities,
    validate_confidence_badge_00_truth,
)

OUTPUT_DIR = Path(__file__).resolve().parent
PY_OS_FILE = OUTPUT_DIR / "gse_one_mind_autonomous_os.py"
TS_DAEMON_FILE = OUTPUT_DIR / "one_mind_agent_bus_daemon.ts"


def _make_valid_claim_matrix() -> ClaimMatrixArtifact:
    return ClaimMatrixArtifact(
        research_id="arXiv:2309.00756",
        verbatim_quote_span=(120, 348),
        equation_id="eq.sandholtz.quantile_mdp.tau_v1",
        bitmask_288_hex="a1b2c3d4" * 9,
        code_path="packages/prediction-engine/src/markov-simulator.ts",
        code_sha256=sha256_hex("markov-simulator-impl-v5.3"),
        test_target="tests/test_gse_one_mind_os.py::test_full_tuesday_to_tuesday_autonomous_business_loop",
        test_passed=True,
        real_data_manifest_uri="2026_roster_canonical.parquet",
        real_data_sha256=sha256_hex("2026_roster_canonical.parquet:week10"),
        real_data_rows=1696,
        is_synthetic_fixture=False,
        source_tier=1,
    )


def _make_valid_paired_audits(
    sealed_hash: str = CANONICAL_SEALED_HASH_FIXTURE,
    diff_sha: str | None = None,
) -> tuple[IndependentAuditSubmission, IndependentAuditSubmission]:
    d_sha = diff_sha or sha256_hex("pick-artifact-diff-wk10-bal-cin")
    audit_a = IndependentAuditSubmission(
        agent_id="motif-qc",
        model_family="claude-opus-5.5",
        quality_score=9.55,
        directional_prob=0.584,
        sealed_hash_observed=sealed_hash,
        prm_step_indicators=(1, 1, 1, 1, 1),
        noisy_verifier_reward=1,
        false_positive_rate_rho0=0.04,
        false_negative_rate_rho1=0.06,
        diff_sha256=d_sha,
        lexical_clean=True,
    )
    audit_b = IndependentAuditSubmission(
        agent_id="antigravity-argon",
        model_family="gemini-4-argon",
        quality_score=9.42,
        directional_prob=0.592,
        sealed_hash_observed=sealed_hash,
        prm_step_indicators=(1, 1, 1, 1, 1),
        noisy_verifier_reward=1,
        false_positive_rate_rho0=0.05,
        false_negative_rate_rho1=0.05,
        diff_sha256=d_sha,
        lexical_clean=True,
    )
    return audit_a, audit_b


class TestGseOneMindAutonomousOS(unittest.TestCase):
    def setUp(self) -> None:
        self.tmp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.tmp_dir.name)
        self.roster_sha = sha256_hex("2026_roster_canonical.parquet:week10")
        self.injuries_sha = sha256_hex("injuries_2026.csv:week10")
        self.s0 = OperationalLedgerState(
            nfl_season=2026,
            nfl_week=9,
            sealed_hash=CANONICAL_SEALED_HASH_FIXTURE,
            tau=SEALED_TAU,
            prob_per_point=PROB_PER_POINT,
            qb_questionable_epa=QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF,
            stage0_roster_sha256=self.roster_sha,
            stage0_injuries_sha256=self.injuries_sha,
        )
        self.os_engine = TuesdayToTuesdayBusinessOS(self.root, self.s0)

    def tearDown(self) -> None:
        self.tmp_dir.cleanup()

    def test_inductive_invariant_honest_refusal_and_00_truth_doctrines(self) -> None:
        with self.assertRaises(SealInvarianceError):
            TuesdayToTuesdayBusinessOS(
                self.root / "bad_tau",
                OperationalLedgerState(
                    nfl_season=2026,
                    nfl_week=9,
                    sealed_hash=CANONICAL_SEALED_HASH_FIXTURE,
                    tau=0.50,
                    prob_per_point=PROB_PER_POINT,
                    qb_questionable_epa=QB_QUESTIONABLE_EV_WEIGHTED_EPA_DROPOFF,
                    stage0_roster_sha256=self.roster_sha,
                    stage0_injuries_sha256=self.injuries_sha,
                ),
            )

        audit_a, audit_b = _make_valid_paired_audits()
        fallback_audit = IndependentAuditSubmission(
            **{**audit_a.__dict__, "directional_prob": 0.5}
        )
        with self.assertRaises(DataGapError):
            self.os_engine.audit_gate.verify_and_reconcile(
                "pick-05-fallback", fallback_audit, audit_b, CANONICAL_SEALED_HASH_FIXTURE
            )

        with self.assertRaises(DataGapError):
            shin_devig_probabilities([0.95, 1.90])

        with self.assertRaises(InductiveGateError):
            compute_murphy_brier_partition([0.9, 0.9, 0.1, 0.1], [0, 0, 1, 1])

        # `00-TRUTH-FILE`: integer `XX/100` badges only, zero `%` confidence/win-rate headlines, autonomous boundary
        self.assertEqual(validate_confidence_badge_00_truth("82/100"), 82)
        with self.assertRaises(InductiveGateError):
            validate_confidence_badge_00_truth("82%")
        with self.assertRaises(InductiveGateError):
            assert_00_truth_public_copy("85% confidence play tonight!")
        self.assertEqual(enforce_autonomous_action_boundary("package"), "EXECUTED_AUTONOMOUSLY")
        self.assertEqual(enforce_autonomous_action_boundary("post", founder_approved=False), "QUEUED_FOR_FOUNDER_APPROVAL")
        self.assertEqual(enforce_autonomous_action_boundary("post", founder_approved=True), "EXECUTED_WITH_FOUNDER_APPROVAL")

    def test_paired_adversarial_audit_and_claim_matrix_gates(self) -> None:
        audit_a, audit_b = _make_valid_paired_audits()

        with self.assertRaises(PairedAuditError):
            self.os_engine.audit_gate.verify_and_reconcile(
                "self-audit", audit_a, audit_a, CANONICAL_SEALED_HASH_FIXTURE
            )

        same_fam = IndependentAuditSubmission(
            **{**audit_b.__dict__, "model_family": "claude-opus-5.5"}
        )
        with self.assertRaises(PairedAuditError):
            self.os_engine.audit_gate.verify_and_reconcile(
                "echo-chamber", audit_a, same_fam, CANONICAL_SEALED_HASH_FIXTURE
            )

        deepseek_auditor = IndependentAuditSubmission(
            **{**audit_b.__dict__, "agent_id": "deepseek-move37", "model_family": "deepseek-r2"}
        )
        with self.assertRaises(PairedAuditError):
            self.os_engine.audit_gate.verify_and_reconcile(
                "deepseek-exec", audit_a, deepseek_auditor, CANONICAL_SEALED_HASH_FIXTURE
            )

        broken_prm = IndependentAuditSubmission(
            **{**audit_b.__dict__, "prm_step_indicators": (1, 1, 0, 1)}
        )
        with self.assertRaises(PairedAuditError):
            self.os_engine.audit_gate.verify_and_reconcile(
                "prm-zero", audit_a, broken_prm, CANONICAL_SEALED_HASH_FIXTURE
            )

        noisy_channel = IndependentAuditSubmission(
            **{**audit_b.__dict__, "false_positive_rate_rho0": 0.55, "false_negative_rate_rho1": 0.50}
        )
        with self.assertRaises(PairedAuditError):
            self.os_engine.audit_gate.verify_and_reconcile(
                "noisy-channel", audit_a, noisy_channel, CANONICAL_SEALED_HASH_FIXTURE
            )

        valid_cm = _make_valid_claim_matrix()
        self.assertEqual(len(valid_cm.validate()), 64)
        with self.assertRaises(ClaimMatrixIncompleteError):
            ClaimMatrixArtifact(**{**valid_cm.__dict__, "is_synthetic_fixture": True}).validate()
        with self.assertRaises(ClaimMatrixIncompleteError):
            ClaimMatrixArtifact(**{**valid_cm.__dict__, "source_tier": 5}).validate()

    def test_mind_guardian_single_writer_and_two_way_bus_warm_start(self) -> None:
        with self.assertRaises(SecondWriterForbiddenError):
            self.os_engine.mind_guardian.append_entry(
                writer_role="rogue_subagent",
                guardian_token="bad_token",
                entry_id="rogue-1",
                kind="ILLEGAL",
                domain_slug="FLEET_BUS",
                valid_time_iso="2026-11-13T01:00:00Z",
                transaction_time_iso="2026-11-13T01:00:00Z",
                sealed_hash=CANONICAL_SEALED_HASH_FIXTURE,
                payload={"note": "unauthorized"},
                claim_matrix_sha256="a" * 64,
                paired_audit_receipt_sha256="b" * 64,
            )

        with self.assertRaises(SecretLeakError):
            self.os_engine.bus.publish_inbox_task(
                "motif",
                "secret-task",
                {"api_key": "sk-1234567890abcdefghijklmnop", "task_id": "secret-task"},
            )

        self.os_engine.bus.publish_inbox_task(
            "motif",
            "2026-11-13-motif-wire-sinkhorn",
            {
                "description": "Verify Week 10 Sinkhorn target share overlay",
                "task_id": "2026-11-13-motif-wire-sinkhorn",
            },
        )
        claimed = self.os_engine.bus.claim_next_inbox_task(
            "opencode", CANONICAL_SEALED_HASH_FIXTURE, now_epoch_s=1794531600.0
        )
        self.assertIsNotNone(claimed)
        task_data, warm_ctx = claimed  # type: ignore[misc]
        self.assertEqual(task_data["task_id"], "2026-11-13-motif-wire-sinkhorn")
        self.assertEqual(warm_ctx.conditions_on["tau"], SEALED_TAU)

        second_claim = self.os_engine.bus.claim_next_inbox_task(
            "jules", CANONICAL_SEALED_HASH_FIXTURE, now_epoch_s=1794531610.0
        )
        self.assertIsNone(second_claim)

        reclaimed = self.os_engine.bus.reclaim_stale_claims(now_epoch_s=1794531600.0 + 4 * 3600 + 5)
        self.assertEqual(reclaimed, ["2026-11-13-motif-wire-sinkhorn"])

        reclaimed_pair = self.os_engine.bus.claim_next_inbox_task(
            "opencode", CANONICAL_SEALED_HASH_FIXTURE, now_epoch_s=1794546010.0
        )
        self.assertIsNotNone(reclaimed_pair)
        audit_a, audit_b = _make_valid_paired_audits()
        receipt = self.os_engine.bus.complete_task_with_paired_audit(
            claiming_agent="opencode",
            task_id="2026-11-13-motif-wire-sinkhorn",
            deliverable_summary={"l1_marginal_error": 8.47e-11, "status": "PASS"},
            lesson_summary="Log-domain Schmitzer stabilization eliminates underflow at epsilon=0.05.",
            claim_matrix=_make_valid_claim_matrix(),
            audit_a=audit_a,
            audit_b=audit_b,
            expected_sealed_hash=CANONICAL_SEALED_HASH_FIXTURE,
            valid_time_iso="2026-11-13T04:00:00Z",
            transaction_time_iso="2026-11-13T04:05:00Z",
        )
        self.assertEqual(receipt["status"], "VERIFIED")

        warm_jules = self.os_engine.bus.hydrate_agent_warm_start("jules", CANONICAL_SEALED_HASH_FIXTURE)
        self.assertEqual(warm_jules.mind_entry_count, 1)
        self.assertEqual(warm_jules.mind_head_sha256, receipt["mind_entry_sha256"])
        self.assertIn("2026-11-13-motif-wire-sinkhorn", warm_jules.recent_verified_receipts)
        self.assertEqual(len(warm_jules.active_lessons), 1)

    def test_full_tuesday_to_tuesday_autonomous_business_loop(self) -> None:
        t_tue = datetime.datetime(2026, 11, 10, 10, 0, tzinfo=datetime.timezone.utc)
        kc_before = Glicko2TeamRating("KC", 1640.0, 50.0, 0.06)
        bal_before = Glicko2TeamRating("BAL", 1620.0, 85.0, 0.06)
        cin_before = Glicko2TeamRating("CIN", 1565.0, 82.0, 0.06)

        lock_out = self.os_engine.run_tuesday_lock(
            iso_week_key="2026-W46",
            nfl_week=10,
            team_ratings=[bal_before, cin_before, kc_before],
            prior_week_matches={
                "BAL": [(Glicko2TeamRating("DEN", 1560.0, 65.0, 0.06), 1.0)],
                "CIN": [(Glicko2TeamRating("LV", 1510.0, 68.0, 0.06), 1.0)],
                "KC": [],
            },
            lock_timestamp_dt=t_tue,
        )
        self.assertEqual(lock_out["coach_mindset_hash"], CANONICAL_SEALED_HASH_FIXTURE)
        self.assertEqual(lock_out["bye_teams"], ["KC"])
        kc_after = lock_out["updated_ratings"]["KC"]
        self.assertAlmostEqual(kc_after.rating, 1640.0, places=5)
        self.assertGreater(kc_after.rd, kc_before.rd)
        bal_after = lock_out["updated_ratings"]["BAL"]
        self.assertGreater(bal_after.rating, bal_before.rating)
        self.assertLess(bal_after.rd, bal_before.rd)

        with self.assertRaises(SealInvarianceError):
            self.os_engine.run_tuesday_lock(
                iso_week_key="2026-W46",
                nfl_week=10,
                team_ratings=[bal_after],
                prior_week_matches={"BAL": []},
                lock_timestamp_dt=t_tue,
            )

        self.os_engine.ingest_midweek_delta(
            date_str="2026-11-11",
            record_id="wed-prac-1",
            valid_time_iso="2026-11-11T16:00:00-06:00",
            transaction_time_iso="2026-11-11T16:15:00-06:00",
            source_type="practice_report",
            source_tier=3,
            source_url="https://www.baltimoreravens.com/team/injury-report/wk10-wed",
            raw_excerpt="WR Zay Flowers limited in Wednesday walkthrough.",
            subject="player:BAL:Zay_Flowers",
            predicate="questionable",
            obj_value="WR1_LIMITED",
            game_id="2026_10_CIN_BAL",
            confidence=0.80,
        )
        self.os_engine.ingest_midweek_delta(
            date_str="2026-11-11",
            record_id="sxm-ch87-1",
            valid_time_iso="2026-11-12T11:20:00-06:00",
            transaction_time_iso="2026-11-12T11:22:00-06:00",
            source_type="siriusxm_ch87",
            source_tier=1,
            source_url="https://www.siriusxm.com/channels/siriusxm-nfl-radio/wk10-harbaugh",
            raw_excerpt="Head coach confirmed on SiriusXM NFL Radio Ch 87 that Zay Flowers practiced in full Thursday.",
            subject="player:BAL:Zay_Flowers",
            predicate="full_practice",
            obj_value="WR1_FULL",
            game_id="2026_10_CIN_BAL",
            confidence=0.98,
            whisperx_word_span_sec=(412.40, 419.85),
        )
        self.os_engine.ingest_midweek_delta(
            date_str="2026-11-11",
            record_id="dk-line-1",
            valid_time_iso="2026-11-12T14:00:00-06:00",
            transaction_time_iso="2026-11-12T14:00:05-06:00",
            source_type="dk_line",
            source_tier=4,
            source_url="https://sportsbook.draftkings.com/leagues/football/nfl",
            raw_excerpt="BAL moved from -6.0 to -6.5.",
            subject="player:BAL:Zay_Flowers",
            predicate="line_move",
            obj_value=-6.5,
            game_id="2026_10_CIN_BAL",
            confidence=0.95,
        )
        self.os_engine.ingest_midweek_delta(
            date_str="2026-11-11",
            record_id="reddit-rumor-1",
            valid_time_iso="2026-11-12T15:00:00-06:00",
            transaction_time_iso="2026-11-12T15:01:00-06:00",
            source_type="beat_writer",
            source_tier=5,
            source_url="https://www.reddit.com/r/nfl/comments/rumor",
            raw_excerpt="Unverified fan post.",
            subject="player:BAL:Zay_Flowers",
            predicate="out",
            obj_value="RUMOR_OUT",
            game_id="2026_10_CIN_BAL",
            confidence=0.30,
        )
        resolved = self.os_engine.resolve_bitemporal_entity_state(
            date_str="2026-11-11",
            subject="player:BAL:Zay_Flowers",
            game_id="2026_10_CIN_BAL",
            as_of_iso="2026-11-12T18:00:00-06:00",
        )
        self.assertIsNotNone(resolved)
        self.assertEqual(resolved["claim"]["object"], "WR1_FULL")  # type: ignore[index]

        kickoff_ms = 1794186900000
        t90m_ms = kickoff_ms - 90 * 60 * 1000
        worlds = [
            {"home_plays": 64.0, "home_pass_att": 32.0, "home_completions": 17.5, "neutral_pace_sec": 26.8, "pressure_pct": 31.0, "quick_game_pct": 48.0},
            {"home_plays": 65.2, "home_pass_att": 33.3, "home_completions": 18.0, "neutral_pace_sec": 27.1, "pressure_pct": 32.5, "quick_game_pct": 49.5},
            {"home_plays": 67.0, "home_pass_att": 35.0, "home_completions": 19.2, "neutral_pace_sec": 27.4, "pressure_pct": 34.0, "quick_game_pct": 51.0},
        ]
        t90_res = self.os_engine.run_t90m_inactives_and_overlay(
            game_id="2026_10_CIN_BAL",
            matchup_title="Bengals @ Ravens",
            kickoff_epoch_ms=kickoff_ms,
            check_epoch_ms=t90m_ms,
            baseline_shares=[0.12, 0.28, 0.26, 0.18, 0.16],
            post_inactive_capacities=[0.12, 0.31, 0.28, 0.10, 0.19],
            qb_status="ACTIVE_HEALTHY",
            directional_signals=[(2.15, 1, 142), (1.05, 1, 88), (-0.45, -1, 64)],
            simulated_world_summaries=worlds,
            baseline_object=lock_out["baseline_object"],
            confidence_badge="79/100",
        )
        self.assertLess(t90_res["sinkhorn"]["l1_marginal_error"], 1e-9)
        self.assertGreater(t90_res["sinkhorn"]["mass_moved"], 0.05)
        self.assertEqual(t90_res["coach_mindset_hash"], CANONICAL_SEALED_HASH_FIXTURE)
        self.assertIn(
            PUBLIC_CALIBRATION_LEDGER_URL,
            t90_res["public_environment_manifest"]["film_room_scout_take"],
        )

        audit_a, audit_b = _make_valid_paired_audits()
        paired_verdict = self.os_engine.audit_gate.verify_and_reconcile(
            "pick-wk10-bal-spread", audit_a, audit_b, CANONICAL_SEALED_HASH_FIXTURE
        )
        quantiles = {
            "0.05": -7.5,
            "0.10": -4.0,
            "0.25": 1.5,
            "0.50": 6.5,
            "0.75": 11.0,
            "0.90": 16.5,
            "0.95": 20.0,
        }
        cal_probs = [0.22, 0.28, 0.58, 0.64, 0.76, 0.81]
        cal_outcomes = [0, 0, 1, 1, 1, 1]

        with self.assertRaises(InductiveGateError):  # Stage 1: c_hat > 12.42
            self.os_engine.evaluate_five_stage_gate_and_commit_ots(
                pick_id="bad-c-hat",
                game_id="2026_10_CIN_BAL",
                market_label="BAL -6.0",
                c_hat=12.85,
                delta_log_odds=0.18,
                e_value=1.62,
                quantiles=quantiles,
                calibration_outcome_ref=7.0,
                murphy_cal_probs=cal_probs,
                murphy_cal_outcomes=cal_outcomes,
                stage0_roster_sha256=self.roster_sha,
                stage0_injuries_sha256=self.injuries_sha,
                public_copy="Ravens trench advantage controls early downs.",
                confidence_badge="79/100",
                paired_audit=paired_verdict,
                claim_matrix=_make_valid_claim_matrix(),
                commit_epoch_ms=kickoff_ms - 30 * 60 * 1000,
                kickoff_epoch_ms=kickoff_ms,
            )
        with self.assertRaises(InductiveGateError):  # Stage 2: |Delta log-odds| > 0.35
            self.os_engine.evaluate_five_stage_gate_and_commit_ots(
                pick_id="bad-dlo",
                game_id="2026_10_CIN_BAL",
                market_label="BAL -6.0",
                c_hat=11.80,
                delta_log_odds=-0.39,
                e_value=1.62,
                quantiles=quantiles,
                calibration_outcome_ref=7.0,
                murphy_cal_probs=cal_probs,
                murphy_cal_outcomes=cal_outcomes,
                stage0_roster_sha256=self.roster_sha,
                stage0_injuries_sha256=self.injuries_sha,
                public_copy="Ravens trench advantage controls early downs.",
                confidence_badge="79/100",
                paired_audit=paired_verdict,
                claim_matrix=_make_valid_claim_matrix(),
                commit_epoch_ms=kickoff_ms - 30 * 60 * 1000,
                kickoff_epoch_ms=kickoff_ms,
            )
        with self.assertRaises(InductiveGateError):  # Stage 3: E < 1.35
            self.os_engine.evaluate_five_stage_gate_and_commit_ots(
                pick_id="bad-eval",
                game_id="2026_10_CIN_BAL",
                market_label="BAL -6.0",
                c_hat=11.80,
                delta_log_odds=0.18,
                e_value=1.20,
                quantiles=quantiles,
                calibration_outcome_ref=7.0,
                murphy_cal_probs=cal_probs,
                murphy_cal_outcomes=cal_outcomes,
                stage0_roster_sha256=self.roster_sha,
                stage0_injuries_sha256=self.injuries_sha,
                public_copy="Ravens trench advantage controls early downs.",
                confidence_badge="79/100",
                paired_audit=paired_verdict,
                claim_matrix=_make_valid_claim_matrix(),
                commit_epoch_ms=kickoff_ms - 30 * 60 * 1000,
                kickoff_epoch_ms=kickoff_ms,
            )
        with self.assertRaises(InductiveGateError):  # Stage 5: Forbidden math jargon leak
            self.os_engine.evaluate_five_stage_gate_and_commit_ots(
                pick_id="bad-jargon",
                game_id="2026_10_CIN_BAL",
                market_label="BAL -6.0",
                c_hat=11.80,
                delta_log_odds=0.18,
                e_value=1.62,
                quantiles=quantiles,
                calibration_outcome_ref=7.0,
                murphy_cal_probs=cal_probs,
                murphy_cal_outcomes=cal_outcomes,
                stage0_roster_sha256=self.roster_sha,
                stage0_injuries_sha256=self.injuries_sha,
                public_copy="Powered by Romano CQR and 22,750,000 snap evaluations!",
                confidence_badge="79/100",
                paired_audit=paired_verdict,
                claim_matrix=_make_valid_claim_matrix(),
                commit_epoch_ms=kickoff_ms - 30 * 60 * 1000,
                kickoff_epoch_ms=kickoff_ms,
            )

        ots_1 = self.os_engine.evaluate_five_stage_gate_and_commit_ots(
            pick_id="pick-wk10-bal-spread",
            game_id="2026_10_CIN_BAL",
            market_label="BAL -6.0 (-110)",
            c_hat=11.94,
            delta_log_odds=0.21,
            e_value=1.58,
            quantiles=quantiles,
            calibration_outcome_ref=7.0,
            murphy_cal_probs=cal_probs,
            murphy_cal_outcomes=cal_outcomes,
            stage0_roster_sha256=self.roster_sha,
            stage0_injuries_sha256=self.injuries_sha,
            public_copy="Baltimore quick-passing rhythm neutralizes interior pressure.",
            confidence_badge="79/100",
            paired_audit=paired_verdict,
            claim_matrix=_make_valid_claim_matrix(),
            commit_epoch_ms=kickoff_ms - 25 * 60 * 1000,
            kickoff_epoch_ms=kickoff_ms,
        )
        self.assertTrue(self.os_engine.verify_ots_receipt(ots_1))

        paired_verdict_2 = self.os_engine.audit_gate.verify_and_reconcile(
            "pick-wk10-sf-total", audit_a, audit_b, CANONICAL_SEALED_HASH_FIXTURE
        )
        ots_2 = self.os_engine.evaluate_five_stage_gate_and_commit_ots(
            pick_id="pick-wk10-sf-total",
            game_id="2026_10_SF_TB",
            market_label="SF/TB Under 49.5 (-110)",
            c_hat=11.65,
            delta_log_odds=-0.19,
            e_value=1.49,
            quantiles=quantiles,
            calibration_outcome_ref=6.0,
            murphy_cal_probs=cal_probs,
            murphy_cal_outcomes=cal_outcomes,
            stage0_roster_sha256=self.roster_sha,
            stage0_injuries_sha256=self.injuries_sha,
            public_copy="Red-zone field-goal stalls cap scoring ceiling.",
            confidence_badge="76/100",
            paired_audit=paired_verdict_2,
            claim_matrix=_make_valid_claim_matrix(),
            commit_epoch_ms=kickoff_ms - 20 * 60 * 1000,
            kickoff_epoch_ms=kickoff_ms,
        )
        self.assertTrue(self.os_engine.verify_ots_receipt(ots_2))

        with self.assertRaises(TemporalLeakageError):
            self.os_engine.evaluate_five_stage_gate_and_commit_ots(
                pick_id="late-pick",
                game_id="2026_10_CIN_BAL",
                market_label="BAL -6.0",
                c_hat=11.94,
                delta_log_odds=0.21,
                e_value=1.58,
                quantiles=quantiles,
                calibration_outcome_ref=7.0,
                murphy_cal_probs=cal_probs,
                murphy_cal_outcomes=cal_outcomes,
                stage0_roster_sha256=self.roster_sha,
                stage0_injuries_sha256=self.injuries_sha,
                public_copy="Clean scouting note.",
                confidence_badge="79/100",
                paired_audit=paired_verdict,
                claim_matrix=_make_valid_claim_matrix(),
                commit_epoch_ms=kickoff_ms - 2 * 60 * 1000,
                kickoff_epoch_ms=kickoff_ms,
            )

        mri = self.os_engine.run_parlay_mri_free_funnel(
            game_id="2026_10_CIN_BAL",
            leg_two_way_decimal_odds=[(1.87, 1.95), (1.83, 1.98)],
            book_sgp_decimal_odds=2.85,
            copula_family="gumbel",
            copula_theta=1.55,
        )
        self.assertEqual(mri["funnel_route"], "/parlay-mri")
        self.assertGreater(mri["copula_diagnostics"]["correlation_lift_ratio"], 1.0)
        clayton = evaluate_asymmetric_copula_joint_prob([0.55, 0.62], "clayton", 1.8)
        self.assertGreaterEqual(clayton["joint_prob"], clayton["frechet_lower"])
        self.assertLessEqual(clayton["joint_prob"], clayton["frechet_upper"])
        frank3 = evaluate_asymmetric_copula_joint_prob([0.56, 0.58, 0.61], "frank", 2.2)
        self.assertGreaterEqual(frank3["joint_prob"], frank3["frechet_lower"])
        self.assertLessEqual(frank3["joint_prob"], frank3["frechet_upper"])

        t_buy = datetime.datetime(2026, 11, 12, 22, 0, tzinfo=datetime.timezone.utc)
        order_tnf = self.os_engine.create_slate_pack_order(
            order_id="ord-tnf-001",
            customer_id="cust-houston-1",
            pack_slug="tnf-spotlight-pack",
            matchup_label="Bengals ? Ravens",
            pick_ids=["pick-wk10-bal-spread"],
            purchase_timestamp_dt=t_buy,
        )
        self.assertEqual(order_tnf["pack_price_cents"], 1900)
        self.assertNotIn(" ? ", order_tnf["product_title_utf8"])
        self.assertIn("\u2014", order_tnf["product_title_utf8"])
        self.assertEqual(
            order_tnf["founding_all_access_bridge"]["net_upgrade_due_cents"],
            FOUNDING_ALL_ACCESS_MONTHLY_CENTS - 1900,
        )

        order_sun = self.os_engine.create_slate_pack_order(
            order_id="ord-sun-002",
            customer_id="cust-dallas-2",
            pack_slug="sunday-spotlight-pack",
            matchup_label="49ers @ Buccaneers",
            pick_ids=["pick-wk10-sf-total"],
            purchase_timestamp_dt=t_buy,
        )
        self.assertEqual(order_sun["pack_price_cents"], 3900)

        t_settle = datetime.datetime(2026, 11, 16, 4, 30, tzinfo=datetime.timezone.utc)
        settle_1 = self.os_engine.settle_pack_and_mint_idempotent_credits(
            game_id="SLATE_WK10_BATCH",
            pick_outcomes=[
                {"pick_id": "pick-wk10-bal-spread", "grade": "WIN", "decimal_odds": 1.9090909, "stake_units": 1.0},
                {"pick_id": "pick-wk10-sf-total", "grade": "LOSS", "decimal_odds": 1.9090909, "stake_units": 1.0},
            ],
            settlement_timestamp_dt=t_settle,
        )
        self.assertEqual(settle_1["official_record"], "63-24-1")
        self.assertAlmostEqual(settle_1["net_units"], round(CANONICAL_NET_UNITS + 0.9090909 - 1.0, 4), places=3)
        self.assertEqual(self.os_engine.customer_credits_cents.get("cust-houston-1", 0), 0)
        self.assertEqual(self.os_engine.customer_credits_cents["cust-dallas-2"], 3900)

        settle_retry_1 = self.os_engine.settle_pack_and_mint_idempotent_credits(
            game_id="SLATE_WK10_BATCH",
            pick_outcomes=[
                {"pick_id": "pick-wk10-bal-spread", "grade": "WIN", "decimal_odds": 1.9090909, "stake_units": 1.0},
                {"pick_id": "pick-wk10-sf-total", "grade": "LOSS", "decimal_odds": 1.9090909, "stake_units": 1.0},
            ],
            settlement_timestamp_dt=t_settle,
        )
        self.assertEqual(settle_retry_1["official_record"], "63-24-1")
        self.assertEqual(self.os_engine.customer_credits_cents["cust-dallas-2"], 3900)
        self.assertTrue(settle_retry_1["credit_grants"][0]["already_minted"])

        raw_deltas = [0.12 if i % 5 == 0 else -0.04 for i in range(NUM_MCP_DOMAINS)]
        with self.assertRaises(TemporalLeakageError):
            self.os_engine.run_tuesday_purged_oof_weight_update(
                epoch_id="leak-epoch",
                train_fold_end_epoch_ms=1793500000000,
                embargo_ms=86400000,
                oof_cal_start_epoch_ms=1793600000000,
                oof_cal_end_epoch_ms=1794200000000,
                next_eval_kickoff_epoch_ms=1794400000000,
                train_game_ids={"2026_08_BAL_CLE", "2026_09_JAX_BAL"},
                oof_game_ids={"2026_09_JAX_BAL"},
                raw_delta_log_odds=raw_deltas,
                empirical_variance=0.002,
                delta_brier_gain=0.008,
                delta_crps_gain=0.14,
                delta_devig_clv_gain=0.012,
                anchor_nonconformity_scores=[0.8, 1.2, 1.5, 2.0, 2.4],
                candidate_nonconformity_scores=[0.82, 1.18, 1.52, 1.98, 2.38],
                miscoverage_indicators=[0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
                ot_weights=[1.0] * 10,
                claim_matrix=_make_valid_claim_matrix(),
                paired_audit=paired_verdict,
                update_timestamp_dt=datetime.datetime(2026, 11, 17, 9, 30, tzinfo=datetime.timezone.utc),
            )

        oof_res = self.os_engine.run_tuesday_purged_oof_weight_update(
            epoch_id="seal-wk10-oof-v1",
            train_fold_end_epoch_ms=1793500000000,
            embargo_ms=86400000,
            oof_cal_start_epoch_ms=1793600000000,
            oof_cal_end_epoch_ms=1794200000000,
            next_eval_kickoff_epoch_ms=1794400000000,
            train_game_ids={"2026_08_BAL_CLE", "2026_08_KC_LV"},
            oof_game_ids={"2026_10_CIN_BAL", "2026_10_SF_TB"},
            raw_delta_log_odds=raw_deltas,
            empirical_variance=0.002,
            delta_brier_gain=0.008,
            delta_crps_gain=0.14,
            delta_devig_clv_gain=0.012,
            anchor_nonconformity_scores=[0.8, 1.2, 1.5, 2.0, 2.4],
            candidate_nonconformity_scores=[0.82, 1.18, 1.52, 1.98, 2.38],
            miscoverage_indicators=[0, 0, 0, 1, 0, 0, 0, 0, 0, 0],
            ot_weights=[1.0] * 10,
            claim_matrix=_make_valid_claim_matrix(),
            paired_audit=paired_verdict,
            update_timestamp_dt=datetime.datetime(2026, 11, 17, 9, 30, tzinfo=datetime.timezone.utc),
        )
        self.assertGreater(oof_res["james_stein_factor"], 0.0)
        self.assertTrue(all(abs(w) <= MAX_ABS_DELTA_LOG_ODDS for w in oof_res["shrunk_domain_weights"]))
        self.assertLessEqual(oof_res["wasserstein_w1"], 0.08)

        kelly_main = self.os_engine.compute_conformal_copula_kelly(
            win_prob=0.575,
            decimal_odds=1.9090909,
            conformal_lower_prob=0.535,
            conformal_upper_prob=0.615,
            bankroll_usd=10000.0,
            market_class="full_game_spread",
            copula_tail_lambda=0.12,
        )
        self.assertEqual(kelly_main["ruin_guard_status"], "APPROVED_BOUNDED_RISK")
        self.assertGreater(kelly_main["recommended_stake_usd"], 0.0)
        self.assertLessEqual(kelly_main["recommended_fraction"], 0.05)

        kelly_gfv_blocked = self.os_engine.compute_conformal_copula_kelly(
            win_prob=0.59,
            decimal_odds=1.95,
            conformal_lower_prob=0.55,
            conformal_upper_prob=0.63,
            bankroll_usd=200.0,
            account_regime="BROKERAGE_SMALL_CAP",
            settled_cash_usd=0.0,
        )
        self.assertEqual(kelly_gfv_blocked["ruin_guard_status"], "HALT_T_PLUS_1_UNSETTLED_GFV_GUARD")
        self.assertEqual(kelly_gfv_blocked["recommended_stake_usd"], 0.0)

    def test_wide_event_516325_slo_breaker_and_neon_sleep_window(self) -> None:
        sleep_dt = datetime.datetime(2026, 11, 13, 3, 15, tzinfo=CST_TZ)
        with self.assertRaises(NeonSleepWindowViolationError):
            self.os_engine.telemetry.assert_neon_awake_or_defer(sleep_dt, caller_kind="cron")

        override_status = self.os_engine.telemetry.assert_neon_awake_or_defer(
            sleep_dt, caller_kind="cron", emergency_tier1_override=True
        )
        self.assertEqual(override_status, "NEON_HTTP_443_TIER1_OVERRIDE")

        awake_dt = datetime.datetime(2026, 11, 13, 7, 0, tzinfo=CST_TZ)
        self.assertEqual(
            self.os_engine.telemetry.assert_neon_awake_or_defer(awake_dt, caller_kind="cron"),
            "NEON_HTTP_443_ACTIVE",
        )

        ev = self.os_engine.telemetry.emit_wide_event(
            timestamp_dt=awake_dt,
            game_id="2026_10_CIN_BAL",
            nfl_week=10,
            lifecycle_stage="SMOKE_CHECK",
            sealed_hash=CANONICAL_SEALED_HASH_FIXTURE,
            metrics={"latency_ms": 11.4},
            is_error=False,
        )
        self.assertEqual(ev["canonical_code"], WIDE_EVENT_SCHEMA_CODE)
        self.assertEqual(ev["schema_id"], WIDE_EVENT_SCHEMA_ID)
        self.assertIn("trace_id", ev["otel"])
        self.assertIn("fingerprint", ev["sentry"])
        self.assertIn("distinct_id", ev["posthog"])

        for idx in range(12):
            self.os_engine.telemetry.emit_wide_event(
                timestamp_dt=awake_dt,
                game_id=f"ERR_{idx}",
                nfl_week=10,
                lifecycle_stage="INJECTED_FAULT",
                sealed_hash=CANONICAL_SEALED_HASH_FIXTURE,
                metrics={},
                is_error=True,
            )
        with self.assertRaises(SloCircuitOpenError):
            self.os_engine.telemetry.assert_slo_circuit_closed()

    def test_python_and_typescript_ast_and_cross_language_mind_bus_interop(self) -> None:
        py_source = PY_OS_FILE.read_text(encoding="utf-8")
        py_tree = ast.parse(py_source, filename=str(PY_OS_FILE))
        defined_classes = {node.name for node in ast.walk(py_tree) if isinstance(node, ast.ClassDef)}
        for req_cls in (
            "DataGapError",
            "InductiveStateEngine",
            "PairedAdversarialAuditGate",
            "MindGuardian",
            "TwoWayAgentBusCoordinator",
            "WideEventTelemetry516325",
            "TuesdayToTuesdayBusinessOS",
        ):
            self.assertIn(req_cls, defined_classes)

        for node in ast.walk(py_tree):
            if isinstance(node, ast.ExceptHandler):
                self.assertFalse(
                    len(node.body) == 1 and isinstance(node.body[0], ast.Pass),
                    "Swallowed `except: pass` block forbidden by honest-refusal doctrine!",
                )

        audit_a, audit_b = _make_valid_paired_audits()
        py_verdict = self.os_engine.audit_gate.verify_and_reconcile(
            "py-seed-entry", audit_a, audit_b, CANONICAL_SEALED_HASH_FIXTURE
        )
        cm = _make_valid_claim_matrix().with_receipt(py_verdict.receipt_sha256)
        py_entry = self.os_engine.mind_guardian.append_entry(
            writer_role="mind_guardian",
            guardian_token=MindGuardian.GUARDIAN_TOKEN,
            entry_id="py-genesis-001",
            kind="GENESIS_SEAL_SEED",
            domain_slug="NFL_GSE",
            valid_time_iso="2026-11-13T00:00:00Z",
            transaction_time_iso="2026-11-13T00:00:01Z",
            sealed_hash=CANONICAL_SEALED_HASH_FIXTURE,
            payload={
                "l1_marginal_error": 8.47e-11,
                "lesson_summary": "Python genesis entry seeded into shared mind.jsonl.",
                "shrunk_domain_weights": [0.05] * NUM_MCP_DOMAINS,
            },
            claim_matrix_sha256=cm.validate(require_receipt=True),
            paired_audit_receipt_sha256=py_verdict.receipt_sha256,
        )

        self.os_engine.bus.publish_inbox_task(
            "motif",
            "2026-11-13-motif-ts-interop",
            {
                "created_at_iso": "2026-11-13T01:10:00Z",
                "has_complete_spec": True,
                "is_mechanical_scan": False,
                "origin_agent": "motif",
                "payload": {"module": "one_mind_agent_bus_daemon.ts"},
                "requires_judgment": False,
                "task_id": "2026-11-13-motif-ts-interop",
            },
        )

        node_verification_script = r"""
const fs = require("node:fs");
const path = require("node:path");

const tsFilePath = process.argv[2];
const workspaceRoot = process.argv[3];
const expectedPyHead = process.argv[4];

const tsCode = fs.readFileSync(tsFilePath, "utf8");

const exportedNames = new Set();
let emptyCatchBlocks = 0;
let tsInterfacesCount = 0;
let numericPointFiveLiterals = 0;
let compiledCode = "";

if (fs.existsSync("/usr/share/nodejs/@babel/parser")) {
  const parser = require("/usr/share/nodejs/@babel/parser");
  const traverse = require("/usr/share/nodejs/@babel/traverse").default;
  const babel = require("/usr/share/nodejs/@babel/core");

  const ast = parser.parse(tsCode, {
    sourceType: "module",
    plugins: ["typescript"],
  });

  traverse(ast, {
    ExportNamedDeclaration(p) {
      const decl = p.node.declaration;
      if (decl) {
        if (decl.id && decl.id.name) exportedNames.add(decl.id.name);
        if (decl.declarations) {
          for (const d of decl.declarations) {
            if (d.id && d.id.name) exportedNames.add(d.id.name);
          }
        }
      }
    },
    TSInterfaceDeclaration() {
      tsInterfacesCount += 1;
    },
    CatchClause(p) {
      if (!p.node.body || p.node.body.body.length === 0) {
        emptyCatchBlocks += 1;
      }
    },
    NumericLiteral(p) {
      if (p.node.value === 0.5) {
        numericPointFiveLiterals += 1;
      }
    },
  });

  const compiled = babel.transformSync(tsCode, {
    filename: tsFilePath,
    presets: ["/usr/share/nodejs/@babel/preset-typescript"],
    plugins: ["/usr/share/nodejs/@babel/plugin-transform-modules-commonjs"],
  });
  compiledCode = compiled.code;
} else {
  let searchDir = path.dirname(tsFilePath);
  let tsCompiler = null;
  while (true) {
    const candidate = path.join(searchDir, "node_modules", "typescript");
    if (fs.existsSync(candidate)) {
      tsCompiler = require(candidate);
      break;
    }
    const parent = path.dirname(searchDir);
    if (parent === searchDir) break;
    searchDir = parent;
  }
  if (!tsCompiler || !tsCompiler.createSourceFile) {
    throw new Error(`Unable to locate node_modules/typescript walking upward from ${tsFilePath}`);
  }
  const sf = tsCompiler.createSourceFile(tsFilePath, tsCode, tsCompiler.ScriptTarget.Latest, true);
  function hasExportModifier(node) {
    return Array.isArray(node.modifiers) && node.modifiers.some((m) => m.kind === tsCompiler.SyntaxKind.ExportKeyword);
  }
  function walk(node) {
    if (hasExportModifier(node)) {
      if ((tsCompiler.isFunctionDeclaration(node) || tsCompiler.isClassDeclaration(node) || tsCompiler.isInterfaceDeclaration(node)) && node.name) {
        exportedNames.add(node.name.text);
      } else if (tsCompiler.isVariableStatement(node)) {
        for (const decl of node.declarationList.declarations) {
          if (decl.name && decl.name.text) exportedNames.add(decl.name.text);
        }
      }
    }
    if (tsCompiler.isInterfaceDeclaration(node)) {
      tsInterfacesCount += 1;
    } else if (tsCompiler.isCatchClause(node)) {
      if (!node.block || node.block.statements.length === 0) {
        emptyCatchBlocks += 1;
      }
    } else if (tsCompiler.isNumericLiteral(node)) {
      if (Number(node.text) === 0.5) {
        numericPointFiveLiterals += 1;
      }
    }
    tsCompiler.forEachChild(node, walk);
  }
  walk(sf);
  compiledCode = tsCompiler.transpileModule(tsCode, {
    fileName: tsFilePath,
    compilerOptions: {
      module: tsCompiler.ModuleKind.CommonJS,
      target: tsCompiler.ScriptTarget.ES2022,
      esModuleInterop: true,
    },
  }).outputText;
}

for (const reqExport of [
  "CANONICAL_SEALED_HASH_FIXTURE",
  "atOrThrow",
  "validateConfidenceBadge00Truth",
  "enforceAutonomousBoundary",
  "DataGapError",
  "SecondWriterForbiddenError",
  "PairedAuditError",
  "ClaimMatrixIncompleteError",
  "NeonSleepWindowViolationError",
  "SloCircuitOpenError",
  "MindGuardianDaemon",
  "OneMindAgentBusDaemon",
  "runPairedAdversarialAudit",
  "validateClaimMatrix",
]) {
  if (!exportedNames.has(reqExport)) {
    throw new Error("Missing required TypeScript export in AST: " + reqExport);
  }
}
if (tsInterfacesCount < 5) {
  throw new Error("Expected >= 5 TypeScript interfaces in AST, got " + tsInterfacesCount);
}
if (emptyCatchBlocks !== 0) {
  throw new Error("Empty catch block detected in TypeScript AST!");
}
if (numericPointFiveLiterals !== 0) {
  throw new Error("Forbidden 0.5 numeric literal detected in TypeScript AST!");
}

const outJsPath = path.join(workspaceRoot, "compiled_daemon.cjs");
fs.writeFileSync(outJsPath, compiledCode, "utf8");
const daemonMod = require(outJsPath);

const mindGuardian = new daemonMod.MindGuardianDaemon(
  path.join(workspaceRoot, "brain", "mind.jsonl")
);
const chainCheck = mindGuardian.verifyChain();
if (chainCheck.count !== 1 || chainCheck.headSha256 !== expectedPyHead) {
  throw new Error(
    `Cross-language hash mismatch! Expected ${expectedPyHead}, got ${chainCheck.headSha256}`
  );
}

const busDaemon = new daemonMod.OneMindAgentBusDaemon(
  path.join(workspaceRoot, "agent-bus"),
  mindGuardian,
  path.join(workspaceRoot, "artifacts", "wide-events-516325.jsonl")
);

let sleepBlocked = false;
try {
  busDaemon.assertNeonCronAllowed(Date.parse("2026-11-13T09:00:00Z"), false);
} catch (err) {
  if (err.name === "NeonSleepWindowViolationError") sleepBlocked = true;
}
if (!sleepBlocked) {
  throw new Error("TypeScript daemon failed to block cron during 02:30-06:30 CST sleep window!");
}

const claimed = busDaemon.claimNextTask(
  "opencode",
  daemonMod.CANONICAL_SEALED_HASH_FIXTURE,
  1794535000
);
if (!claimed || claimed.task.task_id !== "2026-11-13-motif-ts-interop") {
  throw new Error("TypeScript daemon failed to claim Python-published inbox task!");
}
if (
  claimed.warmStart.mind_head_sha256 !== expectedPyHead ||
  claimed.warmStart.routed_model_tier !== "claude-sonnet-5.5/medium" ||
  claimed.warmStart.active_lessons.length !== 1
) {
  throw new Error("Warm-start hydration mismatch in TypeScript daemon!");
}

const diffSha = daemonMod.sha256Hex("ts-daemon-verified-diff-001");
const settled = busDaemon.settleTaskWithPairedAudit({
  claimingAgent: "opencode",
  taskId: "2026-11-13-motif-ts-interop",
  deliverableSummary: { astVerified: true, exportedSymbols: exportedNames.size },
  lessonSummary: "TypeScript daemon and Python OS share bit-identical canonical JSON SHA-256 chain.",
  nflWeek: 10,
  transactionEpochMs: Date.parse("2026-11-13T14:00:00Z"),
  validTimeIso: "2026-11-13T14:00:00Z",
  expectedSealedHash: daemonMod.CANONICAL_SEALED_HASH_FIXTURE,
  claimMatrix: {
    research_id: "arXiv:2506.10943",
    verbatim_quote_span: [45, 210],
    equation_id: "eq.seal.rest_em_outer_loop",
    bitmask_288_hex: "f0e1d2c3".repeat(9),
    code_path: "one_mind_agent_bus_daemon.ts",
    code_sha256: daemonMod.sha256Hex(tsCode),
    test_target: "test_gse_one_mind_os.py::test_python_and_typescript_ast_and_cross_language_mind_bus_interop",
    test_passed: true,
    real_data_manifest_uri: "2026_roster_canonical.parquet",
    real_data_sha256: daemonMod.sha256Hex("2026_roster_canonical.parquet:week10"),
    real_data_rows: 1696,
    is_synthetic_fixture: false,
    source_tier: 1,
  },
  auditA: {
    agent_id: "motif-qc",
    model_family: "claude-opus-5.5",
    quality_score: 9.6,
    directional_prob: 0.612,
    sealed_hash_observed: daemonMod.CANONICAL_SEALED_HASH_FIXTURE,
    prm_step_indicators: [1, 1, 1, 1],
    noisy_verifier_reward: 1,
    false_positive_rate_rho0: 0.03,
    false_negative_rate_rho1: 0.05,
    diff_sha256: diffSha,
    lexical_clean: true,
  },
  auditB: {
    agent_id: "antigravity-argon",
    model_family: "gemini-4-argon",
    quality_score: 9.5,
    directional_prob: 0.618,
    sealed_hash_observed: daemonMod.CANONICAL_SEALED_HASH_FIXTURE,
    prm_step_indicators: [1, 1, 1, 1],
    noisy_verifier_reward: 1,
    false_positive_rate_rho0: 0.04,
    false_negative_rate_rho1: 0.04,
    diff_sha256: diffSha,
    lexical_clean: true,
  },
});

console.log(JSON.stringify({
  astExports: exportedNames.size,
  tsInterfacesCount,
  tsSettledStatus: settled.status,
  newMindHead: settled.mind_entry_sha256,
}));
"""
        runner_js = self.root / "verify_ts_ast_and_interop.cjs"
        runner_js.write_text(node_verification_script, encoding="utf-8")

        proc = subprocess.run(
            ["node", str(runner_js), str(TS_DAEMON_FILE), str(self.root), py_entry["entry_sha256"]],
            capture_output=True,
            text=True,
            check=False,
        )
        self.assertEqual(
            proc.returncode,
            0,
            msg=f"Node TypeScript AST/Interop check failed:\nSTDOUT: {proc.stdout}\nSTDERR: {proc.stderr}",
        )
        ts_summary = json.loads(proc.stdout.strip())
        self.assertEqual(ts_summary["tsSettledStatus"], "VERIFIED")
        self.assertGreaterEqual(ts_summary["astExports"], 14)

        chain_ok, combined_head = self.os_engine.mind_guardian.verify_chain()
        self.assertTrue(chain_ok)
        self.assertEqual(combined_head, ts_summary["newMindHead"])
        all_entries = self.os_engine.mind_guardian.read_all()
        self.assertEqual(len(all_entries), 2)
        self.assertEqual(all_entries[1]["entry_id"], "bus-verified-2026-11-13-motif-ts-interop")


if __name__ == "__main__":
    unittest.main(verbosity=2)
