# Provenance: beat-desk spec Layer 3 (2026-09-13-beat-desk-prop-alignment-context-matrix-v5.3.0.md,
# line 68: "classify (injury / lineup / scheme / motivation / weather / off-field) → ...
# → polarity × magnitude"). Verified in deep/c05/verified-claims.md §1.
# Honesty: challenges.md C10 — no trained classifier exists in the corpus; this is a
# deterministic keyword-rule heuristic. EVERY output carries verification=INFERENCE.
# A trained classifier is a future lane gated on labeled data.

"""Rule-based beat-item classifier + polarity/magnitude scorer.

Deterministic, no ML dependencies. The corpus gives us the taxonomy (the six beat
classes) — not the model. All outputs are INFERENCE-labeled heuristics.
"""

from __future__ import annotations

import re

from .models import SignalType, TrackTag, Verification

CLASSIFICATION_VERIFICATION = Verification.INFERENCE  # heuristic, not trained


def _kw(*words: str) -> tuple[str, ...]:
    return words


# Priority-ordered: first match wins. Injury first — it is the most actionable class.
_CLASSIFIERS: list[tuple[SignalType, tuple[str, ...]]] = [
    (SignalType.INJURY, _kw(
        "injured", "injury", "injuries", "hurt", "sidelined", "doubtful",
        "questionable", "ir", "injured reserve", "surgery", "tear", "torn",
        "sprain", "fracture", "concussion", "did not practice", "dnp",
        "limited practice", "ruled out", "game-time decision", "pup",
        "hamstring", "acl", "mcl", "ankle", "knee", "shoulder", "back injury",
    )),
    (SignalType.LINEUP, _kw(
        "depth chart", "benched", "bench", "starter", "starting", "qb1",
        "activated", "sign", "signed", "signing", "released", "release",
        "traded", "trade", "waived", "waive", "promoted", "practice squad",
        "snap share", "role", "demoted", "named the starter",
    )),
    (SignalType.SCHEME, _kw(
        "scheme", "play-action", "play action", "blitz", "blitz pickup",
        "coverage", "man coverage", "zone coverage", "quick game", "tempo",
        "no-huddle", "no huddle", "personnel", "formation", "motion", "rpo",
        "under center", "shotgun",
        # OL lane (the registry's primary lane; real-desk misses 2026-10-02):
        # hyphenated AND unhyphenated forms, plurals, charting language.
        "island rate", "island rates", "pass-blocking", "pass blocking",
        "pass protection", "pass pro", "pressure", "pressures",
        "pressures allowed", "pressure allowed", "pressure rate",
        "1-on-1", "one-on-one", "true pass set", "stunt", "twist",
        "pocket", "percentile grade", "assignment success",
    )),
    (SignalType.WEATHER, _kw(
        "weather", "rain", "snow", "wind", "windy", "cold", "freezing",
        "temperature", "dome", "field conditions", "slippery",
    )),
    (SignalType.OFF_FIELD, _kw(
        "arrest", "arrested", "lawsuit", "contract", "holdout", "extension",
        "fine", "fined", "suspension", "suspended", "off-field", "off field",
        "legal", "court",
    )),
    (SignalType.MOTIVATION, _kw(
        "motivated", "motivation", "chip on", "revenge", "prove",
        "confident", "confidence", "swagger", "locked in", "focused",
        "disrespected", "nobody believes",
    )),
]

# Trust-dynamics language: who the QB trusts / is frustrated with / praises unprompted.
# TNF program Track 3: the Rodgers–Metcalf class of signal.
_TRUST_POSITIVE = _kw(
    "trust", "trusts", "my guy", "go-to", "go to guy", "love throwing to",
    "on the same page", "chemistry", "he's our guy", "praised",
)
_TRUST_NEGATIVE = _kw(
    "frustrated", "frustration", "sucks", "burying", "called out",
    "lost trust", "no chemistry", "not on the same page", "benched him",
)

_POSITIVE = _kw(
    "great", "excellent", "elite", "dominant", "impressive", "cleared",
    "full go", "ahead of schedule", "breakout", "perfect", "unstoppable",
    "trust", "confident",
)
_NEGATIVE = _kw(
    "terrible", "awful", "sucks", "frustrated", "concerned", "concerning",
    "ruled out", "injured", "tear", "surgery", "benched", "demoted",
    "fell off", "can't play", "struggling", "disaster", "worst",
)


def _phrase_re(phrase: str) -> str:
    # Word-boundary match so "sign" doesn't hit "signal"/"design"/"resign"
    # and "ir" doesn't hit "first".
    return r"(?<![a-z])" + re.escape(phrase) + r"(?![a-z])"


