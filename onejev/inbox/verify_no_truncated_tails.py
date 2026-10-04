"""Independent verification of git-tree-equations.jsonl.

Deliberately does NOT reuse corpus_gate.classify for the tail test -- it builds
its own regex from the stated rule so the check is independent of the code that
wrote the file. A gate that audits itself proves nothing.
"""
import json
import re
import sys

sys.path.insert(0, r'C:/Users/Garrett/onejev/inbox')
from corpus_gate import classify

POOL = r'C:/Users/Garrett/onejev/inbox/mind-queue/git-tree-equations.jsonl'

# "A row that ends on =, \text{, \mathrm{, or a bare backslash is truncated."
TAIL = re.compile(r'(?:=\s*|\\(?:text|mathrm|operatorname)\{\s*|\\\s*)$')

rows = []
for line in open(POOL, encoding='utf-8', errors='replace').read().splitlines():
    line = line.strip()
    if line:
        rows.append(json.loads(line))

seen = set()
dups = 0
for r in rows:
    k = (r.get('path'), r.get('equation'))
    if k in seen:
        dups += 1
    seen.add(k)

tails = [r['equation'] for r in rows if TAIL.search(str(r.get('equation') or '').rstrip())]

print(json.dumps({
    'rows': len(rows),
    'dup_path_plus_equation': dups,
    'ends_on_operator_or_text_or_backslash': len(tails),
    'missing_path': sum(1 for r in rows if not r.get('path')),
    'non_real_math_on_reclassify': sum(
        1 for r in rows
        if classify(str(r.get('equation') or ''), str(r.get('path') or '')) != 'real_math'
    ),
}, indent=1))

for t in tails[:6]:
    print('   TAIL:', repr(t[:92]))

lens = sorted(len(str(r.get('equation') or '')) for r in rows)
print('len p50/p90/max: %d/%d/%d' % (
    lens[len(lens) // 2], lens[int(len(lens) * 0.9)], lens[-1]))