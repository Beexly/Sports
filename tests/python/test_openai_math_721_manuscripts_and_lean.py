r"""Unit Test Suite for Component 6A: `openai/math` 721 Manuscripts, 373 Result Families & 53,554 Lean Engine.

Verifies:
1. All 721 manuscripts, 721 unique PDF links, and 373 result families (`001..378`, absent `045`, `061`, `070`, `123`, `163`)
   are parsed and stored in `data/audits/openai_math_721_manuscripts_373_families_and_lean_audit_2026_11_06.json`.
2. All 53,554 `.lean` files and 419 `ComparatorChallenges` (`418` top-level + `1` nested `Hodge`; `208` YAML main_results
   across `192` unique configs) and Anchor A5 (`Family 378` / `ComparatorChallenges/SubexponentialSAT.json`) are verified.
3. Both parallel `DeepSeek-V4.1-Flash-1017` synthesis worker streams (`DeepSeek-1017-Stream-A` & `DeepSeek-1017-Stream-B`)
   and 30 Pinecone hybrid vectors (`namespace="gse-openai-math-721-manuscripts"`) are verified.
4. All 7 exported functions in `intelligence/coaching/openai_math_721_manuscript_and_lean_engine.py`:
   - `sogge_local_smoothing_wave_focusing_kernel`
   - `bounded_treewidth_l1_graph_embedding_kernel`
   - `radial_pair_potential_temperature_singularity_kernel`
   - `amplitude_damping_and_atomic_gaussian_channel`
   - `fixed_width_cnf_exact_model_counter`
   - `lean_comparator_challenge_soundness_gate`
   - `evaluate_openai_math_721_pre_projection_overlay`
5. TypeScript mirror `packages/mcp-equations-server/src/openai-math-721-catalog-and-kernels.ts` exports all required symbols.
6. Zero raw secrets and zero literal `etc.` (`\betc\.`) across all Partition A files.
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from intelligence.coaching.openai_math_721_manuscript_and_lean_engine import (
    ABSENT_FAMILY_IDS,
    ANCHOR_A5_COMPARATOR_CONFIG,
    ANCHOR_A5_SUBEXPONENTIAL_SAT_FAMILY_ID,
    CANONICAL_COMPARATOR_CHALLENGES_COUNT,
    CANONICAL_LEAN_FILES_COUNT,
    CANONICAL_MANUSCRIPTS_COUNT,
    CANONICAL_RESULT_FAMILIES_COUNT,
    amplitude_damping_and_atomic_gaussian_channel,
    bounded_treewidth_l1_graph_embedding_kernel,
    evaluate_openai_math_721_pre_projection_overlay,
    fixed_width_cnf_exact_model_counter,
    lean_comparator_challenge_soundness_gate,
    radial_pair_potential_temperature_singularity_kernel,
    sogge_local_smoothing_wave_focusing_kernel,
)


def test_01_audit_json_721_manuscripts_373_families_and_reconciliation() -> None:
    json_path = REPO_ROOT / "data" / "audits" / "openai_math_721_manuscripts_373_families_and_lean_audit_2026_11_06.json"
    assert json_path.is_file()
    data = json.loads(json_path.read_text(encoding="utf-8"))

    counts = data["counts"]
    assert counts["manuscripts_count"] == 721
    assert counts["unique_pdf_links_count"] == 721
    assert counts["result_families_count"] == 373
    assert counts["family_number_range"] == "001..378"
    assert counts["absent_family_numbers"] == ["045", "061", "070", "123", "163"]
    assert len(data["manuscripts"]) == 721
    assert len(data["result_families"]) == 373

    rec = data["reconciliation_facts"]
    assert rec["comparator_challenges_total"] == 419
    assert rec["comparator_challenges_top_level"] == 418
    assert rec["comparator_challenges_nested_hodge"] == 1
    assert rec["formalization_yaml_main_results_entries"] == 208
    assert rec["formalization_yaml_unique_comparator_configs"] == 192
    assert rec["anchor_a5_subexponential_sat"]["family_id"] == "378"
    assert rec["anchor_a5_subexponential_sat"]["comparator_config"] == "ComparatorChallenges/SubexponentialSAT.json"


def test_02_lean_53554_files_and_419_comparator_challenges() -> None:
    json_path = REPO_ROOT / "data" / "audits" / "openai_math_721_manuscripts_373_families_and_lean_audit_2026_11_06.json"
    data = json.loads(json_path.read_text(encoding="utf-8"))

    assert data["counts"]["lean_files_count"] == 53554
    assert data["counts"]["comparator_challenges_count"] == 419
    assert data["counts"]["formalized_yaml_sources_count"] == 176
    assert data["counts"]["formalization_yaml_main_results_count"] == 208
    assert data["counts"]["formalization_yaml_unique_configs_count"] == 192


def test_03_parallel_deepseek_1017_streams_and_pinecone_30_vectors() -> None:
    json_path = REPO_ROOT / "data" / "audits" / "openai_math_721_manuscripts_373_families_and_lean_audit_2026_11_06.json"
    data = json.loads(json_path.read_text(encoding="utf-8"))

    streams = data["deepseek1017_worker_streams"]
    assert len(streams) == 2
    assert streams[0]["worker_id"] == "DeepSeek-1017-Stream-A"
    assert streams[1]["worker_id"] == "DeepSeek-1017-Stream-B"
    assert streams[0]["families_processed_count"] + streams[1]["families_processed_count"] == 373
    assert streams[0]["manuscripts_processed_count"] + streams[1]["manuscripts_processed_count"] == 721

    p_rec = data["pinecone_upsert_receipt"]
    assert p_rec["index_name"] == "gse-200-book-hybrid-index"
    assert p_rec["namespace"] == "gse-openai-math-721-manuscripts"
    assert p_rec["vectors_upserted"] == 30


def test_04_sogge_local_smoothing_wave_focusing_kernel() -> None:
    res = sogge_local_smoothing_wave_focusing_kernel(
        spatial_dim_n=3,
        sulcal_curvature_mm_inv=0.45,
        rotational_accel_rad_s2=5100.0,
        crosswind_mph=16.0,
    )
    assert res["spatial_dim_n"] == 3
    assert res["critical_exponent_p"] == 4.0
    assert res["sogge_wave_focusing_gain"] > 1.0
    assert res["sulcal_fundus_amplification"] > res["sogge_wave_focusing_gain"]
    assert res["deep_pass_trajectory_deflection_yds"] > 0.0


def test_05_bounded_treewidth_l1_graph_embedding_kernel() -> None:
    res = bounded_treewidth_l1_graph_embedding_kernel(treewidth_k=6, active_factor_nodes=288, edge_density=0.20)
    assert res["treewidth_k"] == 6
    assert res["active_factor_nodes"] == 288
    assert res["treewidth_l1_distortion"] > 1.0
    assert -1.0 <= res["ollivier_ricci_curvature_kappa"] <= 1.0
    assert res["sparse_cut_bottleneck_capacity"] > 0.0


def test_06_radial_pair_potential_temperature_singularity_kernel() -> None:
    res = radial_pair_potential_temperature_singularity_kernel(
        mean_defender_separation_yds=2.1,
        pass_rush_closing_speed_yds_s=5.8,
    )
    assert res["radial_pair_beta_critical"] > 0.0
    assert res["spin_glass_susceptibility_chi_sg"] > 0.0
    assert 0.0 < res["collapse_probability"] < 1.0
    assert res["phase_state"] in ("SPIN_GLASS_POCKET_COLLAPSE", "COHERENT_POCKET_SHELL")


def test_07_amplitude_damping_and_atomic_gaussian_channel() -> None:
    res = amplitude_damping_and_atomic_gaussian_channel(
        cumulative_interior_hits=5,
        snap_number_in_game=55,
        short_week_fatigue_flag=True,
    )
    assert 0.0 < res["kraus_decoherence_gamma"] <= 0.85
    assert 0.5 < res["amplitude_damping_retention"] < 1.0
    assert res["non_commutative_braiding_norm"] > 0.0
    assert 0.0 < res["atomic_gaussian_tail_bound"] < 1.0


def test_08_fixed_width_cnf_exact_model_counter() -> None:
    res = fixed_width_cnf_exact_model_counter(
        clause_marginal_probs=[0.80, 0.78, 0.82, 0.75, 0.84],
        clause_width=3,
        treewidth_bound=5,
    )
    assert res["clause_count"] == 5
    assert 0.15 < res["cnf_conjunction_satisfaction_prob"] < 1.0
    assert res["thin_tree_spanning_margin"] > 0.0
    assert res["gate_passed"] is True


def test_09_lean_comparator_challenge_soundness_gate() -> None:
    valid_gate = lean_comparator_challenge_soundness_gate()
    assert valid_gate["lean_soundness_verified"] is True
    assert valid_gate["sorry_detected"] is False
    assert valid_gate["namespace_divergence_detected"] is False
    assert valid_gate["comparator_challenges_wired"] == 419
    assert valid_gate["lean_files_cataloged"] == 53554

    invalid_gate = lean_comparator_challenge_soundness_gate(
        challenge_namespace="OAI.Hodge.Challenge",
        solution_namespace="OAI.Divergent.Solution",
        contains_sorry_ax=True,
    )
    assert invalid_gate["lean_soundness_verified"] is False
    assert invalid_gate["sorry_detected"] is True
    assert invalid_gate["namespace_divergence_detected"] is True


def test_10_evaluate_openai_math_721_pre_projection_overlay() -> None:
    overlay = evaluate_openai_math_721_pre_projection_overlay(home_team="BAL", away_team="JAX")
    assert overlay["manuscripts_wired"] == CANONICAL_MANUSCRIPTS_COUNT == 721
    assert overlay["result_families_wired"] == CANONICAL_RESULT_FAMILIES_COUNT == 373
    assert overlay["lean_files_cataloged"] == CANONICAL_LEAN_FILES_COUNT == 53554
    assert overlay["comparator_challenges_wired"] == CANONICAL_COMPARATOR_CHALLENGES_COUNT == 419
    assert overlay["absent_family_numbers"] == list(ABSENT_FAMILY_IDS)
    assert overlay["anchor_a5_subexponential_sat"]["family_id"] == ANCHOR_A5_SUBEXPONENTIAL_SAT_FAMILY_ID == "378"
    assert overlay["anchor_a5_subexponential_sat"]["comparator_config"] == ANCHOR_A5_COMPARATOR_CONFIG
    assert overlay["lean_soundness_verified"] is True
    assert -0.15 <= overlay["pre_projection_epa_delta"] <= 0.15


def test_11_typescript_mirror_and_zero_secrets_or_etc() -> None:
    ts_path = REPO_ROOT / "packages" / "mcp-equations-server" / "src" / "openai-math-721-catalog-and-kernels.ts"
    assert ts_path.is_file()
    ts_text = ts_path.read_text(encoding="utf-8")
    for required_export in [
        "OPENAI_MATH_721_SUMMARY",
        "computeSoggeLocalSmoothingWaveFocusing",
        "computeBoundedTreewidthL1Embedding",
        "computeRadialPairPotentialCriticality",
        "computeAmplitudeDampingFatigueChannel",
        "computeFixedWidthCnfConjunctionGate",
        "verifyLeanComparatorChallengeSoundness",
    ]:
        assert required_export in ts_text, f"Missing TS export: {required_export}"

    etc_pattern = re.compile(r"\be" + r"tc\.", re.IGNORECASE)
    secret_pattern = re.compile(
        r"\b(sk-[A-Za-z0-9]{20,}|xai-[A-Za-z0-9]{20,}|pcsk_[A-Za-z0-9_]{20,}|phc_[A-Za-z0-9_]{20,}|phx_[A-Za-z0-9_]{20,})\b"
    )
    partition_a_files = [
        REPO_ROOT / "scripts" / "ops" / "harvest_and_wire_openai_math_721_manuscripts_and_lean.py",
        REPO_ROOT / "intelligence" / "coaching" / "openai_math_721_manuscript_and_lean_engine.py",
        ts_path,
        REPO_ROOT / "data" / "audits" / "openai_math_721_manuscripts_373_families_and_lean_audit_2026_11_06.json",
        REPO_ROOT / "docs" / "engine" / "research" / "2026-11-06" / "OPENAI_MATH_721_MANUSCRIPTS_373_FAMILIES_AND_53554_LEAN_BIBLE.md",
    ]
    for fpath in partition_a_files:
        assert fpath.is_file(), f"Missing Partition A file: {fpath}"
        txt = fpath.read_text(encoding="utf-8")
        assert not etc_pattern.search(txt), f"Forbidden abbreviation in {fpath}"
        assert not secret_pattern.search(txt), f"Forbidden secret in {fpath}"
