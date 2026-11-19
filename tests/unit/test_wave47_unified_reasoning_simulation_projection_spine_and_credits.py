"""Wave 47 tests: Unified Reasoning->10k-Sim->Derived Projections Spine & Zero-Waste Credits."""

from __future__ import annotations

import json
import re
import time
from pathlib import Path
from typing import Any

import pytest

from gse_engine.compute.corpus_situational_integrator import (
    assert_all_books_pdfs_ig_x_situational_wired,
    compile_all_books_pdfs_ig_x_and_situational_priors,
)
from gse_engine.governance.credit_and_zero_waste_router import (
    NOUS_HERMES_PLUS_GUARDRAILS,
    PROHIBITED_SPEND_TRAPS,
    WAVE47_CREDIT_RLVR_TRAJECTORIES,
    WORKLOAD_CREDIT_ROUTES,
    evaluate_executive_credit_and_zero_waste_alignment_suite,
    resolve_zero_waste_workload_route,
    validate_aws_bedrock_reinstatement_guard,
    validate_nous_portal_zero_payg_request,
)
from gse_engine.governance.simulation_hold_gate import OperatorSimulationHoldError
from gse_engine.memory.knowledge_continuity_and_gsi_rlvr_flywheel import (
    _FORBIDDEN_ODDS_RE,
    compile_gse_to_gsi_rlvr_training_batch,
)
from gse_engine.workflows.unified_reasoning_simulation_projection_spine import (
    QUARANTINED_SIGNAL_KINDS,
    WAVE47_SPINE_RLVR_TRAJECTORIES,
    PregameReasoningSignal,
    default_matchup_context,
    evaluate_unified_reasoning_simulation_projection_spine_suite,
    watch_and_audit_pregame_signals,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
_FORBIDDEN_B_TOKEN_RE = re.compile(r"\b" + "blo" + r"ck(?:ed|er|ers|ing|s)?\b", re.IGNORECASE)
_FORBIDDEN_CERT_RE = re.compile(
    r"\b(?:" + "lo" + "ck|" + "lo" + "cked|" + "guar" + "anteed)\b",
    re.IGNORECASE,
)


def test_wave47_signal_audit_sinkhorn_10k_conservation_and_unified_derivation() -> None:
    """Verify Beat/Social/Cognitive Audit -> Sinkhorn -> 10k Worlds -> Plays/Props/SGP/DFS."""
    with pytest.raises(OperatorSimulationHoldError):
        evaluate_unified_reasoning_simulation_projection_spine_suite(
            away_team="IND", home_team="HOU", as_of_week=11
        )

    w11_tnf = evaluate_unified_reasoning_simulation_projection_spine_suite(
        away_team="IND", home_team="HOU", as_of_week=11, env_override="11"
    )
    assert w11_tnf["matchup"] == "IND @ HOU"
    assert w11_tnf["real_money_stake_cleared"] is False
    assert float(w11_tnf["live_stake_fraction"]) == 0.0
    assert float(w11_tnf["max_world_conservation_residual"]) == 0.0
    assert int(w11_tnf["orphaned_non_simulated_projections"]) == 0

    spread_play = w11_tnf["stage4_derived_outputs"]["game_plays"][0]
    assert spread_play["market_id"] == "full_game_spread"
    assert spread_play["decision"] == "TRANSPARENT_PASS"
    assert spread_play["publish_allowed"] is False

    # Verify quarantined unbacked rumors and wp>=0.95 spikes cannot move reasoned outputs
    ctx = default_matchup_context("KC", "BUF", as_of_week=10)
    clean_signals = [
        s for s in ctx["signals"] if s.kind not in QUARANTINED_SIGNAL_KINDS and s.evidence_span
    ]
    poisoned_signals = [
        *clean_signals,
        PregameReasoningSignal(
            signal_id="poison_rumor",
            source="anon",
            kind="unverified_rumor",
            team_side="away",
            channel="epa_shift",
            raw_delta=25.0,
            sigma_scale=0.1,
            reliability=0.99,
            evidence_span="",
            description="Unbacked rumor.",
        ),
        PregameReasoningSignal(
            signal_id="poison_wp95",
            source="mirage",
            kind="garbage_time_wp95",
            team_side="home",
            channel="epa_shift",
            raw_delta=-25.0,
            sigma_scale=0.1,
            reliability=0.99,
            evidence_span="wp=0.98 blowout snap",
            description="Garbage time mirage.",
        ),
    ]
    audit_clean = watch_and_audit_pregame_signals(clean_signals)
    audit_poison = watch_and_audit_pregame_signals(poisoned_signals)
    assert audit_poison["channels"] == audit_clean["channels"]
    assert float(audit_poison["quarantined_weight_sum"]) == 0.0

    # Verify full KC @ BUF W10 unified derivation & warm cache latency
    r1 = evaluate_unified_reasoning_simulation_projection_spine_suite("KC", "BUF", 10)
    t0 = time.perf_counter()
    r1_cached = evaluate_unified_reasoning_simulation_projection_spine_suite("KC", "BUF", 10)
    assert (time.perf_counter() - t0) < 0.02
    assert r1_cached["suite_sha256"] == r1["suite_sha256"]

    assert int(r1["n_worlds"]) == 10_000
    assert float(r1["max_world_conservation_residual"]) == 0.0
    assert int(r1["orphaned_non_simulated_projections"]) == 0

    s2 = r1["stage2_reasoned_environment"]
    assert float(s2["away"]["named_target_attribution"]) >= 0.94
    assert float(s2["home"]["named_target_attribution"]) >= 0.94
    assert float(s2["away"]["residual_target_share"]) <= 0.05
    assert float(s2["home"]["residual_target_share"]) <= 0.05

    s4 = r1["stage4_derived_outputs"]
    proj_sha = str(r1["projection_source_sha256"])
    assert len(s4["game_plays"]) == 8
    assert len(s4["player_props"]) == 12
    assert all(str(g["projection_source_sha256"]) == proj_sha for g in s4["game_plays"])
    assert all(str(p["projection_source_sha256"]) == proj_sha for p in s4["player_props"])

    sgps = s4["correlated_sgps"]
    assert len(sgps) == 2
    assert float(sgps[0]["correlation_lift"]) > 0.0
    assert float(sgps[1]["correlation_lift"]) < 0.0
    assert all(str(sg["projection_source_sha256"]) == proj_sha for sg in sgps)

    dfs = s4["dfs"]
    assert int(dfs["gpp_portfolio_count"]) == 3
    assert dfs["zero_cap_violations"] is True
    assert dfs["all_gpp_qb_stacked_and_bringback"] is True


def test_wave47_credit_router_spine_wiring_rlvr_406_and_hygiene() -> None:
    """Verify 11-workload credit alignment, corpus gate wiring, 382+24=406 RLVR & hygiene."""
    assert len(PROHIBITED_SPEND_TRAPS) == 6
    assert len(WORKLOAD_CREDIT_ROUTES) == 11

    route_triage = resolve_zero_waste_workload_route(
        "beat_reporter_and_social_triage",
        env={"ALIBABA_API_KEY": "ali-test-key"},
    )
    assert route_triage["primary_lane"] == "alibaba_dashscope_qwen"
    assert route_triage["env_signals_detected"]["alibaba_dashscope_key_present"] is True
    assert route_triage["env_signals_detected"]["posthog_session_replay_default_off"] is True

    cred = evaluate_executive_credit_and_zero_waste_alignment_suite(
        env={
            "ALIBABA_API_KEY": "ali-test-key",
            "CEREBRAS_API_KEY": "cb-test",
            "NOUS_API_KEY": "nous-test-key",
            "NOUS_MODEL": "qwen4-max",
            "NOUS_QWEN4_MAX_FREE_PROMO_ENABLED": "true",
            "NOUS_ALLOW_PAYG": "false",
        }
    )
    assert cred["wired"] is True
    assert cred["all_11_workloads_credit_or_free_aligned"] is True
    assert int(cred["unneeded_cash_leak_count"]) == 0
    assert cred["alibaba_qwen_lane_wired"] is True
    assert cred["nous_portal_qwen4_max_free_promo_wired"] is True
    assert cred["nous_payg_guard_active"] is True
    assert cred["posthog_bot_and_replay_guard_active"] is True
    assert cred["public_token_reseller_enabled"] is False
    assert cred["real_money_stake_cleared"] is False

    assert NOUS_HERMES_PLUS_GUARDRAILS["api_keys_use_payg_credits_not_included_usage"] is True
    free_ok = validate_nous_portal_zero_payg_request("qwen4-max", env={"NOUS_ALLOW_PAYG": "false"})
    assert free_ok["allowed"] is True
    assert free_ok["model"] == "qwen/qwen4-max:free"
    payg_halted = validate_nous_portal_zero_payg_request(
        "nousresearch/hermes-4-405b", env={"NOUS_ALLOW_PAYG": "false"}
    )
    assert payg_halted["allowed"] is False
    assert payg_halted["reason"] == "NOUS_API_KEY_PAYG_HALTED"

    aws_held = validate_aws_bedrock_reinstatement_guard({})
    assert aws_held["account_id"] == "183295455211"
    assert aws_held["invoice_id"] == "2899922873"
    assert aws_held["corporate_oauth_email"] == "hq@galaxysportsedge.com"
    assert aws_held["corporate_oauth_verified"] is True
    assert aws_held["reinstated"] is False
    assert aws_held["bedrock_flip_allowed"] is False
    assert aws_held["status"] == "suspended_invoice_2899922873_halted"
    aws_ready = validate_aws_bedrock_reinstatement_guard(
        {"AWS_ACCOUNT_183295455211_REINSTATED": "true"}
    )
    assert aws_ready["reinstated"] is True
    assert aws_ready["bedrock_flip_allowed"] is True
    assert aws_ready["status"] == "reinstated_ready"

    compiled = compile_all_books_pdfs_ig_x_and_situational_priors(
        away_team="ARI",
        home_team="DEN",
        week=10,
        merged_game_context={},
        stage1a_receipt=None,
        stage1b_receipt=None,
        pbp_ftn_32={},
        x_and_ig_360_charting={},
        full_repo_situational={},
        gdrive_onedrive_overlay={},
        uncompressed_25k_bridge={},
        x_layer2_overlay={},
        q1_to_q51_registry={},
        env_cfg={"is_indoor": False, "wind_mph": 12.0},
    )
    verif = assert_all_books_pdfs_ig_x_situational_wired(compiled)
    assert verif["executive_credit_zero_waste_wired"] is True
    assert verif["unified_reasoning_sim_projection_spine_wired"] is True

    assert len(WAVE47_CREDIT_RLVR_TRAJECTORIES) == 3
    assert len(WAVE47_SPINE_RLVR_TRAJECTORIES) == 3
    rlvr = compile_gse_to_gsi_rlvr_training_batch(REPO_ROOT, min_target_records=382)
    assert int(rlvr["records_compiled"]) >= 382
    assert rlvr["all_verifiers_passed"] is True
    assert rlvr["zero_odds_contamination"] is True

    for rel in (
        "brain/feeds/2026-11-16/gse_to_gsi_verifiable_reasoning_rlvr_feed.jsonl",
        "brain/feeds/2026-11-17/gse_to_gsi_overnight_rlvr_feed.jsonl",
        "data/llm/gse_gsi_rlvr_220_curriculum_2026.jsonl",
    ):
        lines = [
            ln for ln in (REPO_ROOT / rel).read_text(encoding="ascii").splitlines() if ln.strip()
        ]
        assert len(lines) >= 382
        for ln in lines:
            rec: dict[str, Any] = json.loads(ln)
            joined = f"{rec['prompt']} {rec['think']} {json.dumps(rec['ground_truth'])}"
            assert _FORBIDDEN_ODDS_RE.search(joined) is None, rec["record_id"]

    standalone = (
        REPO_ROOT / "brain/feeds/2026-11-17/aws_ngs_going_deep_gse_to_gsi_rlvr_feed.jsonl"
    )
    standalone_n = len(
        [ln for ln in standalone.read_text(encoding="ascii").splitlines() if ln.strip()]
    )
    assert int(rlvr["records_compiled"]) + standalone_n >= 406

    hygiene_paths = (
        REPO_ROOT / "src" / "gse_engine" / "governance" / "credit_and_zero_waste_router.py",
        REPO_ROOT
        / "src"
        / "gse_engine"
        / "workflows"
        / "unified_reasoning_simulation_projection_spine.py",
        REPO_ROOT
        / "brain"
        / "agent-bus"
        / "2026-11-18_wave47_unified_reasoning_simulation_projection_spine_and_credit_router.json",
        REPO_ROOT
        / "docs"
        / "engine"
        / "research"
        / "2026-11-18"
        / "unified-reasoning-simulation-projection-spine-and-zero-waste-credit-alignment.md",
    )
    for hp in hygiene_paths:
        raw = hp.read_text(encoding="ascii")
        assert _FORBIDDEN_B_TOKEN_RE.search(raw) is None, hp.name
        assert _FORBIDDEN_CERT_RE.search(raw) is None, hp.name
        assert "/".join(["Users", "Garrett"]) not in raw, hp.name
        assert "\\".join(["Users", "Garrett"]) not in raw, hp.name
