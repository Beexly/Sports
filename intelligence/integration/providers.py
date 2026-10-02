# PROVENANCE: implements contracts/integration-contracts.md §1 (provider interfaces) and the
# data-shape contracts. Research basis:
# - tnf-intelligence-program-2026-10-01.md §3 (QB behavioral profile fields: HHI, trust targets,
#   INT splits, scramble rate, EPA/dropback vs coverage) and §4 (coaching tendency fields)
# - c09-map.md #1 (21-QB behavioral matrix schema), #2 (vs-blitz/pressure/coverage splits,
#   trust targets), #5 (scheme fingerprints + OL injury flags), #8 (QB Pressure Sensitivity PARKED —
#   get_pressure_splits raises DataGapError until sourced), #9 (NGS tracking ingest fields)
# - x-intake-registry.md (trust-signal intake: source_url + PROVENANCE-GAP rule)
"""Provider interfaces: the contracts sibling modules (qb-behavior, coaching, trust-signals)
must implement. The integration layer depends only on these ABCs, never on module internals."""
from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import Optional

from .types import Verification


class DataGapError(Exception):
    """Raised when a provider has no usable data for the request.
    The integration layer converts this to a DATA-GAP checklist verdict (spec §5)."""
    def __init__(self, track: str, reason: str):
        super().__init__(f"DATA-GAP [{track}]: {reason}")
        self.track = track
        self.reason = reason


# ---------------------------------------------------------------------------
# Data shapes — frozen dataclasses. Every numeric claim carries verification.
# Missing data is None + data_gap reason, never a zero (map #13).
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class QBBehaviorProfile:
    qb_id: str
    name: str
    team: str
    week: int
    season: int
    epa_per_dropback: Optional[float] = None
    cpoe: Optional[float] = None
    pressure_to_sack_rate: Optional[float] = None
    first_read_rate: Optional[float] = None
    scramble_rate: Optional[float] = None
    aggressiveness: Optional[float] = None
    adot: Optional[float] = None
    target_hhi: Optional[float] = None            # target concentration (Rodgers pattern)
    trust_target_share_3rd: Optional[float] = None
    trust_target_share_redzone: Optional[float] = None
    verification: Verification = Verification.CORPUS
    data_gap: Optional[str] = None


@dataclass(frozen=True)
class PressureSplits:
    """Clean-vs-pressured efficiency splits. c09-map.md #8: PARKED until sourced."""
    qb_id: str
    int_rate_clean: Optional[float] = None
    int_rate_pressure: Optional[float] = None
    epa_per_dropback_clean: Optional[float] = None
    epa_per_dropback_pressure: Optional[float] = None
    verification: Verification = Verification.CORPUS
    data_gap: Optional[str] = None


@dataclass(frozen=True)
class CoachProfile:
    coach_id: str
    name: str
    role: str                                     # HC | OC | DC
    team: str
    season: int
    early_down_pass_rate: Optional[float] = None
    fourth_down_go_rate: Optional[float] = None
    blitz_rate: Optional[float] = None            # DC
    man_coverage_rate: Optional[float] = None     # DC
    yoy_delta_note: Optional[str] = None
    verification: Verification = Verification.CORPUS
    data_gap: Optional[str] = None


@dataclass(frozen=True)
class SchemeFingerprint:
    team: str
    week: int
    season: int
    motion_rate: Optional[float] = None
    play_action_rate: Optional[float] = None
    shotgun_rate: Optional[float] = None
    rpo_rate: Optional[float] = None
    quickgame_rate: Optional[float] = None        # proxy via air yards until TTT sourced
    ttt_seconds: Optional[float] = None          # time-to-throw; None until charting/NGS sourced
    avg_air_yards: Optional[float] = None
    early_down_pass_rate: Optional[float] = None
    verification: Verification = Verification.CORPUS
    data_gap: Optional[str] = None


@dataclass(frozen=True)
class TrustSignal:
    player_id: str
    signal_type: str                               # trust | frustration | role_change | praise | injury_news
    text: str
    source_url: Optional[str] = None               # PROVENANCE-GAP if None (x-intake-registry)
    observed_at: Optional[str] = None
    verification: Verification = Verification.SINGLE_SOURCE


@dataclass(frozen=True)
class OLState:
    team: str
    week: int
    season: int
    starters_out: tuple[str, ...] = ()
    practice_status: tuple[tuple[str, str], ...] = ()   # (player, DNP | LIMITED | FULL)
    continuity_index: Optional[float] = None
    pressure_rate_allowed: Optional[float] = None
    verification: Verification = Verification.CORPUS
    data_gap: Optional[str] = None


# ---------------------------------------------------------------------------
# Provider ABCs
# ---------------------------------------------------------------------------

class QBBehaviorProvider(ABC):
    @abstractmethod
    def get_qb_profile(self, qb_id: str, week: int, season: int) -> QBBehaviorProfile: ...
    @abstractmethod
    def get_pressure_splits(self, qb_id: str, week: int, season: int) -> PressureSplits: ...


class CoachingProvider(ABC):
    @abstractmethod
    def get_coach_profile(self, coach_id: str, season: int) -> CoachProfile: ...
    @abstractmethod
    def get_scheme_fingerprint(self, team: str, week: int, season: int) -> SchemeFingerprint: ...


class TrustSignalProvider(ABC):
    @abstractmethod
    def get_trust_signals(self, team: str, week: int, season: int) -> tuple[TrustSignal, ...]: ...


class OLProvider(ABC):
    @abstractmethod
    def get_ol_state(self, team: str, week: int, season: int) -> OLState: ...


@dataclass(frozen=True)
class ProviderRegistry:
    """The wiring point. Sibling modules register their providers here;
    analyze() consumes the registry, never the modules."""
    qb: Optional[QBBehaviorProvider] = None
    coaching: Optional[CoachingProvider] = None
    trust: Optional[TrustSignalProvider] = None
    ol: Optional[OLProvider] = None

    def missing_tracks(self) -> tuple[str, ...]:
        missing = []
        if self.qb is None:
            missing.append("qb_behavior")
        if self.coaching is None:
            missing.append("coaching_scheme")
        if self.trust is None:
            missing.append("trust_signals")
        if self.ol is None:
            missing.append("offensive_line")
        return tuple(missing)
