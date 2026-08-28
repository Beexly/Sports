#!/usr/bin/env python3
import csv, os

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
    # Check for required fields for total
    required = ['over_under_line', 'score_home', 'score_away']
    if all(g.get(field, '').strip() != '' for field in required):
        try:
            # Convert to float/int
            g['over_under_line'] = float(g['over_under_line'])
            g['score_home'] = int(g['score_home'])
            g['score_away'] = int(g['score_away'])
            filtered.append(g)
        except ValueError:
            pass

print(f"Games with valid total data: {len(filtered)}")

if len(filtered) == 0:
    print("ERROR: No valid games found for total.")
    exit(1)

# We'll assume the market's predicted probability of over is 0.5 (ignoring vigorish)
p_over = 0.5

brier_sum = 0.0
count = 0
push_count = 0
for g in filtered:
    actual_total = g['score_home'] + g['score_away']
    line = g['over_under_line']
    if actual_total > line:
        actual_outcome = 1.0   # over
    elif actual_total < line:
        actual_outcome = 0.0   # under
    else:
        actual_outcome = 0.5   # push
        push_count += 1
    
    brier = (p_over - actual_outcome) ** 2
    brier_sum += brier
    count += 1

avg_brier = brier_sum / count if count > 0 else float('inf')
print(f"Assumed p(over)=0.5: Average Brier score for total over/under = {avg_brier:.6f}")
print(f"Number of pushes: {push_count}")

# Now, we can also try to compute the probability of over using a normal distribution for the total?
# We don't have a sigma for the total, but we can try to estimate from the data.
# However, we skip for simplicity.

print("Note: Could not compute Brier score for total line with vig-adjusted probability due to lack of odds data.")
