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


def quick_game_expanding_mean(rows: Sequence[tuple[int, float | None]], week: int) -> float | None:
    """league_baselines.py: unweighted mean of rates whose week is strictly less than W. Null rates dropped. No prior week yields null."""
    chosen: list[float] = []
    for row_week, rate in rows:
        if row_week >= week or rate is None or rate != rate:
            continue
        chosen.append(float(rate))
    if not chosen:
        return None
    return sum(chosen) / len(chosen)


def n_plays_weighted_mean(rows: Sequence[tuple[float | None, float | None]]) -> float | None:
    """league_baselines.py: n_plays-weighted mean of beta_script. Null beta or n_plays <= 0 dropped. No remaining rows yields null."""
    num = 0.0
    den = 0.0
    for beta, n_plays in rows:
        if beta is None or n_plays is None or beta != beta or n_plays != n_plays:
            continue
        if n_plays <= 0:
            continue
        num += float(beta) * float(n_plays)
        den += float(n_plays)
    if den == 0.0:
        return None
    return num / den


def leaf_served_rate(
    w: float,
    n: float,
    p_hat_parent: float | None,
    m: float = 25.0,
    floor: float = 30.0,
) -> float | None:
    """int_parent.py: (w + 25 * p_hat_parent) / (n + 25) only when n >= 30 and p_hat_parent is not null. Otherwise null. Not a parent lookup."""
    if n < floor or p_hat_parent is None:
        return None
    return (w + m * p_hat_parent) / (n + m)


def parse_season_key(season_key: str) -> tuple[int, int | None]:
    """int_parent.py: '2026_w3' is (2026, 3). A bare season is (season, None)."""
    text = str(season_key)
    if "_w" in text:
        season_s, week_s = text.split("_w", 1)
        return int(season_s), int(week_s)
    return int(text), None


def season_key_sort_key(season_key: str) -> tuple[int, int]:
    """int_parent.py: a season-only key sorts as week 0, before that season's week keys."""
    season, week = parse_season_key(season_key)
    return (season, 0 if week is None else week)


def prior_season_key(keys: Sequence[str], season_key: str) -> str | None:
    """int_parent.py build_prior_map: the single immediately preceding key. The first key has none. No rate is looked up."""
    ordered = sorted(set(keys), key=season_key_sort_key)
    prior: dict[str, str | None] = {}
    for i, key in enumerate(ordered):
        prior[key] = ordered[i - 1] if i else None
    return prior.get(season_key)


def spread_neighborhood_k(
    abs_gaps: Sequence[float],
    bw_s: float = 1.0,
    min_n: int = 150,
) -> float:
    """scoredist.py neighborhood: first k in (1, 1.5, 2, 3, 4, 6) with at least min_n gaps inside bw_s * k. If none, the last k is kept."""
    steps = (1.0, 1.5, 2.0, 3.0, 4.0, 6.0)
    chosen = steps[-1]
    for k in steps:
        chosen = k
        n = sum(1 for gap in abs_gaps if gap <= bw_s * k)
        if n >= min_n:
            break
    return chosen


def push_fraction(values: Sequence[float], line: float) -> float:
    """scoredist.py mk: fraction of the sample exactly equal to the line."""
    if len(values) == 0:
        raise ValueError("push_fraction: empty sample")
    return sum(1.0 for v in values if v == line) / len(values)


def shift_to_fair(values: Sequence[float], line: float) -> float:
    """scoredist.py: shift closest to a tie-halved rate of 0.5. Candidates put a sample point on the line, and that shift plus 1e-6. Equal distances keep the smaller absolute shift."""
    if len(values) == 0:
        raise ValueError("shift_to_fair: empty sample")
    best_s = 0.0
    best_d = abs(fair_side(values, line, 0.0) - 0.5)
    for c in sorted({float(line - v) for v in values}):
        for s in (c, c + 1e-6):
            d = abs(fair_side(values, line, s) - 0.5)
            if d < best_d - 1e-12 or (abs(d - best_d) <= 1e-12 and abs(s) < abs(best_s)):
                best_s, best_d = s, d
    return best_s


def point_shift_applies(p: float, q: float, gap: float = 0.01) -> bool:
    """scoredist.py: an engine point-shift is added only when abs(p - q) >= 0.01."""
    return abs(p - q) >= gap


def week_order(season: int, week: int) -> int:
    """completed_air_yards.py: season * 100 + week."""
    return int(season) * 100 + int(week)


def lagged_latest(
    rows: Sequence[tuple[int, float]],
    season: int,
    week: int,
    lag_seasons: int = 2,
) -> float | None:
    """completed_air_yards.py latest: last row with order strictly before the game and at least (season - lag) * 100. No such row is null. The completion mean itself is mean_or_null."""
    game_ord = week_order(season, week)
    lo = (int(season) - lag_seasons) * 100
    hit = [(order, value) for order, value in rows if order < game_ord and order >= lo]
    if not hit:
        return None
    hit.sort()
    return hit[-1][1]


def completion_base_offset(mean_complete: float) -> float:
    """independent_cpoe.py fit_air start: log(mean / (1 - mean + 1e-9)). Not the Newton update."""
    return math.log(mean_complete / (1.0 - mean_complete + 1e-9))


def reconstructed_dropbacks(
    times_pressured: float,
    times_pressured_pct: float,
    passing_bad_throws: float | None = None,
    passing_bad_throw_pct: float | None = None,
) -> float | None:
    """protection_stress.py: times_pressured / times_pressured_pct. A zero percent is missing. Then passing_bad_throws / passing_bad_throw_pct, and a zero bad-throw percent is missing too."""
    if times_pressured_pct != 0:
        return times_pressured / times_pressured_pct
    if passing_bad_throws is None or passing_bad_throw_pct is None or passing_bad_throw_pct == 0:
        return None
    return passing_bad_throws / passing_bad_throw_pct


