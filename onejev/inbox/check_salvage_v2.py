"""Integrity check for unverified-recoverable.jsonl. Written as a FILE because
bash heredocs mangle backslash escapes like \\leq into a bad-escape error."""
import json, re, sys

ROWS = 'C:/Users/Garrett/onejev/inbox/mind-queue/unverified-recoverable.jsonl'
REL = re.compile(r'[=<>\u2264\u2265\u2248\u2190]|:=|\\to|\\rightarrow|\\le\\b|\\ge\\b|\\approx')
MATHY = re.compile(r'[0-9\u03b1-\u03c9\u0391-\u03a9\u2211\u220f\u222b\u2202\u221a]|\\[A-Za-z]{2,}')

rows = [json.loads(l) for l in open(ROWS, encoding='utf-8') if l.strip()]
print('rows                      :', len(rows))
print('unique path+equation      :', len({(r['path'], r['equation']) for r in rows}))
print('duplicates                :', len(rows) - len({(r['path'], r['equation']) for r in rows}))
print('ends on operator          :', sum(1 for r in rows if re.search(r'[=<>\u2264\u2265\u2248\u2190:]\s*$', r['equation'])))
print('leading ellipsis          :', sum(1 for r in rows if r['equation'].lstrip().startswith(('...', '\u2026'))))
print('under 15 chars            :', sum(1 for r in rows if len(r['equation']) < 15))
print('no relation operator      :', sum(1 for r in rows if not REL.search(r['equation'])))
print('no math token             :', sum(1 for r in rows if not MATHY.search(r['equation'])))
print('missing path              :', sum(1 for r in rows if not r.get('path')))
print('verbatim flag false       :', sum(1 for r in rows if not r.get('verbatim')))
print('row keys                  :', sorted(rows[0].keys()) if rows else 'EMPTY')

import random
random.seed(11)
print('\n=== random 10 ===')
for r in random.sample(rows, min(10, len(rows))):
    print('  ', r['equation'][:120])