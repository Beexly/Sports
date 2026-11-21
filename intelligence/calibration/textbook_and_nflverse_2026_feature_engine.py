#!/usr/bin/env python3
"""
Unified 5-Textbook, 4-Paper & 13-Table 2026 Causal NFL Feature & Distribution Engine
(`intelligence/calibration/textbook_and_nflverse_2026_feature_engine.py`)
======================================================================================

Extracts and wires strictly causal multi-dataset context (`2025 REG -> 2026 week < w`)
using true dense chronological indexing (`chronological_nfl_week_index`, zero base-100
`season * 100 + week` offseason dead gap, zero Week 1-4 starvation, zero 2x sawtooth)
and domain-specific probability distributions grounded in Garrett's local quantitative library:
  1. Eager & Erickson (*Football Analytics with Python and R*, Ch. 2, 3, 4, 5, 6):
     - Short (<20 air yds) vs Deep (>=20 air yds) split passing stability & shrinkage.
     - Binomial-Beta Expected Completions driven by NGS xComp% + CPOE + opp coverage.
     - Poisson / Poisson-Gamma Touchdown rate estimation scaled by red-zone (in5/in10/in20)
       share and team implied TDs (`implied_team_total / 8.6`).
  2. Bradley J. Congelio (*Introduction to NFL Analytics with R*, Ch. 1.3 & Ch. 5):
     - Unique Offensive Line starter combinations & continuity (`snap_counts` OL >= 50% snaps)
       driving pressure rate, QB hits, and adjusted sack rate.
  3. Thomas A. Severini (*Analytic Methods in Sports, 3rd Ed.*, Ch. 2.7, 3.8, 9.5):
     - Law of Total Variance compound Gamma yardage distributions (`mu_Y = mu_N * mu_X`,
       `var_Y = mu_N * var_X + mu_X^2 * var_N`) + hierarchical EB pooling across players/defenses.
     - Zero-inflated Binomial-Gamma Hurdle distribution for discrete 1st-Quarter props.
  4. Leonardo Egidi (*Predictive Modelling for Football Analytics*, Ch. 5 & Ch. 7):
     - Hurdle & overdispersed Negative-Binomial counts + exact market-centered logit/Shin devig.
  5. Ed Miller & Matthew Davidow (*The Logic of Sports Betting*, Ch. 1-7):
     - Market-centered fair probability shrinkage avoiding asymmetric threshold distortion on
       rare-event binary propositions (`anytime_td`, `sacks`, milestones).
  6. ArXiv Player-Tracking & Scouting Kernels:
     - Pipping-Gamon et al. (2026, arXiv:2604.01491v2) pass-rush full-play disruption
       `Q_a = 0.009*hurry + 0.103*hit_pressure + 1.0*sack` (`advstats_week_def`) + EB smoothing.
     - Yurko, Nguyen & Pelechrinis (2025, arXiv:2406.17220v2 NFL Ghosts): split 8-week 1D YAC
       expectation stabilization vs 12-week 2D defensive coverage stabilization.
     - Nguyen & Yurko (2026, arXiv:2603.17866v3 Step-and-Turn): RB vs defense random-effect
       variance split (`sigma_RB=0.0058`, `sigma_def=0.0035`, `rb_share=0.733`) & order-statistic
       right-tail modulation.
     - Szekely et al. (2023, arXiv:2303.05774v1 Combine): Combine athleticism prior weighted by
       `0.15 * max(0, 1 - n_nfl / 4)`, decaying strictly to `0.0` at `n_nfl >= 4` games (`R^2=0.17` guard).

ZERO FUTURE LEAKAGE & ZERO BASE-100 GAP: Every lookup reads strictly
`chrono_idx in [target_chrono - trailing_chrono_weeks, target_chrono - 1]`.
"""
from __future__ import annotations

import math
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any, Mapping, Sequence

import numpy as np
import pandas as pd
from scipy import stats

from intelligence.calibration.gse_master_compendium_2026_loader import (
    get_week11_plus_compendium_matchup_context,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_NFLVERSE_DIR = REPO_ROOT / "data" / "nflverse"

TEAM_ALIASES = {
    "LA": "LAR",
    "JAC": "JAX",
    "WSH": "WAS",
    "LVR": "LV",
    "ARZ": "ARI",
    "BLT": "BAL",
    "CLV": "CLE",
    "HST": "HOU",
}
FRONT_SEVEN_PASS_RUSH_POS = {"DE", "DT", "NT", "DL", "EDGE", "OLB", "MLB", "ILB", "LB"}

_NGUYEN_SIGMA_RB = 0.0058
_NGUYEN_SIGMA_DEF = 0.0035
NGUYEN_RB_VARIANCE_SHARE = (_NGUYEN_SIGMA_RB ** 2) / ((_NGUYEN_SIGMA_RB ** 2) + (_NGUYEN_SIGMA_DEF ** 2))
NGUYEN_DEF_VARIANCE_SHARE = 1.0 - NGUYEN_RB_VARIANCE_SHARE


def norm_team(code: Any) -> str:
    s = str(code or "").strip().upper()
    return TEAM_ALIASES.get(s, s)


def _norm_name(name: Any) -> str:
    s = str(name or "").lower().strip()
    for suf in (" jr.", " sr.", " iii", " ii", " iv", " v"):
        if s.endswith(suf):
            s = s[: -len(suf)]
    return "".join(ch for ch in s if ch.isalnum())


def _safe_parquet(path: Path) -> pd.DataFrame:
    if not path.is_file():
        return pd.DataFrame()
    try:
        return pd.read_parquet(path)
    except Exception:
        return pd.DataFrame()


# ---------------------------------------------------------------------------
# Dense Chronological Indexing & Causal Shrunk Covariance (Zero Base-100 Gap)
# ---------------------------------------------------------------------------

def chronological_nfl_week_index(
    season: int,
    week: int,
    base_season: int = 2021,
    reg_weeks: int = 18,
) -> int:
    """Dense chronological index (`2025 W18 -> 2026 W1` step == 1, never 83)."""
    wk = min(int(reg_weeks), max(1, int(week)))
    return (int(season) - int(base_season)) * int(reg_weeks) + (wk - 1)


def build_dense_chronological_game_week_map(
    pairs: Sequence[tuple[int, int]],
) -> dict[tuple[int, int], int]:
    """Map sorted unique `(season, week)` tuples to contiguous integers `0..K-1`."""
    unique = sorted({(int(s), int(w)) for s, w in pairs})
    return {pair: idx for idx, pair in enumerate(unique)}


def compute_chronological_shrunk_covariance(
    observations_by_chrono_week: Sequence[tuple[int, Sequence[float]]] | Mapping[int, Sequence[float]],
    target_chrono_week: int,
    trailing_weeks: int = 16,
    shrinkage_floor: float = 0.15,
    min_variance: float = 1e-6,
) -> np.ndarray:
    """
    Strictly pre-target chronological Ledoit-Wolf shrunk PSD covariance estimator.
    Uses only `target_chrono_week - trailing_weeks <= c_wk < target_chrono_week`,
    never includes `target_chrono_week` itself (preventing self-inclusion saturation)
    and never uses base-100 season-week subtraction.
    """
    lo = int(target_chrono_week) - max(1, int(trailing_weeks))
    hi = int(target_chrono_week)
    items = (
        observations_by_chrono_week.items()
        if isinstance(observations_by_chrono_week, Mapping)
        else observations_by_chrono_week
    )
    rows = [
        np.asarray(vec, dtype=np.float64).ravel()
        for c_wk, vec in items
        if lo <= int(c_wk) < hi
    ]
    if not rows:
        return np.eye(1, dtype=np.float64) * max(1.0, float(min_variance))
    dim = int(rows[0].shape[0])
    X = np.vstack([r for r in rows if r.shape[0] == dim])
    n = int(X.shape[0])
    if n < 2:
        return np.eye(dim, dtype=np.float64) * max(1.0, float(min_variance))

    Xc = X - np.mean(X, axis=0, keepdims=True)
    S = (Xc.T @ Xc) / float(n - 1)
    D = np.diag(np.diag(S))
    num = 0.0
    for i in range(n):
        xi = Xc[i : i + 1, :]
        outer_i = xi.T @ xi
        num += float(np.sum((outer_i - S) ** 2))
    denom = float(n * n) * max(1e-12, float(np.sum((S - D) ** 2)))
    lw_raw = num / denom if denom > 0.0 else 0.5
    alpha = max(float(shrinkage_floor), min(0.85, float(lw_raw)))
    cov = (1.0 - alpha) * S + alpha * D
    cov = 0.5 * (cov + cov.T)
    eigvals, eigvecs = np.linalg.eigh(cov)
    eigvals = np.maximum(eigvals, float(min_variance))
    return (eigvecs * eigvals) @ eigvecs.T


def compute_szekely_combine_prior_weight(
    n_nfl_games: int,
    max_weight: float = 0.15,
    full_nfl_games: int = 4,
) -> float:
    """Szekely et al. (arXiv:2303.05774v1): Combine prior decays strictly to 0 at >=4 games."""
    n = max(0, int(n_nfl_games))
    if n >= int(full_nfl_games):
        return 0.0
    return float(max_weight) * max(0.0, 1.0 - float(n) / float(max(1, int(full_nfl_games))))


def compute_nguyen_yurko_step_turn_rush_decomp(priors: Mapping[str, float]) -> dict[str, float]:
    """Nguyen & Yurko (arXiv:2603.17866v3): RB-vs-defense variance split & tail CV."""
    ryoe = float(priors.get("rush_ryoe", 0.0))
    stacked = float(priors.get("rush_stacked", 0.20))
    comb_z = float(priors.get("combine_athleticism_z", 0.0))
    comb_w = float(priors.get("combine_prior_weight", 0.0))
    explosive_cv = float(np.clip(1.06 + 0.05 * ryoe + comb_w * 0.15 * comb_z - 0.12 * max(0.0, stacked - 0.25), 0.72, 1.48))
    return {
        "rb_skill_share": round(NGUYEN_RB_VARIANCE_SHARE, 4),
        "def_share": round(NGUYEN_DEF_VARIANCE_SHARE, 4),
        "explosive_cv": round(explosive_cv, 4),
    }


@dataclass
class CausalMultiDatasetIndex:
    """In-memory normalized lookup tables supporting strictly causal chronological queries."""

    gsis_by_pfr: dict[str, str] = field(default_factory=dict)
    gsis_by_team_norm: dict[tuple[str, str], str] = field(default_factory=dict)
    pos_by_gsis: dict[str, str] = field(default_factory=dict)

    # 2026 weekly stores keyed by (entity_id, week)
    spw_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)
    ngs_pass_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)
    ngs_pass_2025_prior: dict[str, dict[str, float]] = field(default_factory=dict)
    ngs_rec_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)
    ngs_rec_2025_prior: dict[str, dict[str, float]] = field(default_factory=dict)
    ngs_rush_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)
    ngs_rush_2025_prior: dict[str, dict[str, float]] = field(default_factory=dict)

    adv_pass_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)
    adv_rec_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)
    adv_rush_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)
    adv_def_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)
    snap_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)

    team_week_stats: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)
    team_ol_lineup_by_week: dict[tuple[str, int], tuple[str, ...]] = field(default_factory=dict)
    ftn_off_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)
    ftn_def_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)

    pbp_rz_player_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)
    pbp_rz_team_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)
    pbp_air_yac_player_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)
    pbp_opp_def_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)

    # 2025 Regular-Season (W1-W18) chronological bridge stores preventing Week 1-4 starvation
    spw_2025_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)
    ngs_pass_2025_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)
    ngs_rec_2025_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)
    ngs_rush_2025_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)
    adv_pass_2025_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)
    adv_rec_2025_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)
    adv_rush_2025_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)
    adv_def_2025_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)
    snap_2025_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)
    team_week_2025_stats: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)
    team_ol_2025_by_week: dict[tuple[str, int], tuple[str, ...]] = field(default_factory=dict)
    ftn_off_2025_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)
    ftn_def_2025_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)
    pbp_rz_player_2025_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)
    pbp_rz_team_2025_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)
    pbp_air_yac_player_2025_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)
    pbp_opp_def_2025_weekly: dict[tuple[str, int], dict[str, float]] = field(default_factory=dict)

    combine_by_gsis: dict[str, float] = field(default_factory=dict)
    combine_by_norm_pos: dict[tuple[str, str], float] = field(default_factory=dict)


