"""Falsify my own claim: is the cleaned index really full of prose?

I asserted from THREE sampled rows that the extraction gate admits markdown
headings. That is not evidence. This classifies every row in the cleaned index
with independent, explicit tests and prints the actual distribution plus a
random sample per bucket so each bucket can be read and judged by eye.

No extraction. Read-only over the index.
"""
import json, os, re, random, sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import eq_normalize as E

INDEX = os.path.join(HERE, 'mind-queue', 'wave-index.jsonl')

MD_HEADING = re.compile(r'^\s{0,3}#{1,6}\s')
BULLET = re.compile(r'^\s*([-*•]|\d+[.)])\s')
TABLE_ROW = re.compile(r'^\s*\|')
LINK = re.compile(r'\[[^\]]{2,}\]\([^)]*\)')
EMPH = re.compile(r'\*\*|__|\*[^*]{3,}\*|`[^`]{1,}`')
URL = re.compile(r'https?://')


def classify(eq):
    """Independent, explicit tests. Return (bucket, why)."""
    if not eq:
        return 'EMPTY', 'no equation text'
    t = eq.strip()
    if len(t) > 300:
        return 'OVERLONG', 'longer than 300 chars'
    if MD_HEADING.match(t):
        return 'MD_HEADING', 'starts with #'
    if TABLE_ROW.match(t):
        return 'TABLE', 'markdown table row'
    if LINK.search(t):
        return 'HAS_LINK', 'contains markdown link'
    if URL.search(t):
        return 'HAS_URL', 'contains a URL'
    if not any(r in t for r in ('=', '←', '≤', '≥', '≈', '~')):
        return 'NO_RELATION', 'no relation operator'
    if BULLET.match(t) and not re.search(r'[=<>]\s*\S', t):
        return 'BULLET_NO_MATH', 'list item without math'
    words = re.findall(r'[A-Za-z]{4,}', t)
    if len(words) > 4:
        return 'PROSE', '%d long words' % len(words)
    if re.search(r'\b(the|and|or|with|for|from|that|this|where|which|between|'
                 r'sample|hence|therefore|thus|when|while|after|before)\b', t, re.I):
        return 'PROSE_CONJ', 'sentence connective'
    if EMPH.search(t) and not re.search(r'\{|\^|_', t):
        return 'EMPHASIS', 'markdown emphasis, no sub/superscript'
    if not E.is_clean_equation(t):
        return 'GATE_FAIL', 'eq_normalize.is_clean_equation=False'
    return 'EQUATION', 'passes all gates'


def main():
    rows = []
    with open(INDEX, encoding='utf-8') as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
            except Exception:
                continue
            if r.get('equation'):
                rows.append(r)

    buckets = {}
    for r in rows:
        b, why = classify(r['equation'])
        buckets.setdefault(b, []).append((r['equation'], why, r.get('file', '')))

    total = len(rows)
    print('CLASSIFIED %d cleaned-index rows\n' % total)
    print('%-18s %7s  %6s' % ('BUCKET', 'COUNT', 'PCT'))
    for b in sorted(buckets, key=lambda k: -len(buckets[k])):
        n = len(buckets[b])
        print('%-18s %7d  %5.1f%%' % (b, n, 100.0 * n / total))

    eqn = len(buckets.get('EQUATION', []))
    junk = total - eqn
    print('\nEQUATION-LIKE: %d (%.1f%%)' % (eqn, 100.0 * eqn / total))
    print('NOT EQUATION : %d (%.1f%%)' % (junk, 100.0 * junk / total))

    rng = random.Random(7)
    for b in sorted(buckets):
        if b == 'EQUATION':
            continue
        print('\n--- %s (sample 3 of %d) ---' % (b, len(buckets[b])))
        for eq, why, f in rng.sample(buckets[b], min(3, len(buckets[b]))):
            print('  why  :', why)
            print('  text :', eq[:150])
            print('  file :', os.path.basename(f)[:70])
    print('\n--- EQUATION (sample 3) ---')
    for eq, why, f in rng.sample(buckets['EQUATION'], min(3, len(buckets['EQUATION']))):
        print('  text :', eq[:150])
        print('  file :', os.path.basename(f)[:70])


if __name__ == '__main__':
    main()