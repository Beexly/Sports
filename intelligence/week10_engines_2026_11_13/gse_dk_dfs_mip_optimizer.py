"""Galaxy Sports Edge (Galaxy Sports Network LLC) — Week 10 DraftKings NFL DFS MILP Optimizer.

Implements every mathematical formulation documented in:
`DRAFTKINGS-DFS-THE-DEEP-DIVE-2026-11-07 (1).md`
  1. DraftKings NFL Classic ($50,000 cap; 1 QB, 2 RB, 3 WR, 1 TE, 1 FLEX [RB/WR/TE], 1 DST;
     max 8 players from 1 NFL team; min 2 distinct NFL games; zero duplicate players).
  2. DraftKings NFL Showdown Captain Mode (1 CPT at 1.5x salary & 1.5x points + 5 UTIL at
     1.0x salary & 1.0x points under $50,000; both teams represented; zero duplicate players).
  3. Structural correlation constraints (Hunter, Vielma & Zaman, INFORMS J. on Optimization
     2019, arXiv:1604.01455v3):
       - QB + WR/TE primary team stack constraints (QB+1, modal QB+2, optional max stack cap).
       - Opposing-team game bring-back constraints (RB/WR/TE from opposing team).
       - QB vs opposing DST negative-correlation exclusion (Part VI.5).
  4. Sequential submodular portfolio diversity / exact Hamming distance constraint (HVZ eq. 4.8):
       - Pairwise player overlap cap sum_i x^(l)_i * x_i <= gamma, equivalent to binary indicator
         Hamming distance d_H(x^(l), x) = 2 * (L - overlap) >= d_min, with HVZ slate-adaptive
         defaults (gamma=4 for >9 games, gamma=6 for 4..9 games, gamma=7 for <4 games).
  5. Field ownership-leverage & duplication-avoidance objective penalty (Haugh & Singal,
     Management Science 2021; Part I/III/VI):
       - Additive log-duplication penalty + linear chalk penalty + ceiling upside bonus +
         Mbeledogu (MIT Sloan SSAC 2023) projection-error uncertainty penalty, plus optional
         cumulative ownership barbell bounds and sub-10% skill leverage floor.
  6. DraftKings per-player late-swap lock handling (Part II & Part IX):
       - Pins locked players (and optional slot-pinned entries) to 1 while blocking unrostered
         players from already kicked-off games from swapping into unlocked late-window / MNF slots.
  7. Hard Week 10 NFL slate-hygiene filters:
       - Blocks Week 10 Bye teams: CHI, DEN, PHI, TB.
       - Blocks completed TNF teams from Sunday 12:00 PM CST Main Slate pools: WAS, NYG.
       - Blocks Sunday 8:30 AM CST Munich teams from Sunday 12:00 PM CST Main Slate pools: NE, DET.
       - Blocks Week 10 IR/OUT players: Lamar Jackson, Puka Nacua, Davante Adams, Josh Jacobs,
         TreVeyon Henderson, Malik Willis, Sam Darnold, Gardner Minshew, Michael Wilson.
  8. Post-solve Winner's-Curse selection-bias haircut diagnostic (Part VI.3: sigma * sqrt(2 ln K)).
"""

from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, Iterable, List, Mapping, Optional, Sequence, Set, Tuple

import numpy as np
from scipy.optimize import Bounds, LinearConstraint, milp


# ============================================================================
# Hard Week 10 NFL Slate-Hygiene Constants
# ============================================================================

CLASSIC_SALARY_CAP: int = 50_000
SHOWDOWN_SALARY_CAP: int = 50_000

CLASSIC_SLOTS: Tuple[str, ...] = ("QB", "RB", "WR", "TE", "FLEX", "DST")
CLASSIC_SLOT_COUNTS: Mapping[str, int] = {
    "QB": 1,
    "RB": 2,
    "WR": 3,
    "TE": 1,
    "FLEX": 1,
    "DST": 1,
}
CLASSIC_ROSTER_SIZE: int = 9
SHOWDOWN_ROSTER_SIZE: int = 6
FLEX_ELIGIBLE_POSITIONS: frozenset[str] = frozenset({"RB", "WR", "TE"})
VALID_POSITIONS: frozenset[str] = frozenset({"QB", "RB", "WR", "TE", "DST"})

WEEK_10_BYE_TEAMS: frozenset[str] = frozenset({"CHI", "DEN", "PHI", "TB"})
WEEK_10_COMPLETED_TNF_TEAMS: frozenset[str] = frozenset({"WAS", "NYG"})
WEEK_10_MUNICH_830AM_CST_TEAMS: frozenset[str] = frozenset({"NE", "DET"})

WEEK_10_IR_OUT_DISPLAY_NAMES: Tuple[str, ...] = (
    "Lamar Jackson",
    "Puka Nacua",
    "Davante Adams",
    "Josh Jacobs",
    "TreVeyon Henderson",
    "Malik Willis",
    "Sam Darnold",
    "Gardner Minshew",
    "Michael Wilson",
)

BLOCKED_INJURY_STATUSES: frozenset[str] = frozenset(
    {"IR", "OUT", "O", "INA", "INACTIVE", "SUSP", "PUP", "NFI", "DOUBTFUL_OUT"}
)

_NAME_SUFFIX_RE = re.compile(r"\b(jr|sr|ii|iii|iv|v)\b$", re.IGNORECASE)
_NON_ALNUM_RE = re.compile(r"[^a-z0-9]+")


def normalize_player_name(name: str) -> str:
    """Canonicalize player names for punctuation- and suffix-insensitive matching."""
    cleaned = name.strip().lower().replace("'", "").replace("’", "")
    cleaned = _NON_ALNUM_RE.sub(" ", cleaned).strip()
    cleaned = _NAME_SUFFIX_RE.sub("", cleaned).strip()
    return re.sub(r"\s+", " ", cleaned)


def normalize_team_code(team: str) -> str:
    """Normalize NFL team abbreviations (e.g., JAX/JAC, LAR/LA)."""
    code = team.strip().upper()
    aliases = {"JAC": "JAX", "WSH": "WAS", "LVR": "LV"}
    return aliases.get(code, code)


def normalize_position(pos: str) -> str:
    """Normalize DraftKings position labels."""
    cleaned = pos.strip().upper()
    if cleaned in {"D/ST", "DEF", "DST"}:
        return "DST"
    if cleaned not in VALID_POSITIONS:
        raise ValueError(f"Unsupported DraftKings NFL position: {pos!r}")
    return cleaned


def normalize_ownership(raw_ownership: float) -> float:
    """Normalize ownership from percentage [0, 100] or fraction [0, 1] into (0, 1]."""
    if raw_ownership < 0:
        raise ValueError(f"Projected ownership must be non-negative, got {raw_ownership}")
    frac = raw_ownership / 100.0 if raw_ownership > 1.0 else float(raw_ownership)
    return min(max(frac, 1e-4), 1.0)


WEEK_10_IR_OUT_CANONICAL_NAMES: frozenset[str] = frozenset(
    normalize_player_name(n) for n in WEEK_10_IR_OUT_DISPLAY_NAMES
)


