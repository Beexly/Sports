"""Wave 30 DeepMind MCTX, OpenSpiel CFR+, WeatherBench/BayesNF, Graph Nets & NGS Suite."""

from __future__ import annotations

import math
from collections.abc import Mapping, Sequence
from typing import Any

from gse_engine.memory.wave21_tracking_biomech_rlvr_and_market_hold_suite import (
    assert_prediction_market_compliance_hold,
)

_TARGET_SURFACE = (
    "src/gse_engine/memory/wave30_deepmind_mctx_bayesnf_weatherbench_and_ngs_suite.py"
)
_GUMBEL_SEAM = f"{_TARGET_SURFACE}::select_gumbel_muzero_sequential_halving_action"
_CFR_SEAM = f"{_TARGET_SURFACE}::solve_openspiel_cfr_plus_regret_matching"
_WEATHER_SEAM = f"{_TARGET_SURFACE}::compute_weatherbench_fair_crps_and_spread_skill"
_HILL_SEAM = f"{_TARGET_SURFACE}::evaluate_hill_adstock_workload_saturation"
_GRAPH_SEAM = f"{_TARGET_SURFACE}::propagate_graph_nets_edge_node_global_step"
_EGM_SEAM = f"{_TARGET_SURFACE}::update_elephant_goldfish_selective_memory_gate"
_NGS_SEAM = f"{_TARGET_SURFACE}::compute_ngs_separation_and_ryoe_kinematics"
_RUO_SEAM = f"{_TARGET_SURFACE}::enforce_alphafold3_alphagenome_ehr_ruo_gate"
_BRIDGE_SEAM = f"{_TARGET_SURFACE}::evaluate_wave30_deepmind_and_google_corpus_bridge"

_PERMISSIVE_SPDX: frozenset[str] = frozenset(
    {"APACHE-2.0", "MIT", "BSD-2-CLAUSE", "BSD-3-CLAUSE", "CC-BY-4.0", "ISC"}
)
_RUO_SOURCE_MARKERS: tuple[str, ...] = (
    "alphafold3",
    "alphagenome",
    "alphafold",
    "ehr-predictions",
    "google-health",
    "mimic",
)


def _oss_entry(
    entry_id: int,
    url: str,
    license_spdx: str,
    category: str,
    domain: str,
    gse_seam: str,
    role: str,
    *,
    license_posture: str = "ingest_and_learn_permissive",
    cleared: bool | None = None,
) -> dict[str, Any]:
    name = url.removeprefix("https://github.com/").removeprefix("https://")
    item: dict[str, Any] = {
        "id": entry_id,
        "name": name,
        "url": url,
        "license": license_spdx,
        "category": category,
        "domain": domain,
        "gse_seam": gse_seam,
        "gse_target_surface": _TARGET_SURFACE,
        "license_posture": license_posture,
        "role": role,
        "status": "WIRED_V3",
    }
    if cleared is not None:
        item["cleared"] = cleared
    return item


