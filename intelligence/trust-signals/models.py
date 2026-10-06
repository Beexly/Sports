# Provenance: corpus-intelligence/deep/c05/verified-claims.md §§1–4; buildable-systems.md Systems 1–5.
# Implements: beat-desk Layer 3 taxonomy (2026-09-13-beat-desk-prop-alignment-context-matrix-v5.3.0.md),
# x-intake-registry.md (source list, item format, provenance rule),
# reasoning-depth-spec.md §6.2 (verification statuses) via reasoning/enums.py,
# gse-intelligence-build/contracts/integration-contracts.md §1 (TrustSignal shape, frozen
# dataclasses, None + data_gap for missing data).

"""Core data model for the trust-signals intake module.

Everything downstream (pipeline, tipster, provider, c06's video lane) speaks these
shapes. All numeric claims carry a Verification; heuristic outputs are INFERENCE.
"""

from __future__ import annotations

import os
import sys
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from reasoning.enums import Verification  # noqa: E402


# ---------------------------------------------------------------------------
# Closed taxonomies
# ---------------------------------------------------------------------------

class SignalType(str, Enum):
    """Beat-desk classification taxonomy.

    The first six are the beat-desk spec's classes (Layer 3, verified against source).
    TRUST_QUOTE is this module's addition for the trust-dynamics lane (TNF program
    Track 3: who the QB trusts / is frustrated with). PROJECTION_DIVERGENCE and
    HISTORICAL_COMP cover the @the_waldman / @doug_clawson lanes.
    """

    INJURY = "injury"
    LINEUP = "lineup"
    SCHEME = "scheme"
    MOTIVATION = "motivation"
    WEATHER = "weather"
    OFF_FIELD = "off_field"
    TRUST_QUOTE = "trust_quote"
    PROJECTION_DIVERGENCE = "projection_divergence"
    HISTORICAL_COMP = "historical_comp"
    # --- c06 schema extension v1.1.0 (deep/c06/buildable-systems.md §1):
    # directional trust signals from the video/social extraction framework.
    TRUST_UP = "trust_up"
    TRUST_DOWN = "trust_down"
    FRUSTRATION = "frustration"
    PRAISE_UNPROMPTED = "praise_unprompted"
    ROLE_INCREASE = "role_increase"
    ROLE_DECREASE = "role_decrease"
    EXPERT_DISAGREEMENT = "expert_disagreement"
    NEWS_CONFLICT = "news_conflict"
    RETRACTION = "retraction"


class TrackTag(str, Enum):
    """Intelligence tracks an item can feed (registry item format)."""

    QB_BEHAVIOR = "QB-BEHAVIOR"
    COACHING = "COACHING"
    OL = "OL"
    TRUST_SIGNAL = "TRUST-SIGNAL"
    SCHEME = "SCHEME"
    NEWS = "NEWS"
    OTHER = "OTHER"


class TrustTier(str, Enum):
    """Beat-desk source trust tiers (spec Layer 3, verified). T4 is volume-gated."""

    T1_OFFICIAL = "T1"
    T2_BEAT = "T2"
    T3_NATIONAL = "T3"
    T4_AGGREGATE = "T4"


# Tier prior weights — SPEC defaults from the beat-desk "tier prior" concept.
# The tipster leaderboard moves the *effective* weight from these priors.
TIER_PRIORS: dict[TrustTier, float] = {
    TrustTier.T1_OFFICIAL: 1.0,
    TrustTier.T2_BEAT: 0.8,
    TrustTier.T3_NATIONAL: 0.6,
    TrustTier.T4_AGGREGATE: 0.4,
}


class SignalOrigin(str, Enum):
    """Where the signal came from. VIDEO is reserved for c06's video/social
    extraction framework — both modules write the same TrustSignal shape (S7)."""

    TEXT = "text"
    VIDEO = "video"
    NEWS_WIRE = "news_wire"
    SOCIAL = "social"  # c06 v1.1.0: social posts distinct from press video


