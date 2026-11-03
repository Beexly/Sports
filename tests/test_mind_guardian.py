"""Provenance and quarantine tags on the 2026-11-02 equation feeds."""
from __future__ import annotations

import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
FEEDS = [
    ROOT / "brain" / "feeds" / "2026-11-02" / "nov02_multidomain_corpus_and_equations_feed.jsonl",
    ROOT / "brain" / "feeds" / "2026-11-02" / "trainer_feed.jsonl",
]
ALLOWED_STATUS = {
    "HIGH_PRIORITY_PRODUCTION_TARGET",
    "GATED_EXPERIMENT_CANDIDATE",
    "RESEARCH_HYPOTHESIS_QUARANTINED_UNTIL_BACKTEST",
    "REJECTED_RETRACTED_PAPER",
}
ALLOWED_FIDELITY = {
    "DIRECT_FROM_SOURCE",
    "GSE_DOMAIN_EXTENSION_OF_GUTMANN_NCE",
    "GSE_SPORTS_ANALOGY_EXTENSION_PENDING_BACKTEST",
    "CROSS_DOMAIN_MATHEMATICAL_ANALOGY",
    "EXACT_PAPER_OR_DOMAIN_EQUATION",
    "VALIDATED_THEORY_ADAPTED_TO_NFL",
}
WIRED_TESTS = (
    ROOT / "tests" / "test_trench_pipeline_integration.py",
    ROOT / "tests" / "test_week8_post_slate_fixes.py",
    ROOT / "tests" / "test_biomech_kinetic_translation.py",
    ROOT / "tests" / "test_biomech_quarantine.py",
    ROOT / "tests" / "test_mnf_card_integrity.py",
    ROOT / "tests" / "test_epistemic_gate_and_week9_sanity.py",
)


def _records():
    rows = []
    present = [path for path in FEEDS if path.is_file()]
    assert (ROOT / "brain" / "feeds" / "2026-11-02" / "nov02_multidomain_corpus_and_equations_feed.jsonl") in present
    for path in present:
        for line in path.read_text(encoding="utf-8").splitlines():
            if line.strip():
                rows.append(json.loads(line))
    return rows


def test_equation_provenance_and_quarantine_tags():
    rows = _records()
    assert rows
    gutmann = [r for r in rows if r.get("equation_id") == "EQ-B4-03" or r.get("id") == "EQ-B4-03"]
    assert gutmann, "EQ-B4-03 Gutmann NCE extension was not tagged"
    assert all(r.get("source_fidelity") == "GSE_DOMAIN_EXTENSION_OF_GUTMANN_NCE" for r in gutmann)
    wired_src = "\n".join(p.read_text(encoding="utf-8") for p in WIRED_TESTS)
    for row in rows:
        assert row.get("verification_status") in ALLOWED_STATUS
        assert row.get("source_fidelity") in ALLOWED_FIDELITY
        wired = row.get("wired_into_end_to_end_slate_pipeline")
        assert isinstance(wired, bool)
        if wired:
            token = str(row.get("id") or row.get("equation_id"))
            assert token in wired_src or str(row.get("wired_test", "")) in wired_src