class SlateMode(str, Enum):
    """Supported DraftKings Week 10 contest formats."""

    CLASSIC_SUNDAY_MAIN = "CLASSIC_SUNDAY_MAIN"
    SHOWDOWN_CAPTAIN = "SHOWDOWN_CAPTAIN"


class OptimizationInfeasibleError(RuntimeError):
    """Raised when the MILP constraints admit no feasible DraftKings lineup."""


class LateSwapValidationError(ValueError):
    """Raised when late-swap lock specifications violate DraftKings roster or cap rules."""


# ============================================================================
# Data Structures
# ============================================================================


@dataclass(frozen=True)
class PlayerPoolEntry:
    """Single DraftKings NFL player record with projection, ownership, and game metadata."""

    player_id: str
    name: str
    team: str
    opponent: str
    positions: Tuple[str, ...]
    salary: int
    projected_points: float
    projected_ownership: float = 0.08
    cpt_projected_ownership: Optional[float] = None
    ceiling_points: Optional[float] = None
    projection_std: float = 0.0
    game_id: Optional[str] = None
    kickoff_epoch_cst: Optional[float] = None
    injury_status: Optional[str] = None
    slate_window: str = "SUNDAY_12PM_CST_MAIN"

    def __post_init__(self) -> None:
        if isinstance(self.positions, str):
            raw_positions = [p for p in self.positions.split("/") if p.strip()]
        else:
            raw_positions = list(self.positions)
        if not raw_positions:
            raise ValueError(f"Player {self.name!r} must have at least one eligible position.")
        norm_positions = tuple(dict.fromkeys(normalize_position(p) for p in raw_positions))
        object.__setattr__(self, "positions", norm_positions)
        object.__setattr__(self, "team", normalize_team_code(self.team))
        object.__setattr__(self, "opponent", normalize_team_code(self.opponent))
        if self.salary <= 0:
            raise ValueError(f"Player {self.name!r} salary must be positive, got {self.salary}")
        norm_own = normalize_ownership(self.projected_ownership)
        object.__setattr__(self, "projected_ownership", norm_own)
        if self.cpt_projected_ownership is not None:
            norm_cpt_own = normalize_ownership(self.cpt_projected_ownership)
        else:
            norm_cpt_own = normalize_ownership(min(1.0, max(1e-4, 0.35 * norm_own)))
        object.__setattr__(self, "cpt_projected_ownership", norm_cpt_own)
        if self.ceiling_points is None:
            default_ceil = self.projected_points + max(1.5 * self.projection_std, 0.25 * self.projected_points)
            object.__setattr__(self, "ceiling_points", float(default_ceil))
        if not self.game_id:
            teams_sorted = sorted((self.team, self.opponent))
            object.__setattr__(self, "game_id", f"{teams_sorted[0]}@{teams_sorted[1]}")

    @property
    def cpt_salary(self) -> int:
        """DraftKings Showdown Captain salary at 1.5x base UTIL salary."""
        return int(round(1.5 * self.salary))

    @property
    def cpt_projected_points(self) -> float:
        """DraftKings Showdown Captain projected points at 1.5x base UTIL projection."""
        return 1.5 * self.projected_points

    @property
    def canonical_name(self) -> str:
        return normalize_player_name(self.name)

    def is_flex_eligible(self) -> bool:
        return bool(FLEX_ELIGIBLE_POSITIONS.intersection(self.positions))

    def eligible_classic_slots(self) -> Tuple[str, ...]:
        slots: List[str] = []
        for pos in ("QB", "RB", "WR", "TE", "DST"):
            if pos in self.positions:
                slots.append(pos)
        if self.is_flex_eligible():
            slots.append("FLEX")
        return tuple(slots)


@dataclass(frozen=True)
class BlockedPlayerRecord:
    """Audit trace for every player removed by Week 10 slate hygiene."""

    player_id: str
    name: str
    team: str
    reason_code: str
    detail: str


@dataclass(frozen=True)
class SlateHygieneReport:
    """Filtered pool plus immutable audit report of all blocked players."""

    eligible_pool: Tuple[PlayerPoolEntry, ...]
    blocked_players: Tuple[BlockedPlayerRecord, ...]

    @property
    def blocked_by_reason(self) -> Dict[str, int]:
        counts: Dict[str, int] = {}
        for rec in self.blocked_players:
            counts[rec.reason_code] = counts.get(rec.reason_code, 0) + 1
        return counts


@dataclass(frozen=True)
class LateSwapState:
    """Per-player DraftKings late-swap lock state (Part II & Part IX)."""

    locked_player_ids: frozenset[str] = frozenset()
    locked_slot_assignments: Mapping[str, str] = field(default_factory=dict)
    excluded_player_ids: frozenset[str] = frozenset()
    locked_game_ids: frozenset[str] = frozenset()
    current_time_epoch_cst: Optional[float] = None


@dataclass(frozen=True)
class ClassicOptimizerConfig:
    """Configuration for DraftKings NFL Classic MILP optimization."""

    salary_cap: int = CLASSIC_SALARY_CAP
    min_salary: int = 0
    max_players_per_team: int = 8
    min_games: int = 2
    min_qb_stack: int = 1
    max_qb_stack: Optional[int] = None
    allow_rb_in_primary_stack: bool = False
    min_bringback: int = 1
    bringback_positions: Tuple[str, ...] = ("RB", "WR", "TE")
    disallow_qb_vs_opp_dst: bool = True
    disallow_offense_vs_selected_dst: bool = False
    ownership_penalty_weight: float = 2.5
    dup_log_penalty_weight: float = 0.65
    ownership_floor_ref: float = 0.02
    ceiling_upside_weight: float = 0.0
    robust_error_rho: float = 0.0
    min_cumulative_ownership: Optional[float] = None
    max_cumulative_ownership: Optional[float] = None
    min_sub_10pct_skill_players: int = 0
    max_overlap: Optional[int] = None
    min_unique_players: Optional[int] = None
    min_hamming_distance: Optional[int] = None
    max_player_exposure: Optional[float] = None
    candidate_pool_size_for_haircut: int = 5_000


@dataclass(frozen=True)
class ShowdownOptimizerConfig:
    """Configuration for DraftKings NFL Showdown Captain Mode MILP optimization."""

    salary_cap: int = SHOWDOWN_SALARY_CAP
    min_salary: int = 0
    min_players_per_team: int = 1
    max_players_per_team: int = 5
    pair_pass_catcher_cpt_with_qb: bool = True
    min_qb_cpt_pass_catchers: int = 1
    min_bringback_opponents: int = 1
    disallow_cpt_dst_vs_opp_qb: bool = True
    ownership_penalty_weight: float = 2.0
    dup_log_penalty_weight: float = 0.55
    ownership_floor_ref: float = 0.02
    ceiling_upside_weight: float = 0.0
    robust_error_rho: float = 0.0
    max_overlap: Optional[int] = None
    min_unique_players: Optional[int] = None
    min_hamming_distance: Optional[int] = None
    enforce_distinct_cpt_or_roster: bool = True
    block_completed_tnf_and_munich: bool = True
    candidate_pool_size_for_haircut: int = 2_002


