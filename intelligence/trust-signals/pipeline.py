# Provenance: beat-desk spec Layer 3 (2026-09-13-beat-desk-prop-alignment-context-matrix-v5.3.0.md,
# line 68: "ingest → classify (injury / lineup / scheme / motivation / weather / off-field)
# → entity-resolve to team/player/game → polarity × magnitude → freshness decay
# (→ source trust weight)"). Verified in deep/c05/verified-claims.md §1.
# Implements buildable-systems.md System 2. Freshness decay itself lives in decay.py;
# the source-trust weight is applied by the provider (tipster.py) at query time.

"""Beat-desk processing pipeline: RawItem → list[TrustSignal].

One raw item can yield multiple signals (e.g. an injury report that also carries
trust-dynamics language yields an INJURY signal plus a TRUST_QUOTE signal).
"""

from __future__ import annotations

import hashlib

from .classify import (
    CLASSIFICATION_VERIFICATION,
    classify,
    detect_trust_dynamics,
    is_default_classification,
    score_magnitude,
    score_polarity,
    track_tags_for,
)
from .decay import age_hours
from .entities import resolve_player, resolve_teams
from .models import (
    BeatVector,
    HoldFlag,
    RawItem,
    SignalOrigin,
    SignalType,
    SourceRecord,
    TrustSignal,
    Verification,
    utcnow,
)

# Hold-flag rule (spec Layer 3): unresolved high-magnitude negative items block Premium.
HOLD_MAGNITUDE = 0.7
HOLD_MAX_AGE_HOURS = 24.0


def _signal_id(source_handle: str, post_id: str | None, text: str, sig_type: SignalType) -> str:
    key = post_id or hashlib.sha1(text.encode()).hexdigest()[:16]
    return hashlib.sha1(f"{source_handle}|{key}|{sig_type.value}".encode()).hexdigest()[:16]


def process_item(
    item: RawItem,
    source: SourceRecord,
    roster: dict[str, str] | None = None,
    signal_origin: SignalOrigin = SignalOrigin.TEXT,
) -> list[TrustSignal]:
    """Run the beat-desk pipeline on one raw item.

    Returns 1–2 signals. Classification/polarity/magnitude are heuristics —
    every signal carries verification=INFERENCE. Entity resolution failures set
    data_gap instead of guessing (challenges.md C9).
    """
    roster = roster or {}
    sig_type = classify(item.raw_text)
    if is_default_classification(item.raw_text):
        # The text carried no beat keywords; fall back to the source's known
        # coverage lane (registry) rather than the MOTIVATION default. Only the
        # two sources with unambiguous lanes get hints — never guess for others.
        if source.handle == "@the_waldman":
            sig_type = SignalType.PROJECTION_DIVERGENCE
        elif source.handle == "@doug_clawson":
            sig_type = SignalType.HISTORICAL_COMP
    polarity = score_polarity(item.raw_text)
    magnitude = score_magnitude(item.raw_text, sig_type)
    teams = resolve_teams(item.raw_text)
    player_id, player_name = resolve_player(item.raw_text, roster)

    team = teams[0] if teams else None
    data_gap = None
    if team is None:
        data_gap = "entity resolution: no team identified in text"

    signals: list[TrustSignal] = [
        TrustSignal(
            signal_id=_signal_id(item.source_handle, item.post_id, item.raw_text, sig_type),
            team=team,
            player_id=player_id,
            player_name=player_name,
            signal_type=sig_type,
            signal_origin=signal_origin,
            text=item.raw_text[:500],
            source_handle=item.source_handle,
            source_url=item.url,
            observed_at=item.observed_at,
            verification=CLASSIFICATION_VERIFICATION,
            track_tags=tuple(track_tags_for(sig_type, item.raw_text)),
            polarity=polarity,
            magnitude=magnitude,
            provenance_gap=item.provenance_gap,
            data_gap=data_gap,
        )
    ]

    # Trust-dynamics language gets its own signal — the core of the trust lane
    # (TNF program Track 3; the Rodgers–Metcalf class).
    trust_note = detect_trust_dynamics(item.raw_text)
    if trust_note and sig_type != SignalType.TRUST_QUOTE:
        signals.append(TrustSignal(
            signal_id=_signal_id(item.source_handle, item.post_id, item.raw_text,
                                 SignalType.TRUST_QUOTE),
            team=team,
            player_id=player_id,
            player_name=player_name,
            signal_type=SignalType.TRUST_QUOTE,
            signal_origin=signal_origin,
            text=f"{trust_note}: {item.raw_text[:400]}",
            source_handle=item.source_handle,
            source_url=item.url,
            observed_at=item.observed_at,
            verification=CLASSIFICATION_VERIFICATION,
            track_tags=tuple(track_tags_for(SignalType.TRUST_QUOTE, item.raw_text)),
            polarity=polarity,
            magnitude=max(magnitude, 0.5),
            provenance_gap=item.provenance_gap,
            data_gap=data_gap,
            # c06 contract §4.4: the post text IS the verbatim quote — populating
            # quote_text lets the c06 merger dedupe TEXT rows against VIDEO rows.
            quote_text=item.raw_text[:400],
            schema_version="1.1.0",
        ))
    return signals


