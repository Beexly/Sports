"""Column-backed equation helpers for mind ingestion (tinkabot lane).

New file only. Does not edit equations.py. Does not score or mint.
Every input name must already exist on features_v1, learn_joined, or learn_wide.
NULL stays NULL. Inputs that fail floors stay NULL.
"""
from __future__ import annotations

from collections.abc import Mapping, Sequence


# Columns this module may read (receipt for mind). Do not invent others.
REQUIRED_FEATURES_V1: tuple[str, ...] = (
    "mkt",
    "elo",
    "elo_res",
    "qb_pit",
    "home_flag",
    "neutral",
    "spread_line",
    "total_line",
    "av_OL",
    "av_SKILL",
    "av_FRONT",
    "av_DB",
    "av_Q",
)

REQUIRED_LEARN_JOINED: tuple[str, ...] = (
    "sens_epa_floor",
    "clean_epa_baseline",
    "p2s_eb",
    "cpoe_pbp",
    "adot",
    "deep_rate_20",
    "scramble_rate",
    "epa",
    "hhi",
    "n_eff",
    "top_share",
    "top2_share",
    "top_ay_share",
    "protection_stress",
)

REQUIRED_LEARN_WIDE: tuple[str, ...] = (
    "weekly_tendencies__shotgun_rate",
    "weekly_tendencies__under_center_rate",
    "weekly_tendencies__quick_game_rate",
    "weekly_tendencies__avg_air_yards",
    "weekly_tendencies__pass_rate_all",
    "weekly_tendencies__early_down_pass_rate",
    "weekly_tendencies__no_huddle_rate",
    "off_tendencies__shotgun_rate",
    "off_tendencies__under_center_rate",
    "off_tendencies__quick_game_rate",
    "off_tendencies__deep_rate",
    "off_tendencies__avg_air_yards",
    "proe_early_neutral__proe",
    "proe_early_neutral__n_plays",
    "def_pressure_weekly__proxy_rate",
    "def_tendencies__pressure_proxy",
    "def_tendencies__sack_rate_vs",
    "tempo__pace_med",
    "tempo__hurryup_rate",
    "rz_mix__rz_pass_rate",
    "rz_mix__rz_proe",
    "script_elasticity__beta_script",
    "sequencing__2__contrast",
    "adjustments__mahal_dist",
)


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
    """-(home_shotgun - away_shotgun); the +1 cancels. Source: learn_wide_coverage derived."""
    d = home_minus_away(home_shotgun, away_shotgun)
    if d is None:
        return None
    return -d


def availability_group_sum(
    av_ol: float | None,
    av_skill: float | None,
    av_front: float | None,
    av_db: float | None,
    av_q: float | None,
) -> float | None:
    """Sum of features_v1 av_* group diffs already home-minus-away."""
    vals = (av_ol, av_skill, av_front, av_db, av_q)
    if any(_null(v) for v in vals):
        return None
    return float(av_ol) + float(av_skill) + float(av_front) + float(av_db) + float(av_q)


def availability_offense_edge(av_ol: float | None, av_skill: float | None, av_q: float | None) -> float | None:
    """Offense-side availability edge from features_v1 av_OL + av_SKILL + av_Q."""
    if _null(av_ol) or _null(av_skill) or _null(av_q):
        return None
    return float(av_ol) + float(av_skill) + float(av_q)


def availability_defense_edge(av_front: float | None, av_db: float | None) -> float | None:
    """Defense-side availability edge from features_v1 av_FRONT + av_DB."""
    if _null(av_front) or _null(av_db):
        return None
    return float(av_front) + float(av_db)


def market_elo_residual(elo_logit: float | None, market_logit: float | None) -> float | None:
    """elo_res = elo - mkt. Prefer features_v1.elo_res when present."""
    if _null(elo_logit) or _null(market_logit):
        return None
    return float(elo_logit) - float(market_logit)


def qb_pit_plus_elo_res(qb_pit: float | None, elo_res: float | None) -> float | None:
    """Champion-family additive: PIT QB edge + Elo residual. No new columns."""
    if _null(qb_pit) or _null(elo_res):
        return None
    return float(qb_pit) + float(elo_res)


def trust_top_share_edge(home_top: float | None, away_top: float | None) -> float | None:
    """learn_joined top_share home-minus-away."""
    return home_minus_away(home_top, away_top)


def trust_hhi_edge(home_hhi: float | None, away_hhi: float | None) -> float | None:
    """learn_joined hhi home-minus-away (higher = more concentrated)."""
    return home_minus_away(home_hhi, away_hhi)


def trust_n_eff_edge(home_n: float | None, away_n: float | None) -> float | None:
    """learn_joined n_eff home-minus-away."""
    return home_minus_away(home_n, away_n)


def protection_stress_edge(home_ps: float | None, away_ps: float | None) -> float | None:
    """learn_joined protection_stress home-minus-away."""
    return home_minus_away(home_ps, away_ps)


def clean_vs_sens_epa(clean: float | None, sens_floor: float | None) -> float | None:
    """learn_joined clean_epa_baseline - sens_epa_floor."""
    if _null(clean) or _null(sens_floor):
        return None
    return float(clean) - float(sens_floor)


def adot_minus_deep(adot: float | None, deep_rate_20: float | None) -> float | None:
    """learn_joined adot vs deep_rate_20 residual (same-row)."""
    if _null(adot) or _null(deep_rate_20):
        return None
    return float(adot) - float(deep_rate_20)


def cpoe_plus_p2s(cpoe_pbp: float | None, p2s_eb: float | None) -> float | None:
    """learn_joined cpoe_pbp + p2s_eb (both EB-shrunk QB weekly)."""
    if _null(cpoe_pbp) or _null(p2s_eb):
        return None
    return float(cpoe_pbp) + float(p2s_eb)