def _filter_reg(df: pd.DataFrame, max_week: int = 18) -> pd.DataFrame:
    if df.empty or "week" not in df.columns:
        return df
    mask = pd.to_numeric(df["week"], errors="coerce").fillna(0).between(1, max_week)
    if "season_type" in df.columns:
        mask = mask & (df["season_type"].astype(str).str.upper() == "REG")
    if "game_type" in df.columns:
        mask = mask & (df["game_type"].astype(str).str.upper() == "REG")
    return df[mask]


def _ingest_spw_df(df: pd.DataFrame, target: dict[tuple[str, int], dict[str, float]], idx: CausalMultiDatasetIndex) -> None:
    if df.empty:
        return
    for _, r in _filter_reg(df).iterrows():
        gsis = str(r.get("player_id") or "").strip()
        wk = int(r.get("week") or 0)
        if not gsis or wk <= 0:
            continue
        pos = str(r.get("position") or "").strip().upper()
        if pos:
            idx.pos_by_gsis.setdefault(gsis, pos)
        tm = norm_team(r.get("team"))
        for col in ("player_display_name", "player_name"):
            nm = _norm_name(r.get(col))
            if tm and nm:
                idx.gsis_by_team_norm.setdefault((tm, nm), gsis)
        target[(gsis, wk)] = {
            "attempts": float(r.get("attempts") or 0.0),
            "completions": float(r.get("completions") or 0.0),
            "passing_yards": float(r.get("passing_yards") or 0.0),
            "passing_air_yards": float(r.get("passing_air_yards") or 0.0),
            "passing_yac": float(r.get("passing_yards_after_catch") or 0.0),
            "passing_cpoe": float(r.get("passing_cpoe") if pd.notna(r.get("passing_cpoe")) else 0.0),
            "pacr": float(r.get("pacr") if pd.notna(r.get("pacr")) else 1.0),
            "passing_20": float(r.get("passing_20") or 0.0),
            "sacks_suffered": float(r.get("sacks_suffered") or 0.0),
            "carries": float(r.get("carries") or 0.0),
            "rushing_yards": float(r.get("rushing_yards") or 0.0),
            "rushing_10": float(r.get("rushing_10") or 0.0),
            "rushing_20": float(r.get("rushing_20") or 0.0),
            "targets": float(r.get("targets") or 0.0),
            "receptions": float(r.get("receptions") or 0.0),
            "receiving_yards": float(r.get("receiving_yards") or 0.0),
            "receiving_air_yards": float(r.get("receiving_air_yards") or 0.0),
            "receiving_yac": float(r.get("receiving_yards_after_catch") or 0.0),
            "receiving_20": float(r.get("receiving_20") or 0.0),
            "target_share": float(r.get("target_share") if pd.notna(r.get("target_share")) else 0.0),
            "air_yards_share": float(r.get("air_yards_share") if pd.notna(r.get("air_yards_share")) else 0.0),
            "wopr": float(r.get("wopr") if pd.notna(r.get("wopr")) else 0.0),
            "racr": float(r.get("racr") if pd.notna(r.get("racr")) else 1.0),
            "def_sacks": float(r.get("def_sacks") or 0.0),
            "def_qb_hits": float(r.get("def_qb_hits") or 0.0),
            "def_tfl": float(r.get("def_tackles_for_loss") or 0.0),
            "def_solo": float(r.get("def_tackles_solo") or 0.0),
            "def_comb": float(r.get("def_tackles_with_assist") or 0.0),
        }


def _ingest_stw_df(df: pd.DataFrame, target: dict[tuple[str, int], dict[str, float]]) -> None:
    if df.empty:
        return
    for _, r in _filter_reg(df).iterrows():
        tm = norm_team(r.get("team"))
        wk = int(r.get("week") or 0)
        if not tm or wk <= 0:
            continue
        att = float(r.get("attempts") or 0.0)
        sk = float(r.get("sacks_suffered") or 0.0)
        dropbacks = max(1.0, att + sk)
        target[(tm, wk)] = {
            "attempts": att,
            "completions": float(r.get("completions") or 0.0),
            "passing_yards": float(r.get("passing_yards") or 0.0),
            "passing_tds": float(r.get("passing_tds") or 0.0),
            "carries": float(r.get("carries") or 0.0),
            "rushing_yards": float(r.get("rushing_yards") or 0.0),
            "rushing_tds": float(r.get("rushing_tds") or 0.0),
            "sacks_suffered": sk,
            "sack_rate": sk / dropbacks,
            "cpoe": float(r.get("passing_cpoe") if pd.notna(r.get("passing_cpoe")) else 0.0),
            "passing_epa": float(r.get("passing_epa") or 0.0),
            "rushing_epa": float(r.get("rushing_epa") or 0.0),
            "def_sacks": float(r.get("def_sacks") or 0.0),
            "def_qb_hits": float(r.get("def_qb_hits") or 0.0),
        }


