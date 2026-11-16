"""Cloud Composer / Airflow PythonOperator callables for GSE pipeline orchestration."""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

REPO_ROOT = Path(__file__).resolve().parents[2]
for _candidate in (REPO_ROOT / "src", REPO_ROOT / "intelligence", REPO_ROOT):
    _s = str(_candidate)
    if _s not in sys.path:
        sys.path.insert(0, _s)


def run_fabric_and_corpus_audit(
    *,
    batch_limit: int | None = None,
    **_kwargs: Any,
) -> dict[str, Any]:
    """Run Foundry primitive sweep and verify persisted index + ChampionBundle SHA-256."""
    from gse_engine.fabric import (
        HotSwapInferenceEngine,
        sweep_foundry_and_corpus_primitives,
        verify_champion_bundle,
    )

    sweep = sweep_foundry_and_corpus_primitives(
        output_path=None,
        batch_limit=batch_limit,
        include_ro_db_stats=False,
    )
    index_path = REPO_ROOT / "data" / "engine" / "foundry_compound_corpus_index_2026.json"
    if not index_path.is_file():
        raise RuntimeError(f"Persisted Foundry corpus index missing: {index_path}")
    persisted = json.loads(index_path.read_text(encoding="utf-8"))

    swept_live = int(sweep.get("files_swept") or 0)
    persisted_swept = int(persisted.get("files_swept") or 0)
    manifest_count = int(sweep.get("manifest_877_pdfs_count") or 0)
    lessons_count = int(sweep.get("lessons_ledger_count") or 0)

    engine = HotSwapInferenceEngine()
    bundle_ok, bundle_reason = verify_champion_bundle(engine.active_bundle)

    expected_live_min = int(batch_limit) if batch_limit is not None else 12469
    if (
        swept_live < expected_live_min
        or persisted_swept < 12469
        or manifest_count < 877
        or not bundle_ok
    ):
        raise RuntimeError(
            "FABRIC_CORPUS_AUDIT_FAIL: "
            f"swept_live={swept_live}, persisted_swept={persisted_swept}, "
            f"manifest={manifest_count}, bundle_ok={bundle_ok} ({bundle_reason})"
        )

    return {
        "ok": True,
        "idempotent": True,
        "files_swept": swept_live,
        "persisted_files_swept": persisted_swept,
        "primitives_extracted_total": int(persisted.get("primitives_extracted_total") or 0),
        "manifest_877_pdfs_count": manifest_count,
        "lessons_ledger_count": lessons_count,
        "hotswap_bundle_sha256": engine.active_bundle.bundle_sha256,
        "hotswap_version_tag": engine.active_bundle.version_tag,
    }


def run_gsi_translational_science_audit(**_kwargs: Any) -> dict[str, Any]:
    """Verify persisted Wave 16 GSI translational telemetry, ADR-0003, and 81-compound SAR."""
    from gse_engine.observability.skill_registry_router import route_gse_capability_domain
    from gse_engine.science.gsi_translational_bridge import load_and_verify_wave16_telemetry

    telemetry_path = (
        REPO_ROOT
        / "data"
        / "engine"
        / "gsi_wave16_translational_and_datascience_telemetry_2026.json"
    )
    bundle = load_and_verify_wave16_telemetry(telemetry_path)
    if not all(b.rule_in_only_doctrine for b in bundle.biomarker_structures):
        raise RuntimeError("ADR-0003 violation: non-rule-in biomarker entry detected.")
    if bundle.sar_benchmark.downsampled or bundle.sar_benchmark.evaluated_compounds != 81:
        raise RuntimeError(
            "SAR invariance failure: expected 81 evaluated non-downsampled compounds."
        )
    verdict = route_gse_capability_domain("gsi_translational_science")
    if not verdict.dgx_invariants_ok:
        raise RuntimeError("DGX invariants failed for gsi_translational_science route.")

    return {
        "ok": True,
        "idempotent": True,
        "biomarkers": [b.gene_symbol for b in bundle.biomarker_structures],
        "adr0003_rule_in_only": True,
        "sar_target": bundle.sar_benchmark.target_chembl_id,
        "sar_compounds_evaluated": bundle.sar_benchmark.evaluated_compounds,
        "route_domain": verdict.domain,
        "wiring_score": verdict.wiring_score,
    }


def run_stage2_matchup_integrity_gate(
    away_team: str = "NE",
    home_team: str = "DET",
    week: int = 10,
    **_kwargs: Any,
) -> dict[str, Any]:
    """Execute Stage-0 -> Stage-1A/1B -> Stage-2 compilation and verify all pillars wired."""
    from gse_engine.compute.corpus_situational_integrator import (
        assert_all_books_pdfs_ig_x_situational_wired,
    )
    from scripts.ops.enforce_stage0_roster_and_board_allowlist import (
        load_stage0_game_roster_allowlist,
    )
    from scripts.ops.gse_connected_game_workflow import (
        compile_stage1_to_stage2_simulation_priors,
        run_stage1a_all_38_coaching_and_scheme_layers,
        run_stage1b_all_5367_equations_pre_sim_review,
    )

    s0 = load_stage0_game_roster_allowlist(away_team, home_team, week=int(week))
    s1a = run_stage1a_all_38_coaching_and_scheme_layers(s0)
    s1b = run_stage1b_all_5367_equations_pre_sim_review(s0, s1a)
    priors = compile_stage1_to_stage2_simulation_priors(
        s1a,
        s1b,
        game_context={"verified_board_athletes": s0["verified_board_athletes"]},
    )
    lb = priors["combined_load_bearing_priors"]
    verif = assert_all_books_pdfs_ig_x_situational_wired(lb)
    if not verif.get("all_5_pillars_wired") or not verif.get("gsi_and_compound_fabric_wired"):
        raise RuntimeError(f"STAGE2_INTEGRITY_GATE_FAIL: {verif}")

    return {
        "ok": True,
        "idempotent": True,
        "away_team": str(away_team).upper(),
        "home_team": str(home_team).upper(),
        "week": int(week),
        "all_5_pillars_wired": bool(verif["all_5_pillars_wired"]),
        "gsi_and_compound_fabric_wired": bool(verif["gsi_and_compound_fabric_wired"]),
        "scalars_verified_count": int(verif["scalars_verified_count"]),
        "load_bearing_priors": lb,
    }
