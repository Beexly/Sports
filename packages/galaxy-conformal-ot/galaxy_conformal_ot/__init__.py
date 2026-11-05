"""
galaxy_conformal_ot
===================
Universal High-Dimensional Epistemic Calibration, Spectral Cognitive Routing,
Wasserstein-Mahalanobis Conformal Filtering, and Entropic Optimal Transport
under Adversarial Non-Stationarity.
"""

from .spectral_cognitive_router import (
    build_context_mask_288,
    mask_to_words,
    cholesky_spectral_whitening,
    positive_part_james_stein_shrinkage,
    SpectralCognitiveRouter,
)

from .conformal_copula_sizing import (
    conformal_finite_sample_rank,
    asymmetric_tacqr_score,
    check_frechet_hoeffding_bounds,
    assert_frechet_hoeffding_bounds,
    slow_75_conformal_kelly_stake,
    ConformalCopulaSizer,
)

from .sinkhorn_optimal_transport import (
    sinkhorn_knopp_reallocate,
    assert_pbp_conservation,
    EntropicOptimalTransport,
)

from .kinematic_workload_hazard import (
    compute_acwr_ratio,
    distributed_lag_kinematic_workload,
    evaluate_injury_survival_hazard,
    KinematicHazardModel,
)

from .schrodinger_bridge_hazard import (
    compute_critical_slowing_down_index,
    compute_expected_free_energy,
    solve_schrodinger_bridge_trajectory,
    AdversarialSchrodingerActiveHazardEngine,
)

from .wasserstein_mahalanobis_whitening import (
    GSEClinicalEngine,
    ProductionWhiteningEngine,
    RFFMahalanobis,
    CounterfactualTransportEngine,
    standardize_vitals,
    hourly_state_matrix,
    multi_frame_features,
    conformal_rank,
    split_conformal_threshold,
)

from .gse_gsi_unified_hyperloop import (
    HyperloopStepVerdict,
    UnifiedHyperloopOrchestrator,
)

from .gsi_research_api_wrapper import (
    evaluate_trajectory_payload,
    app as gsi_research_asgi_app,
)

from .quantum_topology_hyper_embedding import (
    TopologicalManifoldQuantumEmbedding,
    GSEClinicalEngineV3,
    GSIBraidedInvariantEngine,
)

from .quantum_braid_teb import (
    TimeSlippageMetrics,
    AsynchronousTimeSlippageEstimator,
    BraidInvariantSummary,
    ThermodynamicBraidInvariant,
    QuantumSpectralSummary,
    QuantumSpectralTrajectoryLaplacian,
    PersistentHomologySummary,
    PersistentHomologyBetti,
    ErgodicBifurcationSummary,
    ErgodicBraidBifurcationMonitor,
)

__version__ = "3.0.0"
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
    "AdversarialSchrodingerActiveHazardEngine",
    "GSEClinicalEngine",
    "ProductionWhiteningEngine",
    "RFFMahalanobis",
    "CounterfactualTransportEngine",
    "standardize_vitals",
    "hourly_state_matrix",
    "multi_frame_features",
    "conformal_rank",
    "split_conformal_threshold",
    "HyperloopStepVerdict",
    "UnifiedHyperloopOrchestrator",
    "evaluate_trajectory_payload",
    "gsi_research_asgi_app",
    "TopologicalManifoldQuantumEmbedding",
    "GSEClinicalEngineV3",
    "GSIBraidedInvariantEngine",
    "TimeSlippageMetrics",
    "AsynchronousTimeSlippageEstimator",
    "BraidInvariantSummary",
    "ThermodynamicBraidInvariant",
    "QuantumSpectralSummary",
    "QuantumSpectralTrajectoryLaplacian",
    "PersistentHomologySummary",
    "PersistentHomologyBetti",
    "ErgodicBifurcationSummary",
    "ErgodicBraidBifurcationMonitor",
]
