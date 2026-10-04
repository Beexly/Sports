"""Dump the 880 rows the INDEPENDENT verifier still flags as prose.

My writer says 0 remaining; the verifier says 880. When two checks disagree I
must look at the actual rows, not pick the flattering number.
"""
import json, os, re

Q = 'C:/Users/Garrett/onejev/inbox/mind-queue'
rows = [json.loads(l) for l in open(os.path.join(Q, 'markdown-clean-final.jsonl'),
                                    encoding='utf-8') if l.strip()]

PROSE_RUN = re.compile(r'(?:[A-Za-z]{3,}[\s,]+){2,}[A-Za-z]{3,}')


def strip_cmds(s):
    s = re.sub(r'\\[A-Za-z]+\{[^}]*\}', ' ', s)
    return re.sub(r'\\[A-Za-z]+', ' ', s)


flagged = []
for r in rows:
    for m in PROSE_RUN.finditer(r['equation']):
        bare = strip_cmds(m.group(0))
        if len(re.findall(r'[A-Za-z]{3,}', bare)) >= 3:
            flagged.append((m.group(0)[:60], r['equation']))
            break

print('rows:', len(rows))
print('flagged by verifier:', len(flagged))
print()
print('=== ALL flagged rows, full text ===')
for seg, eq in flagged:
    print('  %r' % eq[:150])
    print()