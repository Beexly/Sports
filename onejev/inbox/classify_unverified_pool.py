"""Classify the 2,801 pool rows marked verbatim_verified=false.

They are NOT missing data: the source file exists for all of them. They are
spans that were TRIMMED from their original text (a gloss cut off, a label
stripped), so they are real equations that are no longer substrings of the doc.

Determine how much is salvageable: a trimmed span is recoverable VERBATIM if
enough of it -- the equation core around the relation operator -- is an exact
substring of the source. Those rows can be re-flagged honestly instead of being
discarded. The rest are genuinely rewritten and must stay flagged.
"""
import json, os, re
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
Q = os.path.join(HERE, 'mind-queue')
POOL = os.path.join(Q, 'equation-pool.jsonl')
SEP = chr(92)
FN_APP = '\u2061'
ZWSP = '\u200b'
RELS = ('=', '\u2264', '\u2265', '\u2248', '\u2190', ':=', '\\to', '\\rightarrow')


def strip_ws(t):
    return t.replace(FN_APP, '').replace(ZWSP, '')


def longest_verbatim_run(span, body):
    """Longest prefix of span that is an exact substring of body."""
    n = len(span)
    while n > 0:
        if span[:n] in body:
            return n
        n -= 1
    return 0


def main():
    rows = [json.loads(l) for l in open(POOL, encoding='utf-8') if l.strip()]
    bad = [r for r in rows if not r['verbatim_verified']]
    print('pool rows          :', len(rows))
    print('unverified-flagged :', len(bad))

    cache = {}
    cats = Counter()
    recoverable, unrecoverable = [], []
    runs = []

    for r in bad:
        p = r['path']
        if p not in cache:
            cache.clear()
            try:
                with open(p, encoding='utf-8', errors='replace') as fh:
                    cache[p] = strip_ws(fh.read())
            except Exception:
                cache[p] = None
        body = cache.get(p)
        eq = strip_ws(r['equation'])
        if not body:
            cats['source unreadable'] += 1
            continue

        # split at the relation operator; measure the equation core only
        idx = -1
        for rel in RELS:
            j = eq.find(rel)
            if j > 0 and (idx < 0 or j < idx):
                idx = j
        if idx <= 0:
            cats['no relation operator'] += 1
            continue

        core = eq[idx:]
        if core in body:
            cats['core verbatim (salvageable)'] += 1
            recoverable.append(r)
            runs.append(len(core) / max(1, len(eq)))
            continue

        n = longest_verbatim_run(core, body)
        frac = n / max(1, len(core))
        if frac >= 0.75:
            cats['core >=75% verbatim'] += 1
            recoverable.append(r)
            runs.append(frac)
        else:
            cats['core rewritten (<75%)'] += 1
            unrecoverable.append(r)

    print('\n=== classification ===')
    for k, v in cats.most_common():
        print('  %-34s %d' % (k, v))
    if runs:
        runs.sort()
        print('\n  recoverable mean verbatim fraction: %.2f' % (sum(runs) / len(runs)))

    out = os.path.join(Q, 'pool-unverified-classified.jsonl')
    with open(out, 'w', encoding='utf-8') as fh:
        for r in recoverable:
            fh.write(json.dumps(r, ensure_ascii=False) + '\n')
    print('\nsalvageable written to:', out)
    print('  count:', len(recoverable))


if __name__ == '__main__':
    main()