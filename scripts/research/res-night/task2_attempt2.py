#!/usr/bin/env python3
"""
Compute Brier score for market lines (spread) from the adapted harness output.
"""
import json, math, os

# Approximate standard deviation for NFL point spread (commonly used)
SPREAD_STD_DEV = 13.5

def norm_cdf(x):
    """Cumulative distribution function for the standard normal distribution."""
    return (1.0 + math.erf(x / math.sqrt(2.0))) / 2.0

def main():
    harness_path = "C:/Users/Garrett/Sports/data/nflverse/games_harness_rows.jsonl"
    if not os.path.exists(harness_path):
        print(f"Harness file not found: {harness_path}")
        return

    total_games = 0
    brier_sum = 0.0
    with open(harness_path) as f:
        for line in f:
            total_games += 1
            rec = json.loads(line)
            spread = rec.get("spreadLineHome")
            home_score = rec.get("homeScore")
            away_score = rec.get("awayScore")
            if spread is None or home_score is None or away_score is None:
                continue
            actual_spread = home_score - away_score
            # Convert spread to home win probability
            # Note: spread is the points the home team is favored by (positive means home favored)
            p_home = norm_cdf(spread / SPREAD_STD_DEV)
            actual_outcome = 1 if actual_spread > 0 else 0  # ignore ties (very rare)
            brier = (p_home - actual_outcome) ** 2
            brier_sum += brier

    if total_games == 0:
        print("No valid games found.")
        return

    brier_avg = brier_sum / total_games
    print(f"=== Brier Score for Market Spread (adapted harness) ===")
    print(f"Games processed: {total_games}")
    print(f"Average Brier score: {brier_avg:.6f}")
    print(f"(Lower is better; 0.25 is the score for uniform random guessing)")

if __name__ == "__main__":
    main()
