"""Column-backed equation helpers for mind ingestion (tinkabot lane).

Stated identity: tinkabot.
New-file helpers only. Does not edit equations.py. Does not score or mint.
Every input name must already exist on features_v1, learn_joined, or learn_wide.
NULL stays NULL. Inputs that fail floors stay NULL.

HOLD trim (Red Team via GSE Main): no composed sums/products of unrelated
columns; no home_minus_away rename wrappers. Kept primitives + documented
under_center / proe floor from corpus.
"""
from __future__ import annotations

from collections.abc import Sequence

IDENTITY = "tinkabot"

# Columns this module may read (receipt for mind). Do not invent others.
REQUIRED_FEATURES_V1: tuple[str, ...] = (
    "mkt",
    "elo",
    "elo_res",
)

REQUIRED_LEARN_JOINED: tuple[str, ...] = ()

REQUIRED_LEARN_WIDE: tuple[str, ...] = (
    "weekly_tendencies__shotgun_rate",
    "off_tendencies__shotgun_rate",
    "proe_early_neutral__proe",
    "proe_early_neutral__n_plays",
)

# Corpus floor citation: eng/learn_wide_coverage.json floors.proe_early_neutral
# "n_plays < 25 nulls proe, proe_raw, proe_se, pass_rate_actual, pass_rate_expected"
PROE_N_PLAYS_FLOOR = 25


def _null(x: float | None) -> bool:
    return x is None


def home_minus_away(home: float | None, away: float | None) -> float | None:
    """PIT home-minus-away. Both sides required."""
    if _null(home) or _null(away):
        return None
    return float(home) - float(away)


def under_center_rate(shotgun_rate: float | None) -> float | None:
    """learn_wide derived: under_center_rate = 1 - shotgun_rate."""
    if _null(shotgun_rate):
        return None
    return 1.0 - float(shotgun_rate)


def under_center_diff(home_shotgun: float | None, away_shotgun: float | None) -> float | None:
    """-(home_shotgun - away_shotgun); the +1 cancels.

    Source: eng/learn_wide_coverage.json derived.formula / on_diff.
    """
    d = home_minus_away(home_shotgun, away_shotgun)
    if d is None:
        return None
    return -d


def market_elo_residual(elo_logit: float | None, market_logit: float | None) -> float | None:
    """elo_res = elo - mkt. Prefer features_v1.elo_res when present."""
    if _null(elo_logit) or _null(market_logit):
        return None
    return float(elo_logit) - float(market_logit)


def proe_or_null(
    proe: float | None,
    n_plays: float | None,
    floor: float = PROE_N_PLAYS_FLOOR,
) -> float | None:
    """proe_early_neutral floor from eng/learn_wide_coverage.json:

    floors.proe_early_neutral: "n_plays < 25 nulls proe, proe_raw, proe_se,
    pass_rate_actual, pass_rate_expected"
    """
    if _null(proe) or _null(n_plays):
        return None
    if float(n_plays) < floor:
        return None
    return float(proe)


COLUMN_BACKED_FUNCS: Sequence[str] = (
    "home_minus_away",
    "under_center_rate",
    "under_center_diff",
    "market_elo_residual",
    "proe_or_null",
)

# Functions removed under Red Team HOLD (do not reintroduce without CLEAR).
HOLD_DELETED: Sequence[str] = (
    "qb_pit_plus_elo_res",
    "cpoe_plus_p2s",
    "adot_minus_deep",
    "scramble_vs_epa",
    "availability_group_sum",
    "availability_offense_edge",
    "availability_defense_edge",
    "clean_vs_sens_epa",
    "offset_family_eta",
    "row_column_edges",
    "trust_top_share_edge",
    "trust_hhi_edge",
    "trust_n_eff_edge",
    "protection_stress_edge",
    "pressure_proxy_edge",
    "sack_rate_edge",
    "pace_med_edge",
    "hurryup_edge",
    "rz_pass_edge",
    "rz_proe_edge",
    "script_beta_edge",
    "sequencing_contrast_edge",
    "mahal_dist_edge",
    "early_down_pass_edge",
    "quick_game_edge",
    "avg_air_yards_edge",
    "pass_rate_all_edge",
    "top_ay_share_edge",
    "top2_share_edge",
)