@dataclass(frozen=True)
class RosteredSlotPlayer:
    """Single assigned slot inside an optimized Classic or Showdown lineup."""

    slot: str
    player: PlayerPoolEntry
    effective_salary: int
    effective_projected_points: float
    effective_ownership: float


@dataclass(frozen=True)
class OptimizedLineup:
    """Solved MILP lineup with correlation, ownership, and winner's-curse diagnostics."""

    lineup_index: int
    mode: SlateMode
    slots: Tuple[RosteredSlotPlayer, ...]
    total_salary: int
    total_projected_points: float
    objective_score: float
    cumulative_ownership: float
    log_duplication_index: float
    distinct_games_count: int
    team_counts: Mapping[str, int]
    stack_summary: str
    winners_curse_haircut_points: float
    haircut_adjusted_points: float

    @property
    def player_ids(self) -> Tuple[str, ...]:
        return tuple(s.player.player_id for s in self.slots)

    @property
    def player_id_set(self) -> frozenset[str]:
        return frozenset(self.player_ids)


# ============================================================================
# Hard Week 10 Slate-Hygiene Filter
# ============================================================================


def apply_week10_slate_hygiene(
    players: Sequence[PlayerPoolEntry],
    mode: SlateMode = SlateMode.CLASSIC_SUNDAY_MAIN,
    block_completed_tnf_and_munich: bool = True,
) -> SlateHygieneReport:
    """Apply hard Week 10 NFL slate-hygiene filters and deduplicate the player pool.

    Automatically blocks:
      - Week 10 Bye teams: CHI, DEN, PHI, TB
      - Completed TNF (WAS, NYG) on Sunday 12:00 PM CST Main Slate (or when enabled)
      - Sunday 8:30 AM CST Munich (NE, DET) on Sunday 12:00 PM CST Main Slate (or when enabled)
      - Week 10 verified IR/OUT players (Lamar Jackson, Puka Nacua, Davante Adams,
        Josh Jacobs, TreVeyon Henderson, Malik Willis, Sam Darnold, Gardner Minshew,
        Michael Wilson) and any player tagged with an IR/OUT/INACTIVE status.
    """
    eligible: List[PlayerPoolEntry] = []
    blocked: List[BlockedPlayerRecord] = []
    seen_ids: Set[str] = set()
    seen_name_team: Set[Tuple[str, str]] = set()

    enforce_main_window = (
        mode == SlateMode.CLASSIC_SUNDAY_MAIN or block_completed_tnf_and_munich
    )

    for p in players:
        if p.team in WEEK_10_BYE_TEAMS or p.opponent in WEEK_10_BYE_TEAMS:
            blocked.append(
                BlockedPlayerRecord(
                    player_id=p.player_id,
                    name=p.name,
                    team=p.team,
                    reason_code="WEEK10_BYE_TEAM",
                    detail=f"Blocked Week 10 Bye team ({p.team} vs {p.opponent}).",
                )
            )
            continue

        if enforce_main_window and (
            p.team in WEEK_10_COMPLETED_TNF_TEAMS
            or p.opponent in WEEK_10_COMPLETED_TNF_TEAMS
        ):
            blocked.append(
                BlockedPlayerRecord(
                    player_id=p.player_id,
                    name=p.name,
                    team=p.team,
                    reason_code="COMPLETED_TNF_SLATE",
                    detail=f"Blocked completed TNF matchup ({p.team} vs {p.opponent}) from Sunday 12:00 PM CST Main Slate.",
                )
            )
            continue

        if enforce_main_window and (
            p.team in WEEK_10_MUNICH_830AM_CST_TEAMS
            or p.opponent in WEEK_10_MUNICH_830AM_CST_TEAMS
        ):
            blocked.append(
                BlockedPlayerRecord(
                    player_id=p.player_id,
                    name=p.name,
                    team=p.team,
                    reason_code="MUNICH_830AM_CST_SLATE",
                    detail=f"Blocked Sunday 8:30 AM CST Munich game ({p.team} vs {p.opponent}) from Sunday 12:00 PM CST Main Slate.",
                )
            )
            continue

        if p.canonical_name in WEEK_10_IR_OUT_CANONICAL_NAMES:
            blocked.append(
                BlockedPlayerRecord(
                    player_id=p.player_id,
                    name=p.name,
                    team=p.team,
                    reason_code="WEEK10_IR_OUT_LIST",
                    detail=f"Blocked Week 10 IR/OUT player: {p.name}.",
                )
            )
            continue

        if p.injury_status and p.injury_status.strip().upper() in BLOCKED_INJURY_STATUSES:
            blocked.append(
                BlockedPlayerRecord(
                    player_id=p.player_id,
                    name=p.name,
                    team=p.team,
                    reason_code="INJURY_STATUS_TAG",
                    detail=f"Blocked player with injury status {p.injury_status!r}.",
                )
            )
            continue

        name_team_key = (p.canonical_name, p.team)
        if p.player_id in seen_ids or name_team_key in seen_name_team:
            blocked.append(
                BlockedPlayerRecord(
                    player_id=p.player_id,
                    name=p.name,
                    team=p.team,
                    reason_code="DUPLICATE_POOL_ENTRY",
                    detail=f"Deduplicated repeated pool entry for {p.name} ({p.team}).",
                )
            )
            continue

        seen_ids.add(p.player_id)
        seen_name_team.add(name_team_key)
        eligible.append(p)

    return SlateHygieneReport(
        eligible_pool=tuple(eligible),
        blocked_players=tuple(blocked),
    )


# ============================================================================
# Helper Math:HVZ Overlap / Hamming Distance & Winner's-Curse Haircut
# ============================================================================


def compute_binary_hamming_distance(ids_a: Iterable[str], ids_b: Iterable[str]) -> int:
    """Symmetric difference cardinality d_H(x, y) = sum_i |x_i - y_i| = 2*(L - |A cap B|)."""
    set_a = set(ids_a)
    set_b = set(ids_b)
    return len(set_a.symmetric_difference(set_b))


