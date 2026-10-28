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

LEAGUE_HHI = 0.135          # league median target HHI, 2023-2026
FLOOR, CEIL = 0.55, 1.60    # clamp so one outlier cannot swamp the table


def effective_n(hhi):
    """Effective number of contributors. HHI 0.20 -> 5.0, HHI 0.10 -> 10.0."""
    if hhi <= 0:
        return float("inf")
    return 1.0 / hhi


def load_multiplier(hhi, league_hhi=LEAGUE_HHI, floor=FLOOR, ceil=CEIL):
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


def scale_dropoff(base_dropoff, hhi, **kw):
    """Apply the multiplier to a sealed dropoff factor."""
    return round(base_dropoff * load_multiplier(hhi, **kw), 4)


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
