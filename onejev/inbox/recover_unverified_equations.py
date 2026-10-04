"""Second recovery pass: equations hidden inside UNVERIFIED agreement rows.

All 15,488 UNVERIFIED rows fail eq_normalize.is_clean_equation, which counts long
English words and rejects any row with more than 4. Reading a sample shows the
equation is present and the row merely carries a gloss:

    'auROC = (1/(n\u207b\u207a)) \u03a3\u1d62 y\u1d62 s\u1d62\u207b, with s\u1d62\u207b = \u03a3_{i\u2032<i}(1\u2212y_{i\u2032}), n\u207b/n\u207a class counts'
    'Home indicator (Eq. 1 context): h_ijr = 1 (home i), 0 (neutral), \u22121 (home j).'

Both are real equations. This pass extracts the equation span VERBATIM, then
re-judges the span alone through the same eq_normalize.agreed() authority.

Same integrity rule as the first pass: every emitted equation must be a literal
substring of its source row. Fragments ending on a bare operator are rejected.
"""
import json, os, re, sys
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import eq_normalize as E
from falsify_index_v2 import REL, MATHY, balanced

SRC = os.path.join(HERE, 'mind-queue', 'wave-agreement-gemini.jsonl')
OUT = os.path.join(HERE, 'mind-queue', 'wave-agreement-recovered.jsonl')

# Word-ish glosses that follow a complete equation. Must also catch a sentence
# starting mid-gloss ('Key consequence stated in ...'), which the GLOSS list
# missed and which left '... ∂L_ij/∂θ. Key consequence stated in'.
GLOSS = re.compile(
    r'\s*,?\s*(?:with|where|so|thus|hence|and|class counts|defaults?|the \w+|'
    r'e\.g\.|i\.e\.|as (?:in|of|of the)|defined (?:by|as)|'
        r'α = 0\.95|per market|week(?:ly)?|report)\b', re.I)
# A trailing prose sentence: capitalised word run with no operator, right after a
# full stop. Cut it so the equation ends cleanly.
TRAIL_PROSE = re.compile(r'(?<=\.)\s+(?=[A-Z][a-z]{2,}\s+[a-z]{2,}(?:\s+[a-z]{2,}){1,6}\s*$)')
LEAD_LABEL = re.compile(
    r'^\s*(?:\*\*)?[A-Z][\w\s/\-\(\)]{2,60}(?:\([^)]*\))?(?:\*\*)?\s*:\s*')
CONNECT = re.compile(r'\b(?:with|where|which|and then|so that|because|given that|'
                     r'the \w+ (?:is|are|carries|returns))\b', re.I)


def split_equation(eq):
    """Return verbatim equation spans from one row."""
    t = eq.strip()
    out = []
    # Drop a trailing prose sentence that survived sentence splitting, e.g.
    # '... ∂L_ij/∂θ. Key consequence stated in' -> keep only the equation.
    t = TRAIL_PROSE.sub('', t)

    # 1) strip a leading label like 'Home indicator (Eq. 1 context): '
    body = LEAD_LABEL.sub('', t, count=1)
    for cand in (t, body):
        cand = cand.strip()
        if not cand or len(cand) > 800:
            continue
        # cut the trailing gloss
        cut = GLOSS.split(cand)[0].strip()
        for piece in {cand, cut}:
            piece = piece.strip(' ,;')
            if not piece:
                continue
            if re.search(r'[=<>\u2264\u2265\u2248\u2190]$', piece):
                continue
            if not REL.search(piece) and not any(o in piece for o in ('\u2264', '\u2265', '\u2248', '\u2190')):
                continue
            if not MATHY.search(piece):
                continue
            if not balanced(piece):
                continue
            if piece not in out:
                out.append(piece)

    # Final sweep: drop any span with a trailing English clause that carries no
    # operator -- '... ∂L_ij/∂θ. Key consequence stated in' is truncated
    # mid-sentence and reads as complete, which is the dangerous failure mode.
    cleaned = []
    for piece in out:
        m = re.search(r'([.;]\s+)([A-Z][a-z]{2,}(?:\s+[a-z]{2,}){2,}\s*)$', piece)
        if m and '=' not in m.group(2):
            head = piece[:m.start()].strip()
            if len(head) > 8:
                cleaned.append(head)
                continue
        cleaned.append(piece)
    return cleaned

    # 2) sentence-level: split on '. ' and test each sentence, keeping the one
    #    that is equation-shaped even if the whole row was not
    for sent in re.split(r'(?<=\.)\s+(?=[A-Z*])', t):
        sent = sent.strip(' ,;')
        if not sent or len(sent) > 500:
            continue
        if re.search(r'[=<>\u2264\u2265\u2248]$', sent):
            continue
        if not REL.search(sent):
            continue
        if not MATHY.search(sent):
            continue
        if not balanced(sent):
            continue
        # sentence must not be mostly English
        words = re.findall(r'[A-Za-z]{4,}', sent)
        if len(words) > 12:
            continue
        if sent not in out:
            out.append(sent)
    return out


def main():
    src_rows = []
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
                src_rows.append(r)

    kept, dupes, nonverbatim = [], 0, 0
    reasons = Counter()
    seen_out = set()          # dedupe: same path+equation recovered twice
    for r in src_rows:
        got = split_equation(r['printed_equation'])
        if not got:
            reasons['no equation span found'] += 1
            continue
        for g in got:
            if g not in r['printed_equation']:
                nonverbatim += 1
                continue
            verdict, compare_key = E.verdict(g)
            if verdict != 'AGREE':
                reasons['span still UNVERIFIED'] += 1
                continue
            dedupe_key = (r.get('source_path'), g)
            if dedupe_key in seen_out:
                dupes += 1
                continue
            seen_out.add(dedupe_key)
            kept.append({
                'status': verdict,
                'compare_key': compare_key,
                'source_path': r.get('source_path'),
                'printed_equation': g,
                'recovered_from': 'UNVERIFIED prose-bundled row',
            })

    with open(OUT, 'w', encoding='utf-8') as fh:
        for r in kept:
            fh.write(json.dumps(r, ensure_ascii=False) + '\n')

    print(json.dumps({
        'input_unverified_rows': len(src_rows),
        'recovered_agree': len(kept),
        'nonverbatim_rejected': nonverbatim,
        'duplicates_dropped': dupes,
        'reasons': dict(reasons),
        'out': OUT,
    }, indent=1))

    print('\n--- samples (must be verbatim + complete equations) ---')
    for r in kept[:12]:
        print('  ', r['printed_equation'][:120])


if __name__ == '__main__':
    main()