"""Unit tests for Wave 16 GSI translational sports-medicine and statistical progression."""

from __future__ import annotations

import json
from pathlib import Path

import pytest

from gse_engine.cli import _build_commands
from gse_engine.observability.skill_registry_router import route_gse_capability_domain
from gse_engine.science import (
    BiomarkerStructuralProfile,
    ClinicalTrialPortfolioSummary,
    CongenericSarSummary,
    MultiOmicsTargetAnnotation,
    Wave16TranslationalBundle,
    evaluate_paired_projection_progression,
    load_and_verify_wave16_telemetry,
    validate_and_serialize_wave16_bundle,
)


def test_paired_progression_philox_bootstrap_and_tests() -> None:
    """Paired progression computes Wilcoxon, t-test, and bit-exact Philox CI."""
    pre = [92.0, 81.5, 114.2, 68.0, 77.4, 103.5, 71.2, 88.6, 95.1, 64.9, 82.0, 79.8]
    post = [70.0, 63.1, 89.0, 52.4, 60.2, 79.1, 56.8, 69.0, 72.5, 51.3, 62.7, 61.9]

    r1 = evaluate_paired_projection_progression(pre, post, metric_name="pass_mae", seed=20261116)
    r2 = evaluate_paired_projection_progression(pre, post, metric_name="pass_mae", seed=20261116)
    assert r1 == r2
    assert r1.n_samples == 12
    assert r1.mae_reduction > 15.0
    assert r1.mae_reduction_pct > 20.0
    assert r1.paired_t_pvalue < 1e-6
    assert r1.wilcoxon_pvalue < 0.005
    assert r1.cohens_dz > 1.0
    assert r1.bootstrap_ci_low <= r1.mae_reduction <= r1.bootstrap_ci_high
    assert r1.bootstrap_ci_low > 0.0

    with pytest.raises(ValueError, match="equal length"):
        evaluate_paired_projection_progression([1.0, 2.0], [1.0])


def test_biomarker_profile_enforces_adr0003_rule_in_only_and_disorder_guard() -> None:
    """Blocks non-rule-in clearance overrides, clinical prose, and missing disorder flags."""
    ok_profile = BiomarkerStructuralProfile(
        uniprot_id="P14136",
        gene_symbol="GFAP",
        global_plddt=80.0,
        very_high_pct=58.3,
        very_low_pct=19.2,
        rigid_domain_count=2,
        domain_ranges=("62-219", "227-376"),
        intrinsically_disordered_warning=True,
        molecular_summary="Two coiled-coil domains flanked by disordered terminal tails.",
        rule_in_only_doctrine=True,
    )
    assert ok_profile.rule_in_only_doctrine is True

    with pytest.raises(ValueError, match="rule_in_only_doctrine"):
        BiomarkerStructuralProfile(
            uniprot_id="P09936",
            gene_symbol="UCHL1",
            global_plddt=93.62,
            very_high_pct=79.8,
            very_low_pct=0.0,
            rigid_domain_count=1,
            domain_ranges=("1-221",),
            intrinsically_disordered_warning=False,
            molecular_summary="Compact ordered globular ubiquitin hydrolase domain.",
            rule_in_only_doctrine=False,
        )

    with pytest.raises(ValueError, match="Research-use-only"):
        BiomarkerStructuralProfile(
            uniprot_id="P09936",
            gene_symbol="UCHL1",
            global_plddt=93.62,
            very_high_pct=79.8,
            very_low_pct=0.0,
            rigid_domain_count=1,
            domain_ranges=("1-221",),
            intrinsically_disordered_warning=False,
            molecular_summary="Athlete is cleared to play based on biomarker fold.",
        )

    with pytest.raises(ValueError, match="Disorder warning invariant"):
        BiomarkerStructuralProfile(
            uniprot_id="P14136",
            gene_symbol="GFAP",
            global_plddt=80.0,
            very_high_pct=58.3,
            very_low_pct=19.2,
            rigid_domain_count=2,
            domain_ranges=("62-219", "227-376"),
            intrinsically_disordered_warning=False,
            molecular_summary="Ordered core.",
        )


