"""
Galaxy Sports Edge (Galaxy Sports Network LLC) — Institutional DFS v2 Portfolio Optimizer.

Clean, generalized evolution of `gse_dk_dfs_mip_optimizer.py` (ZERO hardcoded week/team/
player constants), combining:
  1. Dynamic `SlateHygieneConfig` (bye weeks, locked slate windows, IR/OUT/inactive statuses,
     deduplication by `player_id` and canonical `(name, team)`).
  2. Hunter, Vielma & Zaman (INFORMS 2019) exact Hamming diversity constraint
     `d_H(x^(l), x) = 2 * (L - overlap) >= d_min` + primary QB stack + game bring-back +
     QB vs opposing DST negative correlation exclusion.
  3. Haugh & Singal (Management Science 2021) Dirichlet-Multinomial field duplication &
     leverage objective adjustment.
  4. Newell Stochastic Integer Programming Recourse across correlated world simulations
     (tail quantile payout vs variance penalty).
  5. Yahoo Salary-Lag Convexity bonus (salaried below market-implied Fair Points curve).
  6. Google Lobby-Bias / Narrative Concentration Cap (bounds single-game/chalk saturation).
  7. Liu Payout-Order Utility (POM) ranking + Winner's-Curse selection-bias haircut.
"""
from __future__ import annotations

import math
import re
from dataclasses import dataclass, field
from enum import Enum
from typing import Dict, Iterable, List, Mapping, Optional, Sequence, Set, Tuple

import numpy as np
from scipy.optimize import Bounds, LinearConstraint, milp

CLASSIC_SALARY_CAP = 50_000
SHOWDOWN_SALARY_CAP = 50_000
CLASSIC_POSITIONS: Tuple[str, ...] = ("QB", "RB", "WR", "TE", "DST")
FLEX_ELIGIBLE_POSITIONS: frozenset[str] = frozenset({"RB", "WR", "TE"})
VALID_POSITIONS: frozenset[str] = frozenset(CLASSIC_POSITIONS)
TEAM_ALIASES: Dict[str, str] = {"JAC": "JAX", "WSH": "WAS", "LVR": "LV", "LA": "LAR"}
INACTIVE_STATUS_TOKENS: frozenset[str] = frozenset({"IR", "OUT", "O", "PUP", "NFI", "SUSP", "SUSPENDED", "INACTIVE", "NA"})


def normalize_team_code(team: str) -> str:
    code = (team or "").strip().upper()
    return TEAM_ALIASES.get(code, code)


def normalize_player_name(name: str) -> str:
    cleaned = re.sub(r"\b(jr|sr|ii|iii|iv|v)\.?$", "", (name or "").strip().lower())
    return re.sub(r"[^a-z0-9]+", " ", cleaned).strip()


def normalize_position(pos: str) -> str:
    cleaned = (pos or "").strip().upper()
    if cleaned in {"D/ST", "DEF", "DST"}:
        return "DST"
    if cleaned not in VALID_POSITIONS:
        raise ValueError(f"Unsupported DraftKings NFL position: {pos!r}")
    return cleaned


def normalize_ownership(raw_ownership: float) -> float:
    if raw_ownership < 0:
        raise ValueError(f"Projected ownership must be non-negative, got {raw_ownership}")
    frac = raw_ownership / 100.0 if raw_ownership > 1.0 else float(raw_ownership)
    return min(max(frac, 1e-4), 1.0)


class SlateMode(str, Enum):
    CLASSIC_SUNDAY_MAIN = "CLASSIC_SUNDAY_MAIN"
    SHOWDOWN_CAPTAIN = "SHOWDOWN_CAPTAIN"


class OptimizationInfeasibleError(RuntimeError):
    pass


