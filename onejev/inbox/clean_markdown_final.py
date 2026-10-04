"""Fix markdown-clean.jsonl WITHOUT cutting at a relation operator.

The rejected clean_markdown_prose2.py walked back to the LAST '=' and kept the
head -- which ends ON the operator, producing 26,268 rows ending in '=' and
garbage like '1 CockpitTask assigned to JARVIS, status=NEEDS_REVIEW'. Cutting
there is wrong: an equation whose RHS was never captured cannot be repaired by
truncating it.

Correct policy for the two defects actually measured:
  * 1,136 rows are prose (headers, captions, table rows) -> DROP, don't cut.
  *    74 duplicate (path, equation) pairs               -> DROP, keep one.
Nothing is rewritten and nothing is cut, so every kept row stays an exact
substring of the source span.
"""
import json, os, re
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
Q = os.path.join(HERE, 'mind-queue')
IN = os.path.join(Q, 'markdown-clean.jsonl')
OUT = os.path.join(Q, 'markdown-clean-final.jsonl')

PROSE_RUN = re.compile(r'(?:[A-Za-z]{3,}[\s,]+){2,}[A-Za-z]{3,}')
MATHY = re.compile(r'[0-9\u03b1-\u03c9\u0391-\u03a9\u2211\u220f\u222b\u2202\u221a]|\\[A-Za-z]{2,}')
# header/caption/table junk: prose with essentially no math
NOISY = re.compile(
    r'(?:status=NEEDS|assigned to|CockpitTask|complianceStatus|'
    r'as in Figure|Table \d|Fig\. \d|^\d+-\d+\s+n=\d)', re.I)


def strip_cmds(s):
    s = re.sub(r'\\[A-Za-z]+\{[^}]*\}', ' ', s)
    return re.sub(r'\\[A-Za-z]+', ' ', s)


def is_prose(eq):
    if NOISY.search(eq):
        return True
    words = 0
    for m in PROSE_RUN.finditer(eq):
        bare = strip_cmds(m.group(0))
        words += len(re.findall(r'[A-Za-z]{3,}', bare))
    # prose-dominant: lots of English and barely any math
    return words >= 3 and len(MATHY.findall(eq)) <= 2


def main():
    rows = [json.loads(l) for l in open(IN, encoding='utf-8') if l.strip()]
    print('input:', len(rows))

    kept, seen = [], set()
    st = Counter()
    for r in rows:
        eq = r['equation']
        if is_prose(eq):
            st['dropped_prose'] += 1
            continue
        k = (r['path'], eq)
        if k in seen:
            st['dropped_dup'] += 1
            continue
        seen.add(k)
        kept.append(r)

    with open(OUT, 'w', encoding='utf-8') as fh:
        for k in kept:
            fh.write(json.dumps(k, ensure_ascii=False) + '\n')

    rem = sum(1 for k in kept if is_prose(k['equation']))
    print(json.dumps({
        'kept': len(kept),
        'dropped_prose': st['dropped_prose'],
        'dropped_dup': st['dropped_dup'],
        'remaining_prose': rem,
        'out': OUT,
    }, indent=1))


if __name__ == '__main__':
    main()