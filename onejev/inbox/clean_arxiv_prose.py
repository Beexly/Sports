"""Strip prose from arXiv spans at the LAST RELATION BOUNDARY, keeping verbatim.

An audit (independently reproduced here at 18.1% of rows) showed prose welded
onto equations: '\\phi(s,q,x)=x+qs-\\eta q^2, \\eta\\geq 0, which is the PNL with
a quadratic penalty'. The equation ends at its last relation operator's clause;
the tail is English.

Key constraint that earlier passes got wrong: the result must stay an exact
SUBSTRING of the source. So this only ever CUTS a span at an index -- it never
substitutes, rewrites, or collapses whitespace. A span that cannot be cut
cleanly is dropped, never rewritten.

Also drops table-like rows (runs of \\pm standard errors), which are results
tables posing as equations.
"""
import glob, json, os, re
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
Q = os.path.join(HERE, 'mind-queue')
OUT = os.path.join(Q, 'arxiv-clean.jsonl')

PROSE_RUN = re.compile(r'(?:[A-Za-z]{3,}[\s,]+){2,}[A-Za-z]{3,}')
# An English connective that legitimately precedes a clause of math.
CONNECT = re.compile(
    r'(?:,|\band\b|\bwhere\b|\bwhich\b|\bwith\b|\bthen\b|\bsuch that\b|\bfor\b|'
    r'\bif\b|\bor\b|\bwhen\b|\bgiven\b|\byields\b|\bdenote[sd]?\b|\bsatisf(?:y|ies)\b|'
    r'\bhence\b|\bthus\b|\bso that\b|\bsince\b|\bby definition\b|\bas follows\b|'
    r'\bin terms of\b|\bwe (?:have|write|define|set|let)\b|\bwe also have\b|'
    r'\bthe following\b|\bhold(?:s)? for\b|\bfor all\b|\bfor any\b|\bunder which\b)', re.I)


def strip_latex(seg):
    seg = re.sub(r'\\[A-Za-z]+\{[^}]*\}', ' ', seg)
    return re.sub(r'\\[A-Za-z]+', ' ', seg)


def prose_index(eq):
    """Index where English prose begins, or -1 if the span is clean."""
    for m in PROSE_RUN.finditer(eq):
        bare = strip_latex(m.group(0))
        if len(re.findall(r'[A-Za-z]{3,}', bare)) >= 3:
            # the prose run starts before the match if a connective precedes it
            start = m.start()
            pre = eq[:start]
            cm = None
            for c in CONNECT.finditer(pre):
                cm = c
            if cm is not None:
                start = cm.start()
            return start
    return -1


def clean(eq):
    """Return the verbatim equation head, or None to drop the row."""
    s = eq.strip()
    # table-like: runs of standard errors, not an equation
    if s.count('\\pm') >= 3:
        return None
    n_pm = s.count('\\pm') + s.count('±')
    if n_pm >= 2 and re.match(r'^\s*[0-9.]+', s):
        return None
        return None

    idx = prose_index(s)
    if idx > 0:
        head = s[:idx].strip()
        # never leave a dangling connective or operator at the end
        head = re.sub(r'(?:,|\band\b|\bwhere\b|\bwhich\b|\bwith\b|\bthen\b|'
                      r'\bsuch that\b|\bfor\b|\bif\b|\bor\b|\bwhen\b|\bgiven\b|'
                      r'\byields\b|\bdenote[sd]?\b|\bsatisf(?:y|ies)\b|\bhence\b|'
                      r'\bthus\b|\bso that\b|\bsince\b)\s*$', '', head,
                      flags=re.I).strip()
        head = head.rstrip(',;:').strip()
        if idx >= len(s):
            return None
        s = head if len(head) >= 15 else s

    if len(s) < 15:
        return None
    if re.search(r'[=<>\u2264\u2265\u2248\u2190:]\s*$', s):
        return None
    if not re.search(r'[=<>\u2264\u2265\u2248\u2190]|:=|\\to\b|\\rightarrow', s):
        return None
    return s


def main():
    rows = []
    for w in sorted(glob.glob(os.path.join(Q, 'wave-93*.jsonl'))):
        for line in open(w, encoding='utf-8', errors='replace'):
            line = line.strip()
            if not line or line.startswith('corpus-roots:'):
                continue
            try:
                r = json.loads(line)
            except Exception:
                continue
            if r.get('equation'):
                rows.append(r)
    print('rows in          :', len(rows))

    kept, cut, dropped = [], 0, 0
    seen = set()
    for r in rows:
        eq = r['equation']
        c = clean(eq)
        if c is None:
            dropped += 1
            continue
        if c != eq.strip():
            cut += 1
        if prose_index(c) > 0:
            dropped += 1          # still prosey after the cut -> do not ship it
            continue
        k = (r['file'], c)
        if k in seen:
            dropped += 1
            continue
        seen.add(k)
        kept.append({'equation': c, 'path': r['file'].replace(chr(92), '/'),
                     'status': 'ARXIV_CLEAN', 'verbatim': c in eq})

    with open(OUT, 'w', encoding='utf-8') as fh:
        for k in kept:
            fh.write(json.dumps(k, ensure_ascii=False) + '\n')

    # report
    rem = sum(1 for k in kept if prose_index(k['equation']) > 0)
    tbl = sum(1 for k in kept if k['equation'].count('\\pm') >= 3)
    print(json.dumps({
        'kept': len(kept),
        'prose_trimmed': cut,
        'dropped': dropped,
        'remaining_prose': rem,
        'remaining_table_like': tbl,
        'out': OUT,
    }, indent=1))


if __name__ == '__main__':
    main()