def _ingest_adv_and_snap_season(
    data_dir: Path,
    suffix: str,
    resolve_fn: Any,
    idx: CausalMultiDatasetIndex,
    adv_pass_out: dict[tuple[str, int], dict[str, float]],
    adv_rec_out: dict[tuple[str, int], dict[str, float]],
    adv_rush_out: dict[tuple[str, int], dict[str, float]],
    adv_def_out: dict[tuple[str, int], dict[str, float]],
    snap_out: dict[tuple[str, int], dict[str, float]],
    ol_out: dict[tuple[str, int], tuple[str, ...]],
) -> None:
    adv_p = _safe_parquet(data_dir / f"advstats_week_pass_{suffix}.parquet")
    if not adv_p.empty:
        for _, r in _filter_reg(adv_p).iterrows():
            wk = int(r.get("week") or 0)
            gsis = resolve_fn(r.get("pfr_player_id"), r.get("team"), r.get("pfr_player_name"))
            if gsis and wk > 0:
                adv_pass_out[(gsis, wk)] = {
                    "pressured_pct": float(r.get("times_pressured_pct") or 0.22),
                    "bad_throw_pct": float(r.get("passing_bad_throw_pct") or 0.16),
                    "drop_pct": float(r.get("passing_drop_pct") or 0.045),
                    "times_sacked": float(r.get("times_sacked") or 0.0),
                    "times_blitzed": float(r.get("times_blitzed") or 0.0),
                }

    adv_r = _safe_parquet(data_dir / f"advstats_week_rec_{suffix}.parquet")
    if not adv_r.empty:
        for _, r in _filter_reg(adv_r).iterrows():
            wk = int(r.get("week") or 0)
            gsis = resolve_fn(r.get("pfr_player_id"), r.get("team"), r.get("pfr_player_name"))
            if gsis and wk > 0:
                adv_rec_out[(gsis, wk)] = {
                    "rec_brk_tkl": float(r.get("receiving_broken_tackles") or 0.0),
                    "rec_drop_pct": float(r.get("receiving_drop_pct") or 0.04),
                    "rec_rat": float(r.get("receiving_rat") or 90.0),
                }

    adv_ru = _safe_parquet(data_dir / f"advstats_week_rush_{suffix}.parquet")
    if not adv_ru.empty:
        for _, r in _filter_reg(adv_ru).iterrows():
            wk = int(r.get("week") or 0)
            gsis = resolve_fn(r.get("pfr_player_id"), r.get("team"), r.get("pfr_player_name"))
            if gsis and wk > 0:
                adv_rush_out[(gsis, wk)] = {
                    "ybc_avg": float(r.get("rushing_yards_before_contact_avg") or 2.2),
                    "yac_avg": float(r.get("rushing_yards_after_contact_avg") or 2.0),
                    "rush_brk_tkl": float(r.get("rushing_broken_tackles") or 0.0),
                }

    adv_d = _safe_parquet(data_dir / f"advstats_week_def_{suffix}.parquet")
    if not adv_d.empty:
        for _, r in _filter_reg(adv_d).iterrows():
            wk = int(r.get("week") or 0)
            gsis = resolve_fn(r.get("pfr_player_id"), r.get("team"), r.get("pfr_player_name"))
            if gsis and wk > 0:
                hurry = float(r.get("def_times_hurried") or 0.0)
                hit = float(r.get("def_times_hitqb") or 0.0)
                sk = float(r.get("def_sacks") or 0.0)
                press = float(r.get("def_pressures") if r.get("def_pressures") is not None else (hurry + hit + sk))
                # Pipping-Gamon et al. (2026) OLS disruption weighting relative to sack
                disruption_qa = 0.009 * hurry + 0.103 * max(0.0, press - sk) + 1.0 * sk
                adv_def_out[(gsis, wk)] = {
                    "def_pressures": press,
                    "def_hurries": hurry,
                    "def_qbkd": hit,
                    "def_blitzed": float(r.get("def_times_blitzed") or 0.0),
                    "def_sacks": sk,
                    "def_tackles_comb": float(r.get("def_tackles_combined") or 0.0),
                    "def_missed_tackle_pct": float(r.get("def_missed_tackle_pct") or 0.10),
                    "pipping_gamon_qa": disruption_qa,
                }

    sc = _safe_parquet(data_dir / f"snap_counts_{suffix}.parquet")
    if not sc.empty:
        sc = _filter_reg(sc).copy()
        sc["team_norm"] = sc["team"].map(norm_team)
        for _, r in sc.iterrows():
            wk = int(r.get("week") or 0)
            pfr = str(r.get("pfr_player_id") or "").strip()
            tm = str(r.get("team_norm") or "")
            pos = str(r.get("position") or "").strip().upper()
            gsis = resolve_fn(pfr, tm, r.get("player"))
            if gsis and wk > 0:
                if pos:
                    idx.pos_by_gsis.setdefault(gsis, pos)
                snap_out[(gsis, wk)] = {
                    "offense_pct": float(r.get("offense_pct") or 0.0),
                    "defense_pct": float(r.get("defense_pct") or 0.0),
                    "offense_snaps": float(r.get("offense_snaps") or 0.0),
                    "defense_snaps": float(r.get("defense_snaps") or 0.0),
                }
        ol_sub = sc[sc["position"].isin(["T", "G", "C", "OL", "OT", "OG"]) & (sc["offense_snaps"] > 0)]
        for (tm, wk), grp in ol_sub.groupby(["team_norm", "week"]):
            top5 = tuple(sorted(str(x) for x in grp.sort_values("offense_snaps", ascending=False)["player"].head(5)))
            ol_out[(str(tm), int(wk))] = top5


