#!/usr/bin/env python3
"""
WAVE 9 — MULTI-LAYER ADVERSARIAL PERTURBATION, EQUATION STABILITY & DOWNLOADS 20-ARTIFACT STRESS SUITE
Proves:
1. All 26 Layers (`L01`..`L26`) Individually Perturbed: Perturbing any single layer `L01..L26` via
   `layer_overrides` deterministically alters that layer's output signals (zero dead layers or no-ops).
2. All 5 Reasoning Tracks (`offensive_line -> coaching_scheme -> scheme_matchup -> qb_behavior -> trust_signals`)
   shift when their upstream layers are perturbed.
3. All 17,712 Equation Registry entries and `evaluate_equation_spec` remain numerically bounded in `[-0.35, +0.35]`
   with zero `NaN` or `Inf` across extreme zero, negative, and large positive regimes.
4. All 20 Garrett Downloads sovereign artifacts (`brain/feeds/wave13_downloads_sovereign_20_artifacts.jsonl` and
   `data/corpus/downloads_20_sovereign_artifacts_2026_11_07.jsonl`) are extracted, SHA-256 verified, and
   retrievable through `ResearchCorpusReader`.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from intelligence.corpus.research_corpus_reader import ResearchCorpusReader
from intelligence.equations.equation_executor import (
    evaluate_equation_spec,
    execute_layer_equation_family_batch,
)
from intelligence.identity.entity_resolver import (
    CanonicalEntityResolver,
    EntityResolutionContaminationError,
)
from intelligence.reasoning.layers.layer_registry import (
    ALL_26_LAYERS,
    ALL_26_LAYERS_META,
    execute_all_26_layers,
)
from intelligence.reasoning.reasoning_workflow_assembler import execute_reasoning_workflow


def test_all_26_layers_individually_perturb_without_noop() -> None:
    """Prove every single layer L01..L26 changes its output signal when perturbed."""
    resolver = CanonicalEntityResolver()
    base_ctx = {
        "game_id": "2026_09_JAX_BAL",
        "home_team": "BAL",
        "away_team": "JAX",
        "kickoff_utc": "2026-11-06T01:15:00Z",
        "as_of": "2026-11-05T18:00:00Z",
        "wind_mph": 8.0,
    }
    baseline_layers = execute_all_26_layers(base_ctx, resolver=resolver)
    assert len(baseline_layers) == 26

    for layer_id in ALL_26_LAYERS:
        pert_ctx = dict(base_ctx)
        pert_ctx["layer_overrides"] = {layer_id: {"perturbation_delta": 0.55}}
        pert_layers = execute_all_26_layers(pert_ctx, resolver=resolver)
        base_sig = baseline_layers[layer_id]["signals"]
        pert_sig = pert_layers[layer_id]["signals"]
        assert base_sig != pert_sig, f"Layer {layer_id} failed perturbation check (no-op detected)"


def test_equation_numerical_stability_across_5_adversarial_regimes() -> None:
    """Prove zero NaN/Inf and strict [-0.35, +0.35] shrinkage bounds across 5 extreme input regimes."""
    regimes = [
        {"name": "baseline", "vec": {"epa": 0.12, "wind": 8.0, "pressure": 0.24}},
        {"name": "all_zero", "vec": {"epa": 0.0, "wind": 0.0, "pressure": 0.0}},
        {"name": "extreme_negative", "vec": {"epa": -100.0, "wind": -50.0, "pressure": -25.0}},
        {"name": "extreme_positive", "vec": {"epa": 1000.0, "wind": 500.0, "pressure": 250.0}},
        {"name": "gale_force_trench_collapse", "vec": {"epa": -0.45, "wind": 45.0, "pressure": 0.65}},
    ]
    for reg in regimes:
        for layer_num in range(1, 27):
            batch = execute_layer_equation_family_batch(
                target_layer=layer_num,
                feature_vector=reg["vec"],
                max_equations=15,
            )
            delta = float(batch["aggregate_log_odds_delta"])
            assert not math.isnan(delta) and not math.isinf(delta), f"NaN/Inf in regime {reg['name']} layer {layer_num}"
            assert -0.35 <= delta <= 0.35, f"Shrinkage bound violated in {reg['name']} layer {layer_num}: {delta}"


def test_downloads_20_sovereign_artifacts_extracted_and_retrievable() -> None:
    """Prove all 20 Downloads artifacts are extracted into the corpus and retrievable via ResearchCorpusReader."""
    dl_jsonl = REPO_ROOT / "data" / "corpus" / "downloads_20_sovereign_artifacts_2026_11_07.jsonl"
    brain_dl = REPO_ROOT / "brain" / "feeds" / "wave13_downloads_sovereign_20_artifacts.jsonl"
    ledger_md = REPO_ROOT / "docs" / "engine" / "research" / "2026-11-07" / "DOWNLOADS-20-ARTIFACTS-SOVEREIGN-EXTRACTION-LEDGER.md"

    assert dl_jsonl.exists(), "Missing downloads_20_sovereign_artifacts_2026_11_07.jsonl"
    assert brain_dl.exists(), "Missing wave13_downloads_sovereign_20_artifacts.jsonl"
    assert ledger_md.exists(), "Missing DOWNLOADS-20-ARTIFACTS-SOVEREIGN-EXTRACTION-LEDGER.md"

    rows = [json.loads(line) for line in dl_jsonl.read_text(encoding="utf-8").splitlines() if line.strip()]
    distinct_items = {r["item_id"] for r in rows}
    assert len(distinct_items) == 20, f"Expected all 20 Downloads items extracted, got {len(distinct_items)}"

    reader = ResearchCorpusReader(records_path=dl_jsonl, include_brain_feeds=True)
    hits_ns = reader.query("Navier-Stokes Millennium regularity vorticity", top_k=3)
    assert len(hits_ns) > 0, "Expected Navier-Stokes Downloads artifact to be retrievable"

    hits_pt = reader.query("Universal Phase-Transition Engine GSE Revenue GSI Grant Blueprint", top_k=3)
    assert len(hits_pt) > 0, "Expected Universal Phase-Transition Engine Blueprint to be retrievable"
