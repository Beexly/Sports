import os

results_path = 'RESULTS.md'
with open(results_path, 'r') as f:
    lines = f.readlines()

new_lines = []
i = 0
while i < len(lines):
    if lines[i].startswith('## Task 2: Paired-vs-market Brier meter'):
        new_lines.append(lines[i])
        i += 1
        # Skip until the next task header or end of file
        while i < len(lines) and not lines[i].startswith('## Task 3:'):
            i += 1
        # Now we are at the task 3 header or end. We'll insert our new content.
        new_lines.append('BLOCKED: Two attempts made.\n')
        new_lines.append('  Attempt 1: ran script (task2_attempt1.py) to compute Brier score for spread cover using normal distribution assumption.\n')
        new_lines.append('    Output: Sigma=10.0: Average Brier score for spread cover = 0.198559; Sigma=14.0: Average Brier score for spread cover = 0.202053.\n')
        new_lines.append('    Note: Could not compute Brier score for total line due to lack of odds data.\n')
        new_lines.append('  Attempt 2: ran script (task2_attempt2.py) to compute Brier score for total over/under assuming p(over)=0.5.\n')
        new_lines.append('    Output: Assumed p(over)=0.5: Average Brier score for total over/under = 0.246; Number of pushes: X (we didn\'t capture the exact number, but we can note that pushes occurred).\n')
        new_lines.append('    Note: Could not compute Brier score for total line with vig-adjusted probability due to lack of odds data.\n')
        new_lines.append('Conclusion: We have Brier scores for spread cover and total over/under under assumptions, but we do not have a paired-vs-market Brier meter because we lack market probabilities (we only have the line, not the vigorish-adjusted probability).\n')
        new_lines.append('')  # blank line
        # Now we do not increment i here because we want to process the line that starts with '## Task 3:' in the next iteration.
    else:
        new_lines.append(lines[i])
        i += 1

with open(results_path, 'w') as f:
    f.writelines(new_lines)

print('Updated RESULTS.md for task 2')
