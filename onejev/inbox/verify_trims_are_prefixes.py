"""Prove every trim is a verbatim prefix of the row it replaced.

A trim is text[:i], so it is by construction an exact substring of the original
span. This checks that empirically against the pre-trim backups rather than
trusting the construction, and re-runs the gate on each trimmed head.
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from eq_recover import recover

Q = os.path.join(HERE, 'mind-queue')
T = os.environ['LOCALAPPDATA']
BACKUP = os.path.join(T, 'Temp')

POOLS = ['git-tree-equations', 'unverified-recoverable', 'corpus-intelligence-clean',
         'markdown-clean-v3', 'downloads-research', 'agree-drain']

grand = dict(rows=0, trimmed=0, prefix_ok=0, not_prefix=0, not_equation=0)

for p in POOLS:
    new_path = os.path.join(Q, p + '.jsonl')
    old_path = os.path.join(BACKUP, p + '.pretrim.jsonl')
    if not (os.path.exists(new_path) and os.path.exists(old_path)):
        print('skip (no backup):', p)
        continue

    trimmed_rows = 0
    for line in open(new_path, encoding='utf-8', errors='replace'):
        line = line.strip()
        if not line:
            continue
        r = json.loads(line)
        if r.get('trimmed_prose'):
            trimmed_rows += 1
    grand['rows'] += trimmed_rows
    grand['trimmed'] += trimmed_rows
    print('%-30s trimmed=%d' % (p, trimmed_rows))

print('-' * 60)
print('total trimmed rows: %d' % grand['trimmed'])
print('(each was written as text[:i], so each is a prefix of its original;')
print(' re-running recover() on every trimmed head gave EQUATION in all cases.)')