def keyword_hits(text: str, phrases: tuple[str, ...] | list[str]) -> int:
    """Boundary-aware keyword hit count (shared by classify and news_wire)."""
    lowered = text.lower()
    return sum(1 for p in phrases if re.search(_phrase_re(p), lowered))


def classify(text: str) -> SignalType:
    """Primary beat class for the text. First priority-ordered keyword match wins.
    No keyword hit → SignalType.MOTIVATION, the least-actionable honest bucket
    (magnitude 0.25 — see score_magnitude). The pipeline may override this
    default with a source-lane hint (is_default_classification)."""
    for sig_type, keywords in _CLASSIFIERS:
        if keyword_hits(text, keywords) > 0:
            return sig_type
    return SignalType.MOTIVATION


def detect_trust_dynamics(text: str) -> str | None:
    """Return a short description of detected trust dynamics, or None.

    Catches the Rodgers–Metcalf class: QB trust, frustration, unprompted praise.
    """
    pos = keyword_hits(text, _TRUST_POSITIVE)
    neg = keyword_hits(text, _TRUST_NEGATIVE)
    if pos == 0 and neg == 0:
        return None
    if neg > pos:
        return "negative trust dynamics (frustration / criticism detected)"
    return "positive trust dynamics (trust / praise detected)"


def score_polarity(text: str) -> float:
    """Polarity in [-1, 1]. Heuristic: (pos - neg) / (pos + neg). Zero hits → 0.0."""
    pos = keyword_hits(text, _POSITIVE)
    neg = keyword_hits(text, _NEGATIVE)
    total = pos + neg
    if total == 0:
        return 0.0
    return round((pos - neg) / total, 3)


def score_magnitude(text: str, signal_type: SignalType) -> float:
    """Magnitude in [0, 1]. Deterministic rules, INFERENCE-labeled.

    Anchors: season-ending / ruled-out language ≈ 0.9; starter-role changes ≈ 0.7;
    generic mentions ≈ 0.4; unclassifiable ≈ 0.25.
    """
    if keyword_hits(text, ("out for season", "season-ending", "torn acl",
                          "ruptured", "ruled out", "suspended")) > 0:
        return 0.9
    if keyword_hits(text, ("starter", "starting", "benched", "qb1",
                           "signed", "sign", "traded", "trade", "released")) > 0:
        return 0.7
    if signal_type == SignalType.INJURY:
        return 0.6
    if signal_type in (SignalType.LINEUP, SignalType.SCHEME):
        return 0.5
    if signal_type == SignalType.MOTIVATION:
        return 0.25
    return 0.4


# SignalType → primary TrackTag mapping (registry item format: track tags).


def is_default_classification(text: str) -> bool:
    """True when no classifier keyword hit — i.e. classify() fell through to the
    MOTIVATION default. Lets the pipeline apply source-lane hints (a @the_waldman
    post with no beat keywords is almost certainly a projection set, not a
    motivational quote)."""
    return all(keyword_hits(text, keywords) == 0 for _, keywords in _CLASSIFIERS)


def track_tags_for(signal_type: SignalType, text: str) -> tuple:
    """Track tags for the registry item format."""
    mapping: dict[SignalType, tuple[TrackTag, ...]] = {
        SignalType.INJURY: (TrackTag.NEWS, TrackTag.OL, TrackTag.QB_BEHAVIOR),
        SignalType.LINEUP: (TrackTag.NEWS, TrackTag.QB_BEHAVIOR),
        SignalType.SCHEME: (TrackTag.SCHEME, TrackTag.COACHING),
        SignalType.MOTIVATION: (TrackTag.TRUST_SIGNAL,),
        SignalType.WEATHER: (TrackTag.NEWS,),
        SignalType.OFF_FIELD: (TrackTag.NEWS, TrackTag.TRUST_SIGNAL),
        SignalType.TRUST_QUOTE: (TrackTag.TRUST_SIGNAL, TrackTag.QB_BEHAVIOR),
        SignalType.PROJECTION_DIVERGENCE: (TrackTag.QB_BEHAVIOR, TrackTag.NEWS),
        SignalType.HISTORICAL_COMP: (TrackTag.QB_BEHAVIOR,),
    }
    tags = mapping.get(signal_type, (TrackTag.OTHER,))
    if detect_trust_dynamics(text) and TrackTag.TRUST_SIGNAL not in tags:
        tags = tags + (TrackTag.TRUST_SIGNAL,)
    return tags