def resolve_hvz_overlap_cap(
    roster_size: int,
    num_games_on_slate: int,
    max_overlap: Optional[int],
    min_unique_players: Optional[int],
    min_hamming_distance: Optional[int],
) -> int:
    """Resolve pairwise player overlap cap gamma (HVZ INFORMS 2019 eq. 4.8 & Haugh-Singal 2021).

    For two binary indicator vectors x, x' of equal cardinality L:
      d_H(x, x') = sum_i |x_i - x'_i| = 2 * (L - x^T x')
    Therefore d_H(x, x') >= d_min  <=>  x^T x' <= L - ceil(d_min / 2).
    When no explicit diversity parameter is supplied on Classic, applies HVZ §V.1
    slate-adaptive defaults:
      - > 9 games: gamma = 4
      - 4..9 games: gamma = 6
      - < 4 games: gamma = 7 (capped at roster_size - 1)
    """
    candidates: List[int] = []
    if max_overlap is not None:
        candidates.append(int(max_overlap))
    if min_unique_players is not None:
        if min_unique_players < 1 or min_unique_players > roster_size:
            raise ValueError(
                f"min_unique_players must be in [1, {roster_size}], got {min_unique_players}"
            )
        candidates.append(roster_size - int(min_unique_players))
    if min_hamming_distance is not None:
        if min_hamming_distance < 1 or min_hamming_distance > 2 * roster_size:
            raise ValueError(
                f"min_hamming_distance must be in [1, {2 * roster_size}], got {min_hamming_distance}"
            )
        candidates.append(roster_size - int(math.ceil(min_hamming_distance / 2.0)))

    if candidates:
        gamma = min(candidates)
    elif roster_size == CLASSIC_ROSTER_SIZE:
        if num_games_on_slate > 9:
            gamma = 4
        elif num_games_on_slate < 4:
            gamma = 7
        else:
            gamma = 6
    else:
        # Showdown 6-man roster default: max 5 shared players (at least 1 unique player / d_H >= 2)
        gamma = roster_size - 1

    return max(0, min(gamma, roster_size - 1))


def compute_winners_curse_haircut(
    lineup_std: float, candidate_pool_size: int
) -> float:
    """Compute selection-bias inflation E[max noise] ≈ sigma * sqrt(2 ln K) (Part VI.3)."""
    if lineup_std <= 0.0 or candidate_pool_size <= 1:
        return 0.0
    return float(lineup_std * math.sqrt(2.0 * math.log(float(candidate_pool_size))))


def _player_objective_adjustment(
    ownership: float,
    projected_points: float,
    ceiling_points: float,
    projection_std: float,
    ownership_penalty_weight: float,
    dup_log_penalty_weight: float,
    ownership_floor_ref: float,
    ceiling_upside_weight: float,
    robust_error_rho: float,
    multiplier: float = 1.0,
) -> Tuple[float, float]:
    """Compute per-variable MILP objective score and log-duplication index."""
    floor_ref = max(ownership_floor_ref, 1e-4)
    log_dup = math.log(max(ownership, floor_ref) / floor_ref)
    upside_term = multiplier * ceiling_upside_weight * max(0.0, ceiling_points - projected_points)
    own_penalty = ownership_penalty_weight * ownership
    dup_penalty = dup_log_penalty_weight * log_dup
    robust_penalty = multiplier * robust_error_rho * max(0.0, projection_std)
    score = (
        multiplier * projected_points
        + upside_term
        - own_penalty
        - dup_penalty
        - robust_penalty
    )
    return score, log_dup


# ============================================================================
# Constraint Matrix Builder Helper
# ============================================================================


class _LinearSystemBuilder:
    """Incremental builder for scipy.optimize.LinearConstraint matrices."""

    def __init__(self, num_vars: int) -> None:
        self.num_vars = num_vars
        self._rows: List[np.ndarray] = []
        self._lbs: List[float] = []
        self._ubs: List[float] = []

    def add_row(
        self,
        coeffs: Mapping[int, float],
        lb: float = -np.inf,
        ub: float = np.inf,
    ) -> None:
        row = np.zeros(self.num_vars, dtype=float)
        for idx, val in coeffs.items():
            if val != 0.0:
                row[idx] = float(val)
        self._rows.append(row)
        self._lbs.append(float(lb))
        self._ubs.append(float(ub))

    def build(self) -> LinearConstraint:
        mat = np.vstack(self._rows) if self._rows else np.zeros((0, self.num_vars), dtype=float)
        return LinearConstraint(mat, np.array(self._lbs, dtype=float), np.array(self._ubs, dtype=float))


# ============================================================================
# 1. DraftKings NFL Classic MILP Optimizer
# ============================================================================