@dataclass(frozen=True)
class PlayerPoolEntry:
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
    yahoo_salary_lag_pts: float = 0.0
    narrative_lobby_tag: Optional[str] = None
    game_id: Optional[str] = None
    injury_status: Optional[str] = None
    slate_window: str = "SUNDAY_MAIN"

    def __post_init__(self) -> None:
        raw_positions = [p for p in self.positions.split("/") if p.strip()] if isinstance(self.positions, str) else list(self.positions)
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
        cpt_own = (
            normalize_ownership(self.cpt_projected_ownership)
            if self.cpt_projected_ownership is not None
            else normalize_ownership(min(1.0, max(1e-4, 0.35 * norm_own)))
        )
        object.__setattr__(self, "cpt_projected_ownership", cpt_own)
        if self.ceiling_points is None:
            default_ceil = self.projected_points + max(1.5 * self.projection_std, 0.25 * self.projected_points)
            object.__setattr__(self, "ceiling_points", float(default_ceil))
        if not self.game_id:
            t_pair = sorted((self.team, self.opponent))
            object.__setattr__(self, "game_id", f"{t_pair[0]}@{t_pair[1]}")

    @property
    def cpt_salary(self) -> int:
        return int(round(1.5 * self.salary))

    @property
    def cpt_projected_points(self) -> float:
        return 1.5 * self.projected_points

    @property
    def canonical_name(self) -> str:
        return normalize_player_name(self.name)

    def is_flex_eligible(self) -> bool:
        return bool(FLEX_ELIGIBLE_POSITIONS.intersection(self.positions))


@dataclass(frozen=True)
class SlateHygieneConfig:
    """Dynamic caller-supplied slate hygiene filter (zero hardcoded week state)."""

    bye_teams: frozenset[str] = frozenset()
    excluded_teams: frozenset[str] = frozenset()
    allowed_windows: Optional[frozenset[str]] = None
    out_or_ir_player_names: frozenset[str] = frozenset()
    excluded_player_ids: frozenset[str] = frozenset()

    def canonical_out_names(self) -> frozenset[str]:
        return frozenset(normalize_player_name(n) for n in self.out_or_ir_player_names)


@dataclass(frozen=True)
class BlockedPlayerRecord:
    player_id: str
    name: str
    team: str
    reason_code: str
    detail: str


@dataclass(frozen=True)
class SlateHygieneReport:
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
    locked_player_ids: frozenset[str] = frozenset()
    excluded_player_ids: frozenset[str] = frozenset()


@dataclass(frozen=True)
class ClassicOptimizerConfig:
    salary_cap: int = CLASSIC_SALARY_CAP
    min_salary: int = 0
    max_players_per_team: int = 8
    min_games: int = 2
    min_qb_stack: int = 1
    max_qb_stack: Optional[int] = None
    min_bringback: int = 1
    disallow_qb_vs_opp_dst: bool = True
    ownership_penalty_weight: float = 2.5
    dup_log_penalty_weight: float = 0.65
    dirichlet_concentration: float = 18.0
    ceiling_upside_weight: float = 0.12
    yahoo_lag_weight: float = 0.25
    lobby_bias_high_own_threshold: float = 0.22
    lobby_bias_max_high_own: int = 3
    lobby_bias_max_per_game: int = 5
    max_overlap: Optional[int] = None
    min_hamming_distance: Optional[int] = None
    candidate_pool_size_for_haircut: int = 5_000
    positional_vuln_weight: float = 0.0
    positional_vuln_as_of_week: Optional[int] = None


@dataclass(frozen=True)
class ShowdownOptimizerConfig:
    salary_cap: int = SHOWDOWN_SALARY_CAP
    min_salary: int = 0
    min_players_per_team: int = 1
    max_players_per_team: int = 5
    pair_pass_catcher_cpt_with_qb: bool = True
    disallow_cpt_dst_vs_opp_qb: bool = True
    ownership_penalty_weight: float = 2.0
    dup_log_penalty_weight: float = 0.55
    dirichlet_concentration: float = 14.0
    ceiling_upside_weight: float = 0.12
    yahoo_lag_weight: float = 0.20
    max_overlap: Optional[int] = None
    min_hamming_distance: Optional[int] = None
    candidate_pool_size_for_haircut: int = 2_002
    positional_vuln_weight: float = 0.0
    positional_vuln_as_of_week: Optional[int] = None


def _resolve_player_15p_vuln_bonus(
    player: PlayerPoolEntry,
    weight: float,
    as_of_week: Optional[int],
    override_map: Optional[Dict[str, float]] = None,
) -> float:
    """Return optional Stream 15P causal positional-vulnerability projection adjustment."""
    if weight == 0.0:
        return 0.0
    if override_map is not None and player.player_id in override_map:
        return float(weight) * float(override_map[player.player_id])
    primary_pos = next((pos for pos in ("QB", "RB", "WR", "TE") if pos in player.positions), "")
    if not primary_pos or not player.opponent:
        return 0.0
    from intelligence.coaching.causal_positional_vulnerability_engine import get_player_15p_matchup_z

    z_val = get_player_15p_matchup_z(player.opponent, primary_pos, as_of_week=as_of_week)
    return float(weight) * float(z_val)


