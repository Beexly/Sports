"""Salvage equations from the 33,913 UNVERIFIED rows -- arXiv-aware.

salvage_unverified.py ran before the arXiv sweep, when UNVERIFIED rows were
markdown prose. Now 33,913 of them are LaTeX from arXiv papers, which fail the
prose gate for a completely different reason: the gate counts English words.

So this pass routes each UNVERIFIED row through eq_recover.recover() FIRST --
which knows about LaTeX -- and only falls back to the markdown span splitter.
Writes to its own file; agree-drain.jsonl stays AGREE-only by contract.
"""
import json, os, re, sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import eq_recover
from eq_recover import recover, JSX

Q = os.path.join(HERE, 'mind-queue')
SRC = os.path.join(Q, 'wave-agreement-gemini.jsonl')
OUT = os.path.join(Q, 'unverified-recoverable.jsonl')
SEP = chr(92)

FN_APP = '\u2061'
ZWSP = '\u200b'


def strip_ws(t):
    return t.replace(FN_APP, '').replace(ZWSP, '')


# --- markdown span splitter (from the earlier salvage pass) ---------------
GLOSS = re.compile(
    r'\s*,?\s*(?:with|where|so|thus|hence|and|class counts|defaults?|the \w+|'
    r'e\.g\.|i\.e\.|as (?:in|of|of the)|defined (?:by|as)|per market|'
    r'week(?:ly)?|report)\b', re.I)
LEAD_LABEL = re.compile(
    r'^\s*(?:\*\*)?[A-Z][\w\s/\-\(\)]{2,60}(?:\([^)]*\))?(?:\*\*)?\s*:\s*')
ENDS_OP = re.compile(r'[=<>≤≥≈←:]\s*$')
LATEX_CMD = re.compile(r'\\[A-Za-z]{2,}')

# eq_recover accepts spans with no relation operator, which admits English junk
# ('Reproduce', 'ADOPT if', '** Build'). A usable span carries a relation
# operator AND real math, and is not a bare verb phrase.
PROSE_MIN = 15
HAS_REL = re.compile(r'[=<>≤≥≈←]|:=|\\to|\\rightarrow|\\le\\b|\\ge\\b|\\approx')
HAS_MATH = re.compile(r'[0-9α-ωΑ-Ω∑∏∫∂√]|\\[A-Za-z]{2,}')


def md_span(eq):
    """Verbatim-by-index prose trim for markdown rows."""
    out = []
    t = eq.strip()
    body = LEAD_LABEL.sub('', t, count=1)
    for cand in (t, body):
        c = GLOSS.split(cand)[0].strip()
        for piece in (cand, c):
            p = piece.strip(' ,;')
            if p and not ENDS_OP.search(p) and 8 <= len(p) <= 320:
                out.append(p)
    return out


def main():
    rows = []
    with open(SRC, encoding='utf-8') as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                r = json.loads(line)
            except Exception:
                continue
            if r.get('status') == 'UNVERIFIED' and r.get('printed_equation'):
                rows.append(r)
    print('UNVERIFIED rows:', len(rows))

    kept, dupes, nonverbatim = [], 0, 0
    reasons = Counter()
    latex_rows = 0
    seen = set()

    for r in rows:
        printed = r['printed_equation']
        path = r.get('source_path') or ''
        # verbatim reference: the SAME normalization extract() applied
        ref = strip_ws(printed)

        got = recover(printed)
        if got['status'] == 'JUNK':
            reasons['junk'] += 1
            continue
        if got['status'] == 'TRUNCATED':
            reasons['truncated'] += 1
            continue

        spans = []
        if LATEX_CMD.search(printed):
            latex_rows += 1
            # eq_recover already isolated an equation-shaped span
            eq = got['equation']
            if eq and eq in ref:
                spans.append(eq)
        else:
            spans = md_span(printed)

        if not spans:
            reasons['no span found'] += 1
            continue

        placed = False
        for s in spans:
            if not s or ENDS_OP.search(s):
                continue
            if len(s) < PROSE_MIN or not HAS_REL.search(s) or not HAS_MATH.search(s):
                reasons['prose fragment'] += 1
                continue
            if s not in ref:
                nonverbatim += 1
                continue
            k = (path, s)
            if k in seen:
                dupes += 1
                continue
            seen.add(k)
            kept.append({'equation': s, 'path': path,
                         'status': 'UNVERIFIED_RECOVERED', 'verbatim': True})
            placed = True
            break
        if not placed:
            reasons['all spans rejected'] += 1

    with open(OUT, 'w', encoding='utf-8') as fh:
        for k in kept:
            fh.write(json.dumps(k, ensure_ascii=False) + '\n')

    print(json.dumps({
        'unverified_in': len(rows),
        'latex_rows': latex_rows,
        'kept': len(kept),
        'junk': reasons['junk'],
        'truncated': reasons['truncated'],
        'duplicates_dropped': dupes,
        'nonverbatim_dropped': nonverbatim,
        'no_span': reasons['no span found'],
        'all_spans_rejected': reasons['all spans rejected'],
        'prose_fragments': reasons['prose fragment'],
        'out': OUT,
    }, indent=1))


if __name__ == '__main__':
    main()