# Provenance: c06 deep research buildable-systems.md §2.1 (contract rules) and §4.1
# (shared store). Entity resolution imported from the sibling (import, don't copy):
# trust-signals/entities.py — TEAM_ALIASES, resolve_teams, resolve_player,
# normalize_name. The "never guesses" rule is the sibling's (challenges.md C9).

"""run_extractors: validate -> entity-resolve -> stamp -> write to shared store.

Fail-loud contract (every violation raises, never coerces):
1. Every RawSignal carries source_url OR provenance_gap — else ValueError
   (registry provenance rule, same as sibling write_landing).
2. signal_type / trust_direction / claim_stance / speaker_role validated against
   closed enums — unknown values raise, never coerce.
3. The pipeline (not the extractor) resolves speaker_name/target_name -> IDs
   via the sibling's entities module. Unresolved -> data_gap on the signal.
4. The pipeline stamps extractor_name/version, computes
   signal_id = sha1(handle, post_id|quote_hash, signal_type, schema_version),
   computes frozen_pre_kickoff, and writes to the SHARED IntakeStore.
"""

from __future__ import annotations

import hashlib

from .. import entities as E
from ..models import (
    CalibrationState,
    SignalOrigin,
    SignalType,
    SpeakerRole,
    TrustDirection,
    TrustSignal,
    Verification,
    utcnow,
)
from .base import ExtractionContext, InputKind, RawSignal, TrustExtractor

SCHEMA_VERSION = "1.1.0"


def _quote_hash(quote_text: str | None) -> str | None:
    if not quote_text:
        return None
    normalized = " ".join(quote_text.lower().split())
    return hashlib.sha1(normalized.encode()).hexdigest()[:16]


def _compute_signal_id(source_handle: str, post_id: str | None,
                       quote_hash: str | None, sig_type: SignalType) -> str:
    key = post_id or quote_hash or "nokey"
    raw = f"{source_handle}|{key}|{sig_type.value}|{SCHEMA_VERSION}"
    return hashlib.sha1(raw.encode()).hexdigest()[:16]


def _validate(raw: RawSignal, extractor_name: str) -> None:
    # Rule 1: provenance — URL or gap note, never neither.
    if not raw.source_url and not raw.provenance_gap:
        raise ValueError(
            f"[{extractor_name}] RawSignal missing both source_url and "
            f"provenance_gap — provenance is mandatory (registry rule)"
        )
    # Rule 2: closed-enum validation — unknown values raise, never coerce.
    if not isinstance(raw.signal_type, SignalType):
        raise ValueError(f"[{extractor_name}] signal_type={raw.signal_type!r} "
                         f"not a SignalType member")
    if not isinstance(raw.trust_direction, TrustDirection):
        raise ValueError(f"[{extractor_name}] trust_direction={raw.trust_direction!r} "
                         f"not a TrustDirection member")
    if not isinstance(raw.speaker_role, SpeakerRole):
        raise ValueError(f"[{extractor_name}] speaker_role={raw.speaker_role!r} "
                         f"not a SpeakerRole member")
    if raw.claim_stance is not None and raw.claim_stance not in ("supports", "opposes", "neutral"):
        raise ValueError(f"[{extractor_name}] claim_stance={raw.claim_stance!r} "
                         f"must be supports|opposes|neutral")
    if not (-1.0 <= raw.polarity <= 1.0):
        raise ValueError(f"[{extractor_name}] polarity={raw.polarity} out of [-1, 1]")
    if not (0.0 <= raw.magnitude <= 1.0):
        raise ValueError(f"[{extractor_name}] magnitude={raw.magnitude} out of [0, 1]")


