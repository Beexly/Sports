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


def glazer_play_rate(status: str | None) -> float:
    """mint_w4.py: OUT 0.0, DOUBTFUL 0.002, QUESTIONABLE 0.72, missing 0.981. Any status not in that map is also 0.981."""
    table = {"OUT": 0.0, "DOUBTFUL": 0.002, "QUESTIONABLE": 0.72, None: 0.981}
    if status in table:
        return table[status]
    return 0.981


def expected_snap_loss(snap_share: float, play_rate: float) -> float:
    """mint_w4.py: snap_share * (1 - play_rate)."""
    return snap_share * (1.0 - play_rate)


def fair_with_push(p_side: float, p_push: float) -> float:
    """mint_w4.py: p_side + 0.5 * p_push. Fair cover and fair over both use this."""
    return p_side + 0.5 * p_push


def sample_median(values: Sequence[float]) -> float | None:
    """mint_w4.py: median of the quoted lines. Empty is null. scoredist.py mk uses the same median for team points."""
    if len(values) == 0:
        return None
    ordered = sorted(values)
    n = len(ordered)
    mid = n // 2
    if n % 2:
        return float(ordered[mid])
    return (float(ordered[mid - 1]) + float(ordered[mid])) / 2.0


def prior4_snap_share(offense: Sequence[float], defense: Sequence[float]) -> float | None:
    """mint_w4.py: max of the mean of the last 4 offense snap percents and the last 4 defense snap percents. Either side empty is null."""
    def tail_mean(rows: Sequence[float]) -> float | None:
        if len(rows) == 0:
            return None
        chunk = list(rows)[-4:]
        return sum(chunk) / len(chunk)

    off = tail_mean(offense)
    deff = tail_mean(defense)
    if off is None or deff is None:
        return None
    return max(off, deff)


def nflverse_home_spread(home_line: float) -> float:
    """mint_w4.py: negate the home spread. Plus means the home team is favoured."""
    return -home_line


def engine_point_shift(anchored_margins: Sequence[float], p: float, q: float) -> float:
    """mint_w4.py: 0 when abs(p - q) < 0.01. Otherwise shift_to(anchored margins, p) minus shift_to(anchored margins, q)."""
    if abs(p - q) < 0.01:
        return 0.0
    return shift_to_target(anchored_margins, p) - shift_to_target(anchored_margins, q)


def logit_contribution(x: float, mu: float, sd: float, weight: float) -> float:
    """mint_w4.py and w4_champion.py: round(((x - mu) / sd) * weight, 4)."""
    return round(((x - mu) / sd) * weight, 4)


def scaled_weight(weight: float, sd: float) -> float:
    """mint_w4.py: round(weight / sd, 5)."""
    return round(weight / sd, 5)


def derived_markets_withheld(p: float, q: float, fair_cover: float, fair_over: float) -> bool:
    """mint_w4.py and GSE_V3_DECISIONS section 2: withhold when abs(p - q) < 0.01 and either fair rate is more than 0.02 from 0.5."""
    if abs(p - q) >= 0.01:
        return False
    return abs(fair_cover - 0.5) > 0.02 or abs(fair_over - 0.5) > 0.02


def fair_worst(fair_covers: Sequence[float], fair_overs: Sequence[float]) -> float | None:
    """mint_w4.py: the largest abs(fair - 0.5) across cover and over. No games is null."""
    if len(fair_covers) != len(fair_overs):
        raise ValueError("fair_worst: cover and over must be the same length")
    if len(fair_covers) == 0:
        return None
    worst = 0.0
    for cover, over in zip(fair_covers, fair_overs):
        worst = max(worst, abs(cover - 0.5), abs(over - 0.5))
    return worst


def injury_report_stale(age_seconds: float) -> bool:
    """mint_w4.py: the injury report is stale when it was observed more than 24 hours ago."""
    return age_seconds > 24 * 3600


def odds_snapshot_stale(age_seconds: float) -> bool:
    """mint_w4.py: the odds snapshot is stale when it is older than 12 hours."""
    return age_seconds > 12 * 3600


def edge_needs_check(edge: float) -> bool:
    """mint_w4.py: abs(edge) > 0.08 is an input-check issue."""
    return abs(edge) > 0.08


