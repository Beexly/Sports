# Provenance: c06 deep research buildable-systems.md §2.3 (v1 extractor set).
# Research basis: x-intake-registry.md (6 accounts, lanes, priority tiers);
# news-social-methods §3.4 (each account gets its own elicitation template —
# "a single generic 'classify this tweet' prompt will not capture a guard
# island-rate chart vs a prop-line disagreement"); 0841 collection protocol
# (72h pre-game window, nickname-collision filtering) for bulk fallback.
# Hard block: X direct fetch is blocked from this environment and mirrors are
# failing (registry known-gaps) — extractors consume stored RawItems; live feed v2.
# v1: stdlib only. Heuristic keyword templates; every output INFERENCE.

"""Per-account X extractors (SOCIAL origin). One template per account lane.

@matt_barlowe is PARKED: defined but deliberately unregistered
(PENDING_VERIFICATION per sibling sources.py — football lane unconfirmed).
"""

from __future__ import annotations

import re

from ..models import SignalOrigin, SignalType, TrustDirection, Verification
from . import register
from .base import ExtractionContext, InputKind, RawSignal, TrustExtractor


class XAccountExtractor(TrustExtractor):
    """Base for the six registry-account X extractors."""
    handle: str = ""
    input_kinds = frozenset({InputKind.X_POST})
    emits_origin = SignalOrigin.SOCIAL

    def _base(self, item, **kw) -> RawSignal:
        return RawSignal(
            source_url=getattr(item, "url", None),
            provenance_gap=getattr(item, "provenance_gap", None),
            observed_at=getattr(item, "observed_at", None),
            verification=Verification.INFERENCE,
            **kw,
        )


def _has(text: str, *phrases: str) -> bool:
    t = text.lower()
    return any(p in t for p in phrases)


@register
class XMysportsupdateExtractor(XAccountExtractor):
    """@mysportsupdate — breaking transactions/injuries (registry Tier 1).

    injury language -> INJURY; depth-chart move language ("taking first-team
    reps") -> ROLE_INCREASE/DECREASE; transactions -> LINEUP.
    """
    name = "x_mysportsupdate"
    version = "1.0.0"
    handle = "@mysportsupdate"

    _INJURY = ("injured", "injury", "ruled out", "doubtful", "questionable",
               "placed on ir", "injured reserve", "torn", "sprain", "fracture",
               "concussion", "surgery", "out for the season", "week-to-week",
               "did not practice", "dnp")
    _ROLE_UP = ("first-team reps", "named the starter", "named starter", "promoted",
                "starting job", "qb1", "taking over as")
    _ROLE_DOWN = ("benched", "demoted", "loses starting", "lost the starting",
                  "replaced as starter")
    _TRANS = ("signed", "released", "traded", "trade", "waived", "claimed",
              "activated", "elevated from the practice squad")

    def extract(self, item, ctx: ExtractionContext) -> list[RawSignal]:
        if item.source_handle != self.handle:
            return []
        text = item.raw_text
        out: list[RawSignal] = []
        if _has(text, *self._INJURY):
            out.append(self._base(item, signal_type=SignalType.INJURY, text=text,
                                  polarity=-0.4, magnitude=0.7, extraction_confidence=0.6))
        if _has(text, *self._ROLE_UP):
            out.append(self._base(item, signal_type=SignalType.ROLE_INCREASE, text=text,
                                  trust_direction=TrustDirection.UP,
                                  polarity=0.3, magnitude=0.6, extraction_confidence=0.55))
        if _has(text, *self._ROLE_DOWN):
            out.append(self._base(item, signal_type=SignalType.ROLE_DECREASE, text=text,
                                  trust_direction=TrustDirection.DOWN,
                                  polarity=-0.3, magnitude=0.6, extraction_confidence=0.55))
        if not out and _has(text, *self._TRANS):
            out.append(self._base(item, signal_type=SignalType.LINEUP, text=text,
                                  polarity=0.0, magnitude=0.5, extraction_confidence=0.5))
        return out