def test_sar_summary_enforces_full_dataset_and_interpretable_features(tmp_path: Path) -> None:
    """Rejects downsampling and anonymous fingerprint bits, and verifies CLI audit."""
    with pytest.raises(ValueError, match="downsampled must be False"):
        CongenericSarSummary(
            target_chembl_id="CHEMBL280",
            target_name="Collagenase 3",
            total_compounds=81,
            evaluated_compounds=40,
            downsampled=True,
            winning_model="RidgeCV",
            holdout_r2=0.72,
            holdout_rmse=0.51,
            cv_r2=0.69,
            top_attributed_features=("cLogP", "TPSA"),
        )

    with pytest.raises(ValueError, match="Interpretable feature attribution"):
        CongenericSarSummary(
            target_chembl_id="CHEMBL280",
            target_name="Collagenase 3",
            total_compounds=81,
            evaluated_compounds=81,
            downsampled=False,
            winning_model="RidgeCV",
            holdout_r2=0.72,
            holdout_rmse=0.51,
            cv_r2=0.69,
            top_attributed_features=("FP_1024", "cLogP"),
        )

    verdict = route_gse_capability_domain("gsi_translational_science")
    assert verdict.nvidia_skill == "dgx-spark-skills"
    assert verdict.hermes_plugin == "brain-graph"
    assert verdict.dgx_invariants_ok is True

    rep = evaluate_paired_projection_progression([30.0, 40.0, 50.0], [22.0, 28.0, 35.0])
    bundle = Wave16TranslationalBundle(
        generated_utc="2026-11-16T18:45:00Z",
        progression_reports=(rep,),
        biomarker_structures=(
            BiomarkerStructuralProfile(
                uniprot_id="P09936",
                gene_symbol="UCHL1",
                global_plddt=93.62,
                very_high_pct=79.8,
                very_low_pct=0.0,
                rigid_domain_count=1,
                domain_ranges=("1-221",),
                intrinsically_disordered_warning=False,
                molecular_summary="Well-ordered 221-aa single globular composite domain.",
            ),
        ),
        clinical_trials=(
            ClinicalTrialPortfolioSummary(
                condition_query="sport-related concussion",
                total_count=63,
                sampled_nct_ids=("NCT02661633",),
                recruiting_count=1,
                completed_count=3,
                phases_present=("PHASE1", "PHASE2"),
            ),
        ),
        sar_benchmark=CongenericSarSummary(
            target_chembl_id="CHEMBL280",
            target_name="Collagenase 3",
            total_compounds=81,
            evaluated_compounds=81,
            downsampled=False,
            winning_model="ElasticNetCV",
            holdout_r2=0.71,
            holdout_rmse=0.53,
            cv_r2=0.68,
            top_attributed_features=("cLogP", "TPSA", "HBA"),
        ),
    )
    out_json = tmp_path / "wave16_audit.json"
    validate_and_serialize_wave16_bundle(bundle, out_json)
    reloaded = load_and_verify_wave16_telemetry(out_json)
    assert reloaded.sar_benchmark.evaluated_compounds == 81

    cli_res = json.loads(_build_commands()["gsi-science-audit"](telemetry_path=str(out_json)))
    assert cli_res["ok"] is True
    assert cli_res["route_domain"] == "gsi_translational_science"
    assert cli_res["sar_target"] == "CHEMBL280"


def test_multiomics_annotation_enforces_ruo_and_non_negative_counts() -> None:
    """Enforces RUO molecular framing and non-negative epigenetic/domain counts."""
    ok = MultiOmicsTargetAnnotation(
        gene_symbol="MMP13",
        ensembl_id="ENSG00000137745",
        uniprot_id="P45452",
        canonical_tss="11:102955734",
        mane_select_transcript="ENST00000260302.7",
        ontology_id="GO:0030574",
        ontology_label="collagen catabolic process",
        gnomad_pli=0.0,
        gnomad_loeuf=0.81,
        top_tissue="Cerebral Cortex",
        subcellular_location="Secreted / Extracellular matrix",
        encode_ccre_count=4,
        interpro_domain_count=5,
        open_targets_tractability="Small molecule Clinical Precedence",
        molecular_notes="Matrix metallopeptidase involved in collagen cleavage.",
    )
    assert ok.gene_symbol == "MMP13"

    with pytest.raises(ValueError, match="Research-use-only"):
        MultiOmicsTargetAnnotation(
            gene_symbol="MMP13",
            ensembl_id="ENSG00000137745",
            uniprot_id="P45452",
            canonical_tss="11:102955734",
            mane_select_transcript="ENST00000260302.7",
            ontology_id="GO:0030574",
            ontology_label="collagen catabolic process",
            gnomad_pli=None,
            gnomad_loeuf=None,
            top_tissue="N/A",
            subcellular_location="N/A",
            encode_ccre_count=1,
            interpro_domain_count=1,
            open_targets_tractability="Unknown",
            molecular_notes="Patient is diagnosed with tendinopathy by this marker.",
        )

    with pytest.raises(ValueError, match="non-negative"):
        MultiOmicsTargetAnnotation(
            gene_symbol="MMP13",
            ensembl_id="ENSG00000137745",
            uniprot_id="P45452",
            canonical_tss="11:102955734",
            mane_select_transcript="ENST00000260302.7",
            ontology_id="GO:0030574",
            ontology_label="collagen catabolic process",
            gnomad_pli=None,
            gnomad_loeuf=None,
            top_tissue="N/A",
            subcellular_location="N/A",
            encode_ccre_count=-1,
            interpro_domain_count=1,
            open_targets_tractability="Unknown",
            molecular_notes="Molecular annotation only.",
        )


