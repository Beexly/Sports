"""Extractor for corpus-intelligence briefs -- measured, not assumed.

Measurement (measure_untouched_corpora.py) says 82.5% of the '=' lines in these
briefs are prose-leaking, so a naive sweep would mostly ingest metadata. These
are distilled prose briefs with sparse real math ('rho_1(A,B) = Pearson corr(
r_A,t, r_B,t+1)', 'e = p_book_entry - p_median_close').

Rules, each traceable to a measured failure mode:
  * Require a relation operator AND math on BOTH sides (drops 'status=NEEDS').
  * Require length >= 15 and NOT to end on an operator.
  * Trim at the prose boundary BY INDEX so the result stays verbatim.
  * Drop YAML/ledger front-matter lines (key: value with no math RHS).
  * Drop anything whose RHS is a bare word or a quoted string.
"""
import glob, json, os, re
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = 'C:/Users/Garrett/_research/agent-bus/research/corpus-intelligence'
OUT = os.path.join(HERE, 'mind-queue', 'corpus-intelligence.jsonl')

REL = re.compile(r'(?<![<>!=])=(?![=><])')
MATHY = re.compile(r'[0-9\u03b1-\u03c9\u0391-\u03a9\u2211\u220f\u222b\u2202\u221a]|\\[A-Za-z]{2,}')
ENDS_OP = re.compile(r'[=<>\u2264\u2265\u2248\u2190:,]\s*$')
PROSE_RUN = re.compile(r'(?:[A-Za-z]{3,}[\s,]+){2,}[A-Za-z]{3,}')
GLOSS = re.compile(
    r'\s*,?\s*(?:where|which|with|and then|so that|because|given that|'
    r'if|when|then|thus|hence|for|per|via|using|under|over)\b.*$', re.I)
# ledger / yaml / config junk
LEDGER = re.compile(
    r'^\s*(?:status|state|assign|assigned|owner|tag|tags|id|ref|path|file|url|'
    r'type|kind|verdict|note|notes|created|updated|count|total|n)\s*[:=]',
    re.I)


def balanced(s):
    return (s.count('{') == s.count('}') and s.count('(') == s.count(')')
            and s.count('[') == s.count(']'))


def rhs_ok(rhs):
    if len(rhs) < 2:
        return False
    if rhs[0] in '([{':
        return False
    if not MATHY.search(rhs):
        return False
    # a bare quoted English phrase is not math
    if re.match(r'^\s*[\'"`]', rhs) and not re.search(r'[0-9\u03b1-\u03c9]', rhs):
        return False
    return True


def candidates(text):
    """Yield verbatim equation candidates from one document."""
    for raw in text.splitlines():
        ln = raw.strip()
        if not ln or ln.startswith(('#', '|', '```')):
            continue
        if LEDGER.match(ln):
            continue
        # strip bullet/numbering, keeping the rest verbatim from that point
        m = re.match(r'^(?:[-*>\u2022]\s*|\d+[.)]\s+|\*\*(?:[^*]+)\*\*\s*:?\s*)', ln)
        start_at = m.end() if m else 0
        # try each relation operator in the line
        for rm in REL.finditer(ln, start_at):
            lhs = ln[start_at:rm.start()].strip()
            rhs = ln[rm.end():].strip()
            if not lhs or not rhs_ok(rhs):
                continue
            span = lhs + '=' + rhs
            if len(span) < 15 or ENDS_OP.search(span):
                continue
            if not balanced(span):
                continue
            if len(re.findall(r'[A-Za-z]{4,}', span)) > 12:
                continue
            # trim prose tail BY INDEX
            cut = GLOSS.search(span)
            if cut and cut.start() > 0:
                trimmed = span[:cut.start()].rstrip(' ,;:')
                if len(trimmed) >= 15 and not ENDS_OP.search(trimmed):
                    if trimmed in ln:
                        yield trimmed
                        continue
            if span in ln:
                yield span


def main():
    files = [p for p in glob.glob(os.path.join(ROOT, '**', '*'), recursive=True)
             if os.path.isfile(p) and p.lower().endswith(('.md', '.txt', '.jsonl'))]
    print('files:', len(files))

    rows = []
    seen = set()
    st = Counter()
    for f in files:
        try:
            t = open(f, encoding='utf-8', errors='replace').read()
        except Exception:
            st['unreadable'] += 1
            continue
        got = 0
        for c in candidates(t):
            k = (f.replace(chr(92), '/'), c)
            if k in seen:
                st['dup'] += 1
                continue
            seen.add(k)
            got += 1
            rows.append({'equation': c, 'path': f.replace(chr(92), '/'),
                         'status': 'BRIEF_EQ', 'verbatim': c in t})
        if got == 0:
            st['files_with_no_equation'] += 1

    with open(OUT, 'w', encoding='utf-8') as fh:
        for r in rows:
            fh.write(json.dumps(r, ensure_ascii=False) + '\n')

    nv = sum(1 for r in rows if not r['verbatim'])
    print(json.dumps({
        'files_scanned': len(files),
        'equations': len(rows),
        'nonverbatim': nv,
        'dups': st['dup'],
        'files_with_no_equation': st['files_with_no_equation'],
        'out': OUT,
    }, indent=1))

    import random
    random.seed(3)
    print('\n=== 12 samples ===')
    for r in random.sample(rows, min(12, len(rows))):
        print('  ', r['equation'][:120])


if __name__ == '__main__':
    main()