def optimize_classic_lineups(
    players: Sequence[PlayerPoolEntry],
    num_lineups: int = 1,
    config: ClassicOptimizerConfig = ClassicOptimizerConfig(),
    late_swap: Optional[LateSwapState] = None,
    apply_week10_hygiene: bool = True,
) -> Tuple[List[OptimizedLineup], SlateHygieneReport]:
    """Build 1..K optimal DraftKings NFL Classic lineups using scipy.optimize.milp."""
    if num_lineups < 1:
        raise ValueError(f"num_lineups must be >= 1, got {num_lineups}")

    if apply_week10_hygiene:
        hygiene_report = apply_week10_slate_hygiene(
            players, mode=SlateMode.CLASSIC_SUNDAY_MAIN, block_completed_tnf_and_munich=True
        )
    else:
        hygiene_report = SlateHygieneReport(eligible_pool=tuple(players), blocked_players=())

    pool = list(hygiene_report.eligible_pool)
    if len(pool) < CLASSIC_ROSTER_SIZE:
        raise OptimizationInfeasibleError(
            f"Eligible Classic pool has only {len(pool)} players (need >= {CLASSIC_ROSTER_SIZE})."
        )

    id_to_idx: Dict[str, int] = {p.player_id: i for i, p in enumerate(pool)}
    swap_state = late_swap or LateSwapState()

    # Validate Late-Swap references before solving
    all_locked_ids = set(swap_state.locked_player_ids) | set(swap_state.locked_slot_assignments.keys())
    missing_locked = [pid for pid in all_locked_ids if pid not in id_to_idx]
    if missing_locked:
        raise LateSwapValidationError(
            f"Locked player IDs missing or blocked by Week 10 slate hygiene: {missing_locked}"
        )
    if all_locked_ids & set(swap_state.excluded_player_ids):
        overlap_ids = sorted(all_locked_ids & set(swap_state.excluded_player_ids))
        raise LateSwapValidationError(
            f"Players cannot be both locked and excluded: {overlap_ids}"
        )
    locked_salary = sum(pool[id_to_idx[pid]].salary for pid in all_locked_ids)
    if locked_salary > config.salary_cap:
        raise LateSwapValidationError(
            f"Locked players salary (${locked_salary:,}) exceeds cap (${config.salary_cap:,})."
        )

    # Variable layout:
    #   [0 .. n_y - 1]                 : y_{i, slot} binary slot assignment variables
    #   [n_y .. n_y + N - 1]           : x_i binary player selection indicators
    #   [n_y + N .. n_y + N + M - 1]   : g_m binary game active indicators
    y_index: Dict[Tuple[int, str], int] = {}
    slot_to_y_vars: Dict[str, List[int]] = {s: [] for s in CLASSIC_SLOTS}
    for i, p in enumerate(pool):
        for s in p.eligible_classic_slots():
            var_idx = len(y_index)
            y_index[(i, s)] = var_idx
            slot_to_y_vars[s].append(var_idx)

    n_y = len(y_index)
    n_players = len(pool)
    games_sorted = sorted({p.game_id for p in pool if p.game_id is not None})
    game_to_idx = {g: idx for idx, g in enumerate(games_sorted)}
    n_games = len(games_sorted)
    total_vars = n_y + n_players + n_games

    def x_var(i: int) -> int:
        return n_y + i

    def g_var(m: int) -> int:
        return n_y + n_players + m

    # Variable bounds & per-player late-swap locks
    var_lb = np.zeros(total_vars, dtype=float)
    var_ub = np.ones(total_vars, dtype=float)

    for i, p in enumerate(pool):
        pid = p.player_id
        game_has_locked = (
            (p.game_id in swap_state.locked_game_ids)
            or (
                swap_state.current_time_epoch_cst is not None
                and p.kickoff_epoch_cst is not None
                and p.kickoff_epoch_cst <= swap_state.current_time_epoch_cst
            )
        )
        if pid in swap_state.excluded_player_ids:
            var_ub[x_var(i)] = 0.0
        elif pid in all_locked_ids:
            var_lb[x_var(i)] = 1.0
            var_ub[x_var(i)] = 1.0
            if pid in swap_state.locked_slot_assignments:
                req_slot = swap_state.locked_slot_assignments[pid].strip().upper()
                if (i, req_slot) not in y_index:
                    raise LateSwapValidationError(
                        f"Locked player {p.name} ({p.positions}) is not eligible for slot {req_slot!r}."
                    )
                var_lb[y_index[(i, req_slot)]] = 1.0
                var_ub[y_index[(i, req_slot)]] = 1.0
        elif game_has_locked:
            # DraftKings per-player lock rule: unrostered players in kicked-off games cannot be swapped in
            var_ub[x_var(i)] = 0.0

    # Build base linear constraints
    sys = _LinearSystemBuilder(total_vars)

    # 1. Exact slot capacities: 1 QB, 2 RB, 3 WR, 1 TE, 1 FLEX, 1 DST
    for slot_name, req_count in CLASSIC_SLOT_COUNTS.items():
        vars_in_slot = slot_to_y_vars[slot_name]
        if len(vars_in_slot) < req_count:
            raise OptimizationInfeasibleError(
                f"Insufficient eligible players for slot {slot_name}: have {len(vars_in_slot)}, need {req_count}."
            )
        sys.add_row({v: 1.0 for v in vars_in_slot}, lb=req_count, ub=req_count)

    # 2. Zero duplicate players: x_i - sum_{s in R_i} y_{i,s} == 0 for every player i
    for i, p in enumerate(pool):
        coeffs: Dict[int, float] = {x_var(i): 1.0}
        for s in p.eligible_classic_slots():
            coeffs[y_index[(i, s)]] = -1.0
        sys.add_row(coeffs, lb=0.0, ub=0.0)

    # 3. Salary cap ($50,000) and optional minimum salary floor
    sys.add_row(
        {x_var(i): float(p.salary) for i, p in enumerate(pool)},
        lb=float(config.min_salary),
        ub=float(config.salary_cap),
    )

    # 4. Max 8 players from any single NFL team
    teams_map: Dict[str, List[int]] = {}
    for i, p in enumerate(pool):
        teams_map.setdefault(p.team, []).append(i)
    for team_indices in teams_map.values():
        sys.add_row(
            {x_var(i): 1.0 for i in team_indices},
            ub=float(config.max_players_per_team),
        )

    # 5. Min 2 distinct NFL games represented:
    #    g_m <= sum_{i in P_m} x_i  and  sum_{i in P_m} x_i <= 9 * g_m, with sum_m g_m >= min_games
    if n_games < config.min_games:
        raise OptimizationInfeasibleError(
            f"Pool spans only {n_games} NFL game(s); Classic requires >= {config.min_games}."
        )
    game_players: Dict[int, List[int]] = {m: [] for m in range(n_games)}
    for i, p in enumerate(pool):
        if p.game_id is not None:
            game_players[game_to_idx[p.game_id]].append(i)
    for m, p_indices in game_players.items():
        # g_m - sum_{i in P_m} x_i <= 0
        row_lower = {g_var(m): 1.0}
        for i in p_indices:
            row_lower[x_var(i)] = -1.0
        sys.add_row(row_lower, ub=0.0)
        # 9 * g_m - sum_{i in P_m} x_i >= 0
        row_upper = {g_var(m): float(CLASSIC_ROSTER_SIZE)}
        for i in p_indices:
            row_upper[x_var(i)] = -1.0
        sys.add_row(row_upper, lb=0.0)

    sys.add_row({g_var(m): 1.0 for m in range(n_games)}, lb=float(config.min_games))

    # 6. Structural Correlation Constraints (HVZ §V.1 & Part I):
    #    (a) QB + WR/TE primary stack: m_stack * y_{q, QB} - sum_{j in team(q) stack} x_j <= 0
    #    (b) Game bring-back: m_bb * y_{q, QB} - sum_{j in opp(q) skill} x_j <= 0
    #    (c) QB vs opposing DST exclusion: y_{q, QB} + y_{d, DST} <= 1
    stack_positions = {"WR", "TE", "RB"} if config.allow_rb_in_primary_stack else {"WR", "TE"}
    bb_positions = set(config.bringback_positions)

    for q_idx, qb in enumerate(pool):
        if (q_idx, "QB") not in y_index:
            continue
        qb_slot_var = y_index[(q_idx, "QB")]

        if config.min_qb_stack > 0 or config.max_qb_stack is not None:
            teammate_pass_catchers = [
                j
                for j, cand in enumerate(pool)
                if j != q_idx
                and cand.team == qb.team
                and bool(stack_positions.intersection(cand.positions))
            ]
            if config.min_qb_stack > 0:
                coeffs_stack: Dict[int, float] = {qb_slot_var: float(config.min_qb_stack)}
                for j in teammate_pass_catchers:
                    coeffs_stack[x_var(j)] = -1.0
                sys.add_row(coeffs_stack, ub=0.0)

            if config.max_qb_stack is not None:
                big_m = float(CLASSIC_ROSTER_SIZE)
                coeffs_max_stack: Dict[int, float] = {qb_slot_var: big_m}
                for j in teammate_pass_catchers:
                    coeffs_max_stack[x_var(j)] = 1.0
                sys.add_row(coeffs_max_stack, ub=float(config.max_qb_stack) + big_m)

        if config.min_bringback > 0:
            opp_skill_indices = [
                j
                for j, cand in enumerate(pool)
                if cand.team == qb.opponent
                and bool(bb_positions.intersection(cand.positions))
            ]
            coeffs_bb: Dict[int, float] = {qb_slot_var: float(config.min_bringback)}
            for j in opp_skill_indices:
                coeffs_bb[x_var(j)] = -1.0
            sys.add_row(coeffs_bb, ub=0.0)

        if config.disallow_qb_vs_opp_dst:
            for d_idx, dst_cand in enumerate(pool):
                if dst_cand.team == qb.opponent and (d_idx, "DST") in y_index:
                    sys.add_row({qb_slot_var: 1.0, y_index[(d_idx, "DST")]: 1.0}, ub=1.0)

    if config.disallow_offense_vs_selected_dst:
        for d_idx, dst_cand in enumerate(pool):
            if (d_idx, "DST") not in y_index:
                continue
            dst_var = y_index[(d_idx, "DST")]
            opp_offense = [
                j
                for j, cand in enumerate(pool)
                if cand.team == dst_cand.opponent and "DST" not in cand.positions
            ]
            if opp_offense:
                coeffs_no_off = {dst_var: float(len(opp_offense))}
                for j in opp_offense:
                    coeffs_no_off[x_var(j)] = 1.0
                sys.add_row(coeffs_no_off, ub=float(len(opp_offense)))

    # 7. Optional Cumulative Ownership Barbell & Sub-10% Skill Leverage Constraints (Part I / III)
    if config.min_cumulative_ownership is not None or config.max_cumulative_ownership is not None:
        own_lb = (
            normalize_ownership(config.min_cumulative_ownership)
            if config.min_cumulative_ownership is not None and config.min_cumulative_ownership <= 1.0
            else (
                config.min_cumulative_ownership / 100.0
                if config.min_cumulative_ownership is not None and config.min_cumulative_ownership > 9.0
                else (config.min_cumulative_ownership if config.min_cumulative_ownership is not None else -np.inf)
            )
        )
        own_ub = (
            config.max_cumulative_ownership / 100.0
            if config.max_cumulative_ownership is not None and config.max_cumulative_ownership > 9.0
            else (config.max_cumulative_ownership if config.max_cumulative_ownership is not None else np.inf)
        )
        sys.add_row(
            {x_var(i): p.projected_ownership for i, p in enumerate(pool)},
            lb=float(own_lb),
            ub=float(own_ub),
        )

    if config.min_sub_10pct_skill_players > 0:
        low_own_skill = [
            i
            for i, p in enumerate(pool)
            if p.projected_ownership < 0.10 and "DST" not in p.positions
        ]
        sys.add_row(
            {x_var(i): 1.0 for i in low_own_skill},
            lb=float(config.min_sub_10pct_skill_players),
        )

    # 8. Build Linear Objective Vector (negated because scipy.optimize.milp minimizes c @ z)
    obj_scores = np.zeros(total_vars, dtype=float)
    player_log_dups = np.zeros(n_players, dtype=float)
    for i, p in enumerate(pool):
        score_i, log_dup_i = _player_objective_adjustment(
            ownership=p.projected_ownership,
            projected_points=p.projected_points,
            ceiling_points=float(p.ceiling_points or p.projected_points),
            projection_std=p.projection_std,
            ownership_penalty_weight=config.ownership_penalty_weight,
            dup_log_penalty_weight=config.dup_log_penalty_weight,
            ownership_floor_ref=config.ownership_floor_ref,
            ceiling_upside_weight=config.ceiling_upside_weight,
            robust_error_rho=config.robust_error_rho,
            multiplier=1.0,
        )
        obj_scores[x_var(i)] = score_i
        player_log_dups[i] = log_dup_i

    c_vec = -obj_scores
    integrality = np.ones(total_vars, dtype=int)

    gamma = resolve_hvz_overlap_cap(
        roster_size=CLASSIC_ROSTER_SIZE,
        num_games_on_slate=n_games,
        max_overlap=config.max_overlap,
        min_unique_players=config.min_unique_players,
        min_hamming_distance=config.min_hamming_distance,
    )

    max_appearances: Optional[int] = None
    if config.max_player_exposure is not None:
        if not (0.0 < config.max_player_exposure <= 1.0):
            raise ValueError("max_player_exposure must be in (0, 1].")
        max_appearances = max(1, int(math.floor(config.max_player_exposure * num_lineups + 1e-9)))

    exposure_counts = np.zeros(n_players, dtype=int)
    results: List[OptimizedLineup] = []

    slot_display_order = {"QB": 0, "RB": 1, "WR": 2, "TE": 3, "FLEX": 4, "DST": 5}

    for k in range(num_lineups):
        iter_ub = var_ub.copy()
        if max_appearances is not None:
            for i in range(n_players):
                if (
                    exposure_counts[i] >= max_appearances
                    and pool[i].player_id not in all_locked_ids
                ):
                    iter_ub[x_var(i)] = 0.0

        res = milp(
            c=c_vec,
            integrality=integrality,
            bounds=Bounds(var_lb, iter_ub),
            constraints=sys.build(),
        )
        if not res.success or res.x is None:
            raise OptimizationInfeasibleError(
                f"Classic MILP infeasible on lineup {k + 1}/{num_lineups}: {res.message}"
            )

        sol = np.rint(res.x).astype(int)
        chosen_slots: List[RosteredSlotPlayer] = []
        selected_indices: List[int] = []

        for (i, slot_name), v_idx in y_index.items():
            if sol[v_idx] == 1:
                p = pool[i]
                selected_indices.append(i)
                chosen_slots.append(
                    RosteredSlotPlayer(
                        slot=slot_name,
                        player=p,
                        effective_salary=p.salary,
                        effective_projected_points=p.projected_points,
                        effective_ownership=p.projected_ownership,
                    )
                )

        chosen_slots.sort(
            key=lambda item: (
                slot_display_order[item.slot],
                -item.effective_salary,
                item.player.name,
            )
        )

        for i in selected_indices:
            exposure_counts[i] += 1

        total_sal = sum(s.effective_salary for s in chosen_slots)
        total_pts = float(sum(s.effective_projected_points for s in chosen_slots))
        cum_own = float(sum(s.effective_ownership for s in chosen_slots))
        log_dup_sum = float(sum(player_log_dups[i] for i in selected_indices))
        obj_val = float(np.dot(obj_scores, sol))

        team_counts: Dict[str, int] = {}
        distinct_games: Set[str] = set()
        for s in chosen_slots:
            team_counts[s.player.team] = team_counts.get(s.player.team, 0) + 1
            if s.player.game_id:
                distinct_games.add(s.player.game_id)

        # Summarize QB stack & bring-back
        qb_entry = next(s.player for s in chosen_slots if s.slot == "QB")
        same_team_stack = [
            s.player.name
            for s in chosen_slots
            if s.slot != "QB"
            and s.player.team == qb_entry.team
            and s.slot != "DST"
        ]
        opp_bringbacks = [
            s.player.name
            for s in chosen_slots
            if s.player.team == qb_entry.opponent and s.slot != "DST"
        ]
        stack_desc = (
            f"QB+{len(same_team_stack)} ({qb_entry.team}) | "
            f"Bring-back: {len(opp_bringbacks)} ({qb_entry.opponent})"
        )

        # Winner's-curse haircut diagnostic (Part VI.3)
        lineup_var = sum(
            (s.player.projection_std if s.player.projection_std > 0 else 0.18 * s.effective_projected_points) ** 2
            for s in chosen_slots
        )
        lineup_std = math.sqrt(lineup_var)
        haircut = compute_winners_curse_haircut(
            lineup_std=lineup_std,
            candidate_pool_size=config.candidate_pool_size_for_haircut,
        )

        results.append(
            OptimizedLineup(
                lineup_index=k + 1,
                mode=SlateMode.CLASSIC_SUNDAY_MAIN,
                slots=tuple(chosen_slots),
                total_salary=total_sal,
                total_projected_points=round(total_pts, 4),
                objective_score=round(obj_val, 4),
                cumulative_ownership=round(cum_own, 4),
                log_duplication_index=round(log_dup_sum, 4),
                distinct_games_count=len(distinct_games),
                team_counts=team_counts,
                stack_summary=stack_desc,
                winners_curse_haircut_points=round(haircut, 4),
                haircut_adjusted_points=round(total_pts - haircut, 4),
            )
        )

        # Add HVZ sequential overlap / Hamming distance constraint against lineup k
        if k + 1 < num_lineups:
            sys.add_row({x_var(i): 1.0 for i in selected_indices}, ub=float(gamma))

    return results, hygiene_report


