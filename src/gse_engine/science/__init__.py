"""GSI translational sports-medicine, cheminformatics, and statistical validation bridge."""

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

__all__ = [
    "BiomarkerStructuralProfile",
    "ClinicalTrialPortfolioSummary",
    "CongenericSarSummary",
    "MultiOmicsTargetAnnotation",
    "PairedModelProgressionReport",
    "Wave16TranslationalBundle",
    "evaluate_paired_projection_progression",
    "load_and_verify_wave16_telemetry",
    "validate_and_serialize_wave16_bundle",
]