def _resolve_name(name: str | None, ctx: ExtractionContext) -> tuple[str | None, str | None, str | None]:
    """Resolve a person name against player roster then coach roster.

    Returns (person_id, matched_name, data_gap). Never guesses: no match ->
    (None, None, gap-note), exactly the sibling's rule.
    """
    if not name:
        return None, None, None
    pid, matched = E.resolve_player(name, ctx.roster)
    if pid:
        return pid, matched, None
    cid, cmatched = E.resolve_player(name, ctx.coach_roster)
    if cid:
        return cid, cmatched, None
    return None, None, f"entity resolution: no roster match for {name!r}"


def raw_to_signal(raw: RawSignal, item, ctx: ExtractionContext,
                  extractor: TrustExtractor) -> TrustSignal:
    """Validate + entity-resolve + stamp one RawSignal into a TrustSignal."""
    _validate(raw, extractor.name)

    speaker_id, speaker_name, speaker_gap = _resolve_name(raw.speaker_name, ctx)
    target_id, target_name, target_gap = _resolve_name(raw.target_name, ctx)

    teams = E.resolve_teams(raw.text)
    team = teams[0] if teams else (ctx.team or None)

    data_gap = speaker_gap or target_gap
    if team is None and data_gap is None:
        data_gap = "entity resolution: no team identified in text"

    quote_hash = _quote_hash(raw.quote_text)
    post_id = getattr(item, "post_id", None)
    source_handle = getattr(item, "source_handle", "")
    observed_at = raw.observed_at or getattr(item, "observed_at", None) or utcnow()

    frozen = None
    if ctx.kickoff_at is not None:
        frozen = observed_at < ctx.kickoff_at

    # PROVENANCE-GAP items pin role_weight to the LEAP floor (news-social §4).
    role_weight = 0.05 if raw.provenance_gap else 1.0

    return TrustSignal(
        signal_id=_compute_signal_id(source_handle, post_id, quote_hash, raw.signal_type),
        team=team,
        player_id=target_id,
        player_name=target_name,
        signal_type=raw.signal_type,
        signal_origin=extractor.emits_origin,
        text=raw.text[:500],
        source_handle=source_handle,
        source_url=raw.source_url,
        observed_at=observed_at,
        verification=raw.verification,
        track_tags=tuple(raw.track_tags),
        polarity=raw.polarity,
        magnitude=raw.magnitude,
        provenance_gap=raw.provenance_gap,
        data_gap=data_gap,
        shadow=True,  # wire-first: everything ships shadow until gates pass
        schema_version=SCHEMA_VERSION,
        extractor_name=extractor.name,
        extractor_version=extractor.version,
        speaker_id=speaker_id,
        speaker_name=speaker_name or raw.speaker_name,
        speaker_role=raw.speaker_role,
        target_id=target_id,
        quote_text=raw.quote_text,
        claim_text=raw.claim_text,
        claim_stance=raw.claim_stance,
        role_weight=role_weight,
        extraction_confidence=raw.extraction_confidence,
        frozen_pre_kickoff=frozen,
        calibration_state=CalibrationState.UNCALIBRATED,
        trust_direction=raw.trust_direction,
    )


def run_extractors(item, ctx: ExtractionContext, store,
                   extractors: list[TrustExtractor] | None = None,
                   kinds: frozenset[InputKind] | None = None) -> list[TrustSignal]:
    """Run extractors over one item; validate, resolve, stamp, write to the
    shared IntakeStore. Returns the TrustSignals written.

    Extractors are pure functions of (item, ctx) — no network, no clock.
    The fetch boundary is the sibling's SourceFetcher; c06 consumes RawItems.
    """
    from . import REGISTRY
    extractors = (extractors if extractors is not None
                  else [cls() for cls in REGISTRY.values()])
    item_kind = getattr(item, "input_kind", InputKind.X_POST)
    written: list[TrustSignal] = []
    for ext in extractors:
        if item_kind not in ext.input_kinds:
            continue
        if kinds is not None and not (ext.input_kinds & kinds):
            continue
        for raw in ext.extract(item, ctx):
            sig = raw_to_signal(raw, item, ctx, ext)
            store.save_signal(sig)
            written.append(sig)
    return written
