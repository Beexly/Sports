# Provenance: c06 deep research buildable-systems.md §2.3 (ClipMetadataHarvester)
# and B8 (stretch). Research basis: video-cv-methods P2 (entity-keyed,
# time-windowed sweep metadata; fail-loud QC; deterministic frame sampling from
# the d07 spec). The Rodgers–Metcalf miss is the motivating regression test:
# the miss was discovery/triage, not CV — an entity-keyed metadata sweep would
# have caught it. v1: metadata half only (title/description/uploader/posted_ts);
# frame decode (dHash perceptual dedupe, shot boundaries) is v1.5.

"""Clip metadata harvester + entity-keyed sweep planner.

Consumes VIDEO_METADATA items (title/description/uploader/posted_ts records)
and emits TRUST_QUOTE signals when metadata carries entity mentions with
trust-direction language. No frame CV in v1 — the metadata is the discovery
surface.
"""

from __future__ import annotations

import hashlib
from dataclasses import dataclass
from datetime import datetime, timedelta

from .. import entities as E
from ..models import SignalOrigin, SignalType, TrustDirection, Verification
from . import register
from .base import ExtractionContext, InputKind, RawSignal, TrustExtractor

_TRUST_UP_WORDS = ("trust", "praise", "love", "confidence in", "my guy",
                   "go-to", "safety blanket", "count on")
_TRUST_DOWN_WORDS = ("frustrat", "criticiz", "calls out", "sucks", "angry",
                      "disappoint", "feud", "tension", "rift")


def _has(text: str, phrases) -> bool:
    t = text.lower()
    return any(p in t for p in phrases)


def metadata_content_hash(title: str, description: str, uploader: str) -> str:
    """Dedupe key for metadata payloads: byte-identical payloads -> one item.
    (v1.5 adds 64-bit dHash perceptual dedupe on downsampled frames.)"""
    payload = f"{title}|{description}|{uploader}".encode()
    return hashlib.sha1(payload).hexdigest()[:16]


@dataclass(frozen=True)
class SweepCell:
    """One (entity, time-window) cell of the discovery sweep plan."""
    entity: str
    window_start: datetime
    window_end: datetime
    query: str  # entity-keyed search query for the window


def build_sweep_plan(entities: list[str], window_start: datetime,
                     window_end: datetime, window_hours: int = 24) -> list[SweepCell]:
    """Emit a sweep plan covering every (entity, window) cell — B8 coverage.

    Windows tile [window_start, window_end) in window_hours chunks; every
    entity gets every window. Deterministic: same inputs -> same plan.
    """
    cells: list[SweepCell] = []
    cursor = window_start
    while cursor < window_end:
        w_end = min(cursor + timedelta(hours=window_hours), window_end)
        for ent in entities:
            cells.append(SweepCell(
                entity=ent,
                window_start=cursor,
                window_end=w_end,
                query=f"{ent} press conference interview",
            ))
        cursor = w_end
    return cells


@register
class ClipMetadataHarvester(TrustExtractor):
    """Harvests video-clip metadata (title/description/uploader/posted_ts).

    Entity-keyed, time-windowed: emits TRUST_QUOTE (+ direction when the
    title/description carries it). This is what would have caught the
    Rodgers–Metcalf video.
    """
    name = "clip_metadata_harvester"
    version = "1.0.0"
    input_kinds = frozenset({InputKind.VIDEO_METADATA})
    emits_origin = SignalOrigin.VIDEO

    def extract(self, item, ctx: ExtractionContext) -> list[RawSignal]:
        title = getattr(item, "title", "") or ""
        description = getattr(item, "description", "") or ""
        uploader = getattr(item, "uploader", "") or ""
        blob = f"{title} {description}"
        if not blob.strip():
            return []
        lowered = " " + E.normalize_name(blob) + " "
        out: list[RawSignal] = []
        roster = {E.normalize_name(k): k for k in ctx.roster}
        for norm_name, display in roster.items():
            if len(norm_name) < 4 or f" {norm_name} " not in lowered:
                continue
            direction = TrustDirection.UNKNOWN
            if _has(blob, _TRUST_UP_WORDS):
                direction = TrustDirection.UP
            elif _has(blob, _TRUST_DOWN_WORDS):
                direction = TrustDirection.DOWN
            out.append(RawSignal(
                signal_type=SignalType.TRUST_QUOTE,
                trust_direction=direction,
                target_name=display,
                text=f"{title} — {description[:300]} (via {uploader})"[:500],
                source_url=getattr(item, "url", None),
                provenance_gap=getattr(item, "provenance_gap", None),
                observed_at=(getattr(item, "posted_at", None)
                             or getattr(item, "observed_at", None)),
                polarity=1.0 if direction == TrustDirection.UP else
                         (-1.0 if direction == TrustDirection.DOWN else 0.0),
                magnitude=0.5,
                extraction_confidence=0.45,
                verification=Verification.INFERENCE,
                track_tags=("TRUST-SIGNAL",),
            ))
        return out
