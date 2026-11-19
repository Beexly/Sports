"""Unit tests for Wave 19 Agentic Fleet (#88..#97), Total Intelligence Gate, and K14."""

from __future__ import annotations

import json
from pathlib import Path

import pytest
from scripts.guardrails.pre_sim_total_intelligence_gate import (
    audit_repository_total_wiring,
    profile_and_assert_pre_sim_execution,
)

from gse_engine.governance.wave19_agentic_fleet_and_registry_97 import (
    WAVE19_CORPUS_ENTRIES,
    CircleTrustRegistry,
    CommitmentSlaAndAlphaFilter,
    DreamMemoryConsolidator,
    GVisorSandboxCostGovernor,
    LocalQuantizedFallbackAndRiskGate,
    ReadOnlySubagentPolicy,
    SingleFacadeMcpDispatcher,
    SubagentRunReceipt,
    ToolCallRepairAndPrefixAligner,
    UninterruptedModeScorerAndLock,
)
from gse_engine.observability.walk_forward_ablation import (
    BitemporalRecord,
    SourceCannotSpeakAsOfError,
    enforce_bitemporal_asof_freeze,
    run_weeks1_to_10_walk_forward_ablation,
)
from gse_engine.science.gsi_translational_bridge import (
    compute_k14_translational_tissue_hazard_prior,
)

REPO_ROOT = Path(__file__).resolve().parents[2]


def test_wave19_registry_contains_all_97_wired_entries() -> None:
    """OSS corpus registry must contain all 97 unique entries with #88..#97 WIRED_V3."""
    assert len(WAVE19_CORPUS_ENTRIES) == 10
    reg_path = (
        REPO_ROOT
        / "docs"
        / "data-sources"
        / "research"
        / "2026-11-15"
        / "oss-corpus-registry.json"
    )
    data = json.loads(reg_path.read_text(encoding="utf-8"))
    entries = data.get("entries", [])
    assert len(entries) >= 97
    by_url = {str(e.get("url")): e for e in entries}
    for expected in WAVE19_CORPUS_ENTRIES:
        url = str(expected["url"])
        assert url in by_url
        assert by_url[url]["status"] == "WIRED_V3"


def test_wave19_fleet_governance_primitives() -> None:
    """Verify all 10 Wave 19 fleet safety, caching, sandbox, and SLA primitives."""
    merged, dream_res = DreamMemoryConsolidator.consolidate(
        ["fact_a"], ["fact_a", "fact_b"], ["pending_post"]
    )
    assert merged == ["fact_a", "fact_b"]
    assert dream_res.wrote_durable_update and dream_res.added_entries == 1
    assert dream_res.blocked_unverified_replays == ["pending_post"]

    policy = ReadOnlySubagentPolicy(agent_id="auditor_1")
    policy.assert_tool_allowed("read")
    with pytest.raises(PermissionError):
        policy.assert_tool_allowed("shell")
    with pytest.raises(PermissionError):
        policy.assert_tool_allowed("edit")
    with pytest.raises(PermissionError):
        policy.assert_tool_allowed("spawn_subagent")

    receipt = SubagentRunReceipt(session_id="w19", lane_role="auditor")
    receipt.record_file_change("src/a.py", b"old", b"new")
    receipt.record_command("pytest -q", 0)
    receipt.record_external_call("espn")
    assert len(receipt.receipt_digest()) == 64

    repaired = ToolCallRepairAndPrefixAligner.repair_tool_json(
        '```json\n{"team": "BAL", "week": 10,}\n```'
    )
    assert repaired == {"team": "BAL", "week": 10}
    aligned, prefix_sha = ToolCallRepairAndPrefixAligner.align_prompt_for_kv_cache(
        ["sys_prompt"], ["turn_1"]
    )
    assert aligned[0] == "sys_prompt" and len(prefix_sha) == 64

    gate = LocalQuantizedFallbackAndRiskGate()
    assert gate.select_backend(True, False) == "cloud_primary"
    assert gate.select_backend(True, True).startswith("local_llamacpp:")
    assert gate.requires_human_pause(False, "live_payment") is True

    gvisor_plan = GVisorSandboxCostGovernor.plan_sandbox(False, idle_ttl_sec=300)
    assert gvisor_plan.monthly_730h_list_usd == 4.76 and gvisor_plan.auto_sleep_enabled

    assert not UninterruptedModeScorerAndLock.can_execute_autonomously("send_email", True, False)
    assert UninterruptedModeScorerAndLock.can_execute_autonomously("read_board", True, False)
    dupes = UninterruptedModeScorerAndLock.detect_duplicate_bills(
        [
            {"bill_id": "b1", "vendor": "Cloud", "amount": 50.0, "day_index": 1},
            {"bill_id": "b2", "vendor": "cloud", "amount": 50.0, "day_index": 5},
        ]
    )
    assert dupes == [("b2", "b1")]

    circles = CircleTrustRegistry()
    with pytest.raises(PermissionError):
        circles.assert_handoff_permitted(
            "public_chalk_viral_mind", "market_anchor_mind", "gse_stage1_to_3_true_pricing"
        )

    alpha_msgs = CommitmentSlaAndAlphaFilter.filter_signal_messages(
        ["Good morning", "Lamar Jackson thumb ruled OUT", "Lunch break"]
    )
    assert len(alpha_msgs) == 1
    assert len(CommitmentSlaAndAlphaFilter.active_november_2026_slas()) >= 3

    dispatcher = SingleFacadeMcpDispatcher()
    queued = dispatcher.dispatch("publish_social", {"msg": "x"}, approved=False)
    assert queued["status"] == "AWAITING_OPERATOR_APPROVAL"
    assert dispatcher.dispatch("read_local", {}, approved=False)["status"] == "EXECUTED_LOCALLY"


