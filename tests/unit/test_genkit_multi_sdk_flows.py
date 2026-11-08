"""Unit tests for the GSE Multi-Language Genkit Flows & Agents (`developing-genkit-python/js/go/dart`)."""

from __future__ import annotations

from intelligence.genkit_flows.gse_genkit_multi_sdk_executor import (
    execute_all_genkit_sdk_flows,
    parse_dotprompt_file,
    render_dotprompt,
    verify_and_execute_cross_sdk_contracts,
)


def test_dotprompt_picoschema_and_handlebars_rendering() -> None:
    spec = parse_dotprompt_file()
    assert spec.picoschema_valid is True
    assert spec.model == "googleai/gemini-flash-latest"
    assert "evaluateSituational87Rules" in spec.tools
    assert "verifyConjunctionGateApproval" in spec.tools
    assert "gameId" in spec.input_schema
    assert "situationalDeltaLogOdds" in spec.output_schema

    rendered_windy = render_dotprompt(
        spec,
        {
            "gameId": "2024_10_CIN_BAL",
            "homeTeam": "BAL",
            "awayTeam": "CIN",
            "marketSpread": -6.0,
            "windMph": 18.5,
            "shortWeekRestDiff": 0,
            "activeFamiliesCount": 279,
        },
    )
    assert "Apply outdoor crosswind deep-pass completion penalty" in rendered_windy

    rendered_calm = render_dotprompt(
        spec,
        {
            "gameId": "2024_10_CIN_BAL",
            "homeTeam": "BAL",
            "awayTeam": "CIN",
            "marketSpread": -6.0,
            "windMph": 6.0,
            "shortWeekRestDiff": 0,
            "activeFamiliesCount": 279,
        },
    )
    assert "Apply outdoor crosswind deep-pass completion penalty" not in rendered_calm


def test_genkit_flow_interrupt_resume_and_agent_branching() -> None:
    report = execute_all_genkit_sdk_flows()
    assert report["status"] == "PASS"
    assert report["dotprompt_picoschema_valid"] is True
    assert report["total_traces_captured"] >= 5

    # Standard flow trace
    flow = report["flow_trace"]
    assert flow["status"] == "PASS"
    assert abs(flow["outputs"]["situationalDeltaLogOdds"]) <= 0.35
    assert flow["outputs"]["activeFamiliesConsumed"] == 279
    assert flow["outputs"]["activeRulesTriggered"] == 87
    assert "%" not in flow["a2ui_surfaces"][0]["props"]["confidenceBadge"]

    # Interrupt & resume cycle
    assert report["interrupt_trace"]["status"] == "INTERRUPTED"
    assert report["interrupt_trace"]["outputs"]["publishDecision"] == "INTERRUPT_PENDING"
    assert report["resumed_trace"]["status"] == "RESUMED_PASS"
    assert report["resumed_trace"]["outputs"]["publishDecision"] == "PLAY"

    # Multi-turn agent with snapshot branching
    agent = report["agent_branching_trace"]
    assert agent["status"] == "PASS"
    assert agent["outputs"]["mainTurn2Delta"] != agent["outputs"]["branchTurn2Delta"]


def test_cross_sdk_go_dart_js_contracts() -> None:
    cross = verify_and_execute_cross_sdk_contracts()
    assert cross["go_sdk"]["all_passed"] is True
    assert cross["dart_sdk"]["all_passed"] is True
    assert cross["js_sdk"]["all_passed"] is True
