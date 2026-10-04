"""Independently verify the subagent's claim: 21.6% of arXiv rows leak prose.

A delegated audit reported that prose bleeds into ~21.6% of wave-93xx rows in a
way that READS AS COMPLETE -- '..., where f_i are probabilities ...' ends on
fluent English, so a terminal-character check passes it. My own verifier only
checked verbatim/JSON/secrets, so it would never have caught this.

This measures it on a fresh sample with a WORD-BASED test (not a character one):
a row is prose-leaking if a run of >=3 consecutive lowercase English words of
length >=3 appears, which is what 'are probabilities such that' looks like and
what '\\sum_{k=1}^{n} x_k' does not.
"""
import glob, json, random, re

WAVES = sorted(glob.glob('C:/Users/Garrett/onejev/inbox/mind-queue/wave-93*.jsonl'))
ROWS = []
for w in WAVES:
    for line in open(w, encoding='utf-8', errors='replace'):
        line = line.strip()
        if not line or line.startswith('corpus-roots:'):
            continue
        try:
            r = json.loads(line)
        except Exception:
            continue
        if r.get('equation'):
            ROWS.append(r)

print('equation rows in corpus:', len(ROWS))

# 3+ consecutive English words (len>=3) = prose, not math
PROSE_RUN = re.compile(r'(?:[A-Za-z]{3,}[\s,]+){2,}[A-Za-z]{3,}')
# mathy connective words that legitimately appear inside LaTeX notes
ALLOW = re.compile(
    r'^\s*(?:the|where|with|and|or|of|for|in|on|at|is|are|to|by)\s*$', re.I)


def prose_leak(eq):
    for m in PROSE_RUN.finditer(eq):
        seg = m.group(0)
        # strip latex commands first: \mathrm{...} etc are not prose
        bare = re.sub(r'\\[A-Za-z]+\{[^}]*\}', ' ', seg)
        bare = re.sub(r'\\[A-Za-z]+', ' ', bare)
        words = re.findall(r'[A-Za-z]{3,}', bare)
        if len(words) >= 3:
            return True, seg.strip()[:80]
    return False, ''


random.seed(4242)
sample = random.sample(ROWS, min(1500, len(ROWS)))
leaks = []
for r in sample:
    bad, seg = prose_leak(r['equation'])
    if bad:
        leaks.append((seg, r['equation']))

print('sampled              :', len(sample))
print('prose leaks          : %d (%.1f%%)' % (len(leaks), 100.0 * len(leaks) / len(sample)))
print()
print('=== 12 leak examples ===')
for seg, eq in leaks[:12]:
    print('  ...%s' % seg)
print()
print('=== 12 full rows judged by eye ===')
for _seg, eq in leaks[:12]:
    print('  %s' % eq[:160].replace('\n', '\\n'))
    print()

# also count table-like rows (\pm standard errors)
tbl = sum(1 for r in sample if r['equation'].count('\\pm') >= 3)
print('table-like (>=3 \\pm) : %d (%.1f%%)' % (tbl, 100.0 * tbl / len(sample)))