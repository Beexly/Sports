#!/usr/bin/env python3
import csv, json, math, os
from scipy.stats import norm  # We'll try to use scipy, but if not available, we'll implement our own CDF

# Check if scipy is available
try:
    from scipy.stats import norm
    has_scipy = True
except ImportError:
    has_scipy = False
    # Define our own norm CDF using math.erf
    def norm_cdf(x, loc=0, scale=1):
        z = (x - loc) / scale
        return 0.5 * (1 + math.erf(z / math.sqrt(2)))

# Path to the CSV
csv_path = r"C:\Users\Garrett\Sports\data\nflverse\games.csv"
if not os.path.exists(csv_path):
    csv_path = r"C:\Users\Garrett\projects\Sports\data\nflverse\games.csv"

print(f"Using CSV: {csv_path}")

# We'll try to read the CSV
games = []
with open(csv_path, newline='') as f:
    reader = csv.DictReader(f)
    for row in reader:
        games.append(row)

print(f"Total games read: {len(games)}")

# We'll filter to games that have the necessary fields and have been played (non-empty scores)
filtered = []
for g in games:
    # Check for required fields
    required = ['spread_favorite', 'team_favorite_id', 'team_home', 'team_away', 'score_home', 'score_away']
    if all(g.get(field, '').strip() != '' for field in required):
        try:
            # Convert to float/int
            g['spread_favorite'] = float(g['spread_favorite'])
            g['score_home'] = int(g['score_home'])
            g['score_away'] = int(g['score_away'])
            filtered.append(g)
        except ValueError:
            pass

print(f"Games with valid data: {len(filtered)}")

if len(filtered) == 0:
    print("ERROR: No valid games found.")
    exit(1)

# We'll try two different sigma values for the normal distribution of the margin
sigmas = [10.0, 14.0]  # typical values for NFL game margin standard deviation

for sigma in sigmas:
    if has_scipy:
        norm_dist = norm(loc=0, scale=sigma)
    else:
        norm_dist = None

    brier_sum = 0.0
    count = 0
    for g in filtered:
        # Determine expected_margin
        home_team = g['team_home']
        away_team = g['team_away']
        favorite_id = g['team_favorite_id']
        spread = g['spread_favorite']  # this is negative if home team is favorite, positive if away team is favorite? Actually, it's the spread with sign indicating the favorite? We saw it's negative when home team is favorite.
        # We'll use the logic we deduced earlier:
        if favorite_id == home_team:
            # home team is favorite
            expected_margin = abs(spread)
        else:
            # away team is favorite
            expected_margin = -abs(spread)
        
        # Actual margin
        margin = g['score_home'] - g['score_away']
        # Did the home team cover? (margin > expected_margin)
        actual_cover = 1.0 if margin > expected_margin else 0.0
        
        # Implied probability from the normal distribution assumption
        if has_scipy:
            p_cover = 1.0 - norm_dist.cdf(expected_margin)
        else:
            p_cover = 1.0 - norm_cdf(expected_margin, loc=0, scale=sigma)
        
        # Brier score for this game
        brier = (p_cover - actual_cover) ** 2
        brier_sum += brier
        count += 1
    
    avg_brier = brier_sum / count if count > 0 else float('inf')
    print(f"Sigma={sigma}: Average Brier score for spread cover = {avg_brier:.6f}")

# Now for the total line: we don't have a good way to get probability without odds, so we skip.
# We'll just output that we couldn't compute for total.
print("Note: Could not compute Brier score for total line due to lack of odds data.")
