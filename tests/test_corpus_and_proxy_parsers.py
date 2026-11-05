#!/usr/bin/env python3
"""Pytest verification suite for corpus parsers, proxy HTML sources, BDB2025 shell calibration,
15,947-pick replay vs 16-5 dual-panel ledger audit, and 877/877 PDF hydration.
"""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_source_files_exist() -> None:
    pfr_html = ROOT / "data/engine/sources/pfr_rush_advanced_2026.html"
    sharp_html = ROOT / "data/engine/sources/sharp_coverage_2026.html"
    proxy_json = ROOT / "data/engine/public_proxy_rates_2026.json"

    assert pfr_html.exists() and pfr_html.stat().st_size > 10000
    assert sharp_html.exists() and sharp_html.stat().st_size > 10000
    assert proxy_json.exists()


def test_public_proxy_rates_values() -> None:
    proxy_json = ROOT / "data/engine/public_proxy_rates_2026.json"
    data = json.loads(proxy_json.read_text(encoding="utf-8"))
    raw = json.dumps(data)
    assert "2.52" in raw  # BAL YBC/Att
    assert "1.92" in raw  # JAX YBC/Att
    assert "59.5" in raw  # BAL two-high rate


def test_batches_5_7_160_works_and_877_pdfs_hydrated() -> None:
    b57 = json.loads((ROOT / "data/research/batches_5_7_works_2026_11_05.json").read_text(encoding="utf-8"))
    works = b57 if isinstance(b57, list) else b57.get("works", [])
    assert len(works) == 160

    idx63 = json.loads((ROOT / "data/research/index_batch3_items_2026_11_05.json").read_text(encoding="utf-8"))
    items = idx63 if isinstance(idx63, list) else idx63.get("items", [])
    assert len(items) == 63

    for fname in [
        "mind_2026_11_05_full_corpus.jsonl",
        "mind_batch3_batch4_gaphunt_repocatalog_am_pm_2026_11_05.jsonl",
    ]:
        rows = [
            json.loads(ln)
            for ln in (ROOT / "data/mind_staging" / fname).read_text(encoding="utf-8").splitlines()
            if ln.strip()
        ]
        pdfs = [r for r in rows if r.get("kind") == "pdf_pointer"]
        assert len(pdfs) == 877
        assert all(r.get("trainer_ready") is True for r in pdfs)
        ds = [r for r in rows if r.get("kind") == "dataset_reference"]
        assert len(ds) == 16


def test_15947_replay_and_bdb2025_shell_calibration_outputs() -> None:
    replay_audit = ROOT / "data/engine/replay_15947_vs_16_5_audit_2026_11_05.json"
    bdb_cal = ROOT / "data/engine/bdb2025_shell_calibration_and_tlaw_epa_2026_11_05.json"
    tnf_resim = ROOT / "data/engine/tnf_jax_bal_post_injury_resim_and_clv_2026_11_05.json"

    assert replay_audit.exists()
    assert bdb_cal.exists()
    assert tnf_resim.exists()

    r_text = replay_audit.read_text(encoding="utf-8")
    assert "15947" in r_text or "15,947" in r_text
    assert "-5.48" in r_text or "-0.0548" in r_text
    assert "0.2484" in r_text
