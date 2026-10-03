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
    """c03: sole caller is code 1, shared is code 2 with weight 0.5, unknown is code 3 and is excluded. Any other code stays null."""
    if attribution_confidence == 1:
        return 1.0
    if attribution_confidence == 2:
        return 0.5
    if attribution_confidence == 3:
        return None
    return None


def fourth_down_gamma(yardline: float | None) -> float | None:
    """c04 verified: gamma(l) = (100 - l) / 29. A missing line stays null."""
    if yardline is None or yardline != yardline:
        return None
    return (100.0 - float(yardline)) / 29.0


def expected_points_go(fourth_conv: float | None, gamma: float | None) -> float | None:
    """c04 verified: E[P+] = 6 * s_4conv ** gamma(l). A missing input stays null."""
    if fourth_conv is None or fourth_conv != fourth_conv or gamma is None or gamma != gamma:
        return None
    if float(fourth_conv) < 0:
        return None
    return 6.0 * (float(fourth_conv) ** float(gamma))


def expected_points_fail(fg_success: float | None, delta_pi_fg: float | None, delta_pi_td: float | None) -> float | None:
    """c04 verified: E[P-] = 3 * s_fg + (3 * delta_pi_fg + 6 * delta_pi_td). A missing input stays null."""
    if fg_success is None or fg_success != fg_success:
        return None
    if delta_pi_fg is None or delta_pi_fg != delta_pi_fg or delta_pi_td is None or delta_pi_td != delta_pi_td:
        return None
    return 3.0 * float(fg_success) + (3.0 * float(delta_pi_fg) + 6.0 * float(delta_pi_td))


def expected_points_net(points_go: float | None, points_fail: float | None) -> float | None:
    """c04 verified: E[P] = E[P+] - E[P-]. A missing side stays null."""
    if points_go is None or points_go != points_go or points_fail is None or points_fail != points_fail:
        return None
    return float(points_go) - float(points_fail)


def two_point_expected_points(success_rate: float | None) -> float | None:
    """c04 verified: 2-pt success 51% (235/460) is 1.02 expected points, success_rate * 2. A missing rate stays null."""
    if success_rate is None or success_rate != success_rate:
        return None
    return float(success_rate) * 2.0


def extra_point_expected_points(success_rate: float | None) -> float | None:
    """c04 verified: XP success 98.4% (8425/8561) is 0.984 expected points, success_rate * 1. A missing rate stays null."""
    if success_rate is None or success_rate != success_rate:
        return None
    return float(success_rate)

import math


def metropolis_acceptance(delta: float | None, temperature: float | None) -> float | None:
    """c04 VC-3 cricket ADAPT note, not a verified NFL result: A(delta, T) = 1 if delta > 0 else exp(delta / T).

    The source paper is cricket-only (0207). The annealing schedule is not part of this identity.
    A missing input, or a non-positive temperature, stays null.
    """
    if delta is None or delta != delta or temperature is None or temperature != temperature:
        return None
    if float(temperature) <= 0:
        return None
    if float(delta) > 0:
        return 1.0
    return math.exp(float(delta) / float(temperature))


def marginal_probability(conditionals: list[float] | None, priors: list[float] | None) -> float | None:
    """a04 paper Eq. 15: P(C) = sum_i P(C|T=i) * P(T=i). A missing factor or unequal lengths stays null."""
    if not conditionals or not priors or len(conditionals) != len(priors):
        return None
    total = 0.0
    for conditional, prior in zip(conditionals, priors):
        if conditional is None or conditional != conditional or prior is None or prior != prior:
            return None
        total += float(conditional) * float(prior)
    return total


def two_sample_denominator(k_p: float | None, k_q: float | None) -> float | None:
    """0598 Rastogi et al. 2021 Eq. 8: (k^p - 1) * (k^q - 1) * (k^p + k^q). A missing count stays null."""
    if k_p is None or k_p != k_p or k_q is None or k_q != k_q:
        return None
    kp = float(k_p)
    kq = float(k_q)
    return (kp - 1.0) * (kq - 1.0) * (kp + kq)


def average_hamming_loss(observed: list | None, reference: list | None) -> float | None:
    """c04 Eq. 4.11: (1/N) sum 1(a_j != a*_j). A missing label or unequal lengths stays null."""
    if not observed or not reference or len(observed) != len(reference):
        return None
    mismatches = 0
    for left, right in zip(observed, reference):
        if left is None or right is None:
            return None
        if left != right:
            mismatches += 1
    return mismatches / len(observed)


def ensemble_crps(members: list[float] | None, observation: float | None) -> float | None:
    """c10 SYS-07, paper Eq. 3: CRPS = (1/M) sum |x_j - y| - (1/(2 M^2)) sum_{j,k} |x_j - x_k|.

    The afCRPS alpha mix is not this identity. A missing member or observation stays null.
    """
    if not members or observation is None or observation != observation:
        return None
    clean: list[float] = []
    for member in members:
        if member is None or member != member:
            return None
        clean.append(float(member))
    count = len(clean)
    y = float(observation)
    mean_abs = sum(abs(member - y) for member in clean) / count
    pair_abs = 0.0
    for left in clean:
        for right in clean:
            pair_abs += abs(left - right)
    return mean_abs - pair_abs / (2.0 * count * count)