def build_beat_vector(
    team: str,
    season: int,
    week: int,
    signals: list[TrustSignal],
    trust_scorer=None,
) -> BeatVector:
    """Aggregate a team's signals into the spec's game_signals-shaped beat vector.

    Each component is the max magnitude among matching signals (strongest claim
    wins, not the average — one credible "starting QB ruled out" outweighs ten
    mild notes). Mirrors the spec's (injury_impact, lineup_news, scheme_notes,
    motivation) plus this module's trust_dynamics.

    trust_scorer (c06 seam, optional): a callable like
    trust_signals.scoring.aggregate_all. When provided, the trust_dynamics
    component comes from the tempered-Bayes trust_score (max |score| over
    groups with trust_path == "bayesian", i.e. n_items >= 3) instead of the
    max-magnitude heuristic; trust_path records which path was used. Default
    None = legacy heuristic behavior, unchanged.
    """
    def comp(*types: SignalType) -> float:
        vals = [s.magnitude for s in signals
                if s.signal_type in types and s.team == team and s.data_gap is None]
        return round(max(vals, default=0.0), 3)

    relevant = [s for s in signals if s.team == team and s.data_gap is None]
    newest = max((s.observed_at for s in relevant), default=None)

    trust_dynamics = comp(SignalType.TRUST_QUOTE)
    trust_path = "heuristic"
    if trust_scorer is not None:
        scores = trust_scorer(relevant)
        bayesian = [sc for sc in scores
                    if getattr(sc, "trust_path", "") == "bayesian"]
        if bayesian:
            trust_dynamics = round(max(abs(sc.trust_score) for sc in bayesian), 3)
            trust_path = "bayesian"

    return BeatVector(
        team=team,
        season=season,
        week=week,
        injury_impact=comp(SignalType.INJURY),
        lineup_news=comp(SignalType.LINEUP),
        scheme_notes=comp(SignalType.SCHEME, SignalType.PROJECTION_DIVERGENCE,
                          SignalType.HISTORICAL_COMP),
        motivation=comp(SignalType.MOTIVATION, SignalType.WEATHER, SignalType.OFF_FIELD),
        trust_dynamics=trust_dynamics,
        sources=tuple(sorted({s.source_handle for s in relevant})),
        newest_observed_at=newest,
        verification=Verification.COMPUTED,
        trust_path=trust_path,
    )


def hold_flags(signals: list[TrustSignal], now=None) -> list[HoldFlag]:
    """Emit hold flags for unresolved high-magnitude negative items (spec Layer 3:
    the pick still generates but cannot go Premium until resolved or game time)."""
    now = now or utcnow()
    flags: list[HoldFlag] = []
    for s in signals:
        if (s.magnitude >= HOLD_MAGNITUDE and s.polarity < 0
                and age_hours(s.observed_at, now) <= HOLD_MAX_AGE_HOURS):
            flags.append(HoldFlag(
                flag_id=f"hold_{s.signal_id}",
                team=s.team,
                reason=f"{s.signal_type.value} (magnitude {s.magnitude}): {s.text[:120]}",
                signal_ids=(s.signal_id,),
                magnitude=s.magnitude,
                created_at=now,
            ))
    return flags
