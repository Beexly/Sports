"""Corpus-wide census of trailing prose in stored equations.

recover() stores text[span_start:] -- from the matched span to END OF LINE. In a
markdown sentence that carries prose along: '... = 0.2 while Alpha has width'.
Known instances: 87 rows in git-tree-equations, ~653 in markdown-clean-v3. This
measures it across EVERY pool, because the defect is in the gate, not in one
extractor, and the true total decides whether it is worth fixing corpus-wide.

A "prose tail" = three or more consecutive English words (a-z, 4+ letters)
appearing AFTER the last math-bearing token in the row.
"""
import glob
import json
import os
import re
from collections import Counter

Q = r'C:/Users/Garrett/onejev/inbox/mind-queue'

# 3+ consecutive English words. Function names a reader treats as math are
# excluded so 'log exp max softmax sigmoid' do not count as prose.
WORD = re.compile(r'[A-Za-z]{4,}')
MATH_WORDS = {
    'log', 'exp', 'max', 'min', 'sin', 'cos', 'tan', 'logit', 'logsig', 'sigmoid',
    'softmax', 'mean', 'prob', 'sum', 'prod', 'sqrt', 'grad', 'norm', 'diag',
    'rank', 'size', 'mass', 'rate', 'odds', 'loss', 'true', 'null', 'else',
    'true', 'info', 'corr', 'dist', 'char', 'item', 'code', 'data', 'time',
    'line', 'type', 'name', 'date', 'file', 'path', 'text', 'word', 'page',
    'case', 'note', 'self', 'rand', 'seed', 'beta', 'gamma', 'delta', 'sigma',
}
PROSE_RUN = re.compile(r'(?:\b[A-Za-z]{4,}\b[\s,;:()\-]+){3,}[A-Za-z]{4,}\b')

POOLS = [
    'git-tree-equations.jsonl',
    'agree-drain.jsonl',
    'markdown-clean-v3.jsonl',
    'arxiv-clean.jsonl',
    'unverified-recoverable.jsonl',
    'corpus-intelligence-clean.jsonl',
    'downloads-research.jsonl',
    'equation-pool.jsonl',
]


def last_math_pos(t):
    """Index just past the final math-bearing token (digit, Greek, operator)."""
    m = None
    for ch in '0-9α-ωΑ-Ω\u2190\u2264\u2265\u2248∑∏∫∂√±=+*/^_':
        pass
    for mm in re.finditer(r'[0-9α-ωΑ-Ω\u2190\u2264\u2265\u2248\u2211\u220f\u222b\u2202\u221a\u00b1=+*/^_\\]', t):
        m = mm
    return m.end() if m else 0


def prose_tail(eq):
    """Return prose appearing AFTER the last math token, or ''.

    The first version used PROSE_RUN.search(t), which matches the FIRST run
    anywhere -- so it counted leading labels ('Moderate-favorite leaf audit')
    and prose inside an RHS ('P(public backs losing side)') as tails. Only a run
    that begins after the final math token is a genuine tail.
    """
    t = str(eq or '').strip()
    if not t:
        return ''
    m = PROSE_RUN.search(t, last_math_pos(t))
    while m:
        words = [w for w in WORD.findall(m.group(0))]
        real = [w for w in words if w.lower() not in MATH_WORDS]
        # a run counts only when most of its words are not math identifiers
        if len(real) >= 3:
            return m.group(0)
        # else this run is math-ish; keep looking after it
        nxt = PROSE_RUN.search(t, m.end())
        if not nxt:
            return ''
        m = nxt
    return ''


total_rows = 0
total_prose = 0
print('%-34s %8s %8s %7s' % ('pool', 'rows', 'prose', 'pct'))
print('-' * 60)
for name in POOLS:
    path = os.path.join(Q, name)
    if not os.path.exists(path):
        continue
    rows = prose = 0
    samples = []
    for line in open(path, encoding='utf-8', errors='replace'):
        line = line.strip()
        if not line or line.startswith('corpus-roots:'):
            continue
        try:
            r = json.loads(line)
        except Exception:
            continue
        rows += 1
        tail = prose_tail(r.get('equation'))
        if tail:
            prose += 1
            if len(samples) < 3:
                samples.append(tail[:70])
    total_rows += rows
    total_prose += prose
    print('%-34s %8d %8d %6.1f%%' % (name, rows, prose, 100.0 * prose / max(1, rows)))
    for s in samples:
        print('      tail: %r' % s)

print('-' * 60)
print('%-34s %8d %8d %6.1f%%' % ('TOTAL', total_rows, total_prose,
                                  100.0 * total_prose / max(1, total_rows)))