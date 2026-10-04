"""Prove the inequality wrapper is strictly additive.

Two checks, both against eq_recover as the authority:
  1. The user's 23 cases must produce IDENTICAL verdicts from the wrapper.
  2. Across real corpus rows, no row may move EQUATION -> anything else.
     The wrapper only runs when the original returns JUNK/no_equation, so a
     regression is structurally impossible -- this measures that it holds.
"""
import json
import os
import sys

HERE = r'C:/Users/Garrett/onejev/inbox'
sys.path.insert(0, HERE)
import eq_recover as base
import eq_recover_ineq as ineq

Q = os.path.join(HERE, 'mind-queue')

CASES = [
    ("\u03b8_i^Bayes = \u03bc + \u03c4\u00b2/(\u03c4\u00b2+\u03c3_1i\u00b2)", "EQUATION"),
    ("auROC = (1/(n\u207b\u207fn\u207a)) \u03a3\u1d62 y\u1d62 s\u1d62\u207b, with s\u1d62\u207b = s", "EQUATION"),
    ("type BrainAnswer = {", "JUNK"),
    ("canonicalHistoryStatus=GREEN", "JUNK"),
    ("L_ij =", "TRUNCATED"),
    ("...\u2202L_ij/\u2202\u03b8", "TRUNCATED"),
    ("Add the ternary/proportional-odds head for markets with draws", "JUNK"),
    ("Q(s)=b_{h,L}(s)P(M<s)+b_{v,L}(s)P(M>s)", "EQUATION"),
    ('className="bg-[var(--eclipse)] border" />', "JUNK"),
    ("entityId=&asOf=", "JUNK"),
    ("pick={pick} />", "JUNK"),
    ("style={{ backgroundColor: '#11161F' }} />", "JUNK"),
    ("const Q = 1", "JUNK"),
    ("let x = 1", "EQUATION"),
    ("Q(s)=" + "b_{h,L}(s)+" * 80, "EQUATION"),
    (r"\hat{C}(p)=\sigma\left(a\cdot logit(p)+b\right)", "EQUATION"),
    (r"\ell(\beta)=\sum_{i<j}\left[y_{ij}\log p_{ij}+(1-y_{ij})\log(1-p_{ij})\right]", "EQUATION"),
    (r"P=\left\{x \mid x>0 \right.", "EQUATION"),
    ("f(x)=(a+b", "TRUNCATED"),
    ("yp =", "TRUNCATED"),
    (r"mu}_{i}^{(g)}(t)=\sum_i x_{i}{\quad\text{", "TRUNCATED"),
    (r"ELO update (Eqs. 5-6): ELO_{i(t+1)} = ELO_{it} + K(O_{ijt} - P_{ijt})", "EQUATION"),
]

print('=== 1. the 23 cases, base vs wrapper ===')
bad = 0
for raw, want in CASES:
    b = base.recover(raw)['status']
    w = ineq.recover(raw)['status']
    same = (b == w)
    ok = (w == want)
    if not (same and ok):
        bad += 1
        print('   MISMATCH want=%s base=%s wrapper=%s  %r' % (want, b, w, raw[:44]))
print('cases: %d   mismatches: %d' % (len(CASES), bad))

print()
print('=== 2. regressions across real corpus rows ===')
POOLS = ['wave-index.jsonl', 'arxiv-clean.jsonl', 'unverified-recoverable.jsonl',
         'git-tree-equations.jsonl', 'markdown-clean-v3.jsonl', 'agree-drain.jsonl',
         'corpus-intelligence-clean.jsonl', 'downloads-research.jsonl']
rows = gains = reg = 0
for name in POOLS:
    p = os.path.join(Q, name)
    if not os.path.exists(p):
        continue
    for line in open(p, encoding='utf-8', errors='replace').read().splitlines():
        line = line.strip()
        if not line:
            continue
        try:
            r = json.loads(line)
        except Exception:
            continue
        eq = str(r.get('equation') or '')
        if not eq:
            continue
        rows += 1
        b = base.recover(eq)['status']
        w = ineq.recover(eq)['status']
        if b == 'EQUATION' and w != 'EQUATION':
            reg += 1
            if reg <= 3:
                print('   REGRESSION: %r' % eq[:88])
        elif b != 'EQUATION' and w == 'EQUATION':
            gains += 1
print(json.dumps({'rows_checked': rows, 'newly_EQUATION': gains,
                  'REGRESSIONS': reg}, indent=1))