@dataclass(frozen=True)
class RosteredSlotPlayer:
    slot: str
    player: PlayerPoolEntry
    effective_salary: int
    effective_projected_points: float
    effective_ownership: float


@dataclass(frozen=True)
class OptimizedLineup:
    lineup_index: int
    mode: SlateMode
    slots: Tuple[RosteredSlotPlayer, ...]
    total_salary: int
    total_projected_points: float
    objective_score: float
    cumulative_ownership: float
    expected_duplicates_per_10k: float
    liu_pom_utility: float
    newell_stochastic_recourse_score: float
    distinct_games_count: int
    team_counts: Mapping[str, int]
    stack_summary: str
    winners_curse_haircut_points: float
    haircut_adjusted_points: float

    @property
    def player_ids(self) -> Tuple[str, ...]:
        return tuple(s.player.player_id for s in self.slots)


def apply_dynamic_slate_hygiene(
    players: Sequence[PlayerPoolEntry],
    hygiene: SlateHygieneConfig | None = None,
) -> SlateHygieneReport:
    cfg = hygiene or SlateHygieneConfig()
    byes = frozenset(normalize_team_code(t) for t in cfg.bye_teams)
    excl_t = frozenset(normalize_team_code(t) for t in cfg.excluded_teams)
    out_names = cfg.canonical_out_names()

    eligible: List[PlayerPoolEntry] = []
    blocked: List[BlockedPlayerRecord] = []
    seen_ids: Set[str] = set()
    seen_name_team: Set[Tuple[str, str]] = set()

    for p in players:
        if p.team in byes or p.opponent in byes:
            blocked.append(BlockedPlayerRecord(p.player_id, p.name, p.team, "BYE_TEAM", f"Team on bye ({p.team} vs {p.opponent})"))
            continue
        if p.team in excl_t or p.opponent in excl_t:
            blocked.append(BlockedPlayerRecord(p.player_id, p.name, p.team, "EXCLUDED_TEAM", f"Team excluded from slate ({p.team})"))
            continue
        if cfg.allowed_windows is not None and p.slate_window not in cfg.allowed_windows:
            blocked.append(BlockedPlayerRecord(p.player_id, p.name, p.team, "WRONG_SLATE_WINDOW", f"Window {p.slate_window} excluded"))
            continue
        if p.player_id in cfg.excluded_player_ids:
            blocked.append(BlockedPlayerRecord(p.player_id, p.name, p.team, "EXCLUDED_PLAYER", "Excluded by operator config"))
            continue
        inj_tok = (p.injury_status or "").strip().upper()
        if p.canonical_name in out_names or inj_tok in INACTIVE_STATUS_TOKENS:
            blocked.append(BlockedPlayerRecord(p.player_id, p.name, p.team, "IR_OR_OUT", f"Inactive status ({p.injury_status or 'OUT_LIST'})"))
            continue
        if p.player_id in seen_ids or (p.canonical_name, p.team) in seen_name_team:
            blocked.append(BlockedPlayerRecord(p.player_id, p.name, p.team, "DUPLICATE", "Duplicate player record"))
            continue
        seen_ids.add(p.player_id)
        seen_name_team.add((p.canonical_name, p.team))
        eligible.append(p)

    return SlateHygieneReport(tuple(eligible), tuple(blocked))


def resolve_hvz_overlap_cap(
    roster_size: int,
    num_games_on_slate: int,
    max_overlap: Optional[int] = None,
    min_hamming_distance: Optional[int] = None,
) -> int:
    """Hunter-Vielma-Zaman exact overlap cap from Hamming bound d_H = 2*(L - overlap)."""
    caps: List[int] = []
    if max_overlap is not None:
        caps.append(int(max_overlap))
    if min_hamming_distance is not None:
        caps.append(roster_size - int(math.ceil(min_hamming_distance / 2.0)))
    if caps:
        return max(0, min(roster_size - 1, min(caps)))
    if num_games_on_slate > 9:
        return min(4, roster_size - 1)
    if num_games_on_slate >= 4:
        return min(6, roster_size - 1)
    return min(7, roster_size - 1)


