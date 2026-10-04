"""Where does the LaTeX span actually END?

arxiv_extract gets 25 equations/paper but the samples are truncated mid-body:
'P_{r,p}(n)=\\int' (integral with no integrand), 'Fixing \\xi = 0' (macro
swallowed, no expression). Cause: LATEX_SPAN stops at the first '.' or ';',
and arXiv math is full of decimal points, abbreviations and '\\\\,' spacing
macros.

This measures real span boundaries before the fix: for each candidate, what
separates it from the next sentence -- '.' '{' newline -- and how much the
current 260-char window is throwing away.
"""
import glob, os, re, sys
from collections import Counter

sys.path.insert(0, r'C:\Users\Garrett\onejev\inbox')
import arxiv_extract as A

files = sorted(glob.glob(os.path.join(A.FT, '*.txt')))[:6]

# What characters immediately follow a LaTeX macro run in real text?
nxt = Counter()
for f in files:
    t = open(f, encoding='utf-8', errors='replace').read().replace(A.FN_APP, '')
    for m in A.LATEX_CMD.finditer(t):
        nxt[t[m.end():m.end() + 1]] += 1

print('character right after a LaTeX macro (top 15):')
for ch, n in nxt.most_common(15):
    print('   %-6r %d' % (ch, n))

# How much text sits between one macro and the next period?
gaps = []
for f in files:
    t = open(f, encoding='utf-8', errors='replace').read().replace(A.FN_APP, '')
    ms = list(A.LATEX_CMD.finditer(t))
    for i in range(min(len(ms) - 1, 400)):
        seg = t[ms[i].end():ms[i + 1].start()]
        if '.' in seg:
            gaps.append(seg.index('.'))
gaps.sort()
if gaps:
    print('\nchars from one macro to the first period: '
          'p10=%d p50=%d p90=%d max=%d'
          % (gaps[len(gaps) // 10], gaps[len(gaps) // 2],
             gaps[len(gaps) * 9 // 10], gaps[-1]))

# Decimal points: how often does '.' sit between two digits (not a boundary)?
dec = 0
for f in files[:3]:
    t = open(f, encoding='utf-8', errors='replace').read()
    dec += len(re.findall(r'\d\.\d', t))
print('\ndecimal points (digit.digit) in 3 papers: %d' % dec)

# The real boundary: a period followed by space + capital, or a newline.
REAL = re.compile(r'(?<=[.!?])\s+(?=[A-Z(\\$])')
print('\nsentence breaks (period+space+capital) in 3 papers:')
for f in files[:3]:
    t = open(f, encoding='utf-8', errors='replace').read()
    print('   %-22s %d' % (os.path.basename(f)[:22], len(REAL.findall(t))))