def _ingest_pbp_ftn_season(
    pbp: pd.DataFrame,
    ftn: pd.DataFrame,
    ftn_off_out: dict[tuple[str, int], dict[str, float]],
    ftn_def_out: dict[tuple[str, int], dict[str, float]],
    rz_team_out: dict[tuple[str, int], dict[str, float]],
    rz_player_out: dict[tuple[str, int], dict[str, float]],
    ay_player_out: dict[tuple[str, int], dict[str, float]],
    opp_def_out: dict[tuple[str, int], dict[str, float]],
) -> None:
    if pbp.empty:
        return
    p_sub = _filter_reg(pbp).copy()
    if p_sub.empty:
        return
    p_sub["posteam_u"] = p_sub["posteam"].map(norm_team)
    p_sub["defteam_u"] = p_sub["defteam"].map(norm_team)

    if not ftn.empty and {"nflverse_game_id", "nflverse_play_id"}.issubset(ftn.columns):
        f_keep = ftn[
            [
                "nflverse_game_id",
                "nflverse_play_id",
                "is_play_action",
                "is_rpo",
                "is_motion",
                "n_defense_box",
                "n_blitzers",
                "is_catchable_ball",
                "is_qb_fault_sack",
            ]
        ].rename(columns={"nflverse_game_id": "game_id", "nflverse_play_id": "play_id"})
        merged = p_sub.merge(f_keep, on=["game_id", "play_id"], how="left")
        for bcol, dval in (
            ("is_play_action", 0.0),
            ("is_motion", 0.0),
            ("is_catchable_ball", 1.0),
            ("is_qb_fault_sack", 0.0),
        ):
            merged[bcol] = merged[bcol].astype("float64").fillna(dval)
        merged["n_blitzers"] = pd.to_numeric(merged["n_blitzers"], errors="coerce").fillna(0.0)
        pass_scrim = merged[merged["play_type"].isin(["pass", "run"]) & merged["posteam_u"].ne("")]
        for (tm, wk), grp in pass_scrim.groupby(["posteam_u", "week"]):
            g_p = grp[grp["pass_attempt"] == 1]
            ftn_off_out[(str(tm), int(wk))] = {
                "pa_rate": float(g_p["is_play_action"].mean()) if not g_p.empty else 0.22,
                "motion_rate": float(grp["is_motion"].mean()) if not grp.empty else 0.45,
                "catchable_rate": float(g_p["is_catchable_ball"].mean()) if not g_p.empty else 0.78,
                "qb_fault_sack_rate": float(g_p["is_qb_fault_sack"].mean()) if not g_p.empty else 0.02,
            }
        for (tm, wk), grp in pass_scrim.groupby(["defteam_u", "week"]):
            g_p = grp[grp["pass_attempt"] == 1]
            ftn_def_out[(str(tm), int(wk))] = {
                "opp_blitz_rate": float((g_p["n_blitzers"] >= 5).mean()) if not g_p.empty else 0.25,
                "opp_avg_box": float(grp["n_defense_box"].dropna().mean() or 6.4),
                "opp_catchable_allowed": float(g_p["is_catchable_ball"].mean()) if not g_p.empty else 0.78,
            }

    scrim_p = p_sub[p_sub["play_type"].isin(["pass", "run"]) & p_sub["week"].notna()].copy()
    scrim_p["in20"] = (scrim_p["yardline_100"].fillna(99.0) <= 20.0).astype(float)
    scrim_p["in10"] = (scrim_p["yardline_100"].fillna(99.0) <= 10.0).astype(float)
    scrim_p["in5"] = (scrim_p["yardline_100"].fillna(99.0) <= 5.0).astype(float)
    scrim_p["is_td"] = (
        (scrim_p.get("rush_touchdown", 0).fillna(0) == 1)
        | ((scrim_p.get("complete_pass", 0).fillna(0) == 1) & (scrim_p.get("pass_touchdown", 0).fillna(0) == 1))
    ).astype(float)

    for (tm, wk), grp in scrim_p.groupby(["posteam_u", "week"]):
        rz_team_out[(str(tm), int(wk))] = {
            "team_in20_opps": float(grp["in20"].sum()),
            "team_in10_opps": float(grp["in10"].sum()),
            "team_in5_opps": float(grp["in5"].sum()),
            "team_tds": float(grp["is_td"].sum()),
        }

    run_p = scrim_p[(scrim_p["play_type"] == "run") & (scrim_p.get("qb_kneel", 0) != 1)]
    if "rusher_player_id" in run_p.columns:
        for (pid, wk), grp in run_p.groupby(["rusher_player_id", "week"]):
            if pd.isna(pid):
                continue
            rec = rz_player_out.setdefault((str(pid), int(wk)), {"in20": 0.0, "in10": 0.0, "in5": 0.0, "tds": 0.0})
            rec["in20"] += float(grp["in20"].sum())
            rec["in10"] += float(grp["in10"].sum())
            rec["in5"] += float(grp["in5"].sum())
            rec["tds"] += float(grp.get("rush_touchdown", 0).fillna(0).sum())

    pass_p = scrim_p[(scrim_p["pass_attempt"] == 1) & (scrim_p.get("qb_spike", 0) != 1)]
    if "receiver_player_id" in pass_p.columns:
        for (pid, wk), grp in pass_p.groupby(["receiver_player_id", "week"]):
            if pd.isna(pid):
                continue
            rec = rz_player_out.setdefault((str(pid), int(wk)), {"in20": 0.0, "in10": 0.0, "in5": 0.0, "tds": 0.0})
            rec["in20"] += float(grp["in20"].sum())
            rec["in10"] += float(grp["in10"].sum())
            rec["in5"] += float(grp["in5"].sum())
            rec["tds"] += float(((grp["complete_pass"] == 1) & (grp["pass_touchdown"] == 1)).sum())

    if "passer_player_id" in pass_p.columns:
        for (pid, wk), grp in pass_p.groupby(["passer_player_id", "week"]):
            if pd.isna(pid):
                continue
            ay = grp["air_yards"].fillna(7.0)
            short = grp[ay < 20.0]
            deep = grp[ay >= 20.0]
            ay_player_out[(str(pid), int(wk))] = {
                "short_att": float(len(short)),
                "short_cmp": float((short["complete_pass"] == 1).sum()),
                "deep_att": float(len(deep)),
                "deep_cmp": float((deep["complete_pass"] == 1).sum()),
                "cpoe_mean": float(grp["cpoe"].dropna().mean() if "cpoe" in grp.columns and grp["cpoe"].notna().any() else 0.0) / 100.0,
                "air_per_att": float(ay.mean() if len(grp) > 0 else 7.5),
                "yac_per_cmp": float(grp.loc[grp["complete_pass"] == 1, "yards_after_catch"].fillna(4.5).mean() or 4.5)
                if (grp["complete_pass"] == 1).any()
                else 4.5,
            }

    for (dt, wk), grp in scrim_p.groupby(["defteam_u", "week"]):
        dp = grp[grp["pass_attempt"] == 1]
        dr = grp[grp["play_type"] == "run"]
        d_att = float(len(dp))
        d_cmp = float((dp["complete_pass"] == 1).sum())
        d_sk = float((grp.get("sack", 0).fillna(0) == 1).sum())
        opp_def_out[(str(dt), int(wk))] = {
            "def_cmp_pct": d_cmp / max(1.0, d_att),
            "def_sack_rate": d_sk / max(1.0, d_att + d_sk),
            "def_pass_ypa": float(dp["passing_yards"].fillna(0).sum()) / max(1.0, d_att),
            "def_rush_ypc": float(dr["rushing_yards"].fillna(0).sum()) / max(1.0, float(len(dr))),
            "def_rz_td_rate": float(grp["is_td"].sum()) / max(1.0, float(grp["in20"].sum())),
        }


