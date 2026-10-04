"""Trim trailing prose, but ONLY when the remainder is still a complete equation.

Measured (census_prose_tails.py, corrected): 4,915 of 239,957 stored equations
(2.0%) carry an English run after the last math token.

The naive fix is WRONG and dangerous. 'Q(s) = P(public backs losing side)' has a
prose tail, but cutting at it leaves 'Q(s) = P(' -- a broken equation. So every
candidate trim is verified: the head must still satisfy eq_recover.recover() as
EQUATION. If trimming breaks it, the row is left exactly as it was.

The edit is a length cut (head = text[:i]), which preserves verbatim: the result
is still an exact substring of the original span.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from eq_recover import recover

Q = os.path.join(HERE, 'mind-queue')

WORD = re.compile(r'[A-Za-z]{4,}')
MATH_WORDS = {
    'log', 'exp', 'max', 'min', 'sin', 'cos', 'tan', 'logit', 'sigmoid',
    'softmax', 'mean', 'prob', 'sum', 'prod', 'sqrt', 'grad', 'norm', 'diag',
    'rank', 'size', 'mass', 'rate', 'odds', 'loss', 'true', 'null', 'else',
    'info', 'corr', 'dist', 'char', 'item', 'code', 'data', 'time', 'line',
    'type', 'name', 'date', 'file', 'path', 'text', 'word', 'page', 'case',
    'note', 'self', 'rand', 'seed', 'beta', 'gamma', 'delta', 'sigma', 'odds',
}
PROSE_RUN = re.compile(r'(?:\b[A-Za-z]{4,}\b[\s,;:()\-]+){3,}[A-Za-z]{4,}\b')
LAST_MATH = re.compile(
    r'[0-9α-ωΑ-Ω←≤≥≈∑∏∫∂√±=+*/^_\\]')


def tail_start(t):
    """Index where the trailing prose run begins, or -1."""
    m = None
    for mm in LAST_MATH.finditer(t):
        m = mm
    if not m:
        return -1
    pm = PROSE_RUN.search(t, m.end())
    if not pm:
        return -1
    real = [w for w in WORD.findall(pm.group(0)) if w.lower() not in MATH_WORDS]
    return pm.start() if len(real) >= 3 else -1


def process(name):
    path = os.path.join(Q, name)
    if not os.path.exists(path):
        return None
    rows, trimmed, skipped_unsafe, no_change = 0, 0, 0, 0
    out = []
    for line in open(path, encoding='utf-8', errors='replace').read().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            r = json.loads(line)
        except Exception:
            out.append(line)
            continue
        rows += 1
        eq = str(r.get('equation') or '')
        i = tail_start(eq)
        if i < 0:
            no_change += 1
            out.append(line)
            continue
        head = eq[:i].rstrip(' ,;:')
        if recover(head)['status'] != 'EQUATION':
            # trimming would break the equation -- keep the original
            skipped_unsafe += 1
            out.append(line)
            continue
        if head == eq:
            no_change += 1
            out.append(line)
            continue
        r['equation'] = head
        r['trimmed_prose'] = True
        out.append(json.dumps(r, ensure_ascii=False))
        trimmed += 1

    with open(path, 'w', encoding='utf-8') as fh:
        for line in out:
            fh.write(line + '\n')
    return {'pool': name, 'rows': rows, 'trimmed': trimmed,
            'kept_because_trim_would_break_it': skipped_unsafe,
            'unchanged': no_change}


if __name__ == '__main__':
    targets = ['git-tree-equations.jsonl', 'unverified-recoverable.jsonl',
               'corpus-intelligence-clean.jsonl', 'markdown-clean-v3.jsonl',
               'downloads-research.jsonl', 'agree-drain.jsonl']
    total = 0
    for t in targets:
        r = process(t)
        if r:
            total += r['trimmed']
            print(json.dumps(r))
    print('TOTAL TRIMMED: %d' % total)