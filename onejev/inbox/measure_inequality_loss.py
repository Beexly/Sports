"""How much real mathematics does EQ_SPAN's '=' requirement cost?

EQ_SPAN is  LHS \\s*=\\s* RHS  -- a literal '=' is mandatory. OPS already includes
<=\\u2264 >=\\u2265 !=\\u2260 ~=\\u2248 and \\neq, and is_clean_equation elsewhere
accepts \\u2264/\\u2265/\\u2248/~ as relations, so the corpus clearly CONTAINS
inequalities. They simply cannot be extracted.

This counts how many, per pool, without proposing a change yet. Measurement
first: I have twice this session shipped a fix that moved a number in the wrong
direction.
"""
import json
import os
import re
import sys

sys.path.insert(0, r'C:/Users/Garrett/onejev/inbox')
from eq_recover import recover

Q = r'C:/Users/Garrett/onejev/inbox/mind-queue'
HASH = re.compile(r'[A-Za-z\\][A-Za-z0-9_^{}\\]{0,30}')
REL_INEQ = re.compile(r'(?:\\le(?:q)?\b|\\ge(?:q)?\b|\\neq\b|\\approx\b|\u2264|\u2265|\u2260|\u2248)')

POOLS = ['wave-index.jsonl', 'unverified-recoverable.jsonl', 'agree-drain.jsonl',
         'git-tree-equations.jsonl', 'markdown-clean-v3.jsonl', 'arxiv-clean.jsonl',
         'corpus-intelligence-clean.jsonl', 'downloads-research.jsonl']

print('%-32s %8s %10s %10s' % ('pool', 'rows', 'no_=', 'ineq_only'))
print('-' * 64)
grand = 0
for name in POOLS:
    path = os.path.join(Q, name)
    if not os.path.exists(path):
        continue
    rows = noeq = ineq_only = 0
    samples = []
    for line in open(path, encoding='utf-8', errors='replace').read().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            r = json.loads(line)
        except Exception:
            continue
        eq = str(r.get('equation') or '')
        if not eq:
            continue
        rows += 1
        if recover(eq)['status'] == 'EQUATION':
            continue
        if '=' in eq:
            continue
        noeq += 1
        m = HASH.search(eq)
        if m and REL_INEQ.search(eq, m.end()):
            ineq_only += 1
            if len(samples) < 3:
                samples.append(eq[:96])
    grand += ineq_only
    print('%-32s %8d %10d %10d' % (name, rows, noeq, ineq_only))
    for s in samples:
        print('      %r' % s)

print('-' * 64)
print('inequality-only rows corpus-wide: %d' % grand)