class TrustDirection(str, Enum):
    """Direction of a trust-bearing signal for the tempered-Bayes aggregator
    (c06 schema extension v1.1.0; deep/c06/buildable-systems.md §4)."""

    UP = "up"
    DOWN = "down"
    NEUTRAL = "neutral"
    CONFLICT = "conflict"
    UNKNOWN = "unknown"


class SpeakerRole(str, Enum):
    """Role of the speaker in a quote signal (c06 schema extension v1.1.0)."""

    PLAYER = "player"
    COACH = "coach"
    EXECUTIVE = "executive"
    ANALYST = "analyst"
    UNKNOWN = "unknown"


class CalibrationState(str, Enum):
    """Wire-first calibration posture of a trust score (c06 v1.1.0).

    UNCALIBRATED: triage index only, shadow=True. Promotion requires the
    0440 NFL-port backtest gate + 0670 ŵ>0.05 protocol (buildable-systems §4.5).
    """

    UNCALIBRATED = "UNCALIBRATED"
    CALIBRATING = "CALIBRATING"
    CALIBRATED = "CALIBRATED"
    FAILED = "FAILED"


class CheckCadence(str, Enum):
    """Monitoring cadence per registry priority tiers."""

    DAILY = "daily"              # Tier 1: morning + evening in season
    WEEKLY = "weekly"            # Tier 2: Saturday pre-slate + Monday recap
    EVENT_DRIVEN = "event"       # Tier 3: only on trigger
    MONTHLY_VERIFY = "verify"    # Tier 4: resolve provenance, promote or demote


class SourceStatus(str, Enum):
    ACTIVE = "active"
    PENDING_VERIFICATION = "pending_verification"  # e.g. @matt_barlowe — not an intake source until verified


class Materiality(str, Enum):
    """News-event materiality (SPEC defaults, see deep/c05/challenges.md C8)."""

    HIGH = "high"      # starting QB/HC out, season-ending injury, major trade
    MEDIUM = "medium"  # depth-chart move, activation, scheme-revealing coordinator quote
    LOW = "low"        # narrative, standings, non-football news


class EventType(str, Enum):
    INJURY = "injury"
    TRANSACTION = "transaction"
    DEPTH_CHART = "depth_chart"
    SCHEME_QUOTE = "scheme_quote"
    NARRATIVE = "narrative"


# ---------------------------------------------------------------------------
# Frozen data shapes
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class SourceRecord:
    """One monitored source, from x-intake-registry.md (verified claims §2)."""

    handle: str                      # "@throwthedamball"
    display_name: str                # "Judah Fortgang"
    lane: str                        # "Betting analytics + OL charting"
    primary_track: TrackTag
    priority: int                    # 1..4 per registry tiers
    trust_tier: TrustTier
    cadence: CheckCadence
    status: SourceStatus = SourceStatus.ACTIVE
    notes: str = ""
    provenance: str = ""             # how the profile was sourced / gaps


@dataclass(frozen=True)
class RawItem:
    """One fetched post/article before processing."""

    source_handle: str
    post_id: str | None              # X post ID; None for wire items without IDs
    raw_text: str
    url: str | None
    observed_at: datetime            # when the post was published
    fetched_at: datetime             # when we fetched it
    provenance_gap: str | None = None  # set when content is inferred/unverifiable


