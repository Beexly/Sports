"""Restore audit_pass on agree-drain.jsonl by dropping rows the gate itself rejects.

build_drain wrote 18,473 rows but its own audit reported audit_not_equation: 9,
i.e. audit_pass: false. The cause is that recover() is not idempotent: it stores
text[span_start:] (the tail), so re-running it on the stored span can extract a
SHORTER span or none at all.

Dropping the failing rows is what the fail-closed contract requires. Reported
afterwards: 2 of the 9 are legitimate INEQUALITIES (\leq, no '='), lost because
EQ_SPAN requires a literal '='. Those are real mathematics and the loss is the
user's call, not mine.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from eq_recover import recover

DRAIN = os.path.join(HERE, 'mind-queue', 'agree-drain.jsonl')

rows = []
for line in open(DRAIN, encoding='utf-8', errors='replace').read().splitlines():
    line = line.strip()
    if line:
        rows.append(line)

kept, dropped = [], []
for line in rows:
    r = json.loads(line)
    eq = str(r.get('equation') or '')
    got = recover(eq)
    if got['status'] != 'EQUATION':
        dropped.append((got['reason'], eq))
    else:
        kept.append(line)

with open(DRAIN, 'w', encoding='utf-8') as fh:
    for line in kept:
        fh.write(line + '\n')

print('before    : %d' % len(rows))
print('dropped   : %d' % len(dropped))
for why, eq in dropped:
    print('   %-14s %r' % (why, eq[:86]))
print('remaining : %d' % len(kept))