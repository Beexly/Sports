"""Week 8 & Week 9 Forensic Fixes Regression Suite."""
from __future__ import annotations

from tests.test_stage0_zero_hallucination_gate import (  # noqa: F401
    test_connected_workflow_master_bundle_and_all_37_athlete_projections,
    test_stage0_allowlist_and_confirmed_starters,
    test_stage0_contamination_gate_raises_on_hallucinated_or_excluded_players,
)
from tests.test_week8_post_slate_fixes import (  # noqa: F401
    test_empirical_bayes_shrinks_small_sample_outliers,
    test_evaluate_prop_vector_returns_platform_variance_and_quantiles,
    test_guardian_ledger_refuses_text_override,
    test_immutable_gate_blocks_311pm_sycophancy_reversal,
    test_inactive_players_hard_blocked,
    test_injury_reallocation_idempotent,
    test_ownership_penalty_crushes_fragile_chalk,
    test_pbp_conservation_coupling_and_jev_degraded_and_showdown_floor,
    test_pbp_conservation_exact,
    test_roster_identity_and_track4_kernels,
    test_simulate_matchup_pbp_conserves_yards_and_tds_without_gaussian_loop,
    test_top_level_aliases_and_hurdle_non_negative_proj,
)
