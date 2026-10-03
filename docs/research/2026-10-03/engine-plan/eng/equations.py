"""Named equation functions. Formulas are copied from the engine plan. No new columns.

Not a scorer, not a feature table, not a mint. NULL stays NULL.

Sources:
- docs/research/2026-10-03/engine-plan/eng/features.py  (logit)
- docs/research/2026-10-03/engine-plan/eng/scoredist.py (log loss, fair side, team points)
- docs/research/2026-10-03/engine-plan/brain/protection_stress.py and brain/BRAIN.md (stress, NULL guards)
- docs/research/2026-10-03/engine-plan/GSE_V2_DECISIONS_SPRINT_2026-10-03.md section 2.1 (promote)
"""
from __future__ import annotations

import math
from collections.abc import Sequence


def logit(p: float) -> float:
    """features.py: lg(p) = log(p / (1 - p)), clipped to [1e-6, 1 - 1e-6]."""
    p = min(max(p, 1e-6), 1.0 - 1e-6)
    return math.log(p / (1.0 - p))


def log_loss(p: float, y: float) -> float:
    """scoredist.py ll: -(y * log(p) + (1 - y) * log(1 - p)), same clip."""
    p = min(max(p, 1e-6), 1.0 - 1e-6)
    return -(y * math.log(p) + (1.0 - y) * math.log(1.0 - p))


def fair_side(values: Sequence[float], line: float, shift: float = 0.0) -> float:
    """scoredist.py: ((v > line) + 0.5 * (v == line)) / n, after adding shift."""
    if len(values) == 0:
        raise ValueError("fair_side: empty sample")
    above = 0.0
    for raw in values:
        v = raw + shift
        if v > line:
            above += 1.0
        elif v == line:
            above += 0.5
    return above / len(values)


def team_points(total: float, margin: float) -> tuple[float, float]:
    """scoredist.py mk: home = (t + m) / 2, away = (t - m) / 2."""
    return (total + margin) / 2.0, (total - margin) / 2.0


def league_expected_pressure(intercept: float, blitz_coef: float, blitz_rate: float) -> float:
    """protection_stress.py: expected = a + b * blitz_rate."""
    return intercept + blitz_coef * blitz_rate


def protection_stress(
    pressure_rate: float,
    blitz_rate: float,
    intercept: float,
    blitz_coef: float,
    n_team_games: int,
    league_team_weeks: int,
) -> float | None:
    """stress = pressure_rate_allowed - league_expected_rate(blitz_rate_faced).

    Guards copied from the script docstring: fewer than 3 team games -> NULL;
    league fit pool under 32 team-weeks -> NULL.
    """
    if n_team_games < 3 or league_team_weeks < 32:
        return None
    expected = league_expected_pressure(intercept, blitz_coef, blitz_rate)
    return pressure_rate - expected


def promoted(delta_logloss_ci_high: float, placebo_fraction: float, fdr_q: float) -> bool:
    """Section 2.1: the 95% CI on delta log loss is below 0 (upper end < 0),
    placebo fraction <= 0.10, and BH-FDR q <= 0.10.
    """
    return delta_logloss_ci_high < 0.0 and placebo_fraction <= 0.10 and fdr_q <= 0.10


def drive_state_line(ydstogo: float, yardline_100: float) -> float:
    """drive_linear.py: 0.2007*ydstogo - 0.0446*yardline_100."""
    return 0.2007 * ydstogo - 0.0446 * yardline_100


def mean_or_null(total: float, n: int, floor: int = 30) -> float | None:
    """Prior-play mean. drive_linear.py and the air-yards files: null under the floor (30)."""
    if n < floor:
        return None
    return total / n


def shrunk_cell(w: float, n: float, p_hat_parent: float | None, m: float = 25.0) -> float | None:
    """int_parent.py: (w + 25 * p_hat_parent) / (n + 25). No invented parent rate."""
    if p_hat_parent is None:
        return None
    return (w + m * p_hat_parent) / (n + m)


def raw_rate_or_null(w: float, n: float) -> float | None:
    """int_parent.py: p_hat is w/n when n > 0 else null."""
    if n <= 0:
        return None
    return w / n


def air_yards_to_sticks(air_yards: float, ydstogo: float) -> float:
    """air_yards_to_sticks.py: air_yards - ydstogo."""
    return air_yards - ydstogo


