"""Recover equations from prose-mixed rows.

8,534 rows were classified as "equation bundled with prose". The equation is
already in the text; the ROW SHAPE is wrong. This extracts the equation spans
without rewriting them: each output row is a verbatim substring of its input.

Rules that keep this honest:
  * Output text is a literal slice of the input. No normalization, no repair.
  * A slice is only emitted if its own brackets balance and it has a relation
    operator with math on both sides.
  * Rows that yield nothing are reported, not silently dropped.
"""
import json, os, re, sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from falsify_index_v2 import REL, MATHY, balanced

SRC = os.path.join(HERE, 'mind-queue', 'corpus-prose-mixed.jsonl')
OUT = os.path.join(HERE, 'mind-queue', 'corpus-recovered.jsonl')
REPORT = os.path.join(HERE, 'mind-queue', 'corpus-recovered-report.json')

# A sentence break followed by something that starts like prose.
BREAK = re.compile(r'(?<=[.;])\s+(?=[A-Z(])|\s--\s|\s—\s|\s\|\s')


def spans(text):
    """Yield verbatim equation substrings from a prose-bundled row."""
    out = []
    # split on sentence/markdown breaks, then test each chunk AND its
    # relation-operator sub-slices
    # Long-form equations are legitimate: 'P(n|S) = u_n·V_n(S) / (1 + Σ_{m∈N} u_m·V_m(S))'
    # runs past 400 chars with the paper's own gloss attached, and the 400 cap
    # silently dropped 2,678 real rows in the first pass. Raise the ceiling and,
    # when a chunk is still too long, take its balanced head rather than nothing.
    MAXLEN = 1000
    for chunk in BREAK.split(text):
        c = chunk.strip()
        if not c:
            continue
        if len(c) > MAXLEN:
            c = c[:MAXLEN]
        if not any(op in c for op in ('=', '←', '≤', '≥', '≈')):
            continue
        cands = [c]
        for m in REL.finditer(c):
            # extend the operator's slice until a break inside the chunk
            lhs_start = 0
            for br in BREAK.finditer(c):
                if br.end() <= m.start():
                    lhs_start = br.end()
            frag = c[lhs_start:].strip()
            # cut trailing prose after the equation: a comma-space followed by
            # lowercase words and no operator
            cut = re.split(r',(?=\s+[a-z]{3,}\s+[a-z]{3,}\s+[a-z]{3,})', frag)[0]
            cands.insert(0, cut.strip())
        for cand in cands:
            cand = cand.strip(' ,;')
            if not cand or len(cand) > MAXLEN:
                continue
            # Reject anything ending on a bare relation operator: that is a
            # fragment, not an equation, no matter how well it scored above.
            if re.search(r'[=<>≤≥≈←:]$', cand):
                continue
            # An equation needs content on BOTH sides of the operator.
            if not REL.search(cand):
                if not any(o in cand for o in ('≤', '≥', '≈', '←')):
                    continue
            else:
                rhs = cand.split('=', 1)[1].strip()
                if len(rhs) < 2 or rhs in ('(', '[', '{'):
                    continue
            if not MATHY.search(cand):
                continue
            if not balanced(cand):
                # Do NOT truncate to a balanced prefix. That emitted fragments like
                # 'Bradley-Terry-Élő log-odds: L_ij =' -- a truncated row is worse
                # than a rejected one, because it looks like a complete equation
                # downstream. A row with unbalanced brackets stays UNRECOVERED.
                continue
            words = len(re.findall(r'[A-Za-z]{4,}', cand))
            if words > 10:
                continue
            if cand not in out:
                out.append(cand)
    return out


def main():
    rows = []
    with open(SRC, encoding='utf-8') as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except Exception:
                continue

    kept = []
    yielded_none = 0
    reasons = Counter()
    for r in rows:
        eq = r.get('equation', '')
        got = spans(eq)
        if not got:
            yielded_none += 1
            reasons['no balanced span'] += 1
            continue
        for g in got:
            # verbatim check: the recovered span MUST be a literal substring
            if g not in eq:
                reasons['NON-VERBATIM-REJECTED'] += 1
                continue
            kept.append({'file': r.get('file'), 'equation': g,
                         'from_mixed_row': True, 'source_len': len(eq)})

    with open(OUT, 'w', encoding='utf-8') as fh:
        for r in kept:
            fh.write(json.dumps(r, ensure_ascii=False) + '\n')

    report = {
        'input_rows': len(rows),
        'recovered_spans': len(kept),
        'rows_yielding_none': yielded_none,
        'spans_per_row': round(len(kept) / max(1, len(rows)), 2),
        'nonverbatim_rejected': reasons['NON-VERBATIM-REJECTED'],
        'out': OUT,
    }
    with open(REPORT, 'w', encoding='utf-8') as fh:
        json.dump(report, fh, indent=1)
    print(json.dumps(report, indent=1))

    print('\n--- recovered samples (verify verbatim) ---')
    for r in kept[:10]:
        ok = r['equation'] in next(
            (x['equation'] for x in rows if x.get('file') == r['file']
             and r['equation'] in x.get('equation', '')), '')
        print('  %s %s' % ('VERBATIM' if ok else 'CHECK   ', r['equation'][:110]))


if __name__ == '__main__':
    main()