def espn_home_projection(game_projection: float | None) -> float | None:
    """mint_w4.py: ESPN gameProjection / 100. Missing is null."""
    if game_projection is None:
        return None
    return float(game_projection) / 100.0


def play_published(abs_edge_ci_low: float, vig: float) -> bool:
    """GSE_V2_DECISIONS section 2.1: a play is published when the lower CI bound of |p - q_exec| exceeds the vig."""
    return abs_edge_ci_low > vig


def clears_half(p: float, delta: float) -> bool:
    """GSE_ENGINE_PLAN M7: abs(p - 0.5) >= delta. The stated sweep is 0, 0.08, 0.10, 0.12, 0.15, 0.18."""
    return abs(p - 0.5) >= delta


def settled_side(result: float, line: float) -> float | None:
    """scoredist.py: null when result equals the line. Otherwise 1 if result is over the line, else 0."""
    if result == line:
        return None
    return 1.0 if result > line else 0.0


def league_pool_ready(attempts: float, floor: float = 100.0) -> bool:
    """qb_air_cpoe.py: a week is skipped when pooled attempts are under 100."""
    return attempts >= floor


def prior_window_mean(values: Sequence[float], window: int = 4) -> float | None:
    """injury_signal.py: mean of the last window observations, minimum one. The kept line is rolling(4, min_periods=1). Empty is null."""
    if len(values) == 0:
        return None
    chunk = list(values)[-window:]
    return sum(chunk) / len(chunk)


def under_center_rate(shotgun_rate: float | None) -> float | None:
    """join_rest.py: under_center_rate = 1 - shotgun_rate. A null shotgun rate stays null."""
    if shotgun_rate is None or shotgun_rate != shotgun_rate or shotgun_rate in (float("inf"), float("-inf")):
        return None
    return 1.0 - shotgun_rate


def under_center_diff(shotgun_diff: float | None) -> float | None:
    """join_rest.py: after home minus away the +1 cancels, so the diff is the negation of the shotgun diff. A null diff stays null."""
    if shotgun_diff is None or shotgun_diff != shotgun_diff or shotgun_diff in (float("inf"), float("-inf")):
        return None
    return -shotgun_diff


def proe_or_null(proe: float | None, n_plays: float | None, floor: float = 25.0) -> float | None:
    """join_rest.py: proe is null when n_plays < 25. A missing play count is 0. A null proe stays null."""
    plays = 0.0 if n_plays is None or n_plays != n_plays else float(n_plays)
    if plays < floor or proe is None or proe != proe:
        return None
    return float(proe)


def trust_share_or_null(share: float | None, targets: float | None, floor: float = 25.0) -> float | None:
    """join_rest.py: hhi and the share columns are null when targets < 25. A missing target count is 0. A null share stays null."""
    n = 0.0 if targets is None or targets != targets else float(targets)
    if n < floor or share is None or share != share:
        return None
    return float(share)


def season_aggregate_order(season: int, season_end: int = 99) -> int:
    """join_rest.py: a season aggregate with no week is stamped season * 100 + 99."""
    return int(season) * 100 + season_end


def within_season_lag(game_season: int, source_season: int, max_lag: int = 2) -> bool:
    """join_rest.py: keep the row only when 0 <= game season - source season <= 2."""
    gap = game_season - source_season
    return gap >= 0 and gap <= max_lag


def text_column_is_numeric(non_null: int, n: int) -> bool:
    """join_rest.py: a text column is numeric when the non-null count is at least max(3, half the rows)."""
    return non_null >= max(3, int(0.5 * n))


def offset_log_odds(market_logit: float, intercept: float, weights: Sequence[float], zs: Sequence[float]) -> float:
    """offset_engine.py: logit(q) + a + sum of w_i z_i. This is the stated equation, not the fit."""
    if len(weights) != len(zs):
        raise ValueError("offset_log_odds: weights and z must be the same length")
    return market_logit + intercept + sum(w * z for w, z in zip(weights, zs))


def clipped_eta(eta: float, limit: float = 20.0) -> float:
    """score_present_flag.py: clip the linear predictor to [-20, 20] before the sigmoid."""
    if eta < -limit:
        return -limit
    if eta > limit:
        return limit
    return eta


