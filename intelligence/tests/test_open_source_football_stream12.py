"""Stream 12/14A/14C Python verification.

Covers:
  * fast_pbp_loader as-of Week-5 zero-future-row leakage (RT-02)
  * universal_handoff_feature_compiler as_of_prior synthetic leakage
  * osf_torch_field_cv three-head pipeline (RT-05 Python mirror)
  * ingest_open_source_football runtime feed: 6 families, precision weights, cap
  * ingest_downloads_master_specs selection and hashes
"""

from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path

import pytest

REPO = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(REPO / "intelligence" / "ingestion"))
sys.path.insert(0, str(REPO / "intelligence" / "vision"))


def load_module(relative: str, name: str):
    path = REPO / relative
    if not path.is_file():
        pytest.skip(f"{relative} not present in this checkout")
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    assert spec and spec.loader
    spec.loader.exec_module(module)
    return module


def test_fast_pbp_loader_week5_admits_zero_future_rows():
    loader = load_module("intelligence/ingestion/fast_pbp_loader.py", "fast_pbp_loader")
    frame, meta = loader.load_pbp(seasons=[2024], as_of=(2024, 5))
    if len(frame) == 0:
        pytest.skip("no local nflverse PBP CSV; run ingest_open_source_football.py first")
    assert "week" in frame.columns and "season" in frame.columns
    future = frame[(frame["season"] > 2024) | ((frame["season"] == 2024) & (frame["week"] >= 5))]
    assert len(future) == 0
    assert meta["as_of"] == [2024, 5]


def test_universal_handoff_as_of_prior_synthetic_leakage():
    compiler = load_module(
        "intelligence/ingestion/universal_handoff_feature_compiler.py",
        "universal_handoff_feature_compiler",
    )
    frame = compiler.synthetic_leakage_frame()
    known = compiler.as_of_prior(frame, target_week=5, target_season=2024)
    assert len(known) > 0
    assert (known["week"] >= 5).sum() == 0
    table = compiler.compileHandoffPriorTable(frame, target_week=5, target_season=2024)
    assert table["meta"]["rowsKnown"] == len(known)
    assert len(table["families"]) == 6


def test_osf_torch_field_cv_three_heads():
    cv = load_module("intelligence/vision/osf_torch_field_cv.py", "osf_torch_field_cv")
    result = cv.run_pipeline(cv.synthetic_frames(4))
    assert result["tensorDims"] == {"frames": 4, "defenders": 11, "offense": 10, "channels": 8}
    assert len(result["classification"]["meanClassProbabilities"]) == 8
    assert abs(sum(result["classification"]["meanClassProbabilities"]) - 1) < 1e-6
    assert len(result["classification"]["epistemicVariance"]) == 8
    assert result["globalDiscovery"]["referenceCount"] == 4
    assert len(result["instanceHighlights"]["rankedPairs"]) == 10
    assert result["streamCalls"] == [
        "engineer_pair_tensor", "frame_embeddings", "self_attention",
        "ensemble_classify", "global_discovery", "guided_grad_cam",
    ]


def test_osf_runtime_feed_has_six_families_and_cap():
    path = REPO / "intelligence" / "ingestion" / "osf_runtime_feed.jsonl"
    if not path.is_file():
        pytest.skip("osf runtime feed not built")
    records = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    assert records, "feed is empty"
    last = records[-1]
    assert last["family_count"] == 6
    assert len(last["families"]) == 6
    assert last["probability_cap"] == 0.12
    assert abs(last["capped_probability_movement"]) <= 0.12 + 1e-9
    for family in last["families"]:
        assert "residual" in family and "precision_weight" in family


def test_downloads_master_specs_manifest_counts():
    manifest_path = (
        REPO / "docs" / "engine" / "research" / "2026-10-22" / "downloads-master-specs"
        / "DOWNLOADS_INGEST_MANIFEST.json"
    )
    if not manifest_path.is_file():
        pytest.skip("downloads ingest manifest not built")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert manifest["counts"] == {"docx": 7, "pdf": 6, "summary": 37}
    assert manifest["recordsWritten"] == 50
    assert manifest["failures"] == []


def test_grok_export_manifest_accounts_for_every_entry():
    manifest_path = (
        REPO / "docs" / "engine" / "research" / "2026-10-22" / "grok-export-2026-10-22"
        / "GROK_EXPORT_INGEST_MANIFEST.json"
    )
    if not manifest_path.is_file():
        pytest.skip("grok export manifest not built yet")
    manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
    assert manifest["entriesTotal"] == 1807
    assert manifest["assetEntries"] == 1727
    assert manifest["textBodies"] == 652
    assert manifest["binaryBodies"] == 1075
    assert manifest["textBodies"] + manifest["binaryBodies"] == manifest["assetEntries"]
    assert manifest["noDataFiltered"] is True
    assert len(manifest["entries"]) == manifest["entriesTotal"]


def test_grok_sanitizer_catches_major_provider_patterns_and_binary():
    module = load_module("scripts/ops/mine_grok_export_corpus.py", "mine_grok_export_corpus")
    samples = {
        "sk_live_" + "a" * 24: "[REDACTED_STRIPE_KEY]",
        "sk-proj-" + "b" * 24: "[REDACTED_OPENAI_KEY]",
        "sk-ant-" + "c" * 24: "[REDACTED_ANTHROPIC_KEY]",
        "AIza" + "d" * 35: "[REDACTED_GOOGLE_KEY]",
        "xoxb-" + "e" * 24: "[REDACTED_SLACK_TOKEN]",
        ("-----BEGIN " + "RSA PRIVATE KEY-----"): "[REDACTED_PRIVATE_KEY]",
        "eyJ" + "f" * 12 + "." + "g" * 12 + "." + "h" * 12: "[REDACTED_JWT]",
        "LTAI" + "i" * 20: "[REDACTED_ALIBABA_KEY]",
    }
    for raw, marker in samples.items():
        clean, n = module.sanitize(raw)
        assert marker in clean, f"{marker} not applied to {raw[:12]}"
        assert n >= 1
    assert module.is_binary(b"\x89PNG\r\n\x1a\n" + b"\x00" * 32) is True
    assert module.is_binary(b"plain conversation text") is False
