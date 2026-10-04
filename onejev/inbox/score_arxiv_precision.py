"""Measure arxiv_extract PRECISION, not just yield.

932 equations from 25 papers (37/paper) would extrapolate to ~41,500 -- but the
12 printed samples are mixed: some are complete equations, some are bare macros
('\\\\lambda=\\u27e8n\\u27e9'), some still carry prose. Yield alone is misleading.

This scores a random sample on four objective checks a human can audit:
  A. contains a LaTeX macro or Greek/symbol (it is math, not prose)
  B. has a relation operator
  C. is balanced
  D. VERBATIM: the span is an exact substring of its source paper
and reports the four buckets so the real yield can be judged, not assumed.
"""
import glob, json, os, random, re, sys
from collections import Counter

sys.path.insert(0, r'C:\Users\Garrett\onejev\inbox')
import arxiv_extract as A

N = int(sys.argv[1]) if len(sys.argv) > 1 else 60
files = sorted(glob.glob(os.path.join(A.FT, '*.txt')))
rng = random.Random(11)
pick = rng.sample(files, min(N, len(files)))

buckets = Counter()
per_paper = []
samples = {k: [] for k in ('clean', 'macro_only', 'prose_bleed', 'no_relation', 'unbalanced')}

for f in pick:
    raw = open(f, encoding='utf-8', errors='replace').read()
    # extract() normalizes the source (U+2061, U+200B removed). Verbatim must be
    # judged against the SAME normalized text, or every span looks non-verbatim.
    t = raw.replace(A.FN_APP, '').replace('\u200b', '')
    rows = A.extract(raw)
    per_paper.append(len(rows))
    for r in rows:
        s = r['equation']
        has_macro = bool(A.LATEX_CMD.search(s))
        has_sym = bool(re.search(r'[α-ωΑ-Ω∑∏∫∂√≈≤≥≠]', s))
        has_rel = bool(A.REL.search(s)) or any(o in s for o in ('≤', '≥', '≈', ':='))
        balanced = A._balanced(s)
        verbatim = s in t
        prose = len(re.findall(r'[A-Za-z]{4,}', s))

        if not has_macro and not has_sym:
            b = 'not_math'
        elif not has_rel:
            b = 'no_relation'
        elif not balanced:
            b = 'unbalanced'
        elif prose > 8:
            b = 'prose_bleed'
        elif re.fullmatch(r'\\[A-Za-z]{2,}(\{[^{}]*\})?', s) and len(s) < 40:
            b = 'macro_only'
        else:
            b = 'clean'
        buckets[b] += 1
        if not verbatim:
            buckets['NON_VERBATIM'] += 1
        if len(samples[b]) < 4:
            samples[b].append(s[:130])

total = sum(v for k, v in buckets.items() if k != 'NON_VERBATIM')
print(json.dumps({
    'papers_sampled': len(pick),
    'equations': total,
    'mean_per_paper': round(total / max(1, len(pick)), 1),
    'extrapolated_to_1113': int((total / max(1, len(pick))) * 1113),
    'buckets': dict(buckets),
    'NON_VERBATIM': buckets['NON_VERBATIM'],
}, indent=1))
for b in sorted(k for k in samples if samples[k]):
    if samples[b]:
        print('\n[%s]' % b)
        for s in samples[b]:
            print('   %r' % s)