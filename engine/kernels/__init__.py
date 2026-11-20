"""Live Brenier Stability, Control, Conservation, and Calibration Kernels."""
from __future__ import annotations

from engine.kernels.brenier_stability import (
    assert_brenier_one_third_modulus,
    compute_optimal_reallocation_map,
)
from engine.kernels.consolidated_sweep_kernels import (
    compute_c281_tprr_yprr_composite,
    load_consolidated_2026_pbp_metrics,
)
from engine.kernels.control_and_calibration import (
    SparkMcpBusAdapter,
    assert_no_synthetic_provenance,
    katch_mcardle_metabolic_fence,
    load_verified_pbp_table,
    tau_hat_shrinkage_live,
)
from intelligence.ops.wire_nov13_super_engines import (
    WEEK11_PLUS_APPROVED_WEEKS,
    LogitTempCalibrator,
    MultimodalDecisionsRouter,
    SovereignDualCloudRouter,
    assert_approved_ngs_tracking_week,
    barometric_pressure_at_altitude_hpa,
    build_nov13_super_engine_manifest,
    evaluate_mind_principles,
    humid_air_density_kg_m3,
)

__all__ = [
    "LogitTempCalibrator",
    "MultimodalDecisionsRouter",
    "SovereignDualCloudRouter",
    "SparkMcpBusAdapter",
    "WEEK11_PLUS_APPROVED_WEEKS",
    "assert_approved_ngs_tracking_week",
    "assert_brenier_one_third_modulus",
    "assert_no_synthetic_provenance",
    "barometric_pressure_at_altitude_hpa",
    "build_nov13_super_engine_manifest",
    "compute_c281_tprr_yprr_composite",
    "compute_optimal_reallocation_map",
    "evaluate_mind_principles",
    "humid_air_density_kg_m3",
    "katch_mcardle_metabolic_fence",
    "load_consolidated_2026_pbp_metrics",
    "load_verified_pbp_table",
    "tau_hat_shrinkage_live",
]