@lru_cache(maxsize=4)
def build_causal_multi_dataset_index(
    nflverse_dir_str: str | None = None,
    pbp_path_str: str | None = None,
) -> CausalMultiDatasetIndex:
    """Load local 2025 REG + 2026 nflverse/FTN/NGS/PFR/SnapCounts/Combine tables."""
    data_dir = Path(nflverse_dir_str) if nflverse_dir_str else DEFAULT_NFLVERSE_DIR
    idx = CausalMultiDatasetIndex()

    pm = _safe_parquet(data_dir / "players_master.parquet")
    if not pm.empty:
        for _, r in pm.iterrows():
            gsis = str(r.get("gsis_id") or "").strip()
            pfr = str(r.get("pfr_id") or "").strip()
            pos = str(r.get("position") or "").strip().upper()
            tm = norm_team(r.get("latest_team"))
            dname = _norm_name(r.get("display_name") or r.get("short_name") or "")
            if gsis:
                if pfr:
                    idx.gsis_by_pfr[pfr] = gsis
                if pos:
                    idx.pos_by_gsis[gsis] = pos
                if tm and dname:
                    idx.gsis_by_team_norm[(tm, dname)] = gsis

    rw = _safe_parquet(data_dir / "roster_weekly_2026_w1_w10.parquet")
    if not rw.empty:
        for _, r in rw.iterrows():
            gsis = str(r.get("gsis_id") or "").strip()
            pfr = str(r.get("pfr_id") or "").strip()
            pos = str(r.get("position") or "").strip().upper()
            tm = norm_team(r.get("team"))
            fnm = _norm_name(r.get("full_name") or "")
            if gsis:
                if pfr and pfr not in idx.gsis_by_pfr:
                    idx.gsis_by_pfr[pfr] = gsis
                if pos:
                    idx.pos_by_gsis.setdefault(gsis, pos)
                if tm and fnm:
                    idx.gsis_by_team_norm[(tm, fnm)] = gsis

    def _resolve_gsis(pfr_id: Any = None, team: Any = None, player_name: Any = None) -> str:
        pfr = str(pfr_id or "").strip()
        if pfr and pfr in idx.gsis_by_pfr:
            return idx.gsis_by_pfr[pfr]
        tm = norm_team(team)
        nm = _norm_name(player_name)
        if tm and nm and (tm, nm) in idx.gsis_by_team_norm:
            return idx.gsis_by_team_norm[(tm, nm)]
        if pfr:
            return f"PFR:{pfr}"
        if tm and nm:
            return f"NM:{tm}:{nm}"
        return ""

    # 1. stats_player_week & stats_team_week (2025 REG + 2026 W1-W10)
    _ingest_spw_df(_safe_parquet(data_dir / "stats_player_week_2025.parquet"), idx.spw_2025_weekly, idx)
    _ingest_spw_df(_safe_parquet(data_dir / "stats_player_week_2026_w1_w10.parquet"), idx.spw_weekly, idx)
    _ingest_stw_df(_safe_parquet(data_dir / "stats_team_week_2025.parquet"), idx.team_week_2025_stats)
    _ingest_stw_df(_safe_parquet(data_dir / "stats_team_week_2026_w1_w10.parquet"), idx.team_week_stats)

    # 2. NGS passing/receiving/rushing (2025 weekly REG + 2025 summary prior + 2026 weekly)
    ngs_p = _safe_parquet(data_dir / "ngs_passing_2025_2026_w1_w10.parquet")
    if not ngs_p.empty:
        p25 = ngs_p[(ngs_p["season"] == 2025) & (ngs_p["week"].between(1, 18))]
        for gsis, grp in p25.groupby("player_gsis_id"):
            idx.ngs_pass_2025_prior[str(gsis)] = {
                "xcomp": float(grp["expected_completion_percentage"].dropna().mean() or 64.0) / 100.0,
                "cpoe": float(grp["completion_percentage_above_expectation"].dropna().mean() or 0.0) / 100.0,
                "iay": float(grp["avg_intended_air_yards"].dropna().mean() or 7.8),
                "ttt": float(grp["avg_time_to_throw"].dropna().mean() or 2.7),
                "aggr": float(grp["aggressiveness"].dropna().mean() or 15.0) / 100.0,
            }
        for target_s, store in ((2025, idx.ngs_pass_2025_weekly), (2026, idx.ngs_pass_weekly)):
            for _, r in ngs_p[(ngs_p["season"] == target_s) & (ngs_p["week"].between(1, 18))].iterrows():
                gsis = str(r.get("player_gsis_id") or "").strip()
                wk = int(r.get("week") or 0)
                if gsis and wk > 0:
                    store[(gsis, wk)] = {
                        "xcomp": float(r.get("expected_completion_percentage") or 64.0) / 100.0,
                        "cpoe": float(r.get("completion_percentage_above_expectation") or 0.0) / 100.0,
                        "iay": float(r.get("avg_intended_air_yards") or 7.8),
                        "ttt": float(r.get("avg_time_to_throw") or 2.7),
                        "aggr": float(r.get("aggressiveness") or 15.0) / 100.0,
                        "attempts": float(r.get("attempts") or 0.0),
                    }

    ngs_r = _safe_parquet(data_dir / "ngs_receiving_2025_2026_w1_w10.parquet")
    if not ngs_r.empty:
        r25 = ngs_r[(ngs_r["season"] == 2025) & (ngs_r["week"].between(1, 18))]
        for gsis, grp in r25.groupby("player_gsis_id"):
            idx.ngs_rec_2025_prior[str(gsis)] = {
                "sep": float(grp["avg_separation"].dropna().mean() or 2.8),
                "cushion": float(grp["avg_cushion"].dropna().mean() or 6.0),
                "iay": float(grp["avg_intended_air_yards"].dropna().mean() or 9.5),
                "yac_oe": float(grp["avg_yac_above_expectation"].dropna().mean() or 0.0),
            }
        for target_s, store in ((2025, idx.ngs_rec_2025_weekly), (2026, idx.ngs_rec_weekly)):
            for _, r in ngs_r[(ngs_r["season"] == target_s) & (ngs_r["week"].between(1, 18))].iterrows():
                gsis = str(r.get("player_gsis_id") or "").strip()
                wk = int(r.get("week") or 0)
                if gsis and wk > 0:
                    store[(gsis, wk)] = {
                        "sep": float(r.get("avg_separation") or 2.8),
                        "cushion": float(r.get("avg_cushion") or 6.0),
                        "iay": float(r.get("avg_intended_air_yards") or 9.5),
                        "yac_oe": float(r.get("avg_yac_above_expectation") or 0.0),
                        "air_share": float(r.get("percent_share_of_intended_air_yards") or 15.0) / 100.0,
                    }

    ngs_ru = _safe_parquet(data_dir / "ngs_rushing_2025_2026_w1_w10.parquet")
    if not ngs_ru.empty:
        ru25 = ngs_ru[(ngs_ru["season"] == 2025) & (ngs_ru["week"].between(1, 18))]
        for gsis, grp in ru25.groupby("player_gsis_id"):
            idx.ngs_rush_2025_prior[str(gsis)] = {
                "ryoe_pa": float(grp["rush_yards_over_expected_per_att"].dropna().mean() or 0.0),
                "eff": float(grp["efficiency"].dropna().mean() or 3.8),
                "stacked_pct": float(grp["percent_attempts_gte_eight_defenders"].dropna().mean() or 20.0) / 100.0,
            }
        for target_s, store in ((2025, idx.ngs_rush_2025_weekly), (2026, idx.ngs_rush_weekly)):
            for _, r in ngs_ru[(ngs_ru["season"] == target_s) & (ngs_ru["week"].between(1, 18))].iterrows():
                gsis = str(r.get("player_gsis_id") or "").strip()
                wk = int(r.get("week") or 0)
                if gsis and wk > 0:
                    store[(gsis, wk)] = {
                        "ryoe_pa": float(r.get("rush_yards_over_expected_per_att") or 0.0),
                        "eff": float(r.get("efficiency") or 3.8),
                        "stacked_pct": float(r.get("percent_attempts_gte_eight_defenders") or 20.0) / 100.0,
                    }

    # 3. PFR Advstats & SnapCounts (2025 REG + 2026 W1-W10)
    _ingest_adv_and_snap_season(
        data_dir,
        "2025",
        _resolve_gsis,
        idx,
        idx.adv_pass_2025_weekly,
        idx.adv_rec_2025_weekly,
        idx.adv_rush_2025_weekly,
        idx.adv_def_2025_weekly,
        idx.snap_2025_weekly,
        idx.team_ol_2025_by_week,
    )
    _ingest_adv_and_snap_season(
        data_dir,
        "2026_w1_w10",
        _resolve_gsis,
        idx,
        idx.adv_pass_weekly,
        idx.adv_rec_weekly,
        idx.adv_rush_weekly,
        idx.adv_def_weekly,
        idx.snap_weekly,
        idx.team_ol_lineup_by_week,
    )

    # 4. PBP + FTN charting (2025 REG + 2026 W1-W10)
    pbp_p25 = REPO_ROOT / "intelligence" / "coaching" / "data" / "play_by_play_2025.parquet"
    _ingest_pbp_ftn_season(
        _safe_parquet(pbp_p25),
        _safe_parquet(data_dir / "ftn_charting_2025.parquet"),
        idx.ftn_off_2025_weekly,
        idx.ftn_def_2025_weekly,
        idx.pbp_rz_team_2025_weekly,
        idx.pbp_rz_player_2025_weekly,
        idx.pbp_air_yac_player_2025_weekly,
        idx.pbp_opp_def_2025_weekly,
    )
    pbp_p = Path(pbp_path_str) if pbp_path_str else (REPO_ROOT / "intelligence" / "coaching" / "data" / "play_by_play_2026.parquet")
    _ingest_pbp_ftn_season(
        _safe_parquet(pbp_p),
        _safe_parquet(data_dir / "ftn_charting_2026_w1_w10.parquet"),
        idx.ftn_off_weekly,
        idx.ftn_def_weekly,
        idx.pbp_rz_team_weekly,
        idx.pbp_rz_player_weekly,
        idx.pbp_air_yac_player_weekly,
        idx.pbp_opp_def_weekly,
    )

    # 5. NFL Combine athleticism composite (Szekely et al. arXiv:2303.05774v1: 3-cone, 40yd, broad jump)
    comb = _safe_parquet(data_dir / "combine_2000_2026.parquet")
    if not comb.empty:
        forty_m = float(pd.to_numeric(comb.get("forty"), errors="coerce").dropna().mean() or 4.65)
        cone_m = float(pd.to_numeric(comb.get("cone"), errors="coerce").dropna().mean() or 7.10)
        bj_m = float(pd.to_numeric(comb.get("broad_jump"), errors="coerce").dropna().mean() or 116.0)
        for _, r in comb.iterrows():
            f_v = pd.to_numeric(r.get("forty"), errors="coerce")
            c_v = pd.to_numeric(r.get("cone"), errors="coerce")
            b_v = pd.to_numeric(r.get("broad_jump"), errors="coerce")
            parts: list[float] = []
            if pd.notna(f_v) and float(f_v) > 3.5:
                parts.append((forty_m - float(f_v)) / 0.25)
            if pd.notna(c_v) and float(c_v) > 5.5:
                parts.append((cone_m - float(c_v)) / 0.25)
            if pd.notna(b_v) and float(b_v) > 70.0:
                parts.append((float(b_v) - bj_m) / 8.0)
            if not parts:
                continue
            z_ath = float(np.clip(float(np.mean(parts)), -2.5, 2.5))
            pfr = str(r.get("pfr_id") or "").strip()
            pos = str(r.get("pos") or "").strip().upper()
            nm = _norm_name(r.get("player_name") or "")
            if pos and nm:
                idx.combine_by_norm_pos[(pos, nm)] = z_ath
            if pfr and pfr in idx.gsis_by_pfr:
                idx.combine_by_gsis[idx.gsis_by_pfr[pfr]] = z_ath

    return idx


