"""Corpus identities from c02 System 3. Not a scorer and not a join.

Sources:
- docs/engine/research/2026-10-02/corpus-deep/deep/c02/buildable-systems.md System 3
- docs/engine/research/2026-10-02/corpus-deep/deep/c02/work/a05-trust-target.md Metric 1-2
"""
from __future__ import annotations

from collections.abc import Sequence


def _counts(counts: Sequence[float]) -> list[float] | None:
    clean: list[float] = []
    for value in counts:
        if value is None or value != value:
            return None
        clean.append(float(value))
    return clean


def target_hhi(counts: Sequence[float], floor: float = 25.0) -> float | None:
    """a05 and c02 System 3: s_i = T_i / T and HHI = sum of s_i squared. T under 25 is null."""
    clean = _counts(counts)
    if not clean:
        return None
    total = sum(clean)
    if total < floor or total <= 0:
        return None
    return sum((count / total) ** 2 for count in clean)


def effective_targets(hhi: float | None) -> float | None:
    """a05: N_eff = 1 / HHI. A null or non-positive HHI stays null."""
    if hhi is None or hhi != hhi or hhi <= 0:
        return None
    return 1.0 / hhi


def top_two_share(counts: Sequence[float], floor: float = 25.0) -> float | None:
    """c02 System 3: top2_share is the sum of the two largest s_i. T under 25, or fewer than two receivers, is null."""
    clean = _counts(counts)
    if clean is None:
        return None
    receivers = [count for count in clean if count > 0]
    if len(receivers) < 2:
        return None
    total = sum(receivers)
    if total < floor or total <= 0:
        return None
    largest = sorted(receivers, reverse=True)
    return (largest[0] + largest[1]) / total


def air_yard_share(receiver_air: float | None, team_air: float | None) -> float | None:
    """c02 System 3 leg 2: receiver air yards / team air yards. A missing or non-positive team total is null."""
    if receiver_air is None or receiver_air != receiver_air:
        return None
    if team_air is None or team_air != team_air or team_air <= 0:
        return None
    return float(receiver_air) / float(team_air)


def int_danger_volume(expected_dropbacks: float | None, worthy_rate: float | None, conversion: float = 0.523) -> float | None:
    """a03 and c02 System 2 display lane: expected_dropbacks × worthy_rate × 0.523. A missing input stays null."""
    if expected_dropbacks is None or expected_dropbacks != expected_dropbacks:
        return None
    if worthy_rate is None or worthy_rate != worthy_rate:
        return None
    if conversion != conversion:
        return None
    return float(expected_dropbacks) * float(worthy_rate) * float(conversion)


def sensitivity_epa_floor(
    clean_epa: float | None,
    pressured_epa: float | None,
    n_pressured: float | None,
    floor: float = 100.0,
) -> float | None:
    """c02 System 1: mean(epa | clean) − mean(epa | pressured_floor). Fewer than 100 pressured dropbacks is null."""
    if n_pressured is None or n_pressured != n_pressured or n_pressured < floor:
        return None
    if clean_epa is None or clean_epa != clean_epa:
        return None
    if pressured_epa is None or pressured_epa != pressured_epa:
        return None
    return float(clean_epa) - float(pressured_epa)


def garbage_time(qtr: float | None, wp: float | None) -> bool | None:
    """c02 INT-5: qtr == 4 and (wp > 0.95 or wp < 0.05). A missing quarter or win probability stays null."""
    if qtr is None or qtr != qtr or wp is None or wp != wp:
        return None
    return qtr == 4 and (wp > 0.95 or wp < 0.05)


def score_bucket(score_differential: float | None) -> str | None:
    """c02 System 2: trail_8+, trail_1_7, tied, lead_1_7, lead_8+ from score_differential. A missing differential stays null."""
    if score_differential is None or score_differential != score_differential:
        return None
    d = float(score_differential)
    if d <= -8:
        return "trail_8+"
    if -7 <= d <= -1:
        return "trail_1_7"
    if d == 0:
        return "tied"
    if 1 <= d <= 7:
        return "lead_1_7"
    if d >= 8:
        return "lead_8+"
    return None


def down_distance_cell(down: float | None, ydstogo: float | None) -> str | None:
    """c02 System 2: {early 1-2, late 3-4} × {short ≤3, mid 4-7, long 8+}. A down outside 1-4, or a missing distance, stays null."""
    if down is None or down != down or ydstogo is None or ydstogo != ydstogo:
        return None
    if down in (1, 2):
        side = "early"
    elif down in (3, 4):
        side = "late"
    else:
        return None
    if ydstogo <= 3:
        dist = "short"
    elif 4 <= ydstogo <= 7:
        dist = "mid"
    elif ydstogo >= 8:
        dist = "long"
    else:
        return None
    return f"{side}_{dist}"


def aggressiveness_proxy_deep(air_yards: float | None) -> int | None:
    """c02 NGS-8: the observable correlate is P(air_yards ≥ 20). A missing air yardage stays null. This is not the 15-yard deep flag."""
    if air_yards is None or air_yards != air_yards:
        return None
    return 1 if float(air_yards) >= 20 else 0


def neutral_wp(wp: float | None) -> bool | None:
    """c03 buildable-systems: neutral_mask is 0.35 ≤ wp ≤ 0.65. A missing win probability stays null."""
    if wp is None or wp != wp:
        return None
    return 0.35 <= float(wp) <= 0.65


def shrunk_proe(proe_raw: float | None, n: float | None, k: float | None) -> float | None:
    """c03: PROE = PROE_raw · n / (n + k), with k the league-median cell n. A missing input, or a non-positive denominator, stays null."""
    if proe_raw is None or proe_raw != proe_raw or n is None or n != n or k is None or k != k:
        return None
    denom = float(n) + float(k)
    if denom == 0:
        return None
    return float(proe_raw) * float(n) / denom


def binomial_cell_se(p_hat: float | None, n: float | None) -> float | None:
    """c03: SE = sqrt(p_hat * (1 - p_hat) / n). A missing input or a non-positive n stays null."""
    if p_hat is None or p_hat != p_hat or n is None or n != n or n <= 0:
        return None
    return (float(p_hat) * (1.0 - float(p_hat)) / float(n)) ** 0.5


def epa_success(epa: float | None) -> bool | None:
    """c03 sequencing: success = epa > 0. A missing epa stays null. Zero is not a success."""
    if epa is None or epa != epa:
        return None
    return float(epa) > 0


def red_zone(yardline_100: float | None) -> bool | None:
    """c02 System 2 and a05: red zone is yardline_100 <= 20. A missing line stays null."""
    if yardline_100 is None or yardline_100 != yardline_100:
        return None
    return float(yardline_100) <= 20


def two_minute(half_seconds_remaining: float | None) -> bool | None:
    """a05: last 2:00 of either half is half_seconds_remaining <= 120. A missing clock stays null."""
    if half_seconds_remaining is None or half_seconds_remaining != half_seconds_remaining:
        return None
    return float(half_seconds_remaining) <= 120


def era_aggregate_weight(attribution_confidence: int | None) -> float | None:
    """c03: sole caller is 1, shared is 0.5, unknown is excluded. Any other code stays null."""
    if attribution_confidence == 1:
        return 1.0
    if attribution_confidence == 2:
        return 0.5
    if attribution_confidence == 3:
        return None
    return None
