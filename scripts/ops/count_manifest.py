#!/usr/bin/env python3
"""Count modules in the zero-orphan bridge manifest block.

Symbol-anchored: starts at the REGISTERED_NFL_AND_EXPECTED_METRIC_MODULES
declaration and counts module specifiers up to the closing bracket of that
list. No magic line numbers.
"""
import re
from pathlib import Path

src = Path("packages/prediction-engine/src/nfl/zero-orphan-expected-metrics-bridge.ts").read_text()
lines = src.splitlines()

start = next(i for i, line in enumerate(lines) if "REGISTERED_NFL_AND_EXPECTED_METRIC_MODULES" in line)
end = next(i for i in range(start + 1, len(lines)) if lines[i].startswith("] as const"))
manifest = "\n".join(lines[start + 1:end])

mods = re.findall(r'"(expected-metrics/[^"]+|nfl/[^"]+)"', manifest)
print("start_idx", start, "end_idx", end)
print("manifest modules:", len(mods))
print("first:", mods[0], "last:", mods[-1])