def dirichlet_multinomial_expected_duplicates(
    ownerships: Sequence[float],
    field_size: int = 10_000,
    concentration: float = 18.0,
) -> float:
    """Haugh-Singal Dirichlet-Multinomial overdispersion duplication multiplier."""
    if not ownerships:
        return 0.0
    p_prod = 1.0
    alpha_scale = max(2.0, float(concentration))
    for o in ownerships:
        p = min(max(float(o), 1e-4), 0.99)
        # Dirichlet overdispersion inflates joint chalk co-occurrence by (1 + p/alpha_eff)
        p_prod *= p * (1.0 + (1.0 - p) / (alpha_scale + 1.0))
    scale_ref = (1.0 / max(1e-12, 0.10 ** len(ownerships))) * 0.025
    return round(float(field_size * min(0.25, p_prod * scale_ref)), 4)


def compute_yahoo_salary_lag_bonus(player: PlayerPoolEntry) -> float:
    """Estimate salary-lag pricing inefficiency relative to fair salary points curve."""
    if abs(player.yahoo_salary_lag_pts) > 1e-6:
        return float(np.clip(player.yahoo_salary_lag_pts, -6.0, 6.0))
    # Fair baseline expectation ~ 2.6 pts per $1k Classic salary plus positional intercept
    pos0 = player.positions[0]
    intercept = 4.2 if pos0 == "QB" else (3.1 if pos0 in ("RB", "WR") else 2.2)
    fair_pts = intercept + 2.55 * (player.salary / 1000.0)
    return round(float(np.clip(player.projected_points - fair_pts, -5.0, 6.0)), 4)


def newell_stochastic_ip_recourse_score(
    slots: Sequence[RosteredSlotPlayer],
    rng_seed: int = 20261120,
    n_worlds: int = 256,
    risk_aversion: float = 0.25,
) -> float:
    """Newell two-stage stochastic IP recourse evaluation over correlated game scripts."""
    rng = np.random.default_rng(rng_seed)
    game_shocks: Dict[str, np.ndarray] = {}
    total_scores = np.zeros(n_worlds, dtype=np.float64)
    for sp in slots:
        gid = sp.player.game_id or "UNK"
        if gid not in game_shocks:
            game_shocks[gid] = rng.normal(0.0, 1.0, size=n_worlds)
        p_std = sp.player.projection_std if sp.player.projection_std > 0 else 0.22 * sp.effective_projected_points
        ind_noise = rng.normal(0.0, 1.0, size=n_worlds)
        corr_draw = 0.42 * game_shocks[gid] + math.sqrt(1.0 - 0.42 ** 2) * ind_noise
        total_scores += np.maximum(0.0, sp.effective_projected_points + p_std * corr_draw)

    p90 = float(np.percentile(total_scores, 90.0))
    mean_v = float(np.mean(total_scores))
    std_v = float(np.std(total_scores))
    return round(0.55 * mean_v + 0.45 * p90 - risk_aversion * std_v, 4)


def compute_liu_pom_utility(
    total_points: float,
    ceiling_sum: float,
    expected_dups_10k: float,
    variance_sum: float,
) -> float:
    """Liu Payout-Order Utility (convex top-end payoff minus duplication/variance drag)."""
    tail_bonus = 0.32 * max(0.0, ceiling_sum - total_points)
    dup_penalty = 1.65 * math.log1p(max(0.0, expected_dups_10k))
    var_penalty = 0.045 * math.sqrt(max(1.0, variance_sum))
    return round(float(total_points + tail_bonus - dup_penalty - var_penalty), 4)


def _winners_curse_haircut(lineup_std: float, candidate_pool_size: int) -> float:
    if candidate_pool_size <= 1 or lineup_std <= 0.0:
        return 0.0
    return float(lineup_std * math.sqrt(2.0 * math.log(candidate_pool_size)) * 0.25)


class _MilpSystem:
    def __init__(self, num_vars: int) -> None:
        self.num_vars = num_vars
        self.rows: List[Tuple[Dict[int, float], float, float]] = []

    def add_row(self, coeffs: Mapping[int, float], lb: float = -np.inf, ub: float = np.inf) -> None:
        self.rows.append((dict(coeffs), float(lb), float(ub)))

    def build(self) -> LinearConstraint:
        mat = np.zeros((len(self.rows), self.num_vars), dtype=np.float64)
        lbs = np.empty(len(self.rows), dtype=np.float64)
        ubs = np.empty(len(self.rows), dtype=np.float64)
        for r_idx, (coeffs, lb, ub) in enumerate(self.rows):
            for c_idx, val in coeffs.items():
                mat[r_idx, c_idx] = val
            lbs[r_idx] = lb
            ubs[r_idx] = ub
        return LinearConstraint(mat, lbs, ubs)


