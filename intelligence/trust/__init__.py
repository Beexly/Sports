# Provenance: the `trust` module of the GSE intelligence build -- the integrity,
# calibration, and honesty substrate. Implements:
#   SYS-03 + SYS-36 (EnbPI conformal intervals; enbpi.py),
#   SYS-21 (production calibration chain; calibration.py),
#   S3 leak-wall fail-closed rules + SYS-28 (feature store; leakwall.py),
#   ENGINEERING_PRINCIPLES Wilson floor (proofledger.py),
#   SYS-22 (15-test evidence guard; evidence_guard.py),
#   SYS-25 (NNTD selective-classification abstention; abstention.py).
# Research sources: ~/workspace/corpus-intelligence/deep/c10/buildable-systems.md,
# ~/workspace/corpus-intelligence/deep/c10/syntheses.md (Pipeline 1, S2, S3, S7),
# ~/workspace/corpus-intelligence/deep/c10/verified-claims.md.
#
# HONESTY: every numeric gate in this module is reproduced on SEEDED SYNTHETIC
# data labeled as such in each submodule's header -- no real odds archive exists
# in this sandbox. Nothing here claims real-game performance.

from .enbpi import (
    enbpi_coverage_check,
    exact_interval,
    finite_sample_quantile,
    uncertainty_resampling_unit,
)
from .calibration import (
    adaptive_ece,
    calibration_chain,
    calibration_chain_stages,
    cohort_e_baseline,
)
from .leakwall import (
    NO_MARKET_FEED,
    FeatureStore,
    latest_prior_row,
    select_market_snapshot,
)
from .proofledger import (
    edge_claim_admissible,
    proof_ledger_floor,
    wilson_lower_bound,
)
from .evidence_guard import (
    blocked_registry,
    evaluate as evidence_guard_evaluate,
    live_pick_value,
    publish as evidence_guard_publish,
)
from .abstention import (
    abstain_decision,
    abstention_backtest,
    abstention_signal,
    calibrate_threshold_to_target_error,
    nntd_disagreement,
)

__all__ = [
    # SYS-03/SYS-36 gates
    "enbpi_coverage_check",
    "exact_interval",
    "finite_sample_quantile",
    "uncertainty_resampling_unit",
    # SYS-21 gate
    "cohort_e_baseline",
    "calibration_chain",
    "calibration_chain_stages",
    "adaptive_ece",
    # S3 + SYS-28 gates
    "latest_prior_row",
    "select_market_snapshot",
    "FeatureStore",
    "NO_MARKET_FEED",
    # proof ledger gate
    "proof_ledger_floor",
    "edge_claim_admissible",
    "wilson_lower_bound",
    # SYS-22 evidence guard
    "evidence_guard_evaluate",
    "evidence_guard_publish",
    "live_pick_value",
    "blocked_registry",
    # SYS-25 abstention
    "nntd_disagreement",
    "abstain_decision",
    "abstention_backtest",
    "abstention_signal",
    "calibrate_threshold_to_target_error",
]