@register
class XThrowthedamballExtractor(XAccountExtractor):
    """@throwthedamball — OL charting (registry Tier 2): chart numbers become
    structured SCHEME data (numbers preserved in text + magnitude)."""
    name = "x_throwthedamball"
    version = "1.0.0"
    handle = "@throwthedamball"

    _SCHEME = ("pass-block", "pass block", "run-block", "run block", "pressure rate",
               "island", "guard", "tackle", "center", "pff grade", "charted",
               "true pass set", "stunt", "blitz pickup", "oline", "o-line")

    def extract(self, item, ctx: ExtractionContext) -> list[RawSignal]:
        if item.source_handle != self.handle:
            return []
        text = item.raw_text
        if not _has(text, *self._SCHEME):
            return []
        numbers = re.findall(r"\d+(?:\.\d+)?%?", text)
        conf = 0.65 if numbers else 0.45
        return [self._base(item, signal_type=SignalType.SCHEME, text=text,
                           polarity=0.0, magnitude=0.55, extraction_confidence=conf)]


@register
class XTheWaldmanExtractor(XAccountExtractor):
    """@the_waldman — sim projections vs Vegas prop lines (registry Tier 1):
    divergence -> EXPERT_DISAGREEMENT with direction + magnitude of the gap."""
    name = "x_the_waldman"
    version = "1.0.0"
    handle = "@the_waldman"

    _DIV = ("projection", "projected", "sim", "simulation", "model has",
            "vegas", "prop line", "the line is", "over/under", "o/u",
            "disagree", "market has", "books have")

    def extract(self, item, ctx: ExtractionContext) -> list[RawSignal]:
        if item.source_handle != self.handle:
            return []
        text = item.raw_text
        if not _has(text, *self._DIV):
            return [self._base(item, signal_type=SignalType.PROJECTION_DIVERGENCE,
                               text=text, polarity=0.0, magnitude=0.4,
                               extraction_confidence=0.4)]
        numbers = [float(n) for n in re.findall(r"\d+(?:\.\d+)?", text)]
        # Divergence language with two numbers = a gap claim; direction unknown
        # from text alone -> NEUTRAL, magnitude scales with number presence.
        mag = 0.7 if len(numbers) >= 2 else 0.5
        return [self._base(item, signal_type=SignalType.EXPERT_DISAGREEMENT,
                           text=text, trust_direction=TrustDirection.NEUTRAL,
                           polarity=0.0, magnitude=mag, extraction_confidence=0.55)]


@register
class XDougClawsonExtractor(XAccountExtractor):
    """@doug_clawson — historical comps (registry Tier 3): base-rate prior notes
    attached as claim_text for the scoring prior (buildable-systems §3)."""
    name = "x_doug_clawson"
    version = "1.0.0"
    handle = "@doug_clawson"

    _COMP = ("compares to", "comparison", "reminds me of", "like prime",
             "comp for", "era-adjusted", "historical", "all-time",
             "since 2000", "since '00", "in the last decade")

    def extract(self, item, ctx: ExtractionContext) -> list[RawSignal]:
        if item.source_handle != self.handle:
            return []
        text = item.raw_text
        if not _has(text, *self._COMP):
            return []
        return [self._base(item, signal_type=SignalType.HISTORICAL_COMP, text=text,
                           claim_text=text[:300], polarity=0.0, magnitude=0.35,
                           extraction_confidence=0.5)]


@register
class XShauncoreExtractor(XAccountExtractor):
    """@shauncore — All-22 officiating/formation notes (registry Tier 3)."""
    name = "x_shauncore"
    version = "1.0.0"
    handle = "@shauncore"

    _SCHEME = ("all-22", "all 22", "formation", "coverage", "officiating",
               "flag", "penalty", "alignment", "ref ", "refs ", "no-call",
               "missed call", "shell", "rotation", "disguise")

    def extract(self, item, ctx: ExtractionContext) -> list[RawSignal]:
        if item.source_handle != self.handle:
            return []
        text = item.raw_text
        if not _has(text, *self._SCHEME):
            return []
        return [self._base(item, signal_type=SignalType.SCHEME, text=text,
                           polarity=0.0, magnitude=0.45, extraction_confidence=0.5)]


class XMATTBarloweExtractor(XAccountExtractor):
    """@matt_barlowe — PARKED. Defined but deliberately NOT registered:
    PENDING_VERIFICATION per sibling sources.py (football lane unconfirmed,
    registry Tier 4 rule). Register only when the lane is confirmed."""
    name = "x_matt_barlowe"
    version = "0.1.0"
    handle = "@matt_barlowe"

    def extract(self, item, ctx: ExtractionContext) -> list[RawSignal]:
        return []  # parked: never emits until registered
