"""Second-pass prose strip for markdown spans, fixing what clean_markdown_prose missed.

clean_markdown_prose.py reported remaining_prose=0, but an independent verifier
found 1,136 rows still carrying prose. Cause: clean() re-tests only the head it
cut, so it never noticed prose that survives INSIDE the math -- e.g.

  \\sigma=(1,2,3,4)\\nas in Figure\\n1
  Leaky-bucket economics (~150-200 active payers = ramen; ~10-15%/mo churn)
  27-29 n=1017 18.7%

Those are header fragments, figure captions and results tables, not equations.

This pass cuts at the LAST relation-operator clause: it walks back from the end
to the final '=' / relation boundary and keeps only what is math-dense there. It
only ever slices, so the result stays an exact substring of the input.
"""
import json, os, re
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
Q = os.path.join(HERE, 'mind-queue')
IN = os.path.join(Q, 'markdown-clean.jsonl')
OUT = os.path.join(Q, 'markdown-clean2.jsonl')

REL_TOK = re.compile(r'[=<>\u2264\u2265\u2248\u2190]|:=|\\le\b|\\ge\b|\\approx|\\to\b|\\rightarrow')
PROSE_RUN = re.compile(r'(?:[A-Za-z]{3,}[\s,]+){2,}[A-Za-z]{3,}')
# prose with no math anywhere near it: header/caption/table junk
MATHY = re.compile(r'[0-9\u03b1-\u03c9\u0391-\u03a9\u2211\u220f\u222b\u2202\u221a]|\\[A-Za-z]{2,}')


def strip_latex_cmds(s):
    s = re.sub(r'\\[A-Za-z]+\{[^}]*\}', ' ', s)
    return re.sub(r'\\[A-Za-z]+', ' ', s)


def prose_score(eq):
    n = 0
    for m in PROSE_RUN.finditer(eq):
        bare = strip_latex_cmds(m.group(0))
        if len(re.findall(r'[A-Za-z]{3,}', bare)) >= 3:
            n += 1
    return n


def math_score(eq):
    return len(MATHY.findall(eq))


def clean(eq):
    """Keep only the math-dense tail containing the final relation operator."""
    s = eq.strip()
    if not s:
        return None

    # hard junk: header fragments and caption lines with no math at all
    if math_score(s) == 0:
        return None

    # walk back from the end to the LAST relation operator
    last = None
    for m in REL_TOK.finditer(s):
        last = m
    if last is None:
        return None

    head = s[:last.end()].rstrip()
    # the head must itself be math-bearing, not a prose preamble
    if math_score(head) == 0:
        return None

    # if the whole thing is already one clean clause, keep it
    if prose_score(head) == 0 and len(head) >= 15:
        return head

    # otherwise cut at the prose run inside the head
    idx = -1
    for m in PROSE_RUN.finditer(head):
        bare = strip_latex_cmds(m.group(0))
        if len(re.findall(r'[A-Za-z]{3,}', bare)) >= 3:
            idx = m.start()
            break
    if idx > 0:
        cand = head[:idx].rstrip()
        cand = re.sub(r'[,\s]+$', '', cand)
        if math_score(cand) == 0 or len(cand) < 15:
            return None
        if prose_score(cand) > 0:
            return None
        return cand
    return None


def main():
    rows = [json.loads(l) for l in open(IN, encoding='utf-8') if l.strip()]
    print('input rows:', len(rows))

    kept, seen = [], set()
    stats = Counter()
    for r in rows:
        eq = r['equation']
        c = clean(eq)
        if c is None:
            stats['dropped'] += 1
            continue
        if c not in eq:
            stats['NOT SUBSTRING'] += 1
            continue
        k = (r['path'], c)
        if k in seen:
            stats['dup'] += 1
            continue
        seen.add(k)
        if c != eq:
            stats['trimmed'] += 1
        kept.append({'equation': c, 'path': r['path'],
                     'status': 'MARKDOWN_CLEAN2', 'verbatim': True})

    with open(OUT, 'w', encoding='utf-8') as fh:
        for k in kept:
            fh.write(json.dumps(k, ensure_ascii=False) + '\n')

    rem = sum(1 for k in kept if prose_score(k['equation']) > 0)
    print(json.dumps({
        'kept': len(kept),
        'trimmed': stats['trimmed'],
        'dropped': stats['dropped'],
        'dup': stats['dup'],
        'not_substring': stats['NOT SUBSTRING'],
        'remaining_prose': rem,
        'out': OUT,
    }, indent=1))


if __name__ == '__main__':
    main()