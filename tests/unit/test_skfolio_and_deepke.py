"""Unit tests for skfolio portfolio Kelly, DeepKE triples, and Paperclip budget guard."""

from __future__ import annotations

from gse_engine.compute.skfolio_allocator import (
    CandidateBetTicket,
    allocate_skfolio_kelly_portfolio,
)
from gse_engine.governance.agent_org_roster import (
    AgentBudgetLedger,
    evaluate_paperclip_budget_guard,
)
from gse_engine.ingestion.deepke_triples import extract_football_knowledge_triples


def test_skfolio_allocator_respects_gate_and_shrinks_correlated_tickets() -> None:
    """Keeps live stake 0.0 when gated and penalizes correlated same-game legs."""
    correlated = [
        CandidateBetTicket(
            ticket_id="leg-a",
            game_id="2026_10_DET_NE",
            win_prob=0.59,
            decimal_odds=1.95,
            return_scenarios=(0.95, -1.0, 0.95, 0.95, -1.0, 0.95),
        ),
        CandidateBetTicket(
            ticket_id="leg-b",
            game_id="2026_10_DET_NE",
            win_prob=0.59,
            decimal_odds=1.95,
            return_scenarios=(0.95, -1.0, 0.95, 0.95, -1.0, 0.95),
        ),
    ]
    independent = [
        CandidateBetTicket(
            ticket_id="leg-a",
            game_id="2026_10_DET_NE",
            win_prob=0.59,
            decimal_odds=1.95,
            return_scenarios=(0.95, -1.0, 0.95, 0.95, -1.0, 0.95),
        ),
        CandidateBetTicket(
            ticket_id="leg-c",
            game_id="2026_10_BUF_IND",
            win_prob=0.59,
            decimal_odds=1.95,
            return_scenarios=(-1.0, 0.95, -1.0, 0.95, 0.95, -1.0),
        ),
    ]

    gated_corr = allocate_skfolio_kelly_portfolio(
        correlated,
        calibration_adjustments_enabled=False,
    )
    gated_indep = allocate_skfolio_kelly_portfolio(
        independent,
        calibration_adjustments_enabled=False,
    )

    assert gated_corr.total_live_stake == 0.0
    assert all(a.live_stake_fraction == 0.0 for a in gated_corr.allocations)
    assert gated_corr.total_rd_weight > 0.0
    assert gated_corr.total_rd_weight <= gated_indep.total_rd_weight

    live_report = allocate_skfolio_kelly_portfolio(
        independent,
        calibration_adjustments_enabled=True,
    )
    assert live_report.total_live_stake == live_report.total_rd_weight


def test_deepke_triples_and_paperclip_budget_guard() -> None:
    """Verifies exact source char offsets and Paperclip spend/token halts."""
    note = (
        "Tee Higgins ruled out on Friday and vacates targets to Andrei Iosivas. "
        "Jameson Williams out vacates targets to Isaac TeSlaa. "
        "Ja'Marr Chase shadowed by Denzel Ward while BAL deploys Man Blitz."
    )
    triples = extract_football_knowledge_triples(note)
    assert len(triples) == 4
    for triple in triples:
        assert note[triple.char_start : triple.char_end] == triple.source_quote

    relations = {t.relation for t in triples}
    assert relations == {"VACATES_VOLUME_TO", "SHADOWED_BY", "DEPLOYS_SHELL"}
    assert any(t.object_entity == "Isaac TeSlaa" for t in triples)

    verdict = evaluate_paperclip_budget_guard(
        [
            AgentBudgetLedger("stage0-feed-auditor", tokens_used=12000, token_limit=50000),
            AgentBudgetLedger(
                "runaway-worker",
                tokens_used=80000,
                token_limit=50000,
                paid_usd_delta=1.25,
                max_paid_usd=0.0,
            ),
        ]
    )
    assert verdict.within_budget is False
    assert verdict.halted_agents == ("runaway-worker",)
    assert verdict.total_paid_usd == 1.25
