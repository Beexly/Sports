#!/usr/bin/env python3
"""
Three encoded blend techniques for win probability from spread.
"""
import json, math
from collections import defaultdict

def norm_cdf(x):
    return (1.0 + math.erf(x / math.sqrt(2.0))) / 2.0

def brier_score(probs, outcomes):
    n = len(probs)
    if n == 0:
        return 0.0
    return sum((p - o) ** 2 for p, o in zip(probs, outcomes)) / n

def main():
    harness_path = "data/nflverse/games_harness_rows.jsonl"
    if not os.path.exists(harness_path):
        print(f"Harness file not found: {harness_path}")
        return
    # We'll compute three blends:
    # Blend 1: p = norm_cdf(spread / 13.5)
    # Blend 2: p = norm_cdf((spread + 2.5) / 13.5)   [home field advantage 2.5]
    # Blend 3: p = norm_cdf(spread / 10.0)          [different sigma]
    spreads = []
    outcomes = []
    with open(harness_path) as f:
        for line in f:
            rec = json.loads(line)
            spread = rec.get("spreadLineHome")
            home_score = rec.get("homeScore")
            away_score = rec.get("awayScore")
            if spread is None or home_score is None or away_score is None:
                continue
            spreads.append(spread)
            outcome = 1 if home_score > away_score else 0
            outcomes.append(outcome)
    if len(spreads) == 0:
        print("No valid games.")
        return
    # Blend 1
    probs1 = [norm_cdf(s / 13.5) for s in spreads]
    brier1 = brier_score(probs1, outcomes)
    # Blend 2
    probs2 = [norm_cdf((s + 2.5) / 13.5) for s in spreads]
    brier2 = brier_score(probs2, outcomes)
    # Blend 3
    probs3 = [norm_cdf(s / 10.0) for s in spreads]
    brier3 = brier_score(probs3, outcomes)
    print(f"=== Three Encoded Blend Techniques (Brier Score) ===")
    print(f"Games processed: {len(spreads)}")
    print(f"Blend 1 (spread/13.5):      Brier = {brier1:.6f}")
    print(f"Blend 2 ((spread+2.5)/13.5): Brier = {brier2:.6f}")
    print(f"Blend 3 (spread/10.0):       Brier = {brier3:.6f}")
    # Also compute the Murphy decomposition for each blend if needed? Not required.

if __name__ == "__main__":
    import os
    main()
