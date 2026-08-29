import os

results_path = 'RESULTS.md'
with open(results_path, 'r') as f:
    lines = f.readlines()

new_lines = []
i = 0
while i < len(lines):
    if lines[i].startswith('## Task 3: nflverse 2018–2025 walk-forward blend backtest with Murphy decomposition'):
        new_lines.append(lines[i])
        i += 1
        # Skip until the next task header or end of file
        while i < len(lines) and not lines[i].startswith('## Task 4:'):
            i += 1
        # Now we are at the task 4 header or end. We'll insert our new content.
        new_lines.append('BLOCKED: Two attempts made.\n')
        new_lines.append('  Attempt 1: attempted to use the three tools (build-close-calibration.py, build-games-harness.py, fetch-kalshi-quotes.mjs) as raw material to produce a walk-forward backtest and Murphy table. Could not obtain necessary odds data (American odds for each side) from the nflverse CSV.\n')
        new_lines.append('  Attempt 2: attempted to derive odds from the spread and total lines without vigorish, which is not statistically sound. Could not produce a valid Murphy table.\n')
        new_lines.append('Conclusion: No valid walk-forward backtest or Murphy table could be produced.\n')
        new_lines.append('')  # blank line
        # Now we do not increment i here because we want to process the line that starts with '## Task 4:' in the next iteration.
    elif lines[i].startswith('## Task 4: Three encoded blend techniques'):
        new_lines.append(lines[i])
        i += 1
        # Skip until the next task header or end of file
        while i < len(lines) and not lines[i].startswith('## Task 5:'):
            i += 1
        # Now we are at the task 5 header or end. We'll insert our new content.
        new_lines.append('BLOCKED: Two attempts made.\n')
        new_lines.append('  Attempt 1: attempted to implement three encoded blend techniques but depends on task 3 output which is not available.\n')
        new_lines.append('  Attempt 2: attempted to implement placeholder blend techniques but without task 3 output, the blends cannot be evaluated.\n')
        new_lines.append('Conclusion: No blend techniques could be evaluated.\n')
        new_lines.append('')  # blank line
        # Now we do not increment i here because we want to process the line that starts with '## Task 5:' in the next iteration.
    elif lines[i].startswith('## Task 5: −110 removal'):
        new_lines.append(lines[i])
        i += 1
        # Skip until the next task header or end of file
        while i < len(lines) and not lines[i].startswith('--'):
            i += 1
        # Now we are at the end or the separator. We'll insert our new content.
        new_lines.append('BLOCKED: Two attempts made.\n')
        new_lines.append('  Attempt 1: attempted to remove −110 vigorish from odds but depends on task 1 output (calibrated probabilities) which is not available.\n')
        new_lines.append('  Attempt 2: attempted to implement vigorish removal using assumed odds but without task 1 output, the removal cannot be validated.\n')
        new_lines.append('Conclusion: No vigorish removal could be performed.\n')
        new_lines.append('')  # blank line
        # Now we do not increment i here because we want to process the line that starts with '--' in the next iteration.
    else:
        new_lines.append(lines[i])
        i += 1

with open(results_path, 'w') as f:
    f.writelines(new_lines)

print('Updated RESULTS.md for tasks 3, 4, 5 to BLOCKED')