def completion_residual(completions: float, expected: float, attempts: int, floor: int = 30) -> float | None:
    """qb_air_cpoe.py: (completions - expected) / attempts. Null under 30 attempts."""
    if attempts < floor:
        return None
    return (completions - expected) / attempts


def complete_minus_probability(complete_pass: float, probability: float) -> float:
    """independent_cpoe.py: residual is complete_pass minus the fitted probability."""
    return complete_pass - probability


def logistic_probability(offset: float, weight: float, z: float) -> float:
    """independent_cpoe.py fit step: 1 / (1 + exp(-(offset + weight * z)))."""
    return 1.0 / (1.0 + math.exp(-(offset + weight * z)))


def margin_residual(result: float, spread_line: float) -> float:
    """scoredist.py: result - spread_line."""
    return result - spread_line


def total_residual(total: float, total_line: float) -> float:
    """scoredist.py: total - total_line."""
    return total - total_line


def push_adjusted(p_side: float, p_push: float) -> float:
    """scoredist.py: p_side / max(1e-9, 1 - p_push)."""
    return p_side / max(1e-9, 1.0 - p_push)


def home_minus_away(home: float | None, away: float | None) -> float | None:
    """Stated on the drive, sticks, and completion features: home minus away, null if either side is null."""
    if home is None or away is None:
        return None
    return home - away


def american_implied(ml: float) -> float:
    """baseline.py ml_prob: 100/(ml+100) if ml>0 else -ml/(-ml+100)."""
    ml = float(ml)
    return 100 / (ml + 100) if ml > 0 else -ml / (-ml + 100)


def devig(home_implied: float, away_implied: float) -> float | None:
    """baseline.py: q = ph / (ph + pa). Null if the denominator is 0."""
    den = home_implied + away_implied
    if den == 0:
        return None
    return home_implied / den


def elo_margin(home_elo: float, away_elo: float, neutral: bool, hfa: float = 48.0) -> float:
    """baseline.py: home Elo minus away, plus 48 unless the site is neutral."""
    return home_elo - away_elo + (0.0 if neutral else hfa)


def elo_win_prob(margin: float) -> float:
    """baseline.py: 1 / (1 + 10 ** (-margin / 400))."""
    return 1.0 / (1.0 + 10 ** (-margin / 400.0))


def season_regress(elo: float) -> float:
    """baseline.py: 1500 + (elo - 1500) * 2/3. One third of the gap is removed."""
    return 1500.0 + (elo - 1500.0) * (2.0 / 3.0)


def mov_multiplier(mov: float, elo_margin_value: float) -> float:
    """baseline.py: log(mov+1) * 2.2 / (abs(margin)*0.001 + 2.2)."""
    return math.log(mov + 1.0) * 2.2 / (abs(elo_margin_value) * 0.001 + 2.2)


def elo_points(k: float, multiplier: float, actual_share: float, win_prob: float) -> float:
    """baseline.py: K * multiplier * (share - p). Share is 1, 0.5, or 0."""
    return k * multiplier * (actual_share - win_prob)


def brier(p: float, y: float) -> float:
    """chart.py: (p - y) ** 2."""
    return (p - y) ** 2


def ece(probs: list[float], outcomes: list[float], bins: int = 10) -> float:
    """chart.py: sum (k/n) * abs(mean p - mean y) over 10 bins. Last bin is closed on the right."""
    if len(probs) != len(outcomes) or len(probs) == 0:
        raise ValueError("ece: probs and outcomes must be the same non-empty length")
    n = len(probs)
    edges = [i / bins for i in range(bins + 1)]
    total = 0.0
    for i in range(bins):
        lo, hi = edges[i], edges[i + 1]
        group = []
        for p, y in zip(probs, outcomes):
            if p >= lo and (p < hi if i < bins - 1 else p <= hi):
                group.append((p, y))
        k = len(group)
        if k == 0:
            continue
        stated = sum(p for p, _ in group) / k
        realized = sum(y for _, y in group) / k
        total += (k / n) * abs(stated - realized)
    return total


def decay_weight(age_weeks: float) -> float:
    """encoder_adj.py: 0.5 ** (age / 8)."""
    return 0.5 ** (age_weeks / 8.0)