@dataclass(frozen=True)
class TrustSignal:
    """The unit the reasoning layer consumes.

    Matches integration-contracts.md §1: {player_id, signal_type, text, source_url,
    observed_at, verification} plus the fields the beat-desk spec and checklist need.
    Frozen: signals are facts about a moment, never mutated — decay is computed
    at query time by the provider.
    """

    signal_id: str                   # content-addressed: sha1(source, post_id/text, type)
    team: str | None                 # 3-letter code; None + data_gap if unresolvable
    player_id: str | None
    player_name: str | None
    signal_type: SignalType
    signal_origin: SignalOrigin
    text: str
    source_handle: str
    source_url: str | None
    observed_at: datetime
    verification: Verification
    track_tags: tuple[TrackTag, ...] = ()
    polarity: float = 0.0            # -1..1 (INFERENCE heuristic unless noted)
    magnitude: float = 0.0           # 0..1
    provenance_gap: str | None = None
    data_gap: str | None = None      # set when entity resolution failed
    shadow: bool = True              # False only after deliberate promotion (C12/S8)
    # --- c06 schema extension v1.1.0 (deep/c06/buildable-systems.md §1) ---
    # All defaulted: old rows deserialize unchanged (schema_version "1.0.0").
    schema_version: str = "1.0.0"    # "1.1.0" on rows written by c06 extractors
    extractor_name: str | None = None
    extractor_version: str | None = None
    speaker_id: str | None = None
    speaker_name: str | None = None
    speaker_role: SpeakerRole = SpeakerRole.UNKNOWN
    target_id: str | None = None
    target_name: str | None = None
    quote_text: str | None = None    # verbatim quote when the signal carries one
    claim_text: str | None = None
    claim_stance: str | None = None
    story_cluster_id: str | None = None
    role_weight: float = 1.0         # LEAP w_i in [0.05, 1.5]; PROVENANCE-GAP -> 0.05
    extraction_confidence: float = 0.0
    frozen_pre_kickoff: bool | None = None
    supersedes: str | None = None    # signal_id of the row this corrects
    correction_of: str | None = None
    calibration_state: CalibrationState = CalibrationState.UNCALIBRATED
    trust_direction: TrustDirection = TrustDirection.UNKNOWN
    merged_provenance: tuple[str, ...] = ()
    dedup_of: str | None = None      # canonical signal_id when merged away


@dataclass(frozen=True)
class BeatVector:
    """Per-(team, week) aggregation — mirrors the spec's game_signals shape so a
    future DB write is a straight mapping (spec Layer 3 output paragraph)."""

    team: str
    season: int
    week: int
    injury_impact: float = 0.0
    lineup_news: float = 0.0
    scheme_notes: float = 0.0
    motivation: float = 0.0
    trust_dynamics: float = 0.0
    sources: tuple[str, ...] = ()
    newest_observed_at: datetime | None = None
    verification: Verification = Verification.COMPUTED
    # c06 v1.1.0: which path produced trust_dynamics — "heuristic" (default,
    # max-magnitude) or "bayesian" (tempered-Bayes trust_score, n_items>=3).
    trust_path: str = "heuristic"


@dataclass(frozen=True)
class HoldFlag:
    """Unresolved high-magnitude negative item: the pick still generates but
    cannot go Premium until resolved or game time (spec Layer 3)."""

    flag_id: str
    team: str | None
    reason: str
    signal_ids: tuple[str, ...]
    magnitude: float
    created_at: datetime
    resolved: bool = False


@dataclass(frozen=True)
class NewsEvent:
    """A classified news-wire event (System 4)."""

    event_id: str
    event_type: EventType
    teams: tuple[str, ...]
    players: tuple[str, ...]
    summary: str
    source_url: str | None
    observed_at: datetime
    materiality: Materiality
    verification: Verification


@dataclass(frozen=True)
class ProfileTrigger:
    """A typed re-run trigger for downstream pipelines (qb-behavioral,
    coaching-tendencies, OL). They subscribe; they never poll the intake."""

    trigger_type: str                 # "qb_profile" | "coaching_profile" | "ol_state" | "checklist_refresh"
    target: str                       # player_id, team code, or "GAME:<away>@<home>:W<w>"
    reason: str
    event_id: str
    materiality: Materiality
    created_at: datetime


def utcnow() -> datetime:
    return datetime.now(timezone.utc)