def _wmean(rows: Sequence[dict[str, float]], weights: Sequence[float], key: str, default: float = 0.0) -> float:
    if not rows:
        return float(default)
    ws = np.asarray(weights, dtype=np.float64)
    vs = np.asarray([float(r.get(key, default)) for r in rows], dtype=np.float64)
    wsum = float(np.sum(ws))
    if wsum <= 1e-12:
        return float(np.mean(vs))
    return float(np.sum(ws * vs) / wsum)


# ---------------------------------------------------------------------------
# Strictly Causal Chronological Lookup Helpers (NEVER read >= target)
# ---------------------------------------------------------------------------

def get_causal_player_priors(
    idx: CausalMultiDatasetIndex,
    gsis_id: str | None,
    player_name: str,
    team: str,
    opp_team: str,
    target_week: int,
    *,
    position: str = "",
    stat_family: str = "passing_yards",
    is_home: bool = True,
    target_season: int = 2026,
    trailing_chrono_weeks: int = 16,
) -> dict[str, float]:
    """Aggregate strictly causal chronological priors across 2025 REG -> 2026 week < target_week."""
    tm = norm_team(team)
    opp = norm_team(opp_team)
    pid = str(gsis_id or "").strip()
    if not pid:
        pid = idx.gsis_by_team_norm.get((tm, _norm_name(player_name)), "")

    tgt_season = int(target_season)
    tgt_week = max(1, int(target_week))
    target_chrono = chronological_nfl_week_index(tgt_season, tgt_week)
    default_window = max(1, int(trailing_chrono_weeks))

    def _collect_chrono(
        store_25: dict[tuple[str, int], dict[str, float]],
        store_26: dict[tuple[str, int], dict[str, float]],
        key_id: str,
        *,
        window_weeks: int = default_window,
        half_life: float = 8.0,
    ) -> tuple[list[dict[str, float]], list[float]]:
        if not key_id:
            return ([], [])
        min_chrono = target_chrono - max(1, int(window_weeks))
        rows: list[dict[str, float]] = []
        weights: list[float] = []
        if tgt_season >= 2026:
            for w in range(1, 19):
                c_idx = chronological_nfl_week_index(2025, w)
                if min_chrono <= c_idx < target_chrono and (key_id, w) in store_25:
                    gap = max(1, target_chrono - c_idx)
                    rows.append(store_25[(key_id, w)])
                    weights.append(0.85 * (0.5 ** (float(gap) / float(half_life))))
            for w in range(1, tgt_week):
                c_idx = chronological_nfl_week_index(2026, w)
                if min_chrono <= c_idx < target_chrono and (key_id, w) in store_26:
                    gap = max(1, target_chrono - c_idx)
                    rows.append(store_26[(key_id, w)])
                    weights.append(0.5 ** (float(gap) / float(half_life)))
        else:
            for w in range(1, tgt_week):
                c_idx = chronological_nfl_week_index(2025, w)
                if min_chrono <= c_idx < target_chrono and (key_id, w) in store_25:
                    gap = max(1, target_chrono - c_idx)
                    rows.append(store_25[(key_id, w)])
                    weights.append(0.5 ** (float(gap) / float(half_life)))
        return (rows, weights)

    spw_h, spw_w = _collect_chrono(idx.spw_2025_weekly, idx.spw_weekly, pid)
    ngs_p_h, ngs_p_w = _collect_chrono(idx.ngs_pass_2025_weekly, idx.ngs_pass_weekly, pid)
    ngs_r_h, _ = _collect_chrono(idx.ngs_rec_2025_weekly, idx.ngs_rec_weekly, pid)
    # Yurko Ghosts (2025, arXiv:2406.17220v2): 8-week stabilization for 1D YAC expectation
    ngs_r_8w, ngs_r_8w_w = _collect_chrono(idx.ngs_rec_2025_weekly, idx.ngs_rec_weekly, pid, window_weeks=8, half_life=5.0)
    ngs_ru_h, ngs_ru_w = _collect_chrono(idx.ngs_rush_2025_weekly, idx.ngs_rush_weekly, pid)
    adv_ru_h, adv_ru_w = _collect_chrono(idx.adv_rush_2025_weekly, idx.adv_rush_weekly, pid)
    # Pipping-Gamon (2026): defensive rushers stabilize rapidly (12-week window, half-life 8)
    adv_d_h, adv_d_w = _collect_chrono(idx.adv_def_2025_weekly, idx.adv_def_weekly, pid, window_weeks=12, half_life=8.0)
    snap_h, snap_w = _collect_chrono(idx.snap_2025_weekly, idx.snap_weekly, pid, window_weeks=8, half_life=5.0)
    rz_h, _ = _collect_chrono(idx.pbp_rz_player_2025_weekly, idx.pbp_rz_player_weekly, pid)
    ay_h, _ = _collect_chrono(idx.pbp_air_yac_player_2025_weekly, idx.pbp_air_yac_player_weekly, pid)

    team_h, team_w = _collect_chrono(idx.team_week_2025_stats, idx.team_week_stats, tm, window_weeks=12, half_life=7.0)
    opp_h, opp_w = _collect_chrono(idx.team_week_2025_stats, idx.team_week_stats, opp, window_weeks=12, half_life=7.0)
    # Yurko Ghosts (2025): 12-week stabilization for 2D defensive coverage
    opp_def_h, opp_def_w = _collect_chrono(idx.pbp_opp_def_2025_weekly, idx.pbp_opp_def_weekly, opp, window_weeks=12, half_life=8.0)
    team_rz_h, _ = _collect_chrono(idx.pbp_rz_team_2025_weekly, idx.pbp_rz_team_weekly, tm)
    ftn_off_h, ftn_off_w = _collect_chrono(idx.ftn_off_2025_weekly, idx.ftn_off_weekly, tm, window_weeks=12, half_life=7.0)
    ftn_def_h, ftn_def_w = _collect_chrono(idx.ftn_def_2025_weekly, idx.ftn_def_weekly, opp, window_weeks=12, half_life=8.0)

    # Congelio Ch 1.3 unique OL combinations over causal chronological window
    ol_lineups: list[tuple[str, ...]] = []
    min_ol_chrono = target_chrono - 10
    if tgt_season >= 2026:
        for w in range(1, 19):
            if min_ol_chrono <= chronological_nfl_week_index(2025, w) < target_chrono and (tm, w) in idx.team_ol_2025_by_week:
                ol_lineups.append(idx.team_ol_2025_by_week[(tm, w)])
    for w in range(1, tgt_week):
        if (tm, w) in idx.team_ol_lineup_by_week:
            ol_lineups.append(idx.team_ol_lineup_by_week[(tm, w)])
    unique_ol_combos = len(set(ol_lineups)) if ol_lineups else 1
    ol_continuity_ratio = 1.0 / max(1.0, float(unique_ol_combos) ** 0.35)

    # NGS passing priors (shrunk toward 2025 baseline per Severini Ch 9.5)
    p25 = idx.ngs_pass_2025_prior.get(pid, {})
    xcomp_25 = p25.get("xcomp", 0.640)
    cpoe_25 = p25.get("cpoe", 0.000)
    if ngs_p_h:
        n_np = float(sum(ngs_p_w))
        xcomp_rec = _wmean(ngs_p_h, ngs_p_w, "xcomp", xcomp_25)
        cpoe_rec = _wmean(ngs_p_h, ngs_p_w, "cpoe", cpoe_25)
        qb_xcomp = (n_np * xcomp_rec + 3.0 * xcomp_25) / (n_np + 3.0)
        qb_cpoe = (n_np * cpoe_rec + 3.0 * cpoe_25) / (n_np + 3.0)
        qb_iay = _wmean(ngs_p_h, ngs_p_w, "iay", 7.8)
        qb_aggr = _wmean(ngs_p_h, ngs_p_w, "aggr", 0.15)
    else:
        qb_xcomp = xcomp_25
        qb_cpoe = cpoe_25
        qb_iay = p25.get("iay", 7.8)
        qb_aggr = p25.get("aggr", 0.15)

    # Eager Ch. 2 short/deep split stability shrinkage
    if ay_h:
        s_att = sum(r["short_att"] for r in ay_h)
        s_cmp = sum(r["short_cmp"] for r in ay_h)
        d_att = sum(r["deep_att"] for r in ay_h)
        d_cmp = sum(r["deep_cmp"] for r in ay_h)
        short_cmp_rate = (s_cmp + 80.0 * 0.695) / (s_att + 80.0)
        deep_cmp_rate = (d_cmp + 160.0 * 0.375) / (d_att + 160.0)
        deep_att_share = d_att / max(1.0, s_att + d_att)
    else:
        short_cmp_rate, deep_cmp_rate, deep_att_share = 0.695, 0.375, 0.12

    # Receiving priors (WOPR, target_share, NGS separation, Yurko 8-week YAC over expected)
    r25 = idx.ngs_rec_2025_prior.get(pid, {})
    if spw_h:
        wopr_mean = _wmean(spw_h, spw_w, "wopr", 0.28)
        rec_tgt_share = _wmean(spw_h, spw_w, "target_share", 0.14)
    else:
        wopr_mean, rec_tgt_share = 0.28, 0.14
    rec_sep = float(np.mean([r["sep"] for r in ngs_r_h])) if ngs_r_h else r25.get("sep", 2.8)
    rec_yac_oe = _wmean(ngs_r_8w, ngs_r_8w_w, "yac_oe", r25.get("yac_oe", 0.0)) if ngs_r_8w else r25.get("yac_oe", 0.0)
    rec_iay = float(np.mean([r["iay"] for r in ngs_r_h])) if ngs_r_h else r25.get("iay", 9.2)

    # Rushing priors (NGS RYOE/att, YBC, YAC)
    ru25 = idx.ngs_rush_2025_prior.get(pid, {})
    rush_ryoe = _wmean(ngs_ru_h, ngs_ru_w, "ryoe_pa", 0.0) if ngs_ru_h else ru25.get("ryoe_pa", 0.0)
    rush_stacked = _wmean(ngs_ru_h, ngs_ru_w, "stacked_pct", 0.20) if ngs_ru_h else ru25.get("stacked_pct", 0.20)
    rush_ybc = _wmean(adv_ru_h, adv_ru_w, "ybc_avg", 2.2) if adv_ru_h else 2.2
    rush_yac = _wmean(adv_ru_h, adv_ru_w, "yac_avg", 2.0) if adv_ru_h else 2.0

    # Snap % trend
    snap_pct = float(np.mean([max(r["offense_pct"], r["defense_pct"]) for r in snap_h])) if snap_h else 0.70
    snap_last = max(snap_h[-1]["offense_pct"], snap_h[-1]["defense_pct"]) if snap_h else snap_pct

    # Red-zone opportunity shares vs team total RZ opps
    if rz_h and team_rz_h:
        p_in20 = sum(r["in20"] for r in rz_h)
        p_in10 = sum(r["in10"] for r in rz_h)
        p_in5 = sum(r["in5"] for r in rz_h)
        t_in20 = max(1.0, sum(r["team_in20_opps"] for r in team_rz_h))
        t_in10 = max(1.0, sum(r["team_in10_opps"] for r in team_rz_h))
        t_in5 = max(1.0, sum(r["team_in5_opps"] for r in team_rz_h))
        rz_weighted_share = (
            0.40 * (p_in5 / t_in5)
            + 0.30 * (p_in10 / t_in10)
            + 0.20 * (p_in20 / t_in20)
            + 0.10 * min(0.35, rec_tgt_share + 0.08 * len(rz_h) / max(1.0, len(team_rz_h)))
        )
    else:
        rz_weighted_share = 0.08

    # Pipping-Gamon pass-rush disruption with Empirical-Bayes smoothing tau=4 games
    if adv_d_h:
        raw_qa = _wmean(adv_d_h, adv_d_w, "pipping_gamon_qa", 0.25)
        n_eff_d = float(sum(adv_d_w))
        def_qa = (n_eff_d * raw_qa + 4.0 * 0.22) / (n_eff_d + 4.0)
        def_press_pg = _wmean(adv_d_h, adv_d_w, "def_pressures", 0.0)
    else:
        def_qa = 0.0
        def_press_pg = 0.0
    pos_u = (position or idx.pos_by_gsis.get(pid, "")).upper()
    is_front_seven = 1.0 if (pos_u in FRONT_SEVEN_PASS_RUSH_POS or def_press_pg >= 0.45) else 0.0

    # Opponent defense & scheme context (Yurko 12-week coverage stabilization)
    opp_cmp_allowed = _wmean(opp_def_h, opp_def_w, "def_cmp_pct", 0.640) if opp_def_h else 0.640
    opp_sack_rate = _wmean(opp_def_h, opp_def_w, "def_sack_rate", 0.065) if opp_def_h else 0.065
    opp_pass_ypa = _wmean(opp_def_h, opp_def_w, "def_pass_ypa", 7.0) if opp_def_h else 7.0
    opp_rush_ypc = _wmean(opp_def_h, opp_def_w, "def_rush_ypc", 4.3) if opp_def_h else 4.3
    opp_rz_td_rate = _wmean(opp_def_h, opp_def_w, "def_rz_td_rate", 0.24) if opp_def_h else 0.24
    opp_off_sack_suffered = _wmean(opp_h, opp_w, "sack_rate", 0.065) if opp_h else 0.065
    opp_off_att_pg = _wmean(opp_h, opp_w, "attempts", 33.0) if opp_h else 33.0
    team_sack_suffered = _wmean(team_h, team_w, "sack_rate", 0.065) if team_h else 0.065
    team_pa_rate = _wmean(ftn_off_h, ftn_off_w, "pa_rate", 0.22) if ftn_off_h else 0.22
    opp_blitz_rate = _wmean(ftn_def_h, ftn_def_w, "opp_blitz_rate", 0.25) if ftn_def_h else 0.25
    opp_box = _wmean(ftn_def_h, ftn_def_w, "opp_avg_box", 6.4) if ftn_def_h else 6.4

    # Szekely et al. (arXiv:2303.05774v1): Combine prior active ONLY for < 4 observed NFL games
    n_nfl_obs = len(spw_h)
    comb_z = idx.combine_by_gsis.get(pid, idx.combine_by_norm_pos.get((pos_u, _norm_name(player_name)), 0.0))
    comb_w = compute_szekely_combine_prior_weight(n_nfl_obs)

    comp_ctx = get_week11_plus_compendium_matchup_context(
        tm,
        opp,
        pos_u,
        stat_family,
        tgt_week,
        is_home=is_home,
    )

    step_turn = compute_nguyen_yurko_step_turn_rush_decomp({
        "rush_ryoe": rush_ryoe,
        "rush_stacked": rush_stacked,
        "combine_athleticism_z": comb_z,
        "combine_prior_weight": comb_w,
    })

    return {
        "qb_xcomp": float(np.clip(qb_xcomp, 0.52, 0.76)),
        "qb_cpoe": float(np.clip(qb_cpoe, -0.10, 0.12)),
        "qb_iay": float(np.clip(qb_iay, 4.5, 13.0)),
        "qb_aggr": float(np.clip(qb_aggr, 0.05, 0.32)),
        "short_cmp_rate": float(short_cmp_rate),
        "deep_cmp_rate": float(deep_cmp_rate),
        "deep_att_share": float(deep_att_share),
        "ol_continuity_ratio": float(ol_continuity_ratio),
        "wopr_mean": float(wopr_mean),
        "rec_sep": float(rec_sep),
        "rec_yac_oe": float(rec_yac_oe),
        "rec_iay": float(rec_iay),
        "rush_ryoe": float(rush_ryoe),
        "rush_ybc_plus_yac": float(rush_ybc + rush_yac),
        "rush_stacked": float(rush_stacked),
        "snap_pct_mean": float(snap_pct),
        "snap_pct_last": float(snap_last),
        "rz_weighted_share": float(np.clip(rz_weighted_share, 0.01, 0.55)),
        "def_disruption_qa": float(def_qa),
        "def_pressures_pg": float(def_press_pg),
        "is_front_seven_rusher": float(is_front_seven),
        "opp_cmp_allowed": float(np.clip(opp_cmp_allowed, 0.52, 0.76)),
        "opp_sack_rate": float(np.clip(opp_sack_rate, 0.02, 0.14)),
        "opp_pass_ypa": float(np.clip(opp_pass_ypa, 4.5, 10.5)),
        "opp_rush_ypc": float(np.clip(opp_rush_ypc, 2.8, 6.2)),
        "opp_rz_td_rate": float(np.clip(opp_rz_td_rate, 0.10, 0.45)),
        "opp_off_sack_suffered": float(np.clip(opp_off_sack_suffered, 0.02, 0.15)),
        "opp_off_att_pg": float(np.clip(opp_off_att_pg, 22.0, 44.0)),
        "team_sack_suffered": float(np.clip(team_sack_suffered, 0.02, 0.15)),
        "team_pa_rate": float(team_pa_rate),
        "opp_blitz_rate": float(opp_blitz_rate),
        "opp_avg_box": float(opp_box),
        "compendium_causal_active": 1.0 if comp_ctx.get("causal_eligible") else 0.0,
        "compendium_pos_def_mult": float(comp_ctx.get("matchup_mult", 1.0)),
        "compendium_logit_adj": float(comp_ctx.get("logit_adj", 0.0)),
        "compendium_hardy_blitz_mult": float(comp_ctx.get("hardy_blitz_mult", 1.0)),
        "combine_athleticism_z": float(comb_z),
        "combine_prior_weight": float(comb_w),
        "nfl_games_observed": float(n_nfl_obs),
        "step_turn_rb_skill_share": float(step_turn["rb_skill_share"]),
        "step_turn_def_share": float(step_turn["def_share"]),
        "step_turn_explosive_cv": float(step_turn["explosive_cv"]),
        "chrono_window_weeks_used": float(default_window),
    }


