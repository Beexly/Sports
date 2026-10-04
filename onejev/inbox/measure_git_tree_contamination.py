"""Measure how much of the git-tree extraction is actually mathematics.

A delegated census measured _research/gse-competitive-intel at 14 real equations
across 980 files. My extraction wrote 1,099 rows from it. Sampling those rows
shows mojibake, tracking URLs and scraped marketing HTML -- the .md files are
scraped web junk that never passed a math gate at all.

This measures contamination across all three git-tree files so the decision to
keep or drop them is made on numbers, not on one hand-judged sample.
"""
import glob
import json
import os
import random
import re

HERE = os.path.dirname(os.path.abspath(__file__))
Q = os.path.join(HERE, 'mind-queue')

# Signals that a "document" is binary noise or scraped web furniture
NOISE = re.compile(
    r'(https?://|www\.|\.com/|\.htm|\.png|\.jpg|&amp;|&quot;|&#\d+|\[\!\[|'
    r'\bsrc=|\bhref=|\bclass=|\bdiv\b|\bspan\b|similarcdn|similarweb|'
    r'\bStart a trial\b|\bSign up\b|\bSubscribe\b|\bCookie|'
    r'[\uFFFD\uFFFE\u0000-\u0008\u000E-\u001F])')

LATEX = re.compile(r'\\[A-Za-z]{2,}')
MATHY = re.compile(r'[\u03b1-\u03c9\u0391-\u03a9\u2211\u220f\u222b\u2202\u221a\u2264\u2265\u2248\u00b1]')


def looks_binary(s):
    """High share of control/replacement characters => not text."""
    if not s:
        return True
    bad = sum(1 for c in s if c == '\ufffd' or ord(c) < 9 or 14 <= ord(c) < 32)
    return bad / len(s) > 0.05


def classify(eq):
    if looks_binary(eq):
        return 'binary_mojibake'
    if NOISE.search(eq):
        return 'web_furniture'
    has_math = bool(LATEX.search(eq) or MATHY.search(eq))
    has_rel = '=' in eq
    if has_math and has_rel:
        return 'real_math'
    if has_math or has_rel:
        return 'weak_math'
    return 'prose_or_other'


def main():
    grand = {}
    for p in sorted(glob.glob(os.path.join(Q, 'git-*.jsonl'))):
        rows = [json.loads(l) for l in open(p, encoding='utf-8', errors='replace') if l.strip()]
        if not rows:
            continue
        c = {}
        for r in rows:
            k = classify(r.get('equation') or '')
            c[k] = c.get(k, 0) + 1
            grand[k] = grand.get(k, 0) + 1
        n = len(rows)
        print('%-28s rows=%-6d  %s' % (
            os.path.basename(p), n,
            '  '.join('%s=%d(%.0f%%)' % (k, v, 100.0 * v / n) for k, v in sorted(c.items()))))

    n = sum(grand.values())
    print('\nCOMBINED rows=%d' % n)
    for k, v in sorted(grand.items(), key=lambda kv: -kv[1]):
        print('  %-18s %7d  %5.1f%%' % (k, v, 100.0 * v / n))

    keep = grand.get('real_math', 0) + grand.get('weak_math', 0)
    print('\nUSABLE (real_math + weak_math) : %d of %d (%.1f%%)'
          % (keep, n, 100.0 * keep / n))
    print('DISCARD (binary + web furniture): %d of %d (%.1f%%)'
          % (n - keep, n, 100.0 * (n - keep) / n))


if __name__ == '__main__':
    main()