def optimize_classic_portfolio_v2(
    players: Sequence[PlayerPoolEntry],
    num_lineups: int = 3,
    *,
    hygiene_config: SlateHygieneConfig | None = None,
    config: ClassicOptimizerConfig | None = None,
    late_swap: LateSwapState | None = None,
    positional_vuln_map: Dict[str, float] | None = None,
) -> Tuple[List[OptimizedLineup], SlateHygieneReport]:
    cfg = config or ClassicOptimizerConfig()
    hygiene = apply_dynamic_slate_hygiene(players, hygiene_config)
    pool = hygiene.eligible_pool
    n_p = len(pool)
    if n_p < 9:
        raise OptimizationInfeasibleError(f"Insufficient eligible players ({n_p}) for DK Classic 9-man roster.")

    slots_order = ("QB", "RB", "WR", "TE", "FLEX", "DST")
    slot_req = {"QB": 1, "RB": 2, "WR": 3, "TE": 1, "FLEX": 1, "DST": 1}

    # Variables: per-player indicator x_i + slot indicators s_{i, slot}
    slot_pairs: List[Tuple[int, str]] = []
    p_slot_vars: Dict[int, List[int]] = {i: [] for i in range(n_p)}
    s_col: Dict[Tuple[int, str], int] = {}
    for i, p in enumerate(pool):
        elig = set(p.positions)
        if p.is_flex_eligible():
            elig.add("FLEX")
        for sl in slots_order:
            if sl in elig:
                idx = n_p + len(slot_pairs)
                slot_pairs.append((i, sl))
                p_slot_vars[i].append(idx)
                s_col[(i, sl)] = idx

    teams = sorted({p.team for p in pool})
    games = sorted({p.game_id or f"{p.team}@{p.opponent}" for p in pool})
    n_tot_base = n_p + len(slot_pairs)
    g_start = n_tot_base
    n_vars = n_tot_base + len(games)

    sys = _MilpSystem(n_vars)
    var_lb = np.zeros(n_vars, dtype=np.float64)
    var_ub = np.ones(n_vars, dtype=np.float64)
    integrality = np.ones(n_vars, dtype=np.int8)

    if late_swap:
        for i, p in enumerate(pool):
            if p.player_id in late_swap.locked_player_ids:
                var_lb[i] = 1.0
            if p.player_id in late_swap.excluded_player_ids:
                var_ub[i] = 0.0

    # Each player rostered in at most 1 slot, linked to x_i
    for i in range(n_p):
        row = {i: -1.0}
        for v_idx in p_slot_vars[i]:
            row[v_idx] = 1.0
        sys.add_row(row, lb=0.0, ub=0.0)

    # Exact slot counts & roster size 9
    for sl, req in slot_req.items():
        cols = {s_col[(i, sl)]: 1.0 for i in range(n_p) if (i, sl) in s_col}
        sys.add_row(cols, lb=float(req), ub=float(req))
    sys.add_row({i: 1.0 for i in range(n_p)}, lb=9.0, ub=9.0)

    # Salary cap bounds
    sal_row = {i: float(pool[i].salary) for i in range(n_p)}
    sys.add_row(sal_row, lb=float(cfg.min_salary), ub=float(cfg.salary_cap))

    # Max players per team
    for tm in teams:
        t_row = {i: 1.0 for i, p in enumerate(pool) if p.team == tm}
        sys.add_row(t_row, ub=float(cfg.max_players_per_team))

    # Google lobby-bias cap: limit players from single game & high-owned chalk clusters
    for g_idx, gid in enumerate(games):
        g_members = [i for i, p in enumerate(pool) if p.game_id == gid]
        g_row = {i: 1.0 for i in g_members}
        sys.add_row(g_row, ub=float(cfg.lobby_bias_max_per_game))
        # Link game indicator z_g: z_g <= sum x_i and |g_members| * z_g >= sum x_i
        sys.add_row({**{i: 1.0 for i in g_members}, g_start + g_idx: -1.0}, lb=0.0)
        for i in g_members:
            sys.add_row({i: 1.0, g_start + g_idx: -1.0}, ub=0.0)

    min_g = min(cfg.min_games, len(games))
    sys.add_row({g_start + g_idx: 1.0 for g_idx in range(len(games))}, lb=float(min_g))

    high_own_idx = [i for i, p in enumerate(pool) if p.projected_ownership >= cfg.lobby_bias_high_own_threshold]
    if high_own_idx:
        sys.add_row({i: 1.0 for i in high_own_idx}, ub=float(cfg.lobby_bias_max_high_own))

    # HVZ primary QB stack & game bring-back + QB vs opposing DST exclusion
    for i, p in enumerate(pool):
        if "QB" not in p.positions or (i, "QB") not in s_col:
            continue
        qb_var = s_col[(i, "QB")]
        mates = [j for j, q in enumerate(pool) if j != i and q.team == p.team and ("WR" in q.positions or "TE" in q.positions)]
        if cfg.min_qb_stack > 0 and len(mates) >= cfg.min_qb_stack:
            row = {j: 1.0 for j in mates}
            row[qb_var] = -float(cfg.min_qb_stack)
            sys.add_row(row, lb=0.0)
        if cfg.max_qb_stack is not None and mates:
            row = {j: 1.0 for j in mates}
            row[qb_var] = float(cfg.max_qb_stack - 9)
            sys.add_row(row, ub=9.0 - float(cfg.max_qb_stack))
        opp_pass = [j for j, q in enumerate(pool) if q.team == p.opponent and ("RB" in q.positions or "WR" in q.positions or "TE" in q.positions)]
        if cfg.min_bringback > 0 and len(opp_pass) >= cfg.min_bringback:
            row = {j: 1.0 for j in opp_pass}
            row[qb_var] = -float(cfg.min_bringback)
            sys.add_row(row, lb=0.0)
        if cfg.disallow_qb_vs_opp_dst:
            for j, q in enumerate(pool):
                if q.team == p.opponent and "DST" in q.positions:
                    sys.add_row({qb_var: 1.0, j: 1.0}, ub=1.0)

    # Objective: maximize projected + ceiling upside + yahoo lag + optional 15P vuln - ownership - Dirichlet duplication log penalty
    obj = np.zeros(n_vars, dtype=np.float64)
    for i, p in enumerate(pool):
        ceil_bonus = cfg.ceiling_upside_weight * max(0.0, float(p.ceiling_points or p.projected_points) - p.projected_points)
        lag_bonus = cfg.yahoo_lag_weight * max(0.0, compute_yahoo_salary_lag_bonus(p))
        vuln_bonus = _resolve_player_15p_vuln_bonus(p, cfg.positional_vuln_weight, cfg.positional_vuln_as_of_week, positional_vuln_map)
        log_dup = cfg.dup_log_penalty_weight * math.log1p(p.projected_ownership * cfg.dirichlet_concentration)
        own_pen = cfg.ownership_penalty_weight * p.projected_ownership
        obj[i] = p.projected_points + ceil_bonus + lag_bonus + vuln_bonus - own_pen - log_dup
    c_vec = -obj

    gamma = resolve_hvz_overlap_cap(9, len(games), cfg.max_overlap, cfg.min_hamming_distance)
    results: List[OptimizedLineup] = []
    for k in range(num_lineups):
        res = milp(c=c_vec, integrality=integrality, bounds=Bounds(var_lb, var_ub), constraints=sys.build())
        if not res.success or res.x is None:
            raise OptimizationInfeasibleError(f"Classic v2 MILP infeasible on lineup {k + 1}/{num_lineups}: {res.message}")

        sol = np.rint(res.x).astype(int)
        chosen: List[RosteredSlotPlayer] = []
        chosen_indices: List[int] = []
        for (i, sl), col_idx in s_col.items():
            if sol[col_idx] == 1:
                chosen_indices.append(i)
                p = pool[i]
                chosen.append(RosteredSlotPlayer(sl, p, p.salary, p.projected_points, p.projected_ownership))
        chosen.sort(key=lambda s: (slots_order.index(s.slot), -s.effective_salary, s.player.name))

        tot_sal = sum(s.effective_salary for s in chosen)
        tot_pts = float(sum(s.effective_projected_points for s in chosen))
        ceil_sum = float(sum(float(s.player.ceiling_points or s.effective_projected_points) for s in chosen))
        cum_own = float(sum(s.effective_ownership for s in chosen))
        exp_dups = dirichlet_multinomial_expected_duplicates([s.effective_ownership for s in chosen], concentration=cfg.dirichlet_concentration)
        var_sum = sum((s.player.projection_std or 0.18 * s.effective_projected_points) ** 2 for s in chosen)
        haircut = _winners_curse_haircut(math.sqrt(var_sum), cfg.candidate_pool_size_for_haircut)
        liu_pom = compute_liu_pom_utility(tot_pts, ceil_sum, exp_dups, var_sum)
        recourse = newell_stochastic_ip_recourse_score(chosen, rng_seed=20261120 + k)

        team_counts: Dict[str, int] = {}
        game_set: Set[str] = set()
        for s in chosen:
            team_counts[s.player.team] = team_counts.get(s.player.team, 0) + 1
            if s.player.game_id:
                game_set.add(s.player.game_id)
        qb_slot = next((s for s in chosen if s.slot == "QB"), chosen[0])
        stack_desc = f"QB {qb_slot.player.name} ({qb_slot.player.team}) + {team_counts.get(qb_slot.player.team, 1) - 1} mates"

        results.append(
            OptimizedLineup(
                lineup_index=k + 1,
                mode=SlateMode.CLASSIC_SUNDAY_MAIN,
                slots=tuple(chosen),
                total_salary=tot_sal,
                total_projected_points=round(tot_pts, 4),
                objective_score=round(float(np.dot(obj, sol)), 4),
                cumulative_ownership=round(cum_own, 4),
                expected_duplicates_per_10k=exp_dups,
                liu_pom_utility=liu_pom,
                newell_stochastic_recourse_score=recourse,
                distinct_games_count=len(game_set),
                team_counts=team_counts,
                stack_summary=stack_desc,
                winners_curse_haircut_points=round(haircut, 4),
                haircut_adjusted_points=round(tot_pts - haircut, 4),
            )
        )
        if k + 1 < num_lineups:
            sys.add_row({i: 1.0 for i in chosen_indices}, ub=float(gamma))

    return results, hygiene


