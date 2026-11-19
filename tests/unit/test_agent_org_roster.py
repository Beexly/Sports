"""Unit tests for agent org chart validation and Clowder consensus rails."""

from __future__ import annotations

from gse_engine.governance.agent_org_roster import (
    DEFAULT_GSE_ORG_CHART,
    AgentOrgNode,
    ModelVote,
    evaluate_clowder_consensus_rail,
    validate_agent_org_chart,
)


def test_default_org_chart_passes_and_detects_cycles() -> None:
    """Verifies acyclic hierarchy and Zero-Waste FREE_WORKHORSE ratio >= 60%."""
    ok, errors = validate_agent_org_chart(DEFAULT_GSE_ORG_CHART)
    assert ok is True
    assert errors == ()

    cyclic = (
        AgentOrgNode("root", "Root", None, "FRONTIER_REASONING", "ALL"),
        AgentOrgNode("a", "A", "b", "FREE_WORKHORSE", "ALL"),
        AgentOrgNode("b", "B", "a", "FREE_WORKHORSE", "ALL"),
    )
    bad_ok, bad_errors = validate_agent_org_chart(cyclic)
    assert bad_ok is False
    assert any(err.startswith("reporting_cycle:") for err in bad_errors)


def test_clowder_consensus_rail_blocks_solo_source_and_clears_multi_source() -> None:
    """Blocks single-family votes and clears multi-family edges above threshold."""
    solo = [ModelVote(model_id="elo-1", source_family="elo", prob=0.63)]
    solo_verdict = evaluate_clowder_consensus_rail(solo, market_fair_prob=0.50)
    assert solo_verdict.approved is False
    assert solo_verdict.agreement_count == 1
    assert abs(solo_verdict.effective_edge - (0.13 * 0.35)) < 1e-5

    multi = [
        ModelVote(model_id="elo-1", source_family="elo", prob=0.58),
        ModelVote(model_id="jev-pbp", source_family="jev-pbp", prob=0.60),
    ]
    multi_verdict = evaluate_clowder_consensus_rail(multi, market_fair_prob=0.52)
    assert multi_verdict.approved is True
    assert multi_verdict.agreement_count == 2
    assert multi_verdict.effective_edge > 0.05
