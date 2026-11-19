"""Unit tests for OpenMausBot/rakazo teammate isolation and OpenCode/Stitch preflight."""

from __future__ import annotations

from gse_engine.governance.teammate_routines import (
    TeammateContactCard,
    verify_lsp_and_stitch_contract,
)


def test_verify_lsp_and_stitch_contract_catches_conflicts_and_errors() -> None:
    """Ensures isolated workspaces and zero LSP/WCAG errors pass cleanly."""
    clean_cards = [
        TeammateContactCard(
            handle="jarvis",
            display_name="Jarvis Coordinator",
            workspace_dir="C:/Users/Garrett/Sports-wt-triage",
            cadence="THREE_NOON",
            memory_namespace="coordinator",
        ),
        TeammateContactCard(
            handle="watcher",
            display_name="Feed Watcher",
            workspace_dir="C:/Users/Garrett/Sports-wt-triage-sandbox",
            cadence="CONTINUOUS_15M",
            memory_namespace="feed_watch",
        ),
    ]

    ok_report = verify_lsp_and_stitch_contract(
        clean_cards,
        lsp_error_count=0,
        rag_citation_count=3,
        wcag_violations=0,
    )
    assert ok_report.passed is True
    assert ok_report.warnings == ()

    bad_report = verify_lsp_and_stitch_contract(
        [clean_cards[0], clean_cards[0]],
        lsp_error_count=2,
        rag_citation_count=0,
        wcag_violations=1,
    )
    assert bad_report.passed is False
    assert len(bad_report.warnings) == 4
