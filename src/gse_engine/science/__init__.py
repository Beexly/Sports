"""GSI translational sports-medicine, cheminformatics, life-saving physics & validation bridge."""

from __future__ import annotations

from gse_engine.science.gsi_translational_bridge import (
    BiomarkerStructuralProfile,
    ClinicalTrialPortfolioSummary,
    CongenericSarSummary,
    MultiOmicsTargetAnnotation,
    PairedModelProgressionReport,
    Wave16TranslationalBundle,
    evaluate_paired_projection_progression,
    load_and_verify_wave16_telemetry,
    validate_and_serialize_wave16_bundle,
)
from gse_engine.science.wave35_gsi_lifesaving_neuro_cardiac_and_tissue_phase_engine import (
    CLINICAL_RUO_SPORTS_WEIGHT,
    WAVE35_GSI_RLVR_TRAJECTORIES,
    evaluate_gsi_cte_subconcussive_waveguide,
    evaluate_gsi_koopman_cardiac_and_wbgt_autonomic_safety,
    evaluate_gsi_longitudinal_injury_and_tissue_mechanics,
    evaluate_wave35_gsi_safety_and_skill_channels,
)

__all__ = [
    "CLINICAL_RUO_SPORTS_WEIGHT",
    "WAVE35_GSI_RLVR_TRAJECTORIES",
    "BiomarkerStructuralProfile",
    "ClinicalTrialPortfolioSummary",
    "CongenericSarSummary",
    "MultiOmicsTargetAnnotation",
    "PairedModelProgressionReport",
    "Wave16TranslationalBundle",
    "evaluate_gsi_cte_subconcussive_waveguide",
    "evaluate_gsi_koopman_cardiac_and_wbgt_autonomic_safety",
    "evaluate_gsi_longitudinal_injury_and_tissue_mechanics",
    "evaluate_paired_projection_progression",
    "evaluate_wave35_gsi_safety_and_skill_channels",
    "load_and_verify_wave16_telemetry",
    "validate_and_serialize_wave16_bundle",
]
