"""Char-span source-grounded extraction for beat reports and press transcripts.

Mirrors the google/langextract grounding contract: every extracted claim must
map verbatim to an exact [start_char, end_char) slice of the original text.
"""

from __future__ import annotations

import re
from collections.abc import Callable, Sequence
from typing import Any

from gse_engine.models import SpanGroundedClaim

_DEFAULT_PATTERNS: tuple[tuple[str, re.Pattern[str]], ...] = (
    (
        "OUT",
        re.compile(
            r"(?P<player>[A-Z][a-zA-Z'.-]+\s+[A-Z][a-zA-Z'.-]+(?:\s+(?:III?|IV|Jr\.|Sr\.))?)\s+"
            r"(?:\((?P<team>[A-Z]{2,3})\)\s+)?(?:is\s+ruled|is|ruled)\s+OUT\b[^.\n]*",
        ),
    ),
    (
        "SNAP_COUNT",
        re.compile(
            r"(?P<player>[A-Z][a-zA-Z'.-]+\s+[A-Z][a-zA-Z'.-]+(?:\s+(?:III?|IV|Jr\.|Sr\.))?)\s+"
            r"(?:\((?P<team>[A-Z]{2,3})\)\s+)?(?:is\s+)?(?:expected to play|on a)\s+"
            r"(?P<limit>\d{1,2})\s*(?:%|\bsnaps?\b|\bsnap count\b)[^.\n]*",
        ),
    ),
)


def _validate_claim_span(transcript: str, raw: dict[str, Any]) -> SpanGroundedClaim | None:
    """Validates exact character-span alignment against the source transcript."""
    quote = str(raw.get("verbatim_quote", ""))
    start = raw.get("start_char")
    end = raw.get("end_char")
    if not quote or not isinstance(start, int) or not isinstance(end, int):
        return None
    if start < 0 or end <= start or end > len(transcript):
        return None
    if transcript[start:end] != quote:
        return None

    limit_val = raw.get("snap_limit_hint")
    snap_limit: float | None = float(limit_val) if isinstance(limit_val, (int, float)) else None
    return SpanGroundedClaim(
        player_name=str(raw.get("player_name", "")).strip(),
        team=str(raw.get("team", "")).strip().upper(),
        injury_tag=str(raw.get("injury_tag", "INFO")).strip().upper(),
        coach_claim=str(raw.get("coach_claim", quote)).strip(),
        verbatim_quote=quote,
        start_char=start,
        end_char=end,
        snap_limit_hint=snap_limit,
    )


def _deterministic_extract(transcript: str) -> list[dict[str, Any]]:
    """Fallback deterministic extractor when no live LLM/langextract model is injected."""
    raw_claims: list[dict[str, Any]] = []
    for tag, pattern in _DEFAULT_PATTERNS:
        for match in pattern.finditer(transcript):
            start, end = match.span()
            gd = match.groupdict()
            limit_raw = gd.get("limit")
            raw_claims.append(
                {
                    "player_name": gd["player"],
                    "team": gd.get("team") or "",
                    "injury_tag": tag,
                    "coach_claim": transcript[start:end],
                    "verbatim_quote": transcript[start:end],
                    "start_char": start,
                    "end_char": end,
                    "snap_limit_hint": float(limit_raw) if limit_raw else None,
                }
            )
    return raw_claims


def extract_grounded_beat_claims(
    transcript: str,
    extractor_fn: Callable[[str], Sequence[dict[str, Any]]] | None = None,
) -> list[SpanGroundedClaim]:
    """Extracts source-grounded injury and coach-speak claims from raw text.

    Args:
        transcript: Raw press-conference or beat-report text.
        extractor_fn: Optional injected callable (e.g. wrapping langextract.extract)
            returning raw claim dicts with `verbatim_quote`, `start_char`, and `end_char`.

    Returns:
        List of verified SpanGroundedClaim instances whose verbatim_quote exactly
        matches transcript[start_char:end_char]. Hallucinated spans are dropped.
    """
    if not transcript or not transcript.strip():
        return []

    raw_items = (
        extractor_fn(transcript) if extractor_fn is not None else _deterministic_extract(transcript)
    )
    verified: list[SpanGroundedClaim] = []
    for item in raw_items:
        claim = _validate_claim_span(transcript, item)
        if claim is not None and claim.player_name:
            verified.append(claim)
    return verified


def verify_span_grounded_triple_with_pbp(
    transcript: str,
    raw_claim: dict[str, Any],
    pbp_trigger_outcomes: Sequence[float],
    pbp_non_trigger_outcomes: Sequence[float],
    expected_direction: int,
    *,
    min_triggers: int = 12,
    max_p_perm: float = 0.10,
) -> dict[str, Any]:
    """Audit span-grounded film/podcast triple against trailing PBP outcomes (WS 2.3)."""
    claim = _validate_claim_span(transcript, raw_claim)
    if claim is None or claim.verbatim_quote != transcript[claim.start_char : claim.end_char]:
        return {
            "accepted": False,
            "queue": "UNVERIFIED_HYPOTHESIS_QUEUE",
            "weight": 0.0,
            "reason": "SPAN_EDIT_DISTANCE_NONZERO",
            "claim": claim,
        }
    n_trig = len(pbp_trigger_outcomes)
    n_ctrl = len(pbp_non_trigger_outcomes)
    if n_trig < min_triggers or n_ctrl < min_triggers:
        return {
            "accepted": False,
            "queue": "UNVERIFIED_HYPOTHESIS_QUEUE",
            "weight": 0.0,
            "reason": "INSUFFICIENT_PBP_TRIGGERS",
            "claim": claim,
        }

    mean_t = sum(pbp_trigger_outcomes) / n_trig
    mean_c = sum(pbp_non_trigger_outcomes) / n_ctrl
    delta = mean_t - mean_c
    dir_sign = 1 if delta > 0 else (-1 if delta < 0 else 0)
    if dir_sign != (1 if expected_direction >= 0 else -1):
        return {
            "accepted": False,
            "queue": "UNVERIFIED_HYPOTHESIS_QUEUE",
            "weight": 0.0,
            "reason": "EMPIRICAL_DIRECTION_MISMATCH",
            "claim": claim,
        }

    # Fast deterministic Studentized t permutation surrogate over pooled sample
    var_t = sum((x - mean_t) ** 2 for x in pbp_trigger_outcomes) / max(1, n_trig - 1)
    var_c = sum((x - mean_c) ** 2 for x in pbp_non_trigger_outcomes) / max(1, n_ctrl - 1)
    se = max(1e-9, ((var_t / n_trig) + (var_c / n_ctrl)) ** 0.5)
    z_val = abs(delta) / se
    p_perm = 2.0 * 0.5 * (1.0 - _erf_approx(z_val / (2.0**0.5)))
    if p_perm >= max_p_perm:
        return {
            "accepted": False,
            "queue": "UNVERIFIED_HYPOTHESIS_QUEUE",
            "weight": 0.0,
            "reason": "P_PERM_ABOVE_THRESHOLD",
            "p_perm": round(p_perm, 6),
            "claim": claim,
        }
    return {
        "accepted": True,
        "queue": "VERIFIED_FILM_TRIPLE",
        "weight": round(1.0 - p_perm, 6),
        "p_perm": round(p_perm, 6),
        "delta_hat": round(delta, 6),
        "claim": claim,
    }


def _erf_approx(x: float) -> float:
    import math

    return math.erf(x)