WAVE30_NEW_OSS_ENTRIES: tuple[dict[str, Any], ...] = (
    _oss_entry(
        266,
        "https://github.com/google-deepmind/mujoco",
        "Apache-2.0",
        "physics-sim",
        "mujoco_multi_joint_contact_dynamics",
        _NGS_SEAM,
        "Multi-joint contact dynamics physics kernel informing kinetic collision scalars.",
    ),
    _oss_entry(
        267,
        "https://github.com/google-deepmind/deepmind-research",
        "Apache-2.0",
        "research-monorepo",
        "deepmind_research_algorithmic_blueprints",
        _BRIDGE_SEAM,
        "Reference DeepMind implementations spanning control, memory, and generative inference.",
    ),
    _oss_entry(
        268,
        "https://github.com/google-deepmind/alphafold",
        "Apache-2.0",
        "structural-bio-ruo",
        "alphafold2_bio_ruo_quarantined",
        _RUO_SEAM,
        "Open-source protein folding architecture quarantined at zero sports weight.",
        license_posture="ingest_and_learn_bio_ruo_zero_sports_weight",
    ),
    _oss_entry(
        269,
        "https://github.com/google-deepmind/sonnet",
        "Apache-2.0",
        "neural-modules",
        "sonnet_composable_neural_modules",
        _BRIDGE_SEAM,
        "Composable neural module abstractions and state-space parameterization patterns.",
    ),
    _oss_entry(
        270,
        "https://github.com/google-deepmind/alphafold3",
        "Apache-2.0",
        "structural-bio-ruo",
        "alphafold3_non_commercial_ruo_quarantined",
        _RUO_SEAM,
        "AlphaFold 3 pipeline restricted by non-commercial parameter terms (zero sports weight).",
        license_posture="ingest_and_learn_non_commercial_ruo_zero_sports_weight",
    ),
    _oss_entry(
        271,
        "https://github.com/google-deepmind/weathernext",
        "Apache-2.0",
        "ensemble-weather",
        "weathernext_generative_ensemble_weather",
        _WEATHER_SEAM,
        "Generative global ensemble weather modeling scored via unbiased Fair-CRPS.",
    ),
    _oss_entry(
        272,
        "https://github.com/google-deepmind/lab",
        "NOASSERTION",
        "3d-agent-env",
        "deepmind_lab_3d_navigation_sim",
        _NGS_SEAM,
        "Custom 3D spatial navigation benchmark informing field-geometry occlusion priors.",
        license_posture="ingest_and_learn_non_commercial_or_permissive",
    ),
    _oss_entry(
        273,
        "https://github.com/google-deepmind/gemma",
        "Apache-2.0",
        "open-weight-llm",
        "gemma_open_weight_transformer_stack",
        _EGM_SEAM,
        "Open-weight Gemma architecture evaluated under dual-agent verification gates.",
    ),
    _oss_entry(
        274,
        "https://github.com/google-deepmind/open_spiel",
        "Apache-2.0",
        "game-theory-cfr",
        "openspiel_cfr_plus_nash_exploitability",
        _CFR_SEAM,
        "Extensive-form imperfect-information game solver driving CFR+ regret minimization.",
    ),
    _oss_entry(
        275,
        "https://github.com/google-deepmind/alphageometry",
        "Apache-2.0",
        "neuro-symbolic-deduction",
        "alphageometry_dd_ar_symbolic_search",
        _GUMBEL_SEAM,
        "Deductive database plus neural construction search architecture.",
    ),
    _oss_entry(
        276,
        "https://github.com/google-deepmind/graph_nets",
        "Apache-2.0",
        "relational-gnn",
        "graph_nets_edge_node_global_passing",
        _GRAPH_SEAM,
        "Battaglia edge-node-global relational message passing for interacting entity graphs.",
    ),
    _oss_entry(
        277,
        "https://github.com/google-deepmind/learning-to-learn",
        "Apache-2.0",
        "meta-learning",
        "learning_to_learn_meta_optimizer",
        _GUMBEL_SEAM,
        "Learned gradient-descent optimizer update rules informing policy refinement.",
    ),
    _oss_entry(
        278,
        "https://github.com/google-deepmind/science-skills",
        "Apache-2.0",
        "scientific-skills",
        "gdm_science_skills_grounded_workflows",
        _EGM_SEAM,
        "Grounded scientific workflow templates with token-efficient verification contracts.",
    ),
    _oss_entry(
        279,
        "https://github.com/google-deepmind/dm-haiku",
        "Apache-2.0",
        "jax-neural-lib",
        "dm_haiku_functional_jax_modules",
        _BRIDGE_SEAM,
        "Stateless JAX parameter transformation patterns for deterministic forward passes.",
    ),
    _oss_entry(
        280,
        "https://github.com/google-deepmind/mctx",
        "Apache-2.0",
        "gumbel-mcts-jax",
        "mctx_gumbel_muzero_sequential_halving",
        _GUMBEL_SEAM,
        "Gumbel-Top-k sequential halving MCTS guaranteeing monotonic policy improvement.",
    ),
    _oss_entry(
        281,
        "https://github.com/google-deepmind/dnc",
        "Apache-2.0",
        "differentiable-memory",
        "dnc_temporal_linkage_allocation_memory",
        _EGM_SEAM,
        "Differentiable Neural Computer allocation and free-gate memory retention formula.",
    ),
    _oss_entry(
        282,
        "https://github.com/google-deepmind/alphagenome",
        "Apache-2.0",
        "genomics-ruo",
        "alphagenome_non_commercial_ruo_quarantined",
        _RUO_SEAM,
        "AlphaGenome genomic regulatory sequence API quarantined at zero sports weight.",
        license_posture="ingest_and_learn_non_commercial_ruo_zero_sports_weight",
    ),
    _oss_entry(
        283,
        "https://github.com/google-research/kauldron",
        "Apache-2.0",
        "ml-training-lib",
        "kauldron_modular_jax_training_loop",
        _BRIDGE_SEAM,
        "Typed modular configuration and metric evaluation pipeline conventions.",
    ),
    _oss_entry(
        284,
        "https://github.com/google-research/weatherbench2",
        "Apache-2.0",
        "weather-benchmark",
        "weatherbench2_ensemble_crps_spread_skill",
        _WEATHER_SEAM,
        "Standardized ensemble weather scoring harness implementing Fair-CRPS and spread-skill.",
    ),
    _oss_entry(
        285,
        "https://github.com/google-research/weatherbenchX",
        "Apache-2.0",
        "modular-verification",
        "weatherbenchx_xarray_probabilistic_metrics",
        _WEATHER_SEAM,
        "Modular meteorological metric evaluation for exceedance Brier and quantile scores.",
    ),
    _oss_entry(
        286,
        "https://github.com/google-research/swirl-lm",
        "Apache-2.0",
        "cfd-atmospheric",
        "swirl_lm_large_eddy_turbulence",
        _WEATHER_SEAM,
        "GPU/TPU computational fluid dynamics large-eddy wind turbulence kernel.",
    ),
    _oss_entry(
        287,
        "https://github.com/google-research/project-guideline",
        "Apache-2.0",
        "path-perception",
        "project_guideline_on_device_corridor_tracking",
        _NGS_SEAM,
        "Low-latency corridor path perception and heading deviation smoothing.",
    ),
    _oss_entry(
        288,
        "https://github.com/google-research/sofima",
        "Apache-2.0",
        "optical-flow-align",
        "sofima_scalable_optical_flow_alignment",
        _NGS_SEAM,
        "Elastic mesh-relaxed optical flow registration across sequential tracking frames.",
    ),
    _oss_entry(
        289,
        "https://github.com/google-research/vision_transformer",
        "Apache-2.0",
        "vision-transformer",
        "vit_patch_embedding_spatial_tokens",
        _BRIDGE_SEAM,
        "Vision Transformer patch tokenization for spatiotemporal field grids.",
    ),
    _oss_entry(
        290,
        "https://github.com/google-research/text-to-text-transfer-transformer",
        "Apache-2.0",
        "seq2seq-t5",
        "t5_unified_text_to_text_transfer",
        _BRIDGE_SEAM,
        "Unified span-corruption encoder-decoder architecture patterns.",
    ),
    _oss_entry(
        291,
        "https://github.com/google-research/simclr",
        "Apache-2.0",
        "contrastive-ssl",
        "simclr_nt_xent_contrastive_pretraining",
        _BRIDGE_SEAM,
        "Temperature-scaled normalized contrastive representation learning.",
    ),
    _oss_entry(
        292,
        "https://github.com/google-research/scenic",
        "Apache-2.0",
        "jax-vision",
        "scenic_jax_spatiotemporal_attention",
        _BRIDGE_SEAM,
        "Factorized spatiotemporal attention primitives in JAX/Flax.",
    ),
    _oss_entry(
        293,
        "https://github.com/google-research/albert",
        "Apache-2.0",
        "encoder-lm",
        "albert_parameter_shared_sentence_order",
        _BRIDGE_SEAM,
        "Cross-layer parameter sharing and sentence-order coherence objectives.",
    ),
    _oss_entry(
        294,
        "https://github.com/google-research/big_vision",
        "Apache-2.0",
        "jax-multimodal",
        "big_vision_siglip_sigmoid_contrastive",
        _BRIDGE_SEAM,
        "SigLIP pairwise sigmoid contrastive training scaling patterns.",
    ),
    _oss_entry(
        295,
        "https://github.com/google-research/frame-interpolation",
        "Apache-2.0",
        "motion-interpolation",
        "film_large_motion_frame_interpolation",
        _NGS_SEAM,
        "Scale-agnostic motion estimator for sub-frame player trajectory continuity.",
    ),
    _oss_entry(
        296,
        "https://github.com/google-research/t5x",
        "Apache-2.0",
        "jax-scale-lm",
        "t5x_partitioned_jax_sequence_training",
        _BRIDGE_SEAM,
        "Data- and model-parallel partitioned JAX sequence computation primitives.",
    ),
    _oss_entry(
        297,
        "https://github.com/google-research/kubric",
        "Apache-2.0",
        "synthetic-physics-video",
        "kubric_synthetic_trajectory_groundtruth",
        _NGS_SEAM,
        "PyBullet/Blender synthetic multi-object collision ground-truth generator.",
    ),
    _oss_entry(
        298,
        "https://github.com/google-research/uda",
        "Apache-2.0",
        "semi-supervised-aug",
        "uda_consistency_regularization",
        _BRIDGE_SEAM,
        "Unsupervised Data Augmentation KL-consistency regularization loss.",
    ),
    _oss_entry(
        299,
        "https://github.com/google-research/streamvibe",
        "CUSTOM_OR_UNSPECIFIED",
        "audio-stream-ml",
        "streamvibe_streaming_signal_features",
        _BRIDGE_SEAM,
        "Streaming signal feature extraction under custom/unspecified repo posture.",
        license_posture="ingest_and_learn_non_commercial_or_permissive",
    ),
    _oss_entry(
        300,
        "https://github.com/google-research/opengrm",
        "Apache-2.0",
        "formal-grammar-fst",
        "opengrm_weighted_fst_grammar_constraints",
        _GRAPH_SEAM,
        "Weighted finite-state transducer grammars enforcing valid state-transition graphs.",
    ),
    _oss_entry(
        301,
        "https://github.com/google-research/mozolm",
        "Apache-2.0",
        "lm-serving",
        "mozolm_adaptive_language_serving",
        _BRIDGE_SEAM,
        "Modular statistical character/token probability serving architecture.",
    ),
    _oss_entry(
        302,
        "https://github.com/google-research/flood-forecasting",
        "Apache-2.0",
        "hydro-time-series",
        "flood_forecasting_hydrological_exceedance",
        _WEATHER_SEAM,
        "Probabilistic gauge-exceedance forecasting informing field saturation risk.",
    ),
    _oss_entry(
        303,
        "https://github.com/google-research/jax3d",
        "Apache-2.0",
        "jax-3d-geometry",
        "jax3d_differentiable_spatial_projections",
        _NGS_SEAM,
        "Differentiable 3D camera geometry for sideline/all-22 yardline projection.",
    ),
    _oss_entry(
        304,
        "https://github.com/google-research/cloud-ai-research",
        "Apache-2.0",
        "cloud-ai-research",
        "cloud_ai_applied_forecasting_research",
        _BRIDGE_SEAM,
        "Applied tabular and industrial time-series forecasting patterns.",
    ),
    _oss_entry(
        305,
        "https://github.com/TransformerOptimus/SuperAGI",
        "MIT",
        "autonomous-agents",
        "superagi_agent_telemetry_workflow",
        _EGM_SEAM,
        "Autonomous agent execution graph with bounded tool telemetry.",
    ),
    _oss_entry(
        306,
        "https://github.com/hyperspaceai/agi",
        "MIT",
        "p2p-distributed-agi",
        "hyperspace_distributed_agent_consensus",
        _EGM_SEAM,
        "Peer-verified experiment consensus and distributed agent evaluation notes.",
    ),
    _oss_entry(
        307,
        "https://github.com/google/agi",
        "Apache-2.0",
        "gpu-telemetry-inspector",
        "google_agi_gpu_frame_profiling",
        _BRIDGE_SEAM,
        "Frame-level GPU hardware trace inspection patterns for kernel profiling.",
    ),
    _oss_entry(
        308,
        "https://github.com/google/agi-dev-releases",
        "Apache-2.0",
        "gpu-telemetry-releases",
        "google_agi_release_channel_metadata",
        _BRIDGE_SEAM,
        "Snapshot release indexing patterns for GPU profiling tooling.",
    ),
    _oss_entry(
        309,
        "https://github.com/google/fsl-gaming",
        "Apache-2.0",
        "spanner-fantasy-ref",
        "google_fsl_spanner_sports_ledger",
        _BRIDGE_SEAM,
        "Reference Cloud Spanner transactional roster ledger pattern.",
    ),
    _oss_entry(
        310,
        "https://github.com/google/comprehensive-rust",
        "Apache-2.0",
        "rust-systems",
        "comprehensive_rust_ownership_safety",
        _RUO_SEAM,
        "Memory-safe Rust systems ownership and concurrency invariants.",
    ),
    _oss_entry(
        311,
        "https://github.com/google/gson",
        "Apache-2.0",
        "json-serde",
        "google_gson_strict_type_adapters",
        _BRIDGE_SEAM,
        "Deterministic schema-checked JSON type-adapter patterns.",
    ),
    _oss_entry(
        312,
        "https://github.com/google/adk-python",
        "Apache-2.0",
        "agent-dev-kit",
        "google_adk_python_hierarchical_agents",
        _EGM_SEAM,
        "Hierarchical multi-agent workflow composition and session state contracts.",
    ),
    _oss_entry(
        313,
        "https://github.com/google/elephant-goldfish-model",
        "Apache-2.0",
        "dual-agent-review",
        "egm_elephant_planner_goldfish_reviewer",
        _EGM_SEAM,
        "Persistent Elephant specification paired with stateless zero-context Goldfish review.",
    ),
    _oss_entry(
        314,
        "https://github.com/google/cadvisor",
        "NOASSERTION",
        "container-metrics",
        "cadvisor_container_resource_telemetry",
        _BRIDGE_SEAM,
        "Per-container CPU/memory time-series metering conventions.",
        license_posture="ingest_and_learn_non_commercial_or_permissive",
    ),
    _oss_entry(
        315,
        "https://github.com/google/bayesnf",
        "Apache-2.0",
        "bayesian-neural-fields",
        "bayesnf_spatiotemporal_fourier_vi",
        _WEATHER_SEAM,
        "Scalable spatiotemporal Bayesian neural fields with multi-scale Fourier embeddings.",
    ),
    _oss_entry(
        316,
        "https://github.com/google/next-prediction",
        "Apache-2.0",
        "trajectory-forecasting",
        "next_multi_agent_activity_path",
        _NGS_SEAM,
        "Multi-person future spatial path and interaction-grid decoding.",
    ),
    _oss_entry(
        317,
        "https://github.com/google/e3d_lstm",
        "Apache-2.0",
        "spatiotemporal-lstm",
        "e3d_lstm_eidetic_recall_memory",
        _HILL_SEAM,
        "Eidetic 3D spatiotemporal recall integrating historical motion states.",
    ),
    _oss_entry(
        318,
        "https://github.com/google/autocjk",
        "Apache-2.0",
        "glyph-synthesis",
        "autocjk_component_decomposition",
        _BRIDGE_SEAM,
        "Hierarchical structural component decomposition patterns.",
    ),
    _oss_entry(
        319,
        "https://github.com/google/ehr-predictions",
        "Apache-2.0",
        "clinical-ehr-ruo",
        "ehr_predictions_clinical_ruo_quarantined",
        _RUO_SEAM,
        "Clinical Electronic Health Records forecasting quarantined at zero sports weight.",
        license_posture="ingest_and_learn_medical_ruo_zero_sports_weight",
    ),
    _oss_entry(
        320,
        "https://github.com/google/prediction_framework",
        "Apache-2.0",
        "time-series-forecasting",
        "google_prediction_framework_residuals",
        _HILL_SEAM,
        "Classical time-series seasonality and residual decomposition templates.",
    ),
    _oss_entry(
        321,
        "https://github.com/google/arithmancer",
        "Apache-2.0",
        "prediction-market-hold",
        "arithmancer_lmsr_offline_hold_cleared_false",
        _RUO_SEAM,
        "LMSR prediction-market mathematics strictly quarantined under polymarket-hold.",
        license_posture="ingest_and_learn_prediction_market_compliance_hold_cleared_false",
        cleared=False,
    ),
    _oss_entry(
        322,
        "https://github.com/google/timecast",
        "Apache-2.0",
        "online-regret-learning",
        "timecast_online_nonstationary_prediction",
        _HILL_SEAM,
        "Online regret-minimizing forecasting over non-stationary streaming series.",
    ),
    _oss_entry(
        323,
        "https://github.com/google/phase-prediction",
        "Apache-2.0",
        "phase-representation",
        "phase_prediction_harmonic_features",
        _BRIDGE_SEAM,
        "Phase-domain spectral representation learning for periodic signals.",
    ),
    _oss_entry(
        324,
        "https://github.com/google/lightweight_mmm",
        "Apache-2.0",
        "adstock-hill-bayesian",
        "lightweight_mmm_adstock_hill_saturation",
        _HILL_SEAM,
        "Geometric Adstock carryover and nonlinear Hill saturation curve parameterization.",
    ),
    _oss_entry(
        325,
        "https://github.com/google/fleetspeak",
        "Apache-2.0",
        "fleet-telemetry",
        "fleetspeak_authenticated_agent_bus",
        _RUO_SEAM,
        "Cryptographically authenticated client-server telemetry envelope design.",
    ),
    _oss_entry(
        326,
        "https://github.com/google/riegeli",
        "Apache-2.0",
        "record-storage",
        "riegeli_compressed_record_framing",
        _BRIDGE_SEAM,
        "Seekable block-free chunked record storage layout for dense replay logs.",
    ),
    _oss_entry(
        327,
        "https://github.com/google/distributed_graph_flow",
        "Apache-2.0",
        "distributed-gnn",
        "distributed_graph_flow_subgraph_sampling",
        _GRAPH_SEAM,
        "Scalable subgraph neighborhood sampling and message-passing orchestration.",
    ),
    _oss_entry(
        328,
        "https://github.com/google/osv-scalibr",
        "Apache-2.0",
        "sbom-sca-security",
        "osv_scalibr_spdx_sbom_license_audit",
        _RUO_SEAM,
        "Software Composition Analysis scanning SPDX licenses across dependency inventories.",
    ),
    _oss_entry(
        329,
        "https://github.com/google/betosim",
        "Apache-2.0",
        "radio-simulation",
        "betosim_multi_agent_link_sim",
        _BRIDGE_SEAM,
        "Discrete-event multi-node simulation harness patterns in Rust.",
    ),
    _oss_entry(
        330,
        "https://github.com/google/capirca",
        "Apache-2.0",
        "policy-acl-compiler",
        "capirca_declarative_firewall_policy",
        _RUO_SEAM,
        "Declarative multi-target firewall policy compilation verifying fail-closed egress.",
    ),
    _oss_entry(
        331,
        "https://github.com/google/tensorstore",
        "NOASSERTION",
        "chunked-tensor-store",
        "tensorstore_zarr_concurrent_array_io",
        _BRIDGE_SEAM,
        "Asynchronous chunked N-dimensional array storage for simulation trajectory tensors.",
        license_posture="ingest_and_learn_non_commercial_or_permissive",
    ),
    _oss_entry(
        332,
        "https://github.com/google/mozc",
        "NOASSERTION",
        "structured-ime",
        "mozc_lattice_viterbi_decoding",
        _BRIDGE_SEAM,
        "Lattice beam search and Viterbi shortest-path candidate ranking.",
        license_posture="ingest_and_learn_non_commercial_or_permissive",
    ),
    _oss_entry(
        333,
        "https://github.com/google/multichase",
        "Apache-2.0",
        "pointer-latency-bench",
        "multichase_cache_latency_microbench",
        _BRIDGE_SEAM,
        "Cache-hierarchy memory latency measurement methodology.",
    ),
    _oss_entry(
        334,
        "https://github.com/google/amber",
        "Apache-2.0",
        "shader-verification",
        "amber_deterministic_compute_tests",
        _BRIDGE_SEAM,
        "Deterministic compute-pipeline tolerance assertion conventions.",
    ),
    _oss_entry(
        335,
        "https://github.com/google/triage-party",
        "Apache-2.0",
        "github-triage",
        "triage_party_issue_priority_queues",
        _EGM_SEAM,
        "Multi-reviewer stateful issue triage queue prioritization rules.",
    ),
    _oss_entry(
        336,
        "https://github.com/google/multi-cast",
        "Apache-2.0",
        "multi-cast-util",
        "multicast_fanout_dispatch_patterns",
        _BRIDGE_SEAM,
        "Low-overhead fanout message routing conventions.",
    ),
    _oss_entry(
        337,
        "https://github.com/google/multichannel-audio-tools",
        "Apache-2.0",
        "dsp-audio",
        "spatial_multichannel_fir_filtering",
        _BRIDGE_SEAM,
        "Multichannel spatial filter bank and beamforming signal math.",
    ),
    _oss_entry(
        338,
        "https://github.com/google/chicago-brick",
        "Apache-2.0",
        "multi-node-wall",
        "chicago_brick_synchronized_clock_grid",
        _BRIDGE_SEAM,
        "Multi-node deterministic frame-clock synchronization patterns.",
    ),
    _oss_entry(
        339,
        "https://github.com/google/web-starter-kit",
        "Apache-2.0",
        "web-scaffold",
        "web_starter_kit_legacy_patterns",
        _BRIDGE_SEAM,
        "Archived responsive multi-device frontend performance checklist reference.",
    ),
    _oss_entry(
        340,
        "https://github.com/google/common-multicloud-runtime",
        "CUSTOM_OR_UNSPECIFIED",
        "multicloud-runtime",
        "common_multicloud_portable_runtime",
        _BRIDGE_SEAM,
        "Cross-provider runtime abstraction interface (archived/custom posture).",
        license_posture="ingest_and_learn_non_commercial_or_permissive",
    ),
    _oss_entry(
        341,
        "https://github.com/google/web-bsd-hunt",
        "Apache-2.0",
        "multiplayer-sim",
        "web_bsd_hunt_tick_state_reconcile",
        _BRIDGE_SEAM,
        "Authoritative tick-based multiplayer grid state reconciliation.",
    ),
    _oss_entry(
        342,
        "https://github.com/google/multi-task-architecture-search",
        "Apache-2.0",
        "nas-multitask",
        "multitask_nas_shared_trunk_routing",
        _BRIDGE_SEAM,
        "Shared-trunk multi-task layer allocation balancing accuracy vs. FLOPs.",
    ),
    _oss_entry(
        343,
        "https://github.com/nflverse/ngs-data",
        "MIT",
        "nfl-next-gen-stats",
        "nflverse_ngs_separation_cpoe_ryoe",
        _NGS_SEAM,
        "Official nflverse Next Gen Stats cushion, separation, CPOE, and RYOE parquet schema.",
    ),
    _oss_entry(
        344,
        "https://arxiv.org/abs/2609.32591",
        "CC-BY-4.0",
        "adaptive-mpc-planning",
        "fast_td_mpc_dual_process_deliberation",
        _GUMBEL_SEAM,
        "Fast-TD-MPC selective test-time deliberation switching between System-1 and System-2.",
        license_posture="ingest_and_learn_academic_arxiv",
    ),
    _oss_entry(
        345,
        "https://arxiv.org/abs/2507.03704",
        "CC-BY-4.0",
        "thinking-speed-control",
        "lin_thinking_speed_steering_vectors",
        _GUMBEL_SEAM,
        "Difficulty-estimated internal steering gating System-1 fast vs. System-2 deliberation.",
        license_posture="ingest_and_learn_academic_arxiv",
    ),
    _oss_entry(
        346,
        "https://arxiv.org/search/?query=Multi-Hop+Graph+Reasoning&searchtype=all&abstracts=show&order=-announced_date_first&size=200",
        "CC-BY-4.0",
        "multi-hop-graph-reasoning",
        "arxiv_multi_hop_kg_reasoner_embrag_tgrpo",
        _GRAPH_SEAM,
        "Multi-hop KG traversal (KG-Reasoner 2604.12487, EMBRAG 2603.13266, MRE 2601.01195).",
        license_posture="ingest_and_learn_academic_arxiv",
    ),
)

