"""Load scaling — turning a concentration index into a dropoff multiplier.

The dropoff table applies a flat factor per position group. That is wrong when a
team funnels everything through one man. This converts a Herfindahl index into an
effective-count and scales the factor by how far the team sits from league normal.

HHI is unitless and unintuitive; 1/HHI is the effective number of contributors,
which is the same quantity in interpretable units (the "effective number of
competitors" transform, Davies 2025). Scaling happens in effective-count space,
never in HHI space, because HHI is convex and 1/HHI is not.
"""
import json
import math
from typing import List

LEAGUE_HHI = 0.135          # league median target HHI, 2023-2026
FLOOR, CEIL = 0.55, 1.60    # clamp so one outlier cannot swamp the table


def effective_n(hhi: float) -> float:
    """Effective number of contributors. HHI 0.20 -> 5.0, HHI 0.10 -> 10.0."""
    if hhi <= 0:
        return float("inf")
    return 1.0 / hhi


def load_multiplier(hhi: float, league_hhi: float = LEAGUE_HHI, floor: float = FLOOR, ceil: float = CEIL) -> float:
    """Multiplier on a positional dropoff factor.

    Concentrated offence (low effective N) -> multiplier > 1, the same injury
    hurts more. Spread offence -> multiplier < 1.

    Ratio is taken in effective-count space and square-rooted, because a dropoff
    factor is a per-player quantity and the effective count dilutes it by roughly
    the square root of the contributor count.
    """
    n_team = effective_n(hhi)
    n_league = effective_n(league_hhi)
    m = math.sqrt(n_league / n_team)
    return max(floor, min(ceil, m))


def scale_dropoff(base_dropoff: float, hhi: float, **kw) -> float:
    """Apply the multiplier to a sealed dropoff factor."""
    return round(base_dropoff * load_multiplier(hhi, **kw), 4)


def effective_competitors(shares: List[float]) -> float:
    """Compute N_eff = 1.0 / sum_i(s_i^2) on normalized positive shares.

    If all shares are <= 0 or empty, returns 1.0.
    Clamped to [1.0, max(1.0, float(len(shares)))].
    """
    if not shares:
        return 1.0
    n = max(1.0, float(len(shares)))
    pos_shares = [float(s) for s in shares if s > 0]
    total = sum(pos_shares)
    if total <= 0:
        return 1.0
    norm_shares = [s / total for s in pos_shares]
    hhi = sum(s * s for s in norm_shares)
    if hhi <= 0:
        return n
    n_eff = 1.0 / hhi
    return max(1.0, min(n, n_eff))


def scale_concentration_n_eff(shares: List[float], target_n_eff: float) -> List[float]:
    """Scale share concentration in effective-count space N_eff = 1/HHI (Davies 2025).

    Returns a valid probability vector summing to 1.0 (even if input is all zeros,
    in which case it returns uniform shares 1.0 / len(shares)).
    """
    if not shares:
        return []
    n = len(shares)
    if n == 1:
        return [1.0]

    pos = [max(0.0, float(s)) for s in shares]
    total = sum(pos)
    if total <= 0:
        return [1.0 / float(n)] * n

    p = [s / total for s in pos]
    target_n_eff = max(1.0, min(float(n), float(target_n_eff)))
    curr_n_eff = effective_competitors(p)

    if abs(curr_n_eff - target_n_eff) < 1e-6:
        return [float(x) for x in p]

    target_hhi = 1.0 / target_n_eff
    curr_hhi = 1.0 / curr_n_eff

    if target_n_eff > curr_n_eff:
        # Disperse towards uniform vector u = [1/n, ..., 1/n]
        denom = curr_hhi - 1.0 / float(n)
        if denom <= 1e-12:
            return [1.0 / float(n)] * n
        num = max(0.0, target_hhi - 1.0 / float(n))
        ratio = max(0.0, min(1.0, num / denom))
        lam = 1.0 - math.sqrt(ratio)
        out = [(1.0 - lam) * pi + lam / float(n) for pi in p]
    else:
        # Concentrate: power-scale if distinct, else blend towards peak e_k
        is_uniform = (max(p) - min(p)) < 1e-7
        if not is_uniform:
            lo, hi = 1.0, 100.0
            best_p = p
            for _ in range(40):
                mid = (lo + hi) / 2.0
                unnorm = [pi ** mid for pi in p]
                s_unnorm = sum(unnorm)
                trial_p = [u / s_unnorm for u in unnorm]
                trial_n = effective_competitors(trial_p)
                if abs(trial_n - target_n_eff) < 1e-6:
                    best_p = trial_p
                    break
                if trial_n > target_n_eff:
                    lo = mid
                else:
                    hi = mid
                best_p = trial_p

            if abs(effective_competitors(best_p) - target_n_eff) < 0.05 or target_n_eff > 1.01:
                out = best_p
            else:
                is_uniform = True

        if is_uniform:
            k = p.index(max(p))
            lo, hi = 0.0, 1.0
            best_p = p
            for _ in range(40):
                mid = (lo + hi) / 2.0
                trial_p = [(1.0 - mid) * pi for pi in p]
                trial_p[k] += mid
                trial_n = effective_competitors(trial_p)
                if abs(trial_n - target_n_eff) < 1e-6:
                    best_p = trial_p
                    break
                if trial_n > target_n_eff:
                    lo = mid
                else:
                    hi = mid
                best_p = trial_p
            out = best_p

    s_out = sum(out)
    return [float(x / s_out) for x in out]


if __name__ == "__main__":
    prof = json.load(open("/opt/model/data/influence.json"))["player_load"]
    latest = {}
    for r in prof:
        latest[r["team"]] = r            # file is season-ordered, last wins
    print(f"{'team':5s} {'HHI':>6s} {'effN':>6s} {'mult':>6s}  dropoff on a 0.095 factor")
    for t, r in sorted(latest.items(), key=lambda kv: -kv[1]["target_hhi"])[:8]:
        print(f"{t:5s} {r['target_hhi']:6.3f} {effective_n(r['target_hhi']):6.2f} "
              f"{load_multiplier(r['target_hhi']):6.2f}  {scale_dropoff(0.095, r['target_hhi'])}")
    print("  ...")
    for t, r in sorted(latest.items(), key=lambda kv: kv[1]["target_hhi"])[:4]:
        print(f"{t:5s} {r['target_hhi']:6.3f} {effective_n(r['target_hhi']):6.2f} "
              f"{load_multiplier(r['target_hhi']):6.2f}  {scale_dropoff(0.095, r['target_hhi'])}")
