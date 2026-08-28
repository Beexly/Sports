#!/usr/bin/env python3
"""
Compute Murphy decomposition (reliability, resolution, uncertainty) for 
the implied win probability from the spread (using normal model).
"""
import json, math, os
from collections import defaultdict

def norm_cdf(x):
    return (1.0 + math.erf(x / math.sqrt(2.0))) / 2.0

def murphy_decomposition(probs, outcomes):
    """
    probs: list of predicted probabilities (0-1)
    outcomes: list of binary outcomes (0 or 1)
    Returns: (reliability, resolution, uncertainty)
    """
    n = len(probs)
    if n == 0:
        return 0.0, 0.0, 0.0
    # Overall observed frequency
    y_bar = sum(outcomes) / n
    # Uncertainty
    uncertainty = y_bar * (1 - y_bar)
    # Reliability and resolution via binning
    # We'll bin into 10 bins (0-0.1, 0.1-0.2, ..., 0.9-1.0)
    bins = defaultdict(lambda: {'sum_prob': 0.0, 'sum_outcome': 0.0, 'count': 0})
    for p, y in zip(probs, outcomes):
        bin_idx = int(p * 10)  # 0-9
        if bin_idx == 10:  # p == 1.0
            bin_idx = 9
        bins[bin_idx]['sum_prob'] += p
        bins[bin_idx]['sum_outcome'] += y
        bins[bin_idx]['count'] += 1
    reliability = 0.0
    resolution = 0.0
    for b in bins.values():
        if b['count'] == 0:
            continue
        p_bar = b['sum_prob'] / b['count']
        y_bar_bin = b['sum_outcome'] / b['count']
        reliability += (b['count'] / n) * (p_bar - y_bar_bin) ** 2
        resolution += (b['count'] / n) * (y_bar_bin - y_bar) ** 2
    return reliability, resolution, uncertainty

def main():
    harness_path = "data/nflverse/games_harness_rows.jsonl"
    if not os.path.exists(harness_path):
        print(f"Harness file not found: {harness_path}")
        return
    probs = []
    outcomes = []
    with open(harness_path) as f:
        for line in f:
            rec = json.loads(line)
            spread = rec.get("spreadLineHome")
            home_score = rec.get("homeScore")
            away_score = rec.get("awayScore")
            if spread is None or home_score is None or away_score is None:
                continue
            # Convert spread to home win probability using normal model
            # Assume spread is in points, positive means home favored.
            # Standard deviation of NFL point spread ~13.5
            p_home = norm_cdf(spread / 13.5)
            probs.append(p_home)
            outcome = 1 if home_score > away_score else 0
            outcomes.append(outcome)
    if len(probs) == 0:
        print("No valid games found.")
        return
    rel, res, unc = murphy_decomposition(probs, outcomes)
    brier = rel - res + unc  # identity
    print(f"=== Murphy Decomposition for Spread-Based Win Probability ===")
    print(f"Games processed: {len(probs)}")
    print(f"Reliability (REL): {rel:.6f}")
    print(f"Resolution (RES):  {res:.6f}")
    print(f"Uncertainty (UNC): {unc:.6f}")
    print(f"Brier score:       {brier:.6f} (should equal REL - RES + UNC)")
    print(f"Check: REL - RES + UNC = {rel - res + unc:.6f}")
    # Also compute per-season decomposition for walk-forward insight
    # Group by season
    seasons = defaultdict(lambda: {'probs': [], 'outcomes': []})
    # We need to reload to get season
    with open(harness_path) as f:
        for line in f:
            rec = json.loads(line)
            spread = rec.get("spreadLineHome")
            home_score = rec.get("homeScore")
            away_score = rec.get("awayScore")
            season = rec.get("season")
            if spread is None or home_score is None or away_score is None or season is None:
                continue
            p_home = norm_cdf(spread / 13.5)
            outcome = 1 if home_score > away_score else 0
            seasons[season]['probs'].append(p_home)
            seasons[season]['outcomes'].append(outcome)
    print(f"\n=== Per-Season Murphy Decomposition (first 5 seasons) ===")
    for season in sorted(seasons.keys())[:5]:
        p = seasons[season]['probs']
        o = seasons[season]['outcomes']
        if len(p) == 0:
            continue
        rel, res, unc = murphy_decomposition(p, o)
        brier = rel - res + unc
        print(f"Season {season}: n={len(p)}, REL={rel:.6f}, RES={res:.6f}, UNC={unc:.6f}, Brier={brier:.6f}")

if __name__ == "__main__":
    main()
