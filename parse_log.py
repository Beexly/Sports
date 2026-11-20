import sys

def summarize_failures(log_lines):
    print("Found failures:")
    for i, line in enumerate(log_lines):
        if line.startswith("2026-11-08T07:23:09.") and "FAILED" in line:
             print(line)

summarize_failures(sys.stdin.read().splitlines())
