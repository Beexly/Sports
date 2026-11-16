"""Immutable typed domain models for gse_engine."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Literal

PositionType = Literal["QB", "RB", "WR", "TE", "DST"]
DecisionType = Literal["PLAY", "PASS"]
FeedKind = Literal["csv", "parquet", "json"]


@dataclass(frozen=True, slots=True)
class FeedGuardVerdict:
    """Result of verifying downloaded feed bytes prior to parsing."""

    ok: bool
    expected_kind: FeedKind
    detected_kind: str
    reason: str
    sha256: str


@dataclass(frozen=True, slots=True)
class SpanGroundedClaim:
    """Beat/press-conference claim anchored to exact character offsets."""

    player_name: str
    team: str
    injury_tag: str
    coach_claim: str
    verbatim_quote: str
    start_char: int
    end_char: int
    snap_limit_hint: float | None = None


@dataclass(frozen=True, slots=True)
class PlayerShare:
    """Active Stage-0 player opportunity profile for a single game."""

    player_id: str
    player_name: str
    position: Literal["RB", "WR", "TE"]
    active: bool
    base_target_share: float
    base_carry_share: float
    depth_rank: int = 1


@dataclass(frozen=True, slots=True)
class ConservedVolumeResult:
    """Conserved target and carry distribution across healthy active teammates."""

    allocated_targets: dict[str, float]
    allocated_carries: dict[str, float]
    residual_target_share: float
    residual_carry_share: float
    named_target_attribution: float
    named_carry_attribution: float
    efficiency_boost: float


@dataclass(frozen=True, slots=True)
class QuarterbackRushInput:
    """Empirical quarterback rushing input profile without phantom Gamma clamps."""

    player_id: str
    player_name: str
    expected_dropbacks: float
    scramble_rate_per_dropback: float
    yards_per_scramble: float
    designed_rushes_per_game: float
    yards_per_designed_rush: float
    victory_formation_prob: float
    expected_kneeldowns_when_winning: float = 1.8


@dataclass(frozen=True, slots=True)
class QuarterbackRushProjection:
    """Projected quarterback rush yards and attempts including Q4 kneeldowns."""

    mean_rush_yards: float
    median_rush_yards: float
    p10_rush_yards: float
    p90_rush_yards: float
    mean_rush_attempts: float
    expected_kneel_yards: float


@dataclass(frozen=True, slots=True)
class TwoSidedPropCandidate:
    """Candidate player prop market requiring two-sided pricing."""

    prop_id: str
    player_id: str
    player_name: str
    market: str
    line: float
    side: Literal["OVER", "UNDER"]
    model_prob: float
    conformal_lower_prob: float
    over_american: int | None
    under_american: int | None
    sgp_bundle_id: str | None = None
    public_note: str = ""


@dataclass(frozen=True, slots=True)
class GatedPropDecision:
    """Post-gate player prop output with strict PASS discipline."""

    prop_id: str
    player_id: str
    player_name: str
    market: str
    line: float
    side: Literal["OVER", "UNDER"]
    decision: DecisionType
    publish_allowed: bool
    confidence_display: str
    devigged_market_prob: float | None
    expected_clv: float
    reasons: tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True, slots=True)
class CagePolicyReceipt:
    """Deterministic SHA-256 policy verification receipt for a slate batch."""

    policy_id: str
    decision: Literal["ADMIT", "REFUSE"]
    payload_sha256: str
    refused_reasons: tuple[str, ...] = field(default_factory=tuple)


@dataclass(frozen=True, slots=True)
class DfsPlayerPoolItem:
    """DraftKings DFS slate player candidate."""

    player_id: str
    name: str
    team: str
    position: PositionType
    salary: int
    kickoff_utc: str
    projected_points: float
    p20_value_mult: float
    median_snaps: float
    ownership_pct: float = 0.1


@dataclass(frozen=True, slots=True)
class SlateWindowConfig:
    """Canonical Three-Noon Master Lock and T-90m window metadata."""

    season: int
    week: int
    window_slot: Literal["TNF", "SUN_EARLY", "SUN_LATE", "SNF", "MNF"]
    mode: Literal["noon-lock", "t90m-adjust"]


@dataclass(frozen=True, slots=True)
class BacktestCalibrationReport:
    """Walk-forward calibration and stake-unlock summary."""

    sample_size: int
    ece: float
    brier_score: float
    decided_clv_beat_rate: float
    max_ece_allowed: float
    real_money_stake_cleared: bool
    reason: str