def test_pre_sim_gate_repo_audit_and_runtime_profiler() -> None:
    """Pre-sim gate passes cleanly across repo and blocks uncalled/orphaned modules."""
    report = audit_repository_total_wiring(REPO_ROOT)
    assert report.repo_detected
    assert report.missing_master_plan_files == []
    assert report.dead_leaf_unwired_pre_sim_modules == []
    assert report.silent_except_swallowers == []
    assert all(m["ok"] for m in report.manifest_checks)
    assert all(report.specific_v3_gap_checks.values())

    def _p1(x: float) -> float:
        return 0.35 * x

    def _p2(x: float) -> float:
        return -0.25 * x

    def _coupled(inp: dict[str, float]) -> dict[str, float]:
        return {"epa": _p1(inp["a"]) + _p2(inp["b"])}

    rec = profile_and_assert_pre_sim_execution(
        "TEST_MATCHUP", _coupled, {"a": 0.1, "b": 0.2}, {"_p1", "_p2"}
    )
    assert rec.all_pillars_fired and rec.all_jacobians_nonzero

    def _uncalled(inp: dict[str, float]) -> dict[str, float]:
        return {"epa": _p1(inp["a"]) + 0.1 * inp["b"]}

    with pytest.raises(RuntimeError, match="Uncalled pre-sim engines"):
        profile_and_assert_pre_sim_execution(
            "TEST_MATCHUP", _uncalled, {"a": 0.1, "b": 0.2}, {"_p1", "_p2"}
        )

    def _orphaned(inp: dict[str, float]) -> dict[str, float]:
        _ = _p2(inp["b"])
        return {"epa": _p1(inp["a"])}

    with pytest.raises(RuntimeError, match="Zero/orphaned Jacobian"):
        profile_and_assert_pre_sim_execution(
            "TEST_MATCHUP", _orphaned, {"a": 0.1, "b": 0.2}, {"_p1", "_p2"}
        )


def test_k14_translational_tissue_hazard_prior_rule_in_only() -> None:
    """K14 enforces ADR-0003 rule-in attenuation only (never clears or boosts injured athletes)."""
    healthy = compute_k14_translational_tissue_hazard_prior(
        concussion_questionable_count=0, lower_extremity_questionable_count=0
    )
    assert healthy["k14_hazard_prior"] == 0.0
    assert healthy["k14_snap_attenuation_mult"] == 1.0
    assert healthy["k14_epa_penalty"] == 0.0

    injured = compute_k14_translational_tissue_hazard_prior(
        concussion_questionable_count=1, lower_extremity_questionable_count=2
    )
    assert 0.0 < injured["k14_hazard_prior"] <= 0.18
    assert 0.84 <= injured["k14_snap_attenuation_mult"] < 1.0
    assert -0.015 <= injured["k14_epa_penalty"] < 0.0


def test_weeks1_to_10_walk_forward_ablation_and_k25_trauma_isolation() -> None:
    """Verify multi-week OOS ablation enforces ASOF freeze, isolates NE@DET, and freezes stakes."""
    with pytest.raises(SourceCannotSpeakAsOfError):
        enforce_bitemporal_asof_freeze(
            [
                BitemporalRecord(
                    record_id="leak",
                    season=2026,
                    week=10,
                    visible_at_utc=100000,
                    forecast_init_utc=100000,
                    payload=0.1,
                )
            ],
            decision_timestamp_utc=99999,
            strict_fail=True,
        )

    summary = run_weeks1_to_10_walk_forward_ablation(REPO_ROOT)
    assert summary["completed_games_evaluated"] >= 135
    assert summary["weeks_covered"] == list(range(1, 11))
    assert summary["k25_ville_e_process"]["munich_ne_det_trauma_isolated"] is True
    assert summary["governance"]["real_money_stake_cleared"] is False
    assert summary["governance"]["live_stake_fraction"] == 0.0

