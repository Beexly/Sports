#!/usr/bin/env python3
"""Count modules in the zero-orphan bridge manifest block (lines 29..107 1-based)."""
import re
src = open('packages/prediction-engine/src/nfl/zero-orphan-expected-metrics-bridge.ts').read()
lines = src.splitlines()
start = next(i for i, l in enumerate(lines) if 'REGISTERED_NFL_AND_EXPECTED_METRIC_MODULES' in l)
end = next(i for i in range(start + 1, len(lines)) if lines[i].startswith('] as const'))
manifest = "\n".join(lines[start + 1:end])
mods = re.findall(r'"(expected-metrics/[^"]+|nfl/[^"]+)"', manifest)
print("start_idx", start, "end_idx", end)
print("manifest modules:", len(mods))
print("first:", mods[0], "last:", mods[-1])
PYEOF = None
EOFMARK = None
EOF