# ---------------------------------------------------------------------------
# 5 Textbook + 4 Paper Closed-Form Distribution Kernels
# ---------------------------------------------------------------------------

def compute_eager_split_pass_and_binomial_completions(
    exp_attempts: float,
    var_attempts: float,
    priors: dict[str, float],
    line: float,
) -> float:
    """Eager & Erickson (Ch. 2 & 5): Beta-Binomial Completion Over/Under probability."""
    eb_comp_base = (1.0 - priors["deep_att_share"]) * priors["short_cmp_rate"] + priors["deep_att_share"] * priors["deep_cmp_rate"]
    # Pipping-Gamon pass protection / OL continuity pressure penalty (0.91 rusher vs 0.60 OL reliability)
    ol_pen = 0.08 * (1.0 - priors["ol_continuity_ratio"]) + 0.06 * max(0.0, priors.get("team_sack_suffered", 0.065) - 0.065)
    p_comp = (
        0.45 * (priors["qb_xcomp"] + 0.65 * priors["qb_cpoe"])
        + 0.35 * eb_comp_base
        + 0.20 * priors["opp_cmp_allowed"]
        - ol_pen
    )
    p_comp = float(np.clip(p_comp, 0.48, 0.77))
    n_eff = max(12.0, float(exp_attempts))
    mu_c = n_eff * p_comp
    var_c = max(2.2, n_eff * p_comp * (1.0 - p_comp) + (p_comp ** 2) * max(4.0, float(var_attempts)))
    z = (float(line) - mu_c) / math.sqrt(var_c)
    return float(np.clip(0.5 * math.erfc(z / math.sqrt(2.0)), 0.05, 0.95))


