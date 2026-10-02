# PROVENANCE — gse-intelligence-build / combining / __init__.py
# Combining module: forecast-distribution combination + ensemble training.
#   SYS-04 Angular forecast combination (arXiv:2305.16735v2)
#   SYS-16 Ensemble information-graph audit (pre-step for SYS-04)
#   SYS-07 afCRPS training recipe + EECRPS evaluation (0748 / 1582)
#   Corpus: ~/workspace/corpus-intelligence/deep/c10/buildable-systems.md
#           ~/workspace/corpus-intelligence/deep/c10/syntheses.md (Pipelines 4, 7)
#           ~/workspace/corpus-intelligence/deep/c10/verified-claims.md
# HONESTY: all evaluations here run on SEEDED SYNTHETIC DGPs (see
# combining/synthetic.py). No real ensemble forecasts exist in this sandbox.
"""Combining module: angular forecast combination (SYS-04/1550) after the
SYS-16 information-graph audit, and afCRPS training + EECRPS evaluation
(SYS-07/0748/1582). Synthetic DGPs only — see combining/synthetic.py."""

from .angular import (
    angular_fallback_theta_deg,
    angular_vs_linear_pool,
    angular_combine,
    vertical_average,
    horizontal_average,
    mean_quantile_score,
    optimize_theta,
)
from .audit import (
    attention_centrality,
    information_graph_audit,
    network_bias_variance,
)
from .afcrps import (
    afcrps_training_check,
    afcrps_naive,
    crps,
    fair_crps,
    eecrps,
    efi_band,
    effective_ensemble_variance,
    fit_bias_corrections,
    fit_pooled_bias_correction,
    apply_corrections,
    CrossEraPoolingError,
    stadium_variable_ladder_spec,
    STADIUM_VARIABLE_LADDER,
    ALPHA,
)

__all__ = [
    "angular_fallback_theta_deg",
    "angular_vs_linear_pool",
    "angular_combine",
    "vertical_average",
    "horizontal_average",
    "mean_quantile_score",
    "optimize_theta",
    "attention_centrality",
    "information_graph_audit",
    "network_bias_variance",
    "afcrps_training_check",
    "afcrps_naive",
    "crps",
    "fair_crps",
    "eecrps",
    "efi_band",
    "effective_ensemble_variance",
    "fit_bias_corrections",
    "fit_pooled_bias_correction",
    "apply_corrections",
    "CrossEraPoolingError",
    "stadium_variable_ladder_spec",
    "STADIUM_VARIABLE_LADDER",
    "ALPHA",
]