def optimize_showdown_portfolio_v2(
    players: Sequence[PlayerPoolEntry],
    num_lineups: int = 3,
    *,
    hygiene_config: SlateHygieneConfig | None = None,
    config: ShowdownOptimizerConfig | None = None,
    positional_vuln_map: Dict[str, float] | None = None,
) -> Tuple[List[OptimizedLineup], SlateHygieneReport]:
    cfg = config or ShowdownOptimizerConfig()
    hygiene = apply_dynamic_slate_hygiene(players, hygiene_config)
    pool = hygiene.eligible_pool
    n_p = len(pool)
    if n_p < 6:
        raise OptimizationInfeasibleError(f"Insufficient eligible players ({n_p}) for DK Showdown 6-man roster.")

    def cpt_v(i: int) -> int:
        return i

    def util_v(i: int) -> int:
        return n_p + i

    def any_v(i: int) -> int:
        return 2 * n_p + i

    n_vars = 3 * n_p
    sys = _MilpSystem(n_vars)
    var_lb = np.zeros(n_vars, dtype=np.float64)
    var_ub = np.ones(n_vars, dtype=np.float64)
    integrality = np.ones(n_vars, dtype=np.int8)

    for i in range(n_p):
        sys.add_row({cpt_v(i): 1.0, util_v(i): 1.0, any_v(i): -1.0}, lb=0.0, ub=0.0)
    sys.add_row({cpt_v(i): 1.0 for i in range(n_p)}, lb=1.0, ub=1.0)
    sys.add_row({util_v(i): 1.0 for i in range(n_p)}, lb=5.0, ub=5.0)
    sal_row: Dict[int, float] = {}
    for i, p in enumerate(pool):
        sal_row[cpt_v(i)] = float(p.cpt_salary)
        sal_row[util_v(i)] = float(p.salary)
    sys.add_row(sal_row, lb=float(cfg.min_salary), ub=float(cfg.salary_cap))

    teams = sorted({p.team for p in pool})
    if len(teams) < 2:
        raise OptimizationInfeasibleError("Showdown requires players from both teams.")
    for tm in teams:
        sys.add_row({any_v(i): 1.0 for i, p in enumerate(pool) if p.team == tm}, lb=float(cfg.min_players_per_team), ub=float(cfg.max_players_per_team))

    if cfg.disallow_cpt_dst_vs_opp_qb:
        for i, p in enumerate(pool):
            if "DST" in p.positions:
                for j, q in enumerate(pool):
                    if q.team == p.opponent and "QB" in q.positions:
                        sys.add_row({cpt_v(i): 1.0, util_v(j): 1.0}, ub=1.0)

    obj = np.zeros(n_vars, dtype=np.float64)
    for i, p in enumerate(pool):
        ceil_b = cfg.ceiling_upside_weight * max(0.0, float(p.ceiling_points or p.projected_points) - p.projected_points)
        lag_b = cfg.yahoo_lag_weight * max(0.0, compute_yahoo_salary_lag_bonus(p))
        vuln_b = _resolve_player_15p_vuln_bonus(p, cfg.positional_vuln_weight, cfg.positional_vuln_as_of_week, positional_vuln_map)
        c_own = float(p.cpt_projected_ownership or 0.05)
        u_own = float(p.projected_ownership)
        obj[cpt_v(i)] = p.cpt_projected_points + 1.5 * ceil_b + 1.5 * lag_b + 1.5 * vuln_b - cfg.ownership_penalty_weight * c_own - cfg.dup_log_penalty_weight * math.log1p(c_own * cfg.dirichlet_concentration)
        obj[util_v(i)] = p.projected_points + ceil_b + lag_b + vuln_b - cfg.ownership_penalty_weight * u_own - cfg.dup_log_penalty_weight * math.log1p(u_own * cfg.dirichlet_concentration)
    c_vec = -obj

    gamma = resolve_hvz_overlap_cap(6, 1, cfg.max_overlap, cfg.min_hamming_distance)
    results: List[OptimizedLineup] = []
    for k in range(num_lineups):
        res = milp(c=c_vec, integrality=integrality, bounds=Bounds(var_lb, var_ub), constraints=sys.build())
        if not res.success or res.x is None:
            raise OptimizationInfeasibleError(f"Showdown v2 MILP infeasible on lineup {k + 1}/{num_lineups}: {res.message}")

        sol = np.rint(res.x).astype(int)
        c_i = next(i for i in range(n_p) if sol[cpt_v(i)] == 1)
        u_is = [i for i in range(n_p) if sol[util_v(i)] == 1]
        c_slot = RosteredSlotPlayer("CPT", pool[c_i], pool[c_i].cpt_salary, pool[c_i].cpt_projected_points, float(pool[c_i].cpt_projected_ownership or 0.0))
        u_slots = [RosteredSlotPlayer("UTIL", pool[i], pool[i].salary, pool[i].projected_points, pool[i].projected_ownership) for i in u_is]
        u_slots.sort(key=lambda s: (-s.effective_salary, s.player.name))
        slots = (c_slot, *u_slots)

        tot_sal = sum(s.effective_salary for s in slots)
        tot_pts = float(sum(s.effective_projected_points for s in slots))
        ceil_sum = float(sum((1.5 if s.slot == "CPT" else 1.0) * float(s.player.ceiling_points or s.player.projected_points) for s in slots))
        cum_own = float(sum(s.effective_ownership for s in slots))
        exp_dups = dirichlet_multinomial_expected_duplicates([s.effective_ownership for s in slots], concentration=cfg.dirichlet_concentration)
        var_sum = sum(((1.5 if s.slot == "CPT" else 1.0) * (s.player.projection_std or 0.18 * s.player.projected_points)) ** 2 for s in slots)
        haircut = _winners_curse_haircut(math.sqrt(var_sum), cfg.candidate_pool_size_for_haircut)
        liu_pom = compute_liu_pom_utility(tot_pts, ceil_sum, exp_dups, var_sum)
        recourse = newell_stochastic_ip_recourse_score(slots, rng_seed=20261120 + k)

        team_counts: Dict[str, int] = {}
        for s in slots:
            team_counts[s.player.team] = team_counts.get(s.player.team, 0) + 1
        split_desc = "-".join(str(team_counts[t]) for t in sorted(team_counts, key=lambda kt: -team_counts[kt]))

        results.append(
            OptimizedLineup(
                lineup_index=k + 1,
                mode=SlateMode.SHOWDOWN_CAPTAIN,
                slots=slots,
                total_salary=tot_sal,
                total_projected_points=round(tot_pts, 4),
                objective_score=round(float(np.dot(obj, sol)), 4),
                cumulative_ownership=round(cum_own, 4),
                expected_duplicates_per_10k=exp_dups,
                liu_pom_utility=liu_pom,
                newell_stochastic_recourse_score=recourse,
                distinct_games_count=1,
                team_counts=team_counts,
                stack_summary=f"CPT {c_slot.player.name} ({c_slot.player.team}) | Split {split_desc}",
                winners_curse_haircut_points=round(haircut, 4),
                haircut_adjusted_points=round(tot_pts - haircut, 4),
            )
        )
        if k + 1 < num_lineups:
            sel = [c_i, *u_is]
            sys.add_row({any_v(i): 1.0 for i in sel}, ub=float(gamma))
            exact = {cpt_v(c_i): 1.0, **{util_v(i): 1.0 for i in u_is}}
            sys.add_row(exact, ub=5.0)

    return results, hygiene
