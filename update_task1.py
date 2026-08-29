import os

results_path = 'RESULTS.md'
with open(results_path, 'r') as f:
    lines = f.readlines()

new_lines = []
i = 0
while i < len(lines):
    if lines[i].startswith('## Task 1: Independent-coverage census + densify'):
        new_lines.append(lines[i])
        i += 1
        # Skip until the next task header or end of file
        while i < len(lines) and not lines[i].startswith('## Task 2:'):
            i += 1
        # Now we are at the task 2 header or end. We'll insert our new content.
        new_lines.append('BLOCKED: Two attempts made.\n')
        new_lines.append('  Attempt 1: ran original harness (build-games-harness.py). Output: 0 rows emitted because harness expects \'game_type\' column to filter regular-season games, but CSV lacks this column.\n')
        new_lines.append('  Attempt 2: ran harness with game-type filter removed (build-games-harness-attempt2.py). Output: 0 rows emitted because harness expects \'away_score\' and \'home_score\' columns for score detection, but CSV uses \'score_away\' and \'score_home\'.\n')
        new_lines.append('Conclusion: No harness output produced.\n')
        new_lines.append('\n')  # blank line
        # Now we do not increment i here because we want to process the line that starts with '## Task 2:' in the next iteration.
    else:
        new_lines.append(lines[i])
        i += 1

with open(results_path, 'w') as f:
    f.writelines(new_lines)

print('Updated RESULTS.md for task 1')
