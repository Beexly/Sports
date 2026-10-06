# Provenance: trust-signals module data model. See README.md and
# corpus-intelligence/deep/c05/verified-claims.md for claim-level provenance.

"""Trust-signals intake module: X-account monitoring + news-wire intake for the
GSE intelligence engine's trust-signal checklist track."""

from .models import (
    BeatVector,
    CheckCadence,
    EventType,
    HoldFlag,
    Materiality,
    NewsEvent,
    ProfileTrigger,
    RawItem,
    SignalOrigin,
    SignalType,
    SourceRecord,
    SourceStatus,
    TIER_PRIORS,
    TrackTag,
    TrustSignal,
    TrustTier,
)

__all__ = [
    "BeatVector", "CheckCadence", "EventType", "HoldFlag", "Materiality",
    "NewsEvent", "ProfileTrigger", "RawItem", "SignalOrigin", "SignalType",
    "SourceRecord", "SourceStatus", "TIER_PRIORS", "TrackTag", "TrustSignal",
    "TrustTier",
]
