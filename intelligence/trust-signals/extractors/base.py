# Provenance: c06 deep research buildable-systems.md §2.1 (extractor plugin interface).
# Research basis: video-cv-methods P1/P2/P3 (transcript-first architecture, metadata
# sweep, quote-miner record spec); news-social-methods §3.4 (per-account elicitation
# templates); reasoning-depth-spec §8 T2 (checklist verdicts).
# v1: stdlib only. Extractors are pure functions of (item, ctx): no network, no clock.

"""Trust-signal extractor plugin framework (c06 lane).

Pluggable extractors turn RawItems (X posts, transcripts, video metadata) into
RawSignals. The pipeline (extractors/pipeline.py) validates, entity-resolves,
stamps, and writes them to the shared IntakeStore. No second store.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum
from typing import ClassVar

from ..models import SignalOrigin, SignalType, SpeakerRole, TrustDirection, Verification


class InputKind(str, Enum):
    """Declared input kinds an extractor accepts."""
    X_POST = "x_post"                    # one RawItem from an X account
    TRANSCRIPT = "transcript"            # press-conference / podcast transcript text
    VIDEO_METADATA = "video_metadata"   # title/description/uploader/timestamps (no frame CV in v1)
    NEWS_WIRE_ITEM = "news_wire_item"   # sibling RawItem passthrough for re-extraction


@dataclass(frozen=True)
class ExtractionContext:
    """Caller-supplied context for one extraction run."""
    roster: dict[str, str]            # normalized player name -> player_id
    coach_roster: dict[str, str]      # normalized coach name -> coach_id
    team: str | None                  # team scope of the sweep, if any
    week: int
    season: int
    kickoff_at: datetime | None       # for frozen_pre_kickoff computation
    schema_version: str = "1.1.0"


@dataclass
class RawSignal:
    """What an extractor may emit. The pipeline fills in: signal_id, role_weight
    (from source tier), story_cluster_id, frozen_pre_kickoff, extractor stamp.

    Contract (fail-loud, enforced by run_extractors): every RawSignal must carry
    source_url OR provenance_gap; signal_type/trust_direction/claim_stance/
    speaker_role validated against closed enums — unknown values raise, never coerce.
    """
    signal_type: SignalType
    trust_direction: TrustDirection = TrustDirection.UNKNOWN
    speaker_name: str | None = None
    target_name: str | None = None     # resolved by the pipeline via entities.resolve_player
    speaker_role: SpeakerRole = SpeakerRole.UNKNOWN
    text: str = ""
    quote_text: str | None = None
    claim_text: str | None = None
    claim_stance: str | None = None
    source_url: str | None = None
    provenance_gap: str | None = None  # REQUIRED if source_url is None — else rejected
    observed_at: datetime | None = None
    track_tags: tuple = ()
    polarity: float = 0.0
    magnitude: float = 0.0
    extraction_confidence: float = 0.0
    verification: Verification = Verification.INFERENCE


class TrustExtractor(ABC):
    """Base class for all trust-signal extractors.

    Subclasses declare name/version/input_kinds/emits_origin and implement
    extract(item, ctx) -> list[RawSignal]. Pure function: no network, no clock.
    Entity resolution is the pipeline's job, never the extractor's.
    """

    name: ClassVar[str]                          # e.g. "x_mysportsupdate"
    version: ClassVar[str]                       # semver; bumped on any logic change
    input_kinds: ClassVar[frozenset[InputKind]]  # declared inputs
    emits_origin: ClassVar[SignalOrigin]         # VIDEO or SOCIAL (c06 lanes)

    @abstractmethod
    def extract(self, item, ctx: ExtractionContext) -> list[RawSignal]:
        """Extract raw signals from one item (a sibling RawItem or a transcript
        wrapper with .raw_text). Returns possibly-empty list."""
        ...
