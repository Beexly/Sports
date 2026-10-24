from pathlib import Path

from research.grounded_span import ground_span

CORPUS = (
    Path(__file__).resolve().parents[2]
    / "docs/engine/research/2026-10-21/downloads-2026-10-21"
    / "X-SITUATIONAL-TRAINING-CORPUS-2026-10-21-xsearch-80.md"
)


def test_real_corpus_span_is_kept_and_a_paraphrase_is_refused():
    source = CORPUS.read_text(encoding="utf-8")
    claim = "Not all 5 yard gains are created equally."
    hit = ground_span(source, claim)
    assert hit["ok"] is True
    assert source[hit["start"]:hit["end"]] == claim
    missed = ground_span(source, "EPA secretly reweights every snap for opponent strength.")
    assert missed["ok"] is False
    assert missed["reason"] == "not-in-source"