def unscaled_z(x: float, mu: float, sd: float) -> float:
    """independent_cpoe.py pred_air: (x - mu) / sd. This step does not add 1e-9."""
    return (x - mu) / sd


def in_prior_season_window(row_season: int, row_week: int, season: int, week: int, lag: int = 2) -> bool:
    """corpus_on_engine.py: same season and week strictly before W, or an earlier season no older than season - 2."""
    if row_season == season and row_week < week:
        return True
    return row_season < season and row_season >= season - lag


def games_before(rows: Sequence[tuple], cutoff, k: int = 16) -> list:
    """data.py qb_rating and perqb.py: rows dated strictly before the cutoff, then the last k. k is 16."""
    prior = [row for row in rows if row[0] < cutoff]
    return prior[-k:]


def zero_filled_diff(home: float | None, away: float | None) -> float:
    """features.py: (home or 0) - (away or 0). A missing side is 0, not null."""
    return float(home or 0.0) - float(away or 0.0)


def pressure_event(qb_hit: float | None, sack: float | None) -> int:
    """corpus_on_engine.py: 1 when qb_hit or sack is 1. A missing flag is 0. Dropback is not required."""
    hit = 0.0 if qb_hit is None else qb_hit
    sk = 0.0 if sack is None else sack
    return 1 if hit == 1 or sk == 1 else 0


def hit_interception(pressure: float, interception: float) -> int:
    """corpus_on_engine.py: 1 only when the pressure flag and the interception flag are both 1."""
    return 1 if pressure == 1 and interception == 1 else 0


def evidence_score(relevance: float | None, evidence: str | None) -> float:
    """corpus_reduce.py: relevance times the evidence weight. Missing relevance is 0. measured 1, claimed 0.6, speculative 0.35, none 0.2, any other label 0.3."""
    try:
        rel = float(relevance or 0)
    except (TypeError, ValueError):
        rel = 0.0
    weights = {"measured": 1.0, "claimed": 0.6, "speculative": 0.35, "none": 0.2}
    key = "none" if evidence is None else str(evidence).lower()
    return rel * weights.get(key, 0.3)


def normal_ci(estimate: float, se: float, z: float = 1.96) -> tuple[float, float]:
    """perqb.py: estimate ± 1.96 * standard error."""
    return estimate - z * se, estimate + z * se


def placebo_fraction(placebo: Sequence[float], observed: float) -> float | None:
    """perqb.py: fraction of placebo scores that are <= the observed score. An empty draw is null."""
    if len(placebo) == 0:
        return None
    return sum(1.0 for value in placebo if value <= observed) / len(placebo)


def selected_side_prob(home_prob: float, side: str) -> float | None:
    """gse_eval.py: the home side keeps the de-vigged home price. The away side is 1 minus that price."""
    if side == "home":
        return home_prob
    if side == "away":
        return 1.0 - home_prob
    return None


def selected_side_won(result: float | None, side: str) -> int | None:
    """gse_eval.py: a tie or a missing result is null. Home won when the result is positive. Away is the opposite."""
    if result is None or result != result or result == 0:
        return None
    home_won = result > 0
    if side == "home":
        return 1 if home_won else 0
    if side == "away":
        return 0 if home_won else 1
    return None


def generated_before_kick(generated, commence) -> bool:
    """gse_eval.py: premint when generated_at is present and strictly before commence. A missing generated_at is false."""
    if generated is None:
        return False
    return generated < commence


def varying_column(sd: float, floor: float = 1e-8) -> bool:
    """score_present_flag.py: a column is kept only when its standard deviation is above 1e-8."""
    return sd > floor


def decision_accuracy(probs: Sequence[float], outcomes: Sequence[float]) -> float:
    """baseline.py metrics: clip each probability to [1e-6, 1 - 1e-6], then the mean of (p > 0.5) == y."""
    if len(probs) == 0 or len(probs) != len(outcomes):
        raise ValueError("decision_accuracy: probs and outcomes must be the same non-empty length")
    hits = 0
    for p, y in zip(probs, outcomes):
        clipped = min(max(p, 1e-6), 1.0 - 1e-6)
        if (clipped > 0.5) == y:
            hits += 1
    return hits / len(probs)