# ============================================================================
# 2. DraftKings NFL Showdown Captain Mode MILP Optimizer
# ============================================================================


def optimize_showdown_lineups(
    players: Sequence[PlayerPoolEntry],
    num_lineups: int = 1,
    config: ShowdownOptimizerConfig = ShowdownOptimizerConfig(),
    late_swap: Optional[LateSwapState] = None,
    apply_week10_hygiene: bool = True,
) -> Tuple[List[OptimizedLineup], SlateHygieneReport]:
    """Build 1..K optimal DraftKings NFL Showdown Captain Mode lineups (1 CPT 1.5x + 5 UTIL)."""
    if num_lineups < 1:
        raise ValueError(f"num_lineups must be >= 1, got {num_lineups}")

    if apply_week10_hygiene:
        hygiene_report = apply_week10_slate_hygiene(
            players,
            mode=SlateMode.SHOWDOWN_CAPTAIN,
            block_completed_tnf_and_munich=config.block_completed_tnf_and_munich,
        )
    else:
        hygiene_report = SlateHygieneReport(eligible_pool=tuple(players), blocked_players=())

    pool = list(hygiene_report.eligible_pool)
    if len(pool) < SHOWDOWN_ROSTER_SIZE:
        raise OptimizationInfeasibleError(
            f"Eligible Showdown pool has only {len(pool)} players (need >= {SHOWDOWN_ROSTER_SIZE})."
        )

    teams_present = sorted({p.team for p in pool})
    if len(teams_present) != 2:
        raise OptimizationInfeasibleError(
            f"Showdown Captain Mode requires exactly 2 active teams from 1 game; got {teams_present}."
        )

    id_to_idx: Dict[str, int] = {p.player_id: i for i, p in enumerate(pool)}
    swap_state = late_swap or LateSwapState()

    all_locked_ids = set(swap_state.locked_player_ids) | set(swap_state.locked_slot_assignments.keys())
    missing_locked = [pid for pid in all_locked_ids if pid not in id_to_idx]
    if missing_locked:
        raise LateSwapValidationError(
            f"Locked Showdown player IDs missing or blocked by hygiene: {missing_locked}"
        )

    # Variable layout for N players:
    #   [0 .. N-1]       : y_{i, CPT}
    #   [N .. 2N-1]      : y_{i, UTIL}
    #   [2N .. 3N-1]     : x_i (roster presence indicator)
    n_players = len(pool)
    total_vars = 3 * n_players

    def cpt_var(i: int) -> int:
        return i

    def util_var(i: int) -> int:
        return n_players + i

    def x_var(i: int) -> int:
        return 2 * n_players + i

    var_lb = np.zeros(total_vars, dtype=float)
    var_ub = np.ones(total_vars, dtype=float)

    for i, p in enumerate(pool):
        pid = p.player_id
        game_has_locked = (
            (p.game_id in swap_state.locked_game_ids)
            or (
                swap_state.current_time_epoch_cst is not None
                and p.kickoff_epoch_cst is not None
                and p.kickoff_epoch_cst <= swap_state.current_time_epoch_cst
            )
        )
        if pid in swap_state.excluded_player_ids:
            var_ub[x_var(i)] = 0.0
        elif pid in all_locked_ids:
            var_lb[x_var(i)] = 1.0
            var_ub[x_var(i)] = 1.0
            if pid in swap_state.locked_slot_assignments:
                req_slot = swap_state.locked_slot_assignments[pid].strip().upper()
                if req_slot == "CPT":
                    var_lb[cpt_var(i)] = 1.0
                    var_ub[cpt_var(i)] = 1.0
                elif req_slot == "UTIL":
                    var_lb[util_var(i)] = 1.0
                    var_ub[util_var(i)] = 1.0
                else:
                    raise LateSwapValidationError(
                        f"Invalid Showdown slot {req_slot!r}; expected 'CPT' or 'UTIL'."
                    )
        elif game_has_locked:
            var_ub[x_var(i)] = 0.0

    sys = _LinearSystemBuilder(total_vars)

    # 1. Exact slot counts: 1 CPT + 5 UTIL
    sys.add_row({cpt_var(i): 1.0 for i in range(n_players)}, lb=1.0, ub=1.0)
    sys.add_row({util_var(i): 1.0 for i in range(n_players)}, lb=5.0, ub=5.0)

    # 2. Zero duplicate players: x_i - y_{i,CPT} - y_{i,UTIL} == 0
    for i in range(n_players):
        sys.add_row({x_var(i): 1.0, cpt_var(i): -1.0, util_var(i): -1.0}, lb=0.0, ub=0.0)

    # 3. Salary cap ($50,000) with CPT at 1.5x salary and UTIL at 1.0x salary
    sal_coeffs: Dict[int, float] = {}
    for i, p in enumerate(pool):
        sal_coeffs[cpt_var(i)] = float(p.cpt_salary)
        sal_coeffs[util_var(i)] = float(p.salary)
    sys.add_row(sal_coeffs, lb=float(config.min_salary), ub=float(config.salary_cap))

    # 4. Both teams represented & max 5 players from 1 team (bring-back floor)
    min_per_team = max(config.min_players_per_team, config.min_bringback_opponents)
    for t in teams_present:
        t_indices = [i for i, p in enumerate(pool) if p.team == t]
        sys.add_row(
            {x_var(i): 1.0 for i in t_indices},
            lb=float(min_per_team),
            ub=float(config.max_players_per_team),
        )

    # 5. Showdown Correlation Constraints:
    #    (a) WR/TE in CPT requires own-team QB in UTIL
    if config.pair_pass_catcher_cpt_with_qb:
        for i, p in enumerate(pool):
            if bool({"WR", "TE"}.intersection(p.positions)):
                own_qbs = [
                    q for q, cand in enumerate(pool) if cand.team == p.team and "QB" in cand.positions
                ]
                if own_qbs:
                    coeffs_pc: Dict[int, float] = {cpt_var(i): 1.0}
                    for q in own_qbs:
                        coeffs_pc[util_var(q)] = -1.0
                    sys.add_row(coeffs_pc, ub=0.0)

    #    (b) QB in CPT requires >= m own-team pass-catchers (WR/TE) in UTIL
    if config.min_qb_cpt_pass_catchers > 0:
        for q, qb in enumerate(pool):
            if "QB" in qb.positions:
                teammate_pcs = [
                    j
                    for j, cand in enumerate(pool)
                    if j != q and cand.team == qb.team and bool({"WR", "TE"}.intersection(cand.positions))
                ]
                coeffs_qb_cpt: Dict[int, float] = {cpt_var(q): float(config.min_qb_cpt_pass_catchers)}
                for j in teammate_pcs:
                    coeffs_qb_cpt[util_var(j)] = -1.0
                sys.add_row(coeffs_qb_cpt, ub=0.0)

    #    (c) Disallow CPT DST paired with opposing QB
    if config.disallow_cpt_dst_vs_opp_qb:
        for d, dst in enumerate(pool):
            if "DST" in dst.positions:
                for q, qb in enumerate(pool):
                    if qb.team == dst.opponent and "QB" in qb.positions:
                        sys.add_row({cpt_var(d): 1.0, x_var(q): 1.0}, ub=1.0)

    # 6. Objective weights: 1.5x points for CPT, 1.0x points for UTIL, minus ownership/dup penalties
    obj_scores = np.zeros(total_vars, dtype=float)
    cpt_log_dups = np.zeros(n_players, dtype=float)
    util_log_dups = np.zeros(n_players, dtype=float)

    for i, p in enumerate(pool):
        cpt_own = float(p.cpt_projected_ownership or 0.35 * p.projected_ownership)
        cpt_score, cpt_ld = _player_objective_adjustment(
            ownership=cpt_own,
            projected_points=p.projected_points,
            ceiling_points=float(p.ceiling_points or p.projected_points),
            projection_std=p.projection_std,
            ownership_penalty_weight=config.ownership_penalty_weight,
            dup_log_penalty_weight=config.dup_log_penalty_weight,
            ownership_floor_ref=config.ownership_floor_ref,
            ceiling_upside_weight=config.ceiling_upside_weight,
            robust_error_rho=config.robust_error_rho,
            multiplier=1.5,
        )
        util_score, util_ld = _player_objective_adjustment(
            ownership=p.projected_ownership,
            projected_points=p.projected_points,
            ceiling_points=float(p.ceiling_points or p.projected_points),
            projection_std=p.projection_std,
            ownership_penalty_weight=config.ownership_penalty_weight,
            dup_log_penalty_weight=config.dup_log_penalty_weight,
            ownership_floor_ref=config.ownership_floor_ref,
            ceiling_upside_weight=config.ceiling_upside_weight,
            robust_error_rho=config.robust_error_rho,
            multiplier=1.0,
        )
        obj_scores[cpt_var(i)] = cpt_score
        obj_scores[util_var(i)] = util_score
        cpt_log_dups[i] = cpt_ld
        util_log_dups[i] = util_ld

    c_vec = -obj_scores
    integrality = np.ones(total_vars, dtype=int)

    has_explicit_roster_diversity = any(
        val is not None
        for val in (config.max_overlap, config.min_unique_players, config.min_hamming_distance)
    )
    gamma = resolve_hvz_overlap_cap(
        roster_size=SHOWDOWN_ROSTER_SIZE,
        num_games_on_slate=1,
        max_overlap=config.max_overlap,
        min_unique_players=config.min_unique_players,
        min_hamming_distance=config.min_hamming_distance,
    )

    results: List[OptimizedLineup] = []
    for k in range(num_lineups):
        res = milp(
            c=c_vec,
            integrality=integrality,
            bounds=Bounds(var_lb, var_ub),
            constraints=sys.build(),
        )
        if not res.success or res.x is None:
            raise OptimizationInfeasibleError(
                f"Showdown MILP infeasible on lineup {k + 1}/{num_lineups}: {res.message}"
            )

        sol = np.rint(res.x).astype(int)
        cpt_idx = next(i for i in range(n_players) if sol[cpt_var(i)] == 1)
        util_indices = [i for i in range(n_players) if sol[util_var(i)] == 1]

        cpt_player = pool[cpt_idx]
        cpt_slot = RosteredSlotPlayer(
            slot="CPT",
            player=cpt_player,
            effective_salary=cpt_player.cpt_salary,
            effective_projected_points=round(cpt_player.cpt_projected_points, 4),
            effective_ownership=float(cpt_player.cpt_projected_ownership or 0.0),
        )
        util_slots = sorted(
            [
                RosteredSlotPlayer(
                    slot="UTIL",
                    player=pool[idx],
                    effective_salary=pool[idx].salary,
                    effective_projected_points=pool[idx].projected_points,
                    effective_ownership=pool[idx].projected_ownership,
                )
                for idx in util_indices
            ],
            key=lambda item: (-item.effective_salary, item.player.name),
        )
        all_slots = (cpt_slot, *util_slots)

        total_sal = sum(s.effective_salary for s in all_slots)
        total_pts = float(sum(s.effective_projected_points for s in all_slots))
        cum_own = float(sum(s.effective_ownership for s in all_slots))
        log_dup_sum = float(cpt_log_dups[cpt_idx] + sum(util_log_dups[i] for i in util_indices))
        obj_val = float(np.dot(obj_scores, sol))

        team_counts: Dict[str, int] = {}
        for s in all_slots:
            team_counts[s.player.team] = team_counts.get(s.player.team, 0) + 1

        split_desc = "-".join(str(team_counts[t]) for t in sorted(team_counts, key=lambda k_t: -team_counts[k_t]))
        stack_desc = f"CPT {cpt_player.name} ({cpt_player.team}) | Split {split_desc}"

        lineup_var = (
            1.5 * (cpt_player.projection_std or 0.18 * cpt_player.projected_points)
        ) ** 2 + sum(
            (pool[idx].projection_std or 0.18 * pool[idx].projected_points) ** 2
            for idx in util_indices
        )
        haircut = compute_winners_curse_haircut(
            lineup_std=math.sqrt(lineup_var),
            candidate_pool_size=config.candidate_pool_size_for_haircut,
        )

        results.append(
            OptimizedLineup(
                lineup_index=k + 1,
                mode=SlateMode.SHOWDOWN_CAPTAIN,
                slots=all_slots,
                total_salary=total_sal,
                total_projected_points=round(total_pts, 4),
                objective_score=round(obj_val, 4),
                cumulative_ownership=round(cum_own, 4),
                log_duplication_index=round(log_dup_sum, 4),
                distinct_games_count=1,
                team_counts=team_counts,
                stack_summary=stack_desc,
                winners_curse_haircut_points=round(haircut, 4),
                haircut_adjusted_points=round(total_pts - haircut, 4),
            )
        )

        if k + 1 < num_lineups:
            selected_indices = [cpt_idx, *util_indices]
            if has_explicit_roster_diversity or not config.enforce_distinct_cpt_or_roster:
                sys.add_row({x_var(i): 1.0 for i in selected_indices}, ub=float(gamma))
            else:
                # Default Showdown diversity: enforce roster Hamming distance d_H >= 2 (overlap <= gamma)
                sys.add_row({x_var(i): 1.0 for i in selected_indices}, ub=float(gamma))
                # Also cut exact (CPT, UTIL) assignment vector
                exact_cut: Dict[int, float] = {cpt_var(cpt_idx): 1.0}
                for idx in util_indices:
                    exact_cut[util_var(idx)] = 1.0
                sys.add_row(exact_cut, ub=float(SHOWDOWN_ROSTER_SIZE - 1))

    return results, hygiene_report