def deep_rate(deep: float, attempts: float, floor: float = 30.0) -> float | None:
    """corpus_on_engine.py: deep / attempts when attempts are at least 30, else null."""
    if attempts < floor:
        return None
    return deep / attempts


def home_epa_edge(home_offense: float, away_defense: float, away_offense: float, home_defense: float) -> float:
    """encoder_adj.py: (home offense + away defense) - (away offense + home defense)."""
    return (home_offense + away_defense) - (away_offense + home_defense)


def pressure_matchup(home_off: float, home_def: float, away_off: float, away_def: float) -> float:
    """engine_v1.py: (away defense pressure - home offense pressure) - (home defense pressure - away offense pressure)."""
    return (away_def - home_off) - (home_def - away_off)


def explosive_play(is_pass: float, is_rush: float, yards_gained: float) -> float:
    """engine_v1.py: 1 when a pass gains at least 20 or a rush gains at least 10."""
    if (is_pass == 1 and yards_gained >= 20) or (is_rush == 1 and yards_gained >= 10):
        return 1.0
    return 0.0


def pressure_on_dropback(sack: float, qb_hit: float, qb_dropback: float) -> float:
    """engine_v1.py: 1 when sack or qb_hit is 1 and the play is a dropback."""
    if (sack == 1 or qb_hit == 1) and qb_dropback == 1:
        return 1.0
    return 0.0


def qb_epa_rating(dropbacks: float, epa_sum: float, prior_mean: float = -0.05, prior_n: float = 150.0) -> float:
    """data.py and perqb.py: (epa + prior_mean * prior_n) / (dropbacks + prior_n). The stated prior is -0.05 over 150 dropbacks."""
    return (epa_sum + prior_mean * prior_n) / (dropbacks + prior_n)


def unknown_qb_rating(prior_mean: float = -0.05) -> float:
    """data.py: an unknown starter is prior_mean - 0.05."""
    return prior_mean - 0.05


def home_flag_from_neutral(neutral: float) -> float:
    """data.py: home_flag = 1 - neutral."""
    return 1.0 - neutral


def prior_four_shares(
    history: Sequence[tuple[int, int, float | None]],
    season: int,
    week: int,
) -> list[float] | None:
    """roll_trust.py: four most recent non-null shares strictly before this week, inside the current and previous season. Fewer than four is null."""
    ordered = sorted(history, key=lambda row: (row[0], row[1]))
    prior: list[float] = []
    for row_season, row_week, value in reversed(ordered):
        if row_season < season - 1:
            break
        if not (row_season < season or (row_season == season and row_week < week)):
            continue
        if value is None or value != value:
            continue
        prior.append(float(value))
        if len(prior) == 4:
            break
    if len(prior) < 4:
        return None
    return prior


def present_filled(value: float | None) -> tuple[float, float]:
    """score_present_flag.py: flag is 1 when the value is non-null, else 0. A missing value is filled with 0."""
    if value is None or value != value:
        return 0.0, 0.0
    return 1.0, float(value)


def injury_out_weight(report_status: str) -> float:
    """data.py: Questionable weight is 0. Out and Doubtful weight is 1."""
    return 0.0 if report_status == "Questionable" else 1.0


def questionable_weight(report_status: str) -> float:
    """data.py: 1 only when the report is Questionable, else 0."""
    return 1.0 if report_status == "Questionable" else 0.0


def snap_share(offense_pct: float | None, defense_pct: float | None) -> float:
    """data.py: max of the two snap percents. A missing percent is 0."""
    offense = 0.0 if offense_pct is None or offense_pct != offense_pct else float(offense_pct)
    defense = 0.0 if defense_pct is None or defense_pct != defense_pct else float(defense_pct)
    return max(offense, defense)


def snap_within_window(event_order: int, snap_order: int, window: int = 200) -> bool:
    """data.py: the as-of snap is kept only when (event order - snap order) < 200."""
    return (event_order - snap_order) < window


def recency_weights(n: int) -> list[float] | None:
    """engine_v1.py team_form: linspace from 0.5 to 1.0 across the kept games. Fewer than 3 games is null."""
    if n < 3:
        return None
    step = 0.5 / (n - 1)
    return [0.5 + i * step for i in range(n)]


def finite_weighted_mean(values: Sequence[float | None], weights: Sequence[float]) -> float:
    """engine_v1.py: sum of finite value * weight over the sum of those weights. Every value missing returns 0, not null."""
    num = 0.0
    den = 0.0
    for value, weight in zip(values, weights):
        if value is None or value != value:
            continue
        num += float(value) * float(weight)
        den += float(weight)
    if den == 0.0:
        return 0.0
    return num / den


def temp_or_default(temp: float | None) -> float:
    """engine_v1.py: temperature when present, else 65."""
    if temp is None or temp != temp:
        return 65.0
    return float(temp)


def wind_or_zero(wind: float | None) -> float:
    """engine_v1.py: wind when present, else 0."""
    if wind is None or wind != wind:
        return 0.0
    return float(wind)


def rest_diff(home_rest: float | None, away_rest: float | None) -> float | None:
    """engine_v1.py: home_rest - away_rest when home_rest is present, else 0. A missing away side stays null."""
    if home_rest is None or home_rest != home_rest:
        return 0.0
    if away_rest is None or away_rest != away_rest:
        return None
    return home_rest - away_rest


def is_dome(roof: str | None) -> float:
    """engine_v1.py: 1 when roof is dome or closed, else 0."""
    return 1.0 if roof in ("dome", "closed") else 0.0
