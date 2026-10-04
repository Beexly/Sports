"""Verify markdown-clean.jsonl: clean AND still verbatim against source papers."""
import glob, json, os, random, re
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
Q = os.path.join(HERE, 'mind-queue')
FN = '\u2061'
ZW = '\u200b'

rows = [json.loads(l) for l in open(os.path.join(Q, 'markdown-clean.jsonl'), encoding='utf-8') if l.strip()]
print('MARKDOWN clean rows:', len(rows))

# 1) verbatim: must be a substring of the ORIGINAL wave equation (same paper)
orig = {}
for w in [os.path.join(Q, 'wave-index.jsonl')]:
    for line in open(w, encoding='utf-8', errors='replace'):
        line = line.strip()
        if not line or line.startswith('corpus-roots:'):
            continue
        try:
            r = json.loads(line)
        except Exception:
            continue
        if r.get('equation'):
            orig[r['file'].replace(chr(92), '/')] = orig.get(r['file'].replace(chr(92), '/'), []) + [r['equation']]

bad = 0
cache = {}
for r in rows:
    srcs = orig.get(r['path'])
    if not srcs:
        bad += 1
        continue
    e = r['equation']
    if not any(e in s for s in srcs):
        bad += 1
print('NOT a substring of its original span:', bad)

print('flag verbatim=false              :', sum(1 for r in rows if not r.get('verbatim')))
print('duplicates (path+equation)       :', len(rows) - len({(r['path'], r['equation']) for r in rows}))
print('ends on operator                 :', sum(1 for r in rows if re.search(r'[=<>\u2264\u2265\u2248\u2190:]\s*$', r['equation'])))
print('under 15 chars                   :', sum(1 for r in rows if len(r['equation']) < 15))

# 2) prose still present?
PROSE_RUN = re.compile(r'(?:[A-Za-z]{3,}[\s,]+){2,}[A-Za-z]{3,}')
def leak(eq):
    for m in PROSE_RUN.finditer(eq):
        bare = re.sub(r'\\[A-Za-z]+\{[^}]*\}', ' ', m.group(0))
        bare = re.sub(r'\\[A-Za-z]+', ' ', bare)
        if len(re.findall(r'[A-Za-z]{3,}', bare)) >= 3:
            return m.group(0)[:70]
    return None

leaks = [l for l in (leak(r['equation']) for r in rows) if l]
print('rows with 3+ word prose run     :', len(leaks))
for l in leaks[:8]:
    print('    ', l)

print('\n=== random 10 CLEAN rows (judge by eye) ===')
random.seed(99)
for r in random.sample(rows, 10):
    print('  ', r['equation'][:150].replace('\n', '\\n'))