def test_stage2_live_wiring_composer_tasks_and_adr0003_cap() -> None:
    """Verify Stage-2 GSI/HotSwap live wiring, ADR-0003 injury cap, and Composer callables."""
    from scripts.ops.gse_connected_game_workflow import (
        compile_stage1_to_stage2_simulation_priors,
    )
    from scripts.ops.gse_gcp_orchestration_tasks import (
        run_fabric_and_corpus_audit,
        run_gsi_translational_science_audit,
        run_stage2_matchup_integrity_gate,
    )

    from gse_engine.compute.corpus_situational_integrator import (
        assert_all_books_pdfs_ig_x_situational_wired,
    )

    stage2_res = run_stage2_matchup_integrity_gate(away_team="NE", home_team="DET", week=10)
    assert stage2_res["ok"] is True
    assert stage2_res["all_5_pillars_wired"] is True
    assert stage2_res["gsi_and_compound_fabric_wired"] is True

    lb = stage2_res["load_bearing_priors"]
    gsi_pillar = lb["gsi_and_compound_fabric_pillar"]
    assert gsi_pillar["wired"] is True
    assert gsi_pillar["adr0003_rule_in_only_doctrine"] is True
    assert gsi_pillar["gfap_disorder_warning_held"] is True
    assert gsi_pillar["hotswap_sha256_verified"] is True
    assert gsi_pillar["sar_compounds_evaluated"] == 81
    assert gsi_pillar["sar_downsampled"] is False
    assert lb["all_corpus_pillars_verification"]["gsi_and_compound_fabric_wired"] is True

    tampered = dict(lb)
    tampered["gsi_and_compound_fabric_pillar"] = {
        **gsi_pillar,
        "adr0003_rule_in_only_doctrine": False,
    }
    with pytest.raises(RuntimeError, match="STAGE2_PRE_SIM_CORPUS_WIRING_FAIL"):
        assert_all_books_pdfs_ig_x_situational_wired(tampered)

    # ADR-0003: Questionable and Doubtful players can never exceed multiplier 1.0
    inj_priors = compile_stage1_to_stage2_simulation_priors(
        stage1a_receipt={"away": "NE", "home": "DET", "week": 10},
        stage1b_receipt={},
        game_context={
            "verified_board_athletes": {
                "Amon-Ra St. Brown": {
                    "team": "DET",
                    "position": "WR",
                    "injury_status": {"report_status": "QUESTIONABLE"},
                },
                "Jahmyr Gibbs": {
                    "team": "DET",
                    "position": "RB",
                    "injury_status": {"report_status": "DOUBTFUL"},
                },
            }
        },
    )
    mults = inj_priors["combined_load_bearing_priors"]["player_target_and_carry_multipliers"]
    assert mults["Amon-Ra St. Brown"] <= 1.0
    assert mults["Jahmyr Gibbs"] <= 1.0

    fabric_res = run_fabric_and_corpus_audit(batch_limit=250)
    assert fabric_res["ok"] is True
    assert fabric_res["files_swept"] == 250
    assert fabric_res["persisted_files_swept"] >= 12469
    assert fabric_res["manifest_877_pdfs_count"] >= 877

    gsi_res = run_gsi_translational_science_audit()
    assert gsi_res["ok"] is True
    assert gsi_res["adr0003_rule_in_only"] is True
    assert gsi_res["sar_compounds_evaluated"] == 81
