"""Bridge connecting GSE Sovereign Foundry artifacts (read-only) to the Week 10 Reasoning Mind."""

from .week10_reasoning_mind_bridge import (
    AUTHORITATIVE_WEEK10_TRUTH_2026_11_13,
    RLVR_VETO_BITEMPORAL_LEAK,
    RLVR_VETO_OVERFIT_ELEPHANT,
    RLVR_VETO_SATURATED_CONFIDENCE,
    RLVR_VETO_SINGLE_SIDED_MARKET,
    RLVR_VETO_STAGE0_ROSTER_CONTAMINATION,
    RLVR_VETO_VANISHING_CREDIT,
    audit_gcp_week10_crucibles,
    build_reference_answer_for_rlvr_scenario,
    evaluate_candidate_ticket_with_rlvr_bridge,
    load_all_sovereign_primitives,
    load_and_verify_all_rlvr_vetoes,
    open_foundry_db_readonly,
    remap_motif_csv_season_stats,
)

__all__ = [
    "AUTHORITATIVE_WEEK10_TRUTH_2026_11_13",
    "RLVR_VETO_BITEMPORAL_LEAK",
    "RLVR_VETO_OVERFIT_ELEPHANT",
    "RLVR_VETO_SATURATED_CONFIDENCE",
    "RLVR_VETO_SINGLE_SIDED_MARKET",
    "RLVR_VETO_STAGE0_ROSTER_CONTAMINATION",
    "RLVR_VETO_VANISHING_CREDIT",
    "audit_gcp_week10_crucibles",
    "build_reference_answer_for_rlvr_scenario",
    "evaluate_candidate_ticket_with_rlvr_bridge",
    "load_all_sovereign_primitives",
    "load_and_verify_all_rlvr_vetoes",
    "open_foundry_db_readonly",
    "remap_motif_csv_season_stats",
]
