"""
galaxy_conformal_ot
===================
Universal High-Dimensional Epistemic Calibration, Spectral Cognitive Routing,
and Entropic Optimal Transport under Adversarial Non-Stationarity.

Four Core Mathematical Primitives:
1. Spectral Cognitive Router: 288-bit bitfield context masking & Cholesky whitening.
2. Conformal Copula Sizing: Finite-sample TA-CQR & non-clamping Fréchet-Hoeffding gates.
3. Sinkhorn Optimal Transport: GPU/CPU entropic optimal transport with mass conservation.
4. Kinematic Workload Hazard: Distributed-lag non-linear collision fatigue models.
"""

from .spectral_cognitive_router import (
    build_context_mask_288,
    mask_to_words,
    cholesky_spectral_whitening,
    positive_part_james_stein_shrinkage,
    SpectralCognitiveRouter
)

from .conformal_copula_sizing import (
    conformal_finite_sample_rank,
    asymmetric_tacqr_score,
    check_frechet_hoeffding_bounds,
    assert_frechet_hoeffding_bounds,
    slow_75_conformal_kelly_stake,
    ConformalCopulaSizer
)

from .sinkhorn_optimal_transport import (
    sinkhorn_knopp_reallocate,
    assert_pbp_conservation,
    EntropicOptimalTransport
)

from .kinematic_workload_hazard import (
    compute_acwr_ratio,
    distributed_lag_kinematic_workload,
    evaluate_injury_survival_hazard,
    KinematicHazardModel
)

from .schrodinger_bridge_hazard import (
    compute_critical_slowing_down_index,
    compute_expected_free_energy,
    solve_schrodinger_bridge_trajectory,
    AdversarialSchrodingerActiveHazardEngine
)

__version__ = "0.2.0"
__all__ = [
    "build_context_mask_288",
    "mask_to_words",
    "cholesky_spectral_whitening",
    "positive_part_james_stein_shrinkage",
    "SpectralCognitiveRouter",
    "conformal_finite_sample_rank",
    "asymmetric_tacqr_score",
    "check_frechet_hoeffding_bounds",
    "assert_frechet_hoeffding_bounds",
    "slow_75_conformal_kelly_stake",
    "ConformalCopulaSizer",
    "sinkhorn_knopp_reallocate",
    "assert_pbp_conservation",
    "EntropicOptimalTransport",
    "compute_acwr_ratio",
    "distributed_lag_kinematic_workload",
    "evaluate_injury_survival_hazard",
    "KinematicHazardModel",
    "compute_critical_slowing_down_index",
    "compute_expected_free_energy",
    "solve_schrodinger_bridge_trajectory",
    "AdversarialSchrodingerActiveHazardEngine"
]