def compute_severini_compound_gamma_tail_prob(
    exp_volume: float,
    var_volume: float,
    exp_per_unit: float,
    var_per_unit: float,
    line: float,
) -> float:
    """Severini (Ch. 3.8, Law of Total Variance): Compound Gamma survival P(Y > line)."""
    mu_n = max(1.0, float(exp_volume))
    mu_x = max(1.0, float(exp_per_unit))
    mu_y = mu_n * mu_x
    var_y = max(4.0, mu_n * max(1.0, float(var_per_unit)) + (mu_x ** 2) * max(1.0, float(var_volume)))
    shape_k = (mu_y ** 2) / var_y
    scale_th = var_y / mu_y
    return float(np.clip(stats.gamma.sf(max(0.0, float(line)), a=shape_k, scale=scale_th), 0.04, 0.96))


def compute_hurdle_gamma_quarter_window_prob(
    full_opps_mean: float,
    q1_share: float,
    per_opp_mean: float,
    per_opp_sd: float,
    line: float,
) -> float:
    """Severini (Ch. 3.8) & Egidi (Ch. 5): Binomial-Gamma Hurdle P(1Q_yds > line)."""
    n_full = max(1, int(round(max(1.0, float(full_opps_mean)))))
    p_q1 = float(np.clip(q1_share, 0.14, 0.34))
    mu_1 = max(2.5, float(per_opp_mean))
    var_1 = max(4.0, float(per_opp_sd) ** 2)
    k_1 = (mu_1 ** 2) / var_1
    th_1 = var_1 / mu_1

    target = float(line)
    max_n = min(n_full, max(8, int(n_full * p_q1 + 5.0 * math.sqrt(n_full * p_q1 * (1.0 - p_q1)))))
    ks = np.arange(1, max_n + 1, dtype=np.int64)
    w_k = stats.binom.pmf(ks, n_full, p_q1)
    sf_k = stats.gamma.sf(max(0.0, target), a=ks * k_1, scale=th_1)
    p_over = float(np.sum(w_k * sf_k))
    return float(np.clip(p_over, 0.03, 0.95))


def compute_exact_order_statistic_longest_prob(
    exp_n_events: float,
    play_mean: float,
    play_cv: float,
    line: float,
) -> float:
    """Yurko (NFL Ghosts 2025) & Nguyen/Yurko (Step-and-Turn 2026): 1 - F_lognormal(L)^N."""
    cv = float(np.clip(play_cv, 0.40, 1.55))
    sigma_l = math.sqrt(math.log(1.0 + cv ** 2))
    mu_l = math.log(max(1.5, float(play_mean))) - 0.5 * (sigma_l ** 2)
    z = (math.log(max(0.5, float(line))) - mu_l) / max(0.05, sigma_l)
    f_one = 0.5 * (1.0 + math.erf(z / math.sqrt(2.0)))
    n_eff = max(1.0, float(exp_n_events))
    p_over = 1.0 - (min(0.9999, max(0.0001, f_one)) ** n_eff)
    return float(np.clip(p_over, 0.04, 0.95))


def compute_eager_poisson_gamma_td_prob(
    team_implied_total: float,
    player_rz_share: float,
    opp_rz_td_rate: float,
    disp_r: float = 3.5,
) -> float:
    """Eager & Erickson (Ch. 6): Red-Zone Conserved Poisson-Gamma Anytime TD Probability."""
    team_tds = max(0.8, float(team_implied_total) / 8.6)
    opp_mult = float(np.clip(float(opp_rz_td_rate) / 0.24, 0.78, 1.25))
    lam_td = max(0.03, team_tds * float(player_rz_share) * opp_mult)
    p_td = 1.0 - ((disp_r / (disp_r + lam_td)) ** disp_r)
    return float(np.clip(p_td, 0.04, 0.85))


def compute_pipping_gamon_sack_prob(
    priors: dict[str, float],
    hist_sack_rate_pg: float,
    line: float = 0.25,
) -> float:
    """Pipping-Gamon et al. (2026) + Congelio (Ch. 1.3): Rushers-Only Sack Survival Prob."""
    if priors["is_front_seven_rusher"] < 0.5 and hist_sack_rate_pg <= 0.02:
        return 0.04
    opp_db = float(priors["opp_off_att_pg"]) * (1.0 + priors["opp_off_sack_suffered"])
    qa_norm = min(1.8, float(priors["def_disruption_qa"]) / 0.45)
    opp_vuln = float(np.clip(priors["opp_off_sack_suffered"] / 0.065, 0.65, 1.55))
    lam_sk = max(0.03, (0.60 * float(hist_sack_rate_pg) + 0.40 * (0.28 * qa_norm * (opp_db / 34.0))) * opp_vuln)
    p_sk = 1.0 - math.exp(-lam_sk) if line < 0.5 else 1.0 - math.exp(-lam_sk * 0.88)
    return float(np.clip(p_sk, 0.03, 0.78))
