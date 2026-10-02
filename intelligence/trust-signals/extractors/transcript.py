# Provenance: c06 deep research buildable-systems.md §2.3 (TranscriptQuoteMiner).
# Research basis: video-cv-methods P3 (quote-miner record spec: "emit the raw
# quote so a human can judge, never just the score"; transcript-first
# architecture); d06 week-3 transcripts (the corpus votes transcript-first);
# 0359 labeling-factory pattern as the calibration path. Honest limit (video-cv
# P3): lexicons are brittle on sarcasm/coach-speak — a triage tool, never
# publish-ready. Unprompted-praise detector is an INFERENCE heuristic (no corpus
# lexicon exists). v1: stdlib only.

"""TranscriptQuoteMiner: press-conference / podcast transcript -> trust signals.

Entity mention (exact + fuzzy via sibling normalize_name) x stance lexicons
(criticism / praise / hedge / redirect) -> quote windows -> RawSignals.
"""

from __future__ import annotations

import re

from .. import entities as E
from ..models import SignalOrigin, SignalType, SpeakerRole, TrustDirection, Verification
from . import register
from .base import ExtractionContext, InputKind, RawSignal, TrustExtractor

_PRAISE = ("love", "great", "unbelievable", "special", "trust", "count on",
           "warrior", "stud", "elite", "best", "amazing", "incredible",
           "leader", "clutch", "proud of", "hell of a", "one of the best",
           "my guy", "go-to guy", "safety blanket")
_CRITICISM = ("frustrat", "disappoint", "mistake", "gotta be better",
              "has to be better", "not good enough", "pissed", "angry",
              "terrible", "awful", "horrible", "unacceptable", "can't have",
              "killing us")
_PROFANITY = ("fuck", "shit", "ass", "damn", "mfer", "motherf", "bitch",
              "hell", "sucks", "suck")
_HEDGE = ("we'll see", "maybe", "not sure", "could be", "we'll find out")
_QUESTION_PREFIX = re.compile(
    r"^\s*(q|question|reporter|media|note|update|fyi|breaking|report)\s*:",
    re.IGNORECASE)


def _speaker_role(speaker: str | None, ctx) -> SpeakerRole:
    """Resolve the speaker label against the rosters for a role.

    Never guesses: a label matching neither roster -> UNKNOWN.
    """
    if not speaker:
        return SpeakerRole.UNKNOWN
    norm = E.normalize_name(speaker)
    for key in ctx.coach_roster:
        nkey = E.normalize_name(key)
        if nkey in norm or norm in nkey:
            return SpeakerRole.COACH
    for key in ctx.roster:
        nkey = E.normalize_name(key)
        if nkey in norm or norm in nkey:
            return SpeakerRole.PLAYER
    return SpeakerRole.UNKNOWN
_SPEAKER_PREFIX = re.compile(r"^\s*([A-Z][A-Za-z'.\- ]{1,30})\s*:\s*(.*)$")


def _count(text: str, phrases) -> int:
    t = text.lower()
    return sum(1 for p in phrases if p in t)


@register
class TranscriptQuoteMiner(TrustExtractor):
    """Mines trust-direction quotes from transcript text.

    Fixture #1 (buildable-systems B4): the Rodgers–Metcalf quote
    ("this mfer sucks ass") must yield FRUSTRATION, speaker Rodgers,
    target Metcalf.
    """
    name = "transcript_quote_miner"
    version = "1.0.0"
    input_kinds = frozenset({InputKind.TRANSCRIPT})
    emits_origin = SignalOrigin.VIDEO  # press-conference video origin

    def extract(self, item, ctx: ExtractionContext) -> list[RawSignal]:
        text = item.raw_text
        if not text or not text.strip():
            return []
        lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
        out: list[RawSignal] = []
        last_question = ""
        # Build mention lookup: normalized name -> display name.
        roster = {E.normalize_name(k): k for k in ctx.roster}
        roster.update({E.normalize_name(k): k for k in ctx.coach_roster})

        for i, line in enumerate(lines):
            m = _SPEAKER_PREFIX.match(line)
            if m:
                speaker, body = m.group(1).strip(), m.group(2)
            else:
                speaker, body = None, line
            if _QUESTION_PREFIX.match(line):
                last_question = body
                continue
            lowered = " " + E.normalize_name(body) + " "
            for norm_name, display in roster.items():
                if len(norm_name) < 4 or f" {norm_name} " not in lowered:
                    continue
                stance = self._stance(body)
                if stance is None:
                    continue
                sig_type, direction, conf = stance
                # Unprompted-praise detector (INFERENCE heuristic): positive
                # mention in an answer to a question NOT about the entity.
                if (sig_type == SignalType.TRUST_UP and last_question
                        and norm_name not in E.normalize_name(last_question)):
                    sig_type = SignalType.PRAISE_UNPROMPTED
                    direction = TrustDirection.UP
                    conf = min(0.8, conf + 0.1)
                # Quote window: the mention line plus one neighbor each side.
                window = " ".join(lines[max(0, i - 1): i + 2])[:600]
                out.append(RawSignal(
                    signal_type=sig_type,
                    trust_direction=direction,
                    speaker_name=speaker,
                    target_name=display,
                    speaker_role=_speaker_role(speaker, ctx),
                    text=window,
                    quote_text=body[:400],
                    source_url=getattr(item, "url", None),
                    provenance_gap=getattr(item, "provenance_gap", None),
                    observed_at=getattr(item, "observed_at", None),
                    polarity=1.0 if direction == TrustDirection.UP else
                             (-1.0 if direction == TrustDirection.DOWN else 0.0),
                    magnitude=conf,
                    extraction_confidence=conf * 0.8,
                    verification=Verification.INFERENCE,
                    track_tags=("TRUST-SIGNAL",),
                ))
        return out

    @staticmethod
    def _stance(body: str):
        """-> (SignalType, TrustDirection, confidence) or None."""
        praise = _count(body, _PRAISE)
        crit = _count(body, _CRITICISM)
        prof = _count(body, _PROFANITY)
        if prof > 0 or crit >= 2 or (crit == 1 and praise == 0):
            # Heat/profanity -> FRUSTRATION; plain criticism -> TRUST_DOWN.
            if prof > 0:
                return SignalType.FRUSTRATION, TrustDirection.DOWN, 0.75
            return SignalType.TRUST_DOWN, TrustDirection.DOWN, 0.6
        if praise >= 1 and crit == 0 and prof == 0:
            return SignalType.TRUST_UP, TrustDirection.UP, min(0.7, 0.45 + 0.1 * praise)
        return None
