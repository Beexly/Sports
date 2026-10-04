"""Which acceptable() test is rejecting every arXiv equation?

arxiv_extract.py returned 0 equations on 25 papers. Every plausible candidate
failed somewhere. This walks the pipeline and reports the FIRST test that kills
each candidate, so the fix targets the real blocker instead of a guess.
"""
import glob, json, os, re, sys
from collections import Counter

sys.path.insert(0, r'C:\Users\Garrett\onejev\inbox')
import arxiv_extract as A

FT = A.FT
files = sorted(glob.glob(os.path.join(FT, '*.txt')))[:8]

why = Counter()
examples = {}


def note(reason, span):
    why[reason] += 1
    if reason not in examples:
        examples[reason] = A.clean_span(span)[:150]


for f in files:
    t = open(f, encoding='utf-8', errors='replace').read().replace(A.FN_APP, '')
    cands = []
    for sent in A.SENT_BREAK.split(t):
        m = A.LATEX_SPAN.search(sent)
        if m:
            cands.append(sent[max(0, m.start() - 40):m.end()])
    for sent in A.SENT_BREAK.split(t):
        if not A.LATEX_CMD.search(sent):
            for m in A.REL.finditer(sent):
                cands.append(sent[max(0, m.start() - 60):m.end()])
                break

    for span in cands[:40]:
        s = A.clean_span(span)
        if len(s) < 8:
            note('too short', span); continue
        if len(s) > 320:
            note('too long', span); continue
        if A.JUNK.search(s):
            note('junk pattern', span); continue
        if s.endswith(('=', '+', '-', '*', '/', ',')):
            note('ends on operator', span); continue
        if not A.REL.search(s) and not any(o in s for o in ('≤', '≥', '≈', '←', ':=')):
            note('no relation operator', span); continue
        if not A.MATHY.search(s):
            note('no math evidence', span); continue
        if ('(' in s or '{' in s) and not A._balanced(s):
            note('unbalanced brackets', span); continue
        if len(re.findall(r'[A-Za-z]{4,}', s)) > 8:
            note('too many prose words', span); continue
        note('ACCEPTED', span)

print(json.dumps(dict(sorted(why.items(), key=lambda kv: -kv[1])), indent=1))
print('\n--- one example per rejection reason ---')
for k in sorted(examples, key=lambda k: -why[k]):
    print('\n[%s] n=%d' % (k, why[k]))
    print('   %r' % examples[k])