def scramble_vs_epa(scramble_rate: float | None, epa: float | None) -> float | None:
    """learn_joined scramble_rate - epa (mobility vs efficiency)."""
    if _null(scramble_rate) or _null(epa):
        return None
    return float(scramble_rate) - float(epa)


def proe_or_null(proe: float | None, n_plays: float | None, floor: float = 25.0) -> float | None:
    """proe_early_neutral floor: n_plays < 25 -> NULL (learn_wide floors)."""
    if _null(proe) or _null(n_plays):
        return None
    if float(n_plays) < floor:
        return None
    return float(proe)


def pressure_proxy_edge(home_proxy: float | None, away_proxy: float | None) -> float | None:
    """def_pressure_weekly__proxy_rate or def_tendencies__pressure_proxy H-A."""
    return home_minus_away(home_proxy, away_proxy)


def sack_rate_edge(home_sack: float | None, away_sack: float | None) -> float | None:
    """def_tendencies__sack_rate_vs home-minus-away."""
    return home_minus_away(home_sack, away_sack)


def pace_med_edge(home_pace: float | None, away_pace: float | None) -> float | None:
    """tempo__pace_med home-minus-away (seconds; lower = faster)."""
    return home_minus_away(home_pace, away_pace)


def hurryup_edge(home_hu: float | None, away_hu: float | None) -> float | None:
    """tempo__hurryup_rate home-minus-away."""
    return home_minus_away(home_hu, away_hu)


def rz_pass_edge(home_rz: float | None, away_rz: float | None) -> float | None:
    """rz_mix__rz_pass_rate home-minus-away."""
    return home_minus_away(home_rz, away_rz)


def rz_proe_edge(home_rzp: float | None, away_rzp: float | None) -> float | None:
    """rz_mix__rz_proe home-minus-away."""
    return home_minus_away(home_rzp, away_rzp)


def script_beta_edge(home_b: float | None, away_b: float | None) -> float | None:
    """script_elasticity__beta_script home-minus-away."""
    return home_minus_away(home_b, away_b)


def sequencing_contrast_edge(home_c: float | None, away_c: float | None) -> float | None:
    """sequencing__2__contrast home-minus-away."""
    return home_minus_away(home_c, away_c)


def mahal_dist_edge(home_m: float | None, away_m: float | None) -> float | None:
    """adjustments__mahal_dist home-minus-away."""
    return home_minus_away(home_m, away_m)


def early_down_pass_edge(home_ed: float | None, away_ed: float | None) -> float | None:
    """weekly_tendencies__early_down_pass_rate home-minus-away."""
    return home_minus_away(home_ed, away_ed)


def quick_game_edge(home_qg: float | None, away_qg: float | None) -> float | None:
    """weekly/off_tendencies quick_game_rate home-minus-away."""
    return home_minus_away(home_qg, away_qg)


def avg_air_yards_edge(home_ay: float | None, away_ay: float | None) -> float | None:
    """weekly/off_tendencies avg_air_yards home-minus-away."""
    return home_minus_away(home_ay, away_ay)


def pass_rate_all_edge(home_pr: float | None, away_pr: float | None) -> float | None:
    """weekly_tendencies__pass_rate_all home-minus-away."""
    return home_minus_away(home_pr, away_pr)


def top_ay_share_edge(home_t: float | None, away_t: float | None) -> float | None:
    """learn_joined top_ay_share home-minus-away."""
    return home_minus_away(home_t, away_t)


def top2_share_edge(home_t: float | None, away_t: float | None) -> float | None:
    """learn_joined top2_share home-minus-away."""
    return home_minus_away(home_t, away_t)


def offset_family_eta(
    market_logit: float | None,
    home_flag: float | None,
    neutral: float | None,
    qb_pit: float | None,
    elo_res: float | None,
    intercept: float = 0.0,
    w_home: float = 1.0,
    w_qb: float = 1.0,
    w_elo: float = 1.0,
) -> float | None:
    """Champion moneyline family shape: mkt + home/neutral + qb_pit + elo_res.

    Weights default to 1.0; callers may pass published weights. Not a scorer.
    """
    if any(_null(v) for v in (market_logit, home_flag, neutral, qb_pit, elo_res)):
        return None
    home_term = float(home_flag) * (0.0 if float(neutral) else 1.0)
    return (
        float(market_logit)
        + intercept
        + w_home * home_term
        + w_qb * float(qb_pit)
        + w_elo * float(elo_res)
    )


def row_column_edges(row: Mapping[str, float | None], prefix_home: str = "h_", prefix_away: str = "a_") -> dict[str, float | None]:
    """Compute H-A edges for a flat row that already stores home/away column pairs.

    Expects keys like h_protection_stress / a_protection_stress. Skips missing pairs.
    """
    out: dict[str, float | None] = {}
    homes = [k[len(prefix_home) :] for k in row if k.startswith(prefix_home)]
    for name in homes:
        hk = prefix_home + name
        ak = prefix_away + name
        if ak not in row:
            continue
        out[name + "_edge"] = home_minus_away(row.get(hk), row.get(ak))
    return out


COLUMN_BACKED_FUNCS: Sequence[str] = (
    "home_minus_away",
    "under_center_rate",
    "under_center_diff",
    "availability_group_sum",
    "availability_offense_edge",
    "availability_defense_edge",
    "market_elo_residual",
    "qb_pit_plus_elo_res",
    "trust_top_share_edge",
    "trust_hhi_edge",
    "trust_n_eff_edge",
    "protection_stress_edge",
    "clean_vs_sens_epa",
    "adot_minus_deep",
    "cpoe_plus_p2s",
    "scramble_vs_epa",
    "proe_or_null",
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
    "offset_family_eta",
    "row_column_edges",
)