def duplicate_rate_mean(rates: Sequence[float | None]) -> float | None:
    """league_baselines.py: mean of duplicate quick_game_rate values on one key. Nulls are dropped. None left is null."""
    chosen = [float(r) for r in rates if r is not None and r == r]
    if not chosen:
        return None
    return sum(chosen) / len(chosen)


def expected_bin_completions(attempts: float, league_rate: float | None) -> float | None:
    """qb_air_cpoe.py: expected completions in a bin are attempts times the league rate. A null rate stays null."""
    if league_rate is None or league_rate != league_rate:
        return None
    return attempts * league_rate


def typed_epa(flag: float, epa: float | None) -> float | None:
    """engine_v1.py: epa when the play flag is 1, else null. A null epa on a flagged play stays null."""
    if flag != 1:
        return None
    if epa is None or epa != epa:
        return None
    return float(epa)


def counted_attempt(sack: float | None, qb_spike: float | None) -> bool:
    """independent_cpoe.py: a play is kept when sack and qb_spike are not 1. A missing flag is 0."""
    sack_v = 0.0 if sack is None or sack != sack else float(sack)
    spike_v = 0.0 if qb_spike is None or qb_spike != qb_spike else float(qb_spike)
    return sack_v == 0.0 and spike_v == 0.0


def snap_share_skipna(offense_pct: float | None, defense_pct: float | None) -> float | None:
    """w4_champion.py: max of the two prior-4 snap percents, skipping a missing side. Both missing is null."""
    present = [float(v) for v in (offense_pct, defense_pct) if v is not None and v == v]
    if not present:
        return None
    return max(present)


def nflverse_join_date(commence, day_offset: int, hours: int = 5):
    """gse_eval.py: commence plus a day offset, minus 5 hours, as a calendar date. The offsets tried are 0, -1, and 1."""
    from datetime import timedelta

    return (commence + timedelta(days=day_offset) - timedelta(hours=hours)).date()


def expected_starter(
    previous: str | None,
    has_prior_game: bool,
    previous_is_out: bool,
    history: Sequence[tuple],
    out_ids: set[str],
    row_cap: int = 60,
) -> tuple[str | None, str]:
    """data.py pit_starter: the last game's starter unless that starter is Out or Doubtful.
    history rows are (date, qb, dropbacks) already limited to dates before the game.
    The last 60 of those rows are kept, then the last 4 distinct dates, then the QB with the most
    dropbacks excluding the previous starter and anyone in out_ids.
    No prior game is (None, 'no-prior-game'). No eligible backup is (None, 'backup-unknown').
    """
    import collections

    if not has_prior_game:
        return None, "no-prior-game"
    if not previous_is_out:
        return previous, "prev-starter"
    recent = list(history)[-row_cap:]
    dates = set(sorted({row[0] for row in recent})[-4:])
    totals: collections.Counter = collections.Counter()
    for date, qb, dropbacks in recent:
        if date in dates and qb != previous and qb not in out_ids:
            totals[qb] += dropbacks
    if totals:
        return totals.most_common(1)[0][0], "backup-most-dropbacks"
    return None, "backup-unknown"


def refit_matches(got: float, published: float, tol: float = 0.00015) -> bool:
    """chart.py: the refit is rejected when abs(got - published) > 0.00015."""
    return abs(got - published) <= tol


def market_log_odds(q: float | None) -> float | None:
    """engine_v1.py: log(q / (1 - q)) when q is present and not zero. A missing or zero price is null."""
    if not q or q != q:
        return None
    return math.log(q / (1.0 - q))


def stress_or_null(
    stress: float | None,
    games: float | None,
    null_reason: str | None,
    floor: float = 3.0,
) -> float | None:
    """join_rest.py: stress is null when null_reason is non-empty, or when games < 3. A missing game count is 0. A null stress stays null."""
    if null_reason is not None and str(null_reason).strip() != "":
        return None
    n = 0.0 if games is None or games != games else float(games)
    if n < floor or stress is None or stress != stress:
        return None
    return float(stress)

