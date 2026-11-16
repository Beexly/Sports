"""Unit tests for char-span source-grounded beat extraction (google/langextract pattern)."""

from __future__ import annotations

from gse_engine.ingestion.beat_langextract import extract_grounded_beat_claims


def test_extracts_exact_span_grounded_injury_and_snap_claims() -> None:
    """Verifies default extraction anchors claims to exact transcript offsets."""
    transcript = (
        "Coach update: Tee Higgins (CIN) is ruled OUT for Sunday night. "
        "Meanwhile Chase Brown (CIN) is expected to play 75% snaps."
    )
    claims = extract_grounded_beat_claims(transcript)

    assert len(claims) == 2
    out_claim = next(c for c in claims if c.injury_tag == "OUT")
    assert out_claim.player_name == "Tee Higgins"
    assert out_claim.team == "CIN"
    assert transcript[out_claim.start_char : out_claim.end_char] == out_claim.verbatim_quote

    snap_claim = next(c for c in claims if c.injury_tag == "SNAP_COUNT")
    assert snap_claim.player_name == "Chase Brown"
    assert snap_claim.snap_limit_hint == 75.0
    assert transcript[snap_claim.start_char : snap_claim.end_char] == snap_claim.verbatim_quote


def test_drops_hallucinated_spans_whose_offsets_do_not_match() -> None:
    """Custom extractors emitting ungrounded quotes or invalid bounds must be discarded."""
    transcript = "Ja'Marr Chase practiced in full on Friday."
    quote = "Ja'Marr Chase practiced in full"
    start = transcript.index(quote)
    end = start + len(quote)

    def fake_extractor(_: str) -> list[dict[str, object]]:
        return [
            {
                "player_name": "Ja'Marr Chase",
                "team": "CIN",
                "injury_tag": "FULL",
                "coach_claim": quote,
                "verbatim_quote": quote,
                "start_char": start,
                "end_char": end,
            },
            {
                "player_name": "Ghost Player",
                "team": "PIT",
                "injury_tag": "OUT",
                "coach_claim": "Ghost Player ruled out",
                "verbatim_quote": "Ghost Player ruled out",
                "start_char": 0,
                "end_char": 22,
            },
        ]

    claims = extract_grounded_beat_claims(transcript, extractor_fn=fake_extractor)
    assert len(claims) == 1
    assert claims[0].player_name == "Ja'Marr Chase"