def encoder_age_weeks(cutoff_season: int, cutoff_week: int, season: int, week: int) -> int:
    """encoder_adj.py: (cutoff_season - season) * 18 + (cutoff_week - week)."""
    return (cutoff_season - season) * 18 + (cutoff_week - week)


def elo_residual(elo_logit: float, market_logit: float) -> float:
    """features.py: elo_res = elo - mkt. Both inputs are already logits."""
    return elo_logit - market_logit


def int_rate(interceptions: float, attempts: float, floor: float = 30.0) -> float | None:
    """corpus_on_engine.py asof: ints/att, null when attempts are under 30."""
    if attempts < floor:
        return None
    return interceptions / attempts


def int_on_pressure(pressure_ints: float, pressure_attempts: float, floor: float = 20.0) -> float | None:
    """corpus_on_engine.py: hit_int/hit_att, null when pressure attempts are under 20."""
    if pressure_attempts < floor:
        return None
    return pressure_ints / pressure_attempts


def target_share(top_targets: float, targets: float) -> float | None:
    """corpus_on_engine.py: top_n / tgt. Null when there are no targets."""
    if targets <= 0:
        return None
    return top_targets / targets


def is_deep(air_yards: float) -> int:
    """corpus_on_engine.py: 1 when air_yards >= 15, else 0."""
    return 1 if air_yards >= 15 else 0


def weighted_mean(values: list[float], weights: list[float]) -> float | None:
    """league_baselines.py: sum(value * weight) / sum(weight). Non-positive weights are dropped."""
    num = 0.0
    den = 0.0
    for v, w in zip(values, weights):
        if w <= 0:
            continue
        num += v * w
        den += w
    if den == 0:
        return None
    return num / den


def four_week_cv(prior: list[float]) -> float | None:
    """roll_trust.py: sample sd / mean on exactly four prior shares. Null if the mean is 0 or the window is not four."""
    if len(prior) != 4:
        return None
    mean = sum(prior) / 4.0
    if mean == 0.0:
        return None
    var = sum((v - mean) ** 2 for v in prior) / 3.0
    return math.sqrt(var) / mean


def air_bin(air_yards: float) -> int:
    """qb_air_cpoe.py: bins behind the line, 0-5, 6-10, 11-15, 16-20, and beyond. Non-finite is -1."""
    if air_yards != air_yards or air_yards in (float("inf"), float("-inf")):
        return -1
    if air_yards < 0:
        return 0
    if air_yards <= 5:
        return 1
    if air_yards <= 10:
        return 2
    if air_yards <= 15:
        return 3
    if air_yards <= 20:
        return 4
    return 5


def sigmoid(x: float) -> float:
    """mint_w4.py: 1 / (1 + exp(-x))."""
    return 1.0 / (1.0 + math.exp(-x))


def standardize(x: float, mu: float, sd: float) -> float:
    """The fit step in test_v1.py and mint_w4.py: (x - mu) / (sd + 1e-9)."""
    return (x - mu) / (sd + 1e-9)


def result_share(result: float) -> float:
    """baseline.py: 1 if the margin is positive, 0.5 on a tie, else 0."""
    if result > 0:
        return 1.0
    if result == 0:
        return 0.5
    return 0.0


def strict_side(values: list[float], line: float) -> float:
    """scoredist.py mk: fraction strictly greater than the line. Pushes are not half-credited."""
    if len(values) == 0:
        raise ValueError("strict_side: empty sample")
    return sum(1.0 for v in values if v > line) / len(values)


def shifted_total(historical_total: float, historical_line: float, quoted_line: float) -> float:
    """scoredist.py neighborhood: round(historical total + (quoted line - historical line))."""
    return float(round(historical_total + (quoted_line - historical_line)))


def shift_to_target(margins: list[float], target: float) -> float:
    """scoredist.py shift_to: 40-step search on [-14, 14] so the tie-halved home-win rate meets the target."""
    if len(margins) == 0:
        raise ValueError("shift_to_target: empty sample")
    lo, hi = -14.0, 14.0
    n = len(margins)
    for _ in range(40):
        mid = (lo + hi) / 2.0
        above = 0.0
        for m in margins:
            v = m + mid
            if v > 0:
                above += 1.0
            elif v == 0:
                above += 0.5
        ph = above / n
        if ph < target:
            lo = mid
        else:
            hi = mid
    return (lo + hi) / 2.0
