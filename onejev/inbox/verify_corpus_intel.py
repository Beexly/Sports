"""Independent check of corpus-intelligence.jsonl -- written as a FILE because
bash heredocs mangle backslash escapes."""
import json, os, random, re

Q = 'C:/Users/Garrett/onejev/inbox/mind-queue'
rows = [json.loads(l) for l in open(os.path.join(Q, 'corpus-intelligence.jsonl'),
                                    encoding='utf-8') if l.strip()]
print('rows:', len(rows))

# verbatim against the ORIGINAL file
bad = 0
cache = {}
for r in rows:
    p = r['path']
    if p not in cache:
        try:
            cache.clear()
            cache[p] = open(p, encoding='utf-8', errors='replace').read()
        except Exception:
            cache[p] = None
    if not cache.get(p) or r['equation'] not in cache[p]:
        bad += 1
print('NOT a substring of its source file:', bad)

REL = re.compile(r'(?<![<>!=])=(?![=><])')
MATHY = re.compile(r'[0-9\u03b1-\u03c9\u0391-\u03a9\u2211\u220f\u222b\u2202\u221a]|\\[A-Za-z]{2,}')
PROSE_RUN = re.compile(r'(?:[A-Za-z]{3,}[\s,]+){2,}[A-Za-z]{3,}')


def strip_cmds(s):
    s = re.sub(r'\\[A-Za-z]+\{[^}]*\}', ' ', s)
    return re.sub(r'\\[A-Za-z]+', ' ', s)


prose = 0
for r in rows:
    for m in PROSE_RUN.finditer(r['equation']):
        if len(re.findall(r'[A-Za-z]{3,}', strip_cmds(m.group(0)))) >= 3:
            prose += 1
            break
print('rows with a 3+ word prose run   :', prose)
print('duplicates (path+equation)      :', len(rows) - len({(r['path'], r['equation']) for r in rows}))
print('ends on operator/punct          :', sum(1 for r in rows if re.search(r'[=<>\u2264\u2265\u2248\u2190:,]\s*$', r['equation'])))
print('contains ** markdown            :', sum(1 for r in rows if '**' in r['equation']))
print('unbalanced brackets             :', sum(
    1 for r in rows if not (r['equation'].count('{') == r['equation'].count('}')
                            and r['equation'].count('(') == r['equation'].count(')'))))
print('no relation operator            :', sum(1 for r in rows if not REL.search(r['equation'])))

print('\n=== 12 random rows ===')
random.seed(21)
for r in random.sample(rows, 12):
    print('  ', r['equation'][:125])