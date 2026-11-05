#!/usr/bin/env python3
"""Verify the zero-orphan manifest against the real filesystem."""
import os
import re

bridge = open('packages/prediction-engine/src/nfl/zero-orphan-expected-metrics-bridge.ts').read().splitlines()
quoted = [l.strip().strip(',').strip('"') for l in bridge if l.strip().startswith('"')]
em = [x for x in quoted if x.startswith('expected-metrics/')]
nfl = [x for x in quoted if x.startswith('nfl/')]

em_disk = [f for f in os.listdir('packages/prediction-engine/src/expected-metrics') if f.endswith('.ts') and not f.endswith('.test.ts')]
nfl_disk = [f for f in os.listdir('packages/prediction-engine/src/nfl') if f.endswith('.ts') and not f.endswith('.test.ts')]

em_manifest_names = set(x.replace('expected-metrics/', '').replace('.ts', '') for x in em)
nfl_manifest_names = set(x.replace('nfl/', '').replace('.ts', '') for x in nfl)

em_missing = sorted(set(em_disk) - {n + '.ts' for n in em_manifest_names})
nfl_missing = sorted(set(nfl_disk) - {n + '.ts' for n in nfl_manifest_names})
em_extra = sorted(em_manifest_names - set(x.replace('.ts', '') for x in em_disk))
nfl_extra = sorted(nfl_manifest_names - set(x.replace('.ts', '') for x in nfl_disk))

print('EM manifest:', len(em), 'EM disk:', len(em_disk))
print('EM missing from manifest:', em_missing)
print('EM extra in manifest:', em_extra)
print('NFL manifest:', len(nfl), 'NFL disk:', len(nfl_disk))
print('NFL missing from manifest:', nfl_missing)
print('NFL extra in manifest:', nfl_extra)
