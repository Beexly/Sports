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
from gse_engine.science.wave36_gsi_icu_hemodynamic_hypoxia_and_shoulder_kinetic_engine import (
    CLINICAL_RUO_ICU_SPORTS_WEIGHT,
    WAVE36_GSI_RLVR_TRAJECTORIES,
    evaluate_gsi_glenohumeral_throwing_mechanics,
    evaluate_gsi_mimic_iv_icu_critical_care_early_warning,
    evaluate_wave36_gsi_icu_and_throwing_suite,
)
from gse_engine.science.wave37_gsi_sofa_sepsis_organ_network_and_mtu_collagen_engine import (
    CLINICAL_RUO_SOFA_SPORTS_WEIGHT,
    WAVE37_GSI_RLVR_TRAJECTORIES,
    evaluate_gsi_mimic_iv_6organ_sofa_and_mortality_network,
    evaluate_gsi_mtu_collagen_surface_rest_mechanics,
    evaluate_wave37_gsi_sofa_and_mtu_suite,
)
from gse_engine.science.wave38_gsi_gtex_transcriptomics_and_schrodinger_bridge_engine import (
    CLINICAL_RUO_GTEX_SPORTS_WEIGHT,
    WAVE38_GSI_RLVR_TRAJECTORIES,
    evaluate_gsi_gtex_v10_tissue_transcriptomic_partition,
    evaluate_gsi_schrodinger_bridge_cellular_recovery,
    evaluate_wave38_gsi_gtex_and_schrodinger_suite,
)
from gse_engine.science.wave39_gsi_hpa_proteomics_mrna_concordance_and_chronic_sofa_engine import (
    CLINICAL_RUO_HPA_SPORTS_WEIGHT,
    WAVE39_GSI_RLVR_TRAJECTORIES,
    evaluate_gsi_hpa_proteomics_and_gtex_concordance,
    evaluate_gsi_mimic_iv_chronic_elixhauser_sofa_mortality,
    evaluate_wave39_gsi_hpa_and_chronic_sofa_suite,
)
from gse_engine.science.wave41_gsi_reactome_pathway_uniprot_stokes_einstein_and_icu_los_engine import (  # noqa: E501
    CLINICAL_RUO_REACTOME_UNIPROT_SPORTS_WEIGHT,
    WAVE41_GSI_RLVR_TRAJECTORIES,
    evaluate_gsi_mimic_iv_prolonged_icu_los_and_triage,
    evaluate_gsi_reactome_pathways_and_uniprot_stokes_einstein,
    evaluate_wave41_gsi_reactome_uniprot_and_icu_los_suite,
)
from gse_engine.science.wave42_gsi_alphafold_interpro_proteolysis_and_icu_trajectory_engine import (  # noqa: E501
    CLINICAL_RUO_ALPHAFOLD_INTERPRO_SPORTS_WEIGHT,
    WAVE42_GSI_RLVR_TRAJECTORIES,
    evaluate_gsi_alphafold_disorder_interpro_and_proteolysis,
    evaluate_gsi_mimic_iv_dynamic_trajectory_sofa_mortality,
    evaluate_wave42_gsi_alphafold_interpro_and_trajectory_suite,
)

__all__ = [
    "CLINICAL_RUO_ALPHAFOLD_INTERPRO_SPORTS_WEIGHT",
    "CLINICAL_RUO_GTEX_SPORTS_WEIGHT",
    "CLINICAL_RUO_HPA_SPORTS_WEIGHT",
    "CLINICAL_RUO_ICU_SPORTS_WEIGHT",
    "CLINICAL_RUO_REACTOME_UNIPROT_SPORTS_WEIGHT",
    "CLINICAL_RUO_SOFA_SPORTS_WEIGHT",
    "CLINICAL_RUO_SPORTS_WEIGHT",
    "WAVE35_GSI_RLVR_TRAJECTORIES",
    "WAVE36_GSI_RLVR_TRAJECTORIES",
    "WAVE37_GSI_RLVR_TRAJECTORIES",
    "WAVE38_GSI_RLVR_TRAJECTORIES",
    "WAVE39_GSI_RLVR_TRAJECTORIES",
    "WAVE41_GSI_RLVR_TRAJECTORIES",
    "WAVE42_GSI_RLVR_TRAJECTORIES",
    "BiomarkerStructuralProfile",
    "ClinicalTrialPortfolioSummary",
    "CongenericSarSummary",
    "MultiOmicsTargetAnnotation",
    "PairedModelProgressionReport",
    "Wave16TranslationalBundle",
    "evaluate_gsi_alphafold_disorder_interpro_and_proteolysis",
    "evaluate_gsi_cte_subconcussive_waveguide",
    "evaluate_gsi_glenohumeral_throwing_mechanics",
    "evaluate_gsi_gtex_v10_tissue_transcriptomic_partition",
    "evaluate_gsi_hpa_proteomics_and_gtex_concordance",
    "evaluate_gsi_koopman_cardiac_and_wbgt_autonomic_safety",
    "evaluate_gsi_longitudinal_injury_and_tissue_mechanics",
    "evaluate_gsi_mimic_iv_6organ_sofa_and_mortality_network",
    "evaluate_gsi_mimic_iv_chronic_elixhauser_sofa_mortality",
    "evaluate_gsi_mimic_iv_dynamic_trajectory_sofa_mortality",
    "evaluate_gsi_mimic_iv_icu_critical_care_early_warning",
    "evaluate_gsi_mimic_iv_prolonged_icu_los_and_triage",
    "evaluate_gsi_mtu_collagen_surface_rest_mechanics",
    "evaluate_gsi_reactome_pathways_and_uniprot_stokes_einstein",
    "evaluate_gsi_schrodinger_bridge_cellular_recovery",
    "evaluate_paired_projection_progression",
    "evaluate_wave35_gsi_safety_and_skill_channels",
    "evaluate_wave36_gsi_icu_and_throwing_suite",
    "evaluate_wave37_gsi_sofa_and_mtu_suite",
    "evaluate_wave38_gsi_gtex_and_schrodinger_suite",
    "evaluate_wave39_gsi_hpa_and_chronic_sofa_suite",
    "evaluate_wave41_gsi_reactome_uniprot_and_icu_los_suite",
    "evaluate_wave42_gsi_alphafold_interpro_and_trajectory_suite",
    "load_and_verify_wave16_telemetry",
    "validate_and_serialize_wave16_bundle",
]