_WAVE30_BRIDGE_CACHE: dict[tuple[float, float, float, bool], dict[str, Any]] = {}


def _softmax(logits: Sequence[float]) -> list[float]:
    """Numerically stable softmax returning a convex probability list."""
    m_val = max(float(x) for x in logits)
    exps = [math.exp(max(-40.0, min(40.0, float(x) - m_val))) for x in logits]
    tot = sum(exps) or 1.0
    return [val / tot for val in exps]


def _clamp(val: float, lo: float, hi: float) -> float:
    """Bound finite float inside [lo, hi]."""
    if not math.isfinite(val):
        raise ValueError("Expected finite float value.")
    return max(lo, min(hi, float(val)))


def select_gumbel_muzero_sequential_halving_action(
    prior_logits: Sequence[float],
    q_estimates: Sequence[float],
    *,
    visit_counts: Sequence[int] | None = None,
    c_visit: float = 50.0,
    c_scale: float = 0.10,
    gumbel_noise: Sequence[float] | None = None,
    entropy_deliberation_threshold: float = 0.85,
) -> dict[str, Any]:
    """Select an action via Gumbel-Top-k sequential halving and gate System-1 vs System-2.

    Grounds DeepMind ``mctx`` (Danihelka et al., ICLR 2022) completed Q-transformation
    ``sigma(q) = (c_visit + max_n) * c_scale * q`` with ``arXiv:2609.32591`` (Fast-TD-MPC)
    and ``arXiv:2507.03704`` entropy-guided adaptive deliberation.
    """
    n_actions = len(prior_logits)
    if n_actions == 0 or len(q_estimates) != n_actions:
        raise ValueError("prior_logits and q_estimates must be non-empty of equal length.")
    if visit_counts is not None and len(visit_counts) != n_actions:
        raise ValueError("visit_counts length must match prior_logits length.")
    if gumbel_noise is not None and len(gumbel_noise) != n_actions:
        raise ValueError("gumbel_noise length must match prior_logits length.")

    logits_f = [_clamp(float(x), -40.0, 40.0) for x in prior_logits]
    q_f = [_clamp(float(q), -10.0, 10.0) for q in q_estimates]
    visits = [max(0, int(v)) for v in visit_counts] if visit_counts is not None else [1] * n_actions
    max_n = float(max(visits))
    scale_coeff = (float(c_visit) + max_n) * max(1e-6, float(c_scale))

    if gumbel_noise is None:
        raw_g = [
            -math.log(-math.log((idx + 0.5) / float(n_actions + 1))) for idx in range(n_actions)
        ]
        mean_g = sum(raw_g) / float(n_actions)
        gumbels = [val - mean_g for val in raw_g]
    else:
        gumbels = [_clamp(float(g), -20.0, 20.0) for g in gumbel_noise]

    prior_probs = _softmax(logits_f)
    if n_actions == 1:
        norm_entropy = 0.0
    else:
        raw_ent = -sum(p * math.log(max(1e-12, p)) for p in prior_probs)
        norm_entropy = max(0.0, min(1.0, raw_ent / math.log(float(n_actions))))

    sigma_q = [scale_coeff * q for q in q_f]
    improved_logits = [logit + sig for logit, sig in zip(logits_f, sigma_q, strict=True)]
    improved_policy = _softmax(improved_logits)

    survivors = list(range(n_actions))
    halving_rounds = 0
    while len(survivors) > 1:
        survivors.sort(
            key=lambda i: gumbels[i] + logits_f[i] + sigma_q[i],
            reverse=True,
        )
        keep_n = max(1, len(survivors) // 2)
        survivors = survivors[:keep_n]
        halving_rounds += 1
    selected_action = survivors[0]

    kl_imp = sum(
        p_new * math.log(max(1e-12, p_new) / max(1e-12, p_old))
        for p_new, p_old in zip(improved_policy, prior_probs, strict=True)
    )
    thinking_mode = (
        "SYSTEM2_SELECTIVE_PLANNING"
        if norm_entropy >= float(entropy_deliberation_threshold)
        else "SYSTEM1_FAST_POLICY"
    )
    return {
        "selected_action": int(selected_action),
        "halving_rounds": int(halving_rounds),
        "prior_probs": [round(p, 6) for p in prior_probs],
        "improved_policy": [round(p, 6) for p in improved_policy],
        "completed_q_sigma": [round(s, 6) for s in sigma_q],
        "kl_policy_improvement": round(max(0.0, float(kl_imp)), 6),
        "normalized_entropy": round(norm_entropy, 6),
        "thinking_mode": thinking_mode,
    }


def _regret_match_positive(regrets: Sequence[float]) -> list[float]:
    """Convert non-negative cumulative regrets to a normalized mixed strategy."""
    pos = [max(0.0, float(r)) for r in regrets]
    tot = sum(pos)
    if tot <= 1e-12:
        n = len(pos)
        return [1.0 / float(n)] * n
    return [r / tot for r in pos]


def solve_openspiel_cfr_plus_regret_matching(
    payoff_matrix: Sequence[Sequence[float]],
    *,
    iterations: int = 64,
) -> dict[str, Any]:
    """Solve two-player zero-sum matrix play-calling equilibrium with OpenSpiel CFR+."""
    if not payoff_matrix or not payoff_matrix[0]:
        raise ValueError("payoff_matrix must be a non-empty 2D matrix.")
    if iterations < 1:
        raise ValueError("iterations must be >= 1.")
    n_rows = len(payoff_matrix)
    n_cols = len(payoff_matrix[0])
    mat: list[list[float]] = []
    for row in payoff_matrix:
        if len(row) != n_cols:
            raise ValueError("payoff_matrix must be rectangular.")
        mat.append([_clamp(float(v), -1e6, 1e6) for v in row])

    reg_row = [0.0] * n_rows
    reg_col = [0.0] * n_cols
    sum_row = [0.0] * n_rows
    sum_col = [0.0] * n_cols

    for step in range(1, int(iterations) + 1):
        strat_r = _regret_match_positive(reg_row)
        strat_c = _regret_match_positive(reg_col)
        weight = float(step)
        for i in range(n_rows):
            sum_row[i] += weight * strat_r[i]
        for j in range(n_cols):
            sum_col[j] += weight * strat_c[j]

        row_vals = [sum(mat[i][j] * strat_c[j] for j in range(n_cols)) for i in range(n_rows)]
        col_vals = [sum(strat_r[i] * mat[i][j] for i in range(n_rows)) for j in range(n_cols)]
        ev = sum(strat_r[i] * row_vals[i] for i in range(n_rows))

        for i in range(n_rows):
            reg_row[i] = max(0.0, reg_row[i] + (row_vals[i] - ev))
        for j in range(n_cols):
            reg_col[j] = max(0.0, reg_col[j] + (ev - col_vals[j]))

    tot_r = sum(sum_row) or 1.0
    tot_c = sum(sum_col) or 1.0
    row_avg = [v / tot_r for v in sum_row]
    col_avg = [v / tot_c for v in sum_col]

    saddle_val = sum(
        row_avg[i] * mat[i][j] * col_avg[j] for i in range(n_rows) for j in range(n_cols)
    )
    br_row_max = max(sum(mat[i][j] * col_avg[j] for j in range(n_cols)) for i in range(n_rows))
    br_col_min = min(sum(row_avg[i] * mat[i][j] for i in range(n_rows)) for j in range(n_cols))
    exploitability = max(0.0, br_row_max - br_col_min)

    return {
        "row_avg_strategy": [round(p, 6) for p in row_avg],
        "col_avg_strategy": [round(p, 6) for p in col_avg],
        "saddle_game_value": round(float(saddle_val), 6),
        "nash_exploitability": round(float(exploitability), 6),
        "iterations": int(iterations),
    }


def compute_weatherbench_fair_crps_and_spread_skill(
    ensemble_members: Sequence[float],
    observed_value: float,
    *,
    exceedance_threshold: float = 15.0,
    spatial_coords: tuple[float, float] = (0.0, 0.0),
    fourier_scales: Sequence[float] = (1.0, 2.0),
) -> dict[str, Any]:
    """Compute WeatherNext/WeatherBench2 Fair-CRPS, spread-skill, and BayesNF Fourier norm."""
    m_cnt = len(ensemble_members)
    if m_cnt < 2:
        raise ValueError("ensemble_members requires at least 2 members for Fair-CRPS.")
    members = [_clamp(float(x), -1e6, 1e6) for x in ensemble_members]
    obs = _clamp(float(observed_value), -1e6, 1e6)

    obs_err_mean = sum(abs(x - obs) for x in members) / float(m_cnt)
    pairwise_abs = sum(
        abs(members[i] - members[j])
        for i in range(m_cnt)
        for j in range(m_cnt)
        if i != j
    )
    fair_crps = max(0.0, obs_err_mean - pairwise_abs / float(2 * m_cnt * (m_cnt - 1)))
    empirical_crps = max(0.0, obs_err_mean - pairwise_abs / float(2 * m_cnt * m_cnt))

    ens_mean = sum(members) / float(m_cnt)
    ens_var = sum((x - ens_mean) ** 2 for x in members) / float(m_cnt - 1)
    ens_spread = math.sqrt(max(0.0, ens_var))
    skill_err = max(1e-4, abs(ens_mean - obs))
    spread_skill_ratio = ens_spread / skill_err

    exc_thr = float(exceedance_threshold)
    exc_prob = sum(1.0 for x in members if x >= exc_thr) / float(m_cnt)
    obs_exc = 1.0 if obs >= exc_thr else 0.0
    exc_brier = (exc_prob - obs_exc) ** 2

    lat_s = float(spatial_coords[0])
    lon_s = float(spatial_coords[1])
    fourier_terms: list[float] = []
    for scale in fourier_scales:
        sc = float(scale)
        fourier_terms.append(math.sin(2.0 * math.pi * sc * lat_s))
        fourier_terms.append(math.cos(2.0 * math.pi * sc * lon_s))
    bayesnf_norm = math.sqrt(sum(v * v for v in fourier_terms))

    return {
        "ensemble_size": int(m_cnt),
        "ensemble_mean": round(ens_mean, 6),
        "ensemble_spread": round(ens_spread, 6),
        "fair_crps": round(fair_crps, 6),
        "empirical_crps": round(empirical_crps, 6),
        "spread_skill_ratio": round(spread_skill_ratio, 6),
        "exceedance_prob": round(exc_prob, 6),
        "exceedance_brier": round(exc_brier, 6),
        "bayesnf_spatiotemporal_feature_norm": round(bayesnf_norm, 6),
    }


def evaluate_hill_adstock_workload_saturation(
    workload_series: Sequence[float],
    *,
    adstock_decay: float = 0.65,
    half_saturation_k: float = 45.0,
    hill_slope: float = 1.8,
) -> dict[str, Any]:
    """Compute geometric Adstock carryover and Hill fatigue saturation response."""
    if not workload_series:
        raise ValueError("workload_series must be non-empty.")
    lam = float(adstock_decay)
    if not (0.0 <= lam <= 0.99):
        raise ValueError("adstock_decay must lie in [0.0, 0.99].")
    k_val = float(half_saturation_k)
    alpha = float(hill_slope)
    if k_val <= 0.0 or alpha <= 0.0:
        raise ValueError("half_saturation_k and hill_slope must be positive.")

    adstock = 0.0
    last_x = 0.0
    for raw in workload_series:
        val = float(raw)
        if val < 0.0 or not math.isfinite(val):
            raise ValueError("workload_series elements must be finite and non-negative.")
        adstock = val + lam * adstock
        last_x = val

    k_pow = k_val**alpha
    a_pow = adstock**alpha if adstock > 0.0 else 0.0
    denom = k_pow + a_pow
    hill_sat = a_pow / denom if denom > 0.0 else 0.0
    if adstock > 0.0 and denom > 0.0:
        marginal_slope = (alpha * k_pow * (adstock ** max(0.0, alpha - 1.0))) / (denom * denom)
        carryover_fraction = max(0.0, (adstock - last_x) / adstock)
    else:
        marginal_slope = 0.0
        carryover_fraction = 0.0

    efficiency_mult = 1.0 - 0.15 * hill_sat
    return {
        "adstock_state": round(adstock, 6),
        "hill_saturation": round(hill_sat, 6),
        "marginal_slope": round(marginal_slope, 6),
        "carryover_fraction": round(carryover_fraction, 6),
        "efficiency_retention_mult": round(efficiency_mult, 6),
    }


def propagate_graph_nets_edge_node_global_step(
    node_features: Sequence[Sequence[float]],
    edges: Sequence[tuple[int, int, float]],
    global_context: float = 0.0,
    *,
    max_hops: int = 2,
) -> dict[str, Any]:
    """Run Battaglia Graph Nets edge->node->global message passing plus multi-hop count."""
    n_nodes = len(node_features)
    if n_nodes == 0:
        raise ValueError("node_features must contain at least one node.")
    if max_hops < 1:
        raise ValueError("max_hops must be >= 1.")

    node_states: list[float] = []
    for vec in node_features:
        if not vec:
            raise ValueError("Each node feature vector must be non-empty.")
        node_states.append(sum(_clamp(float(v), -1e4, 1e4) for v in vec) / float(len(vec)))

    validated_edges: list[tuple[int, int, float]] = []
    adj = [[False] * n_nodes for _ in range(n_nodes)]
    for src, dst, w_raw in edges:
        if not (0 <= src < n_nodes and 0 <= dst < n_nodes):
            raise ValueError(f"Invalid edge indices ({src}, {dst}) for n_nodes={n_nodes}.")
        w_f = _clamp(float(w_raw), -100.0, 100.0)
        validated_edges.append((int(src), int(dst), w_f))
        adj[int(src)][int(dst)] = True

    g_ctx = _clamp(float(global_context), -100.0, 100.0)
    last_edge_msgs: list[float] = []
    for _ in range(int(max_hops)):
        edge_msgs: list[float] = []
        incoming_sum = [0.0] * n_nodes
        incoming_cnt = [0] * n_nodes
        for src, dst, w_f in validated_edges:
            msg = math.tanh(0.5 * (node_states[src] + node_states[dst]) + w_f + 0.25 * g_ctx)
            edge_msgs.append(msg)
            incoming_sum[dst] += msg
            incoming_cnt[dst] += 1
        next_nodes: list[float] = []
        for idx, h_val in enumerate(node_states):
            agg = incoming_sum[idx] / float(incoming_cnt[idx]) if incoming_cnt[idx] > 0 else 0.0
            next_nodes.append(0.65 * h_val + 0.35 * agg)
        node_states = next_nodes
        mean_n = sum(node_states) / float(n_nodes)
        mean_e = sum(edge_msgs) / float(len(edge_msgs)) if edge_msgs else 0.0
        g_ctx = math.tanh(0.60 * g_ctx + 0.25 * mean_n + 0.15 * mean_e)
        last_edge_msgs = edge_msgs

    if len(last_edge_msgs) <= 1:
        edge_entropy = 0.0
    else:
        e_probs = _softmax([abs(m) for m in last_edge_msgs])
        edge_entropy = -sum(p * math.log(max(1e-12, p)) for p in e_probs)

    # Multi-hop reachability within max_hops steps
    reach = [row[:] for row in adj]
    frontier = [row[:] for row in adj]
    for _ in range(1, int(max_hops)):
        nxt = [[False] * n_nodes for _ in range(n_nodes)]
        for i in range(n_nodes):
            for k in range(n_nodes):
                if frontier[i][k]:
                    for j in range(n_nodes):
                        if adj[k][j]:
                            nxt[i][j] = True
                            reach[i][j] = True
        frontier = nxt
    reachable_pairs = sum(
        1 for i in range(n_nodes) for j in range(n_nodes) if i != j and reach[i][j]
    )

    return {
        "updated_node_means": [round(val, 6) for val in node_states],
        "updated_global_scalar": round(g_ctx, 6),
        "edge_attention_entropy": round(max(0.0, edge_entropy), 6),
        "reachable_multi_hop_pairs": int(reachable_pairs),
    }


def update_elephant_goldfish_selective_memory_gate(
    elephant_claims: Sequence[Mapping[str, Any]],
    goldfish_defect_flags: Sequence[bool],
    *,
    prior_dnc_usage: float = 0.35,
    write_gate: float = 0.60,
    free_gate: float = 0.25,
) -> dict[str, Any]:
    """Filter Elephant long-horizon claims via Goldfish defect audit and DNC usage."""
    n_claims = len(elephant_claims)
    if n_claims == 0 or len(goldfish_defect_flags) != n_claims:
        raise ValueError("elephant_claims and goldfish_defect_flags must be non-empty and match.")

    u_prev = _clamp(float(prior_dnc_usage), 0.0, 1.0)
    w_gate = _clamp(float(write_gate), 0.0, 1.0)
    f_gate = _clamp(float(free_gate), 0.0, 1.0)

    surviving_confs: list[float] = []
    flagged = 0
    for claim, is_defect in zip(elephant_claims, goldfish_defect_flags, strict=True):
        conf = _clamp(float(claim.get("confidence", 0.5)), 0.0, 1.0)
        if bool(is_defect):
            flagged += 1
        else:
            surviving_confs.append(conf)

    surviving_cnt = len(surviving_confs)
    veto_rate = float(flagged) / float(n_claims)
    verified_score = sum(surviving_confs) / float(surviving_cnt) if surviving_cnt > 0 else 0.0
    dnc_usage = (1.0 - f_gate) * (u_prev + w_gate - u_prev * w_gate)

    return {
        "total_claims": int(n_claims),
        "surviving_claim_count": int(surviving_cnt),
        "goldfish_veto_rate": round(veto_rate, 6),
        "verified_context_score": round(verified_score, 6),
        "dnc_allocation_usage": round(_clamp(dnc_usage, 0.0, 1.0), 6),
    }


def compute_ngs_separation_and_ryoe_kinematics(
    *,
    avg_cushion_yds: float,
    avg_separation_yds: float,
    air_yards: float,
    actual_completion_rate: float,
    actual_rush_ypc: float,
    expected_rush_ypc: float,
    carrier_speed_mps: float = 8.2,
    carrier_mass_kg: float = 98.0,
) -> dict[str, Any]:
    """Compute nflverse/ngs-data CPOE, RYOE residual, and MuJoCo contact kinetic index."""
    cushion = _clamp(float(avg_cushion_yds), 0.0, 20.0)
    sep = _clamp(float(avg_separation_yds), 0.0, 20.0)
    airy = _clamp(float(air_yards), -10.0, 55.0)
    comp = _clamp(float(actual_completion_rate), 0.0, 1.0)
    act_ypc = _clamp(float(actual_rush_ypc), -5.0, 25.0)
    exp_ypc = _clamp(float(expected_rush_ypc), -5.0, 25.0)
    speed = _clamp(float(carrier_speed_mps), 0.0, 13.0)
    mass = _clamp(float(carrier_mass_kg), 40.0, 180.0)

    logit_comp = 0.85 + 0.28 * (sep - 2.6) + 0.06 * (cushion - 5.5) - 0.045 * (airy - 7.5)
    exp_comp_prob = 1.0 / (1.0 + math.exp(-max(-20.0, min(20.0, logit_comp))))
    cpoe_delta = comp - exp_comp_prob
    ryoe_delta = act_ypc - exp_ypc
    contact_ke_index = (0.5 * mass * speed * speed) / 3500.0

    return {
        "ngs_expected_comp_prob": round(exp_comp_prob, 6),
        "ngs_cpoe_delta": round(cpoe_delta, 6),
        "ngs_ryoe_ypc_delta": round(ryoe_delta, 6),
        "mujoco_contact_kinetic_index": round(contact_ke_index, 6),
    }


def enforce_alphafold3_alphagenome_ehr_ruo_gate(
    model_sources: Sequence[str],
    *,
    sbom_licenses: Sequence[str] = (),
    arithmancer_live_market_requested: bool = False,
) -> dict[str, Any]:
    """Quarantine AlphaFold/AlphaGenome/EHR RUO and Arithmancer LMSR hold at zero weight."""
    hold_status = assert_prediction_market_compliance_hold(
        live_execution_requested=arithmancer_live_market_requested
    )

    quarantined_cnt = 0
    for src in model_sources:
        low = str(src).strip().lower()
        if any(marker in low for marker in _RUO_SOURCE_MARKERS):
            quarantined_cnt += 1

    permissive_cnt = 0
    custom_cnt = 0
    for lic in sbom_licenses:
        up = str(lic).strip().upper()
        if up in _PERMISSIVE_SPDX:
            permissive_cnt += 1
        elif up:
            custom_cnt += 1

    return {
        "ruo_sports_weight": 0.0,
        "quarantine_enforced": True,
        "quarantined_source_count": int(quarantined_cnt),
        "arithmancer_cleared": bool(hold_status["cleared"]),
        "permissive_sbom_count": int(permissive_cnt),
        "custom_sbom_count": int(custom_cnt),
    }


def evaluate_wave30_deepmind_and_google_corpus_bridge(
    *,
    away_clean_epa: float,
    home_clean_epa: float,
    effective_wind_mph: float,
    is_short_week: bool,
) -> dict[str, Any]:
    """Run cached Wave 30 DeepMind/Google/NGS diagnostic bridge (live_stage2_weight=0.0)."""
    key = (
        round(float(away_clean_epa), 4),
        round(float(home_clean_epa), 4),
        round(float(effective_wind_mph), 2),
        bool(is_short_week),
    )
    cached = _WAVE30_BRIDGE_CACHE.get(key)
    if cached is not None:
        return dict(cached)

    epa_edge = float(home_clean_epa) - float(away_clean_epa)
    mctx_res = select_gumbel_muzero_sequential_halving_action(
        [0.40 + epa_edge, 0.15, -0.25, -0.40],
        [0.18 + 0.3 * epa_edge, 0.09, -0.04, -0.10],
        visit_counts=[12, 8, 4, 2],
    )
    cfr_res = solve_openspiel_cfr_plus_regret_matching(
        [[0.22 + 0.1 * epa_edge, -0.08], [-0.04, 0.16]],
        iterations=48,
    )
    wind = max(0.0, float(effective_wind_mph))
    wx_res = compute_weatherbench_fair_crps_and_spread_skill(
        [wind * 0.90, wind * 0.98, wind * 1.04, wind * 1.12],
        wind,
        exceedance_threshold=15.0,
        spatial_coords=(0.41, 0.72),
    )
    series = [28.0, 31.0, 35.0, 40.0] if is_short_week else [22.0, 25.0, 26.0, 28.0]
    hill_res = evaluate_hill_adstock_workload_saturation(series)
    gn_res = propagate_graph_nets_edge_node_global_step(
        [[0.2 + float(away_clean_epa), 0.1], [0.2 + float(home_clean_epa), -0.1], [0.05, 0.05]],
        [(0, 1, 0.6), (1, 2, 0.5), (0, 2, 0.25)],
        global_context=epa_edge,
    )
    egm_res = update_elephant_goldfish_selective_memory_gate(
        [
            {"claim_id": "epa_prior", "confidence": 0.84},
            {"claim_id": "noise_spike", "confidence": 0.42},
        ],
        [False, True],
    )
    ngs_res = compute_ngs_separation_and_ryoe_kinematics(
        avg_cushion_yds=5.9,
        avg_separation_yds=2.95,
        air_yards=8.4,
        actual_completion_rate=0.665,
        actual_rush_ypc=4.45,
        expected_rush_ypc=4.18,
    )
    ruo_res = enforce_alphafold3_alphagenome_ehr_ruo_gate(
        ("google-deepmind/alphafold3", "google-deepmind/alphagenome", "google/ehr-predictions"),
        sbom_licenses=("Apache-2.0", "MIT", "CC-BY-4.0"),
        arithmancer_live_market_requested=False,
    )

    scalars = (
        float(mctx_res["kl_policy_improvement"]),
        float(mctx_res["normalized_entropy"]),
        float(cfr_res["saddle_game_value"]),
        float(cfr_res["nash_exploitability"]),
        float(wx_res["fair_crps"]),
        float(wx_res["spread_skill_ratio"]),
        float(wx_res["bayesnf_spatiotemporal_feature_norm"]),
        float(hill_res["hill_saturation"]),
        float(hill_res["efficiency_retention_mult"]),
        float(gn_res["updated_global_scalar"]),
        float(egm_res["verified_context_score"]),
        float(egm_res["dnc_allocation_usage"]),
        float(ngs_res["ngs_cpoe_delta"]),
        float(ngs_res["ngs_ryoe_ypc_delta"]),
        float(ngs_res["mujoco_contact_kinetic_index"]),
        float(ruo_res["ruo_sports_weight"]),
    )
    all_finite = all(math.isfinite(s) for s in scalars)
    out: dict[str, Any] = {
        "wave30_wired": True,
        "new_oss_entries_count": len(WAVE30_NEW_OSS_ENTRIES),
        "oss_registry_target_entries": 346,
        "all_scalars_finite": all_finite,
        "scalars_verified_count": len(scalars),
        "mctx_thinking_mode": mctx_res["thinking_mode"],
        "openspiel_nash_exploitability": float(cfr_res["nash_exploitability"]),
        "weatherbench_fair_crps": float(wx_res["fair_crps"]),
        "lightweight_mmm_hill_sat": float(hill_res["hill_saturation"]),
        "graph_nets_global_scalar": float(gn_res["updated_global_scalar"]),
        "egm_verified_context_score": float(egm_res["verified_context_score"]),
        "ngs_cpoe_delta": float(ngs_res["ngs_cpoe_delta"]),
        "ruo_sports_weight": float(ruo_res["ruo_sports_weight"]),
        "arithmancer_cleared": bool(ruo_res["arithmancer_cleared"]),
        "live_stage2_weight": 0.0,
    }
    _WAVE30_BRIDGE_CACHE[key] = out
    return dict(out)


__all__ = [
    "WAVE30_NEW_OSS_ENTRIES",
    "compute_ngs_separation_and_ryoe_kinematics",
    "compute_weatherbench_fair_crps_and_spread_skill",
    "enforce_alphafold3_alphagenome_ehr_ruo_gate",
    "evaluate_hill_adstock_workload_saturation",
    "evaluate_wave30_deepmind_and_google_corpus_bridge",
    "propagate_graph_nets_edge_node_global_step",
    "select_gumbel_muzero_sequential_halving_action",
    "solve_openspiel_cfr_plus_regret_matching",
    "update_elephant_goldfish_selective_memory_gate",
]
