"""Verify the git-tree extractions without re-reading every blob.

Re-reading 10,300 blobs to test verbatim membership is slow and RAM-hungry on
this box (a previous attempt timed out at 420 s). Verify structure and cheap
properties from the rows alone, then verbatim-check a BOUNDED random sample.
"""
import glob
import json
import os
import random
import re
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
Q = os.path.join(HERE, 'mind-queue')
SAMPLE = 400


def balanced(s):
    return (s.count('{') == s.count('}')
            and s.count('(') == s.count(')')
            and s.count('[') == s.count(']'))


def main():
    total = 0
    for p in sorted(glob.glob(os.path.join(Q, 'git-*.jsonl'))):
        rows = [json.loads(l) for l in open(p, encoding='utf-8', errors='replace') if l.strip()]
        if not rows:
            print('%-28s EMPTY' % os.path.basename(p))
            continue
        total += len(rows)

        seen = set()
        dups = 0
        short = 0
        for r in rows:
            k = (r.get('path'), r.get('equation'))
            if k in seen:
                dups += 1
            seen.add(k)
            if len(r.get('equation') or '') < 15:
                short += 1

        unbalanced = sum(1 for r in rows if not balanced(r['equation']))
        ends_op = sum(1 for r in rows
                      if re.search(r'[=<>\u2264\u2265\u2248\\{,]\s*$', r['equation']))
        no_rel = sum(1 for r in rows if '=' not in r['equation'])
        flags = Counter(k for r in rows for k in r.keys())

        # verbatim on a bounded sample
        random.seed(11)
        pick = random.sample(rows, min(SAMPLE, len(rows)))
        cache = {}
        nonverb = 0
        checked = 0
        for r in pick:
            src = r.get('path')
            if src not in cache:
                if not os.path.exists(src):
                    cache[src] = None
                else:
                    cache[src] = open(src, encoding='utf-8', errors='replace').read()
            if len(cache) > 40:
                cache.pop(next(iter(cache)))
            if cache.get(src) is None:
                continue
            checked += 1
            if r['equation'] not in cache[src]:
                nonverb += 1

        print('%-28s rows=%-6d dups=%-4d unbalanced=%5.1f%% ends-on-op=%5.1f%% '
              'no-rel=%5.1f%% short=%-4d verbatim_sampled=%-5d nonverbatim=%d'
              % (os.path.basename(p), len(rows), dups,
                 100.0 * unbalanced / len(rows), 100.0 * ends_op / len(rows),
                 100.0 * no_rel / len(rows), short, checked, nonverb))
        print('%-28s keys: %s' % ('', ', '.join(sorted(flags))))

    print('\nTOTAL git-tree equations: %d' % total)


if __name__ == '__main__':
    main()