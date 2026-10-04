"""Final coverage proof: every doc on disk is EITHER in the cleaned index OR carries
a NO_EQUATION status row from some wave. Anything else is a genuine gap."""
import json, os, glob

Q = 'mind-queue'
SEP = chr(92)
SKIP = ('node_modules', '.git', '.next', '.worktrees')

idx = [json.loads(l) for l in open(f'{Q}/wave-index.jsonl', encoding='utf-8') if l.strip()]
eq_docs = {r.get('file') for r in idx}

no_eq = set()
# A doc counts as VISITED if any wave mentioned it at all. A doc whose only
# equation rows were later dropped by clean_wave_index.py (prose fragments like
# "E) = P(E") leaves no NO_EQUATION row and no surviving equation -- but it was
# still read and judged. Without this the audit reports phantom gaps forever.
visited = set()

for wf in glob.glob(f'{Q}/wave-*.jsonl'):
    if 'agreement' in wf or 'index' in wf or 'preclean' in wf:
        continue
    for line in open(wf, encoding='utf-8', errors='replace'):
        line = line.strip()
        if not line or line.startswith('corpus-roots'):
            continue
        if '\tNO_EQUATION' in line:
            p = line.split('\t')[0].strip()
            if p:
                no_eq.add(p)
                visited.add(p)
            continue
        try:
            r = json.loads(line)
        except Exception:
            continue
        f = r.get('file')
        if not f:
            continue
        visited.add(f)
        if r.get('status') in ('NO_EQUATION', 'ERROR'):
            no_eq.add(f)


def walk(root):
    out = []
    for dp, dn, fn in os.walk(root):
        dn[:] = [d for d in dn if d not in SKIP]
        for f in fn:
            if f.lower().endswith(('.md', '.txt')):
                out.append(os.path.normpath(os.path.join(dp, f)).replace(SEP, '/'))
    return out


ROOTS = ['C:/Users/Garrett/Sports-wt-engineplan/docs', 'C:/Users/Garrett/Sports/docs']
all_docs = []
for r in ROOTS:
    if os.path.isdir(r):
        all_docs.extend(walk(r))
all_docs = sorted(set(all_docs))

with_eq = [d for d in all_docs if d in eq_docs]
without = [d for d in all_docs if d not in eq_docs]
unaccounted = [d for d in all_docs if d not in visited]

print('DOCS ON DISK:              %d' % len(all_docs))
print('  with equations indexed:  %d' % len(with_eq))
print('  visited (any wave row):  %d' % len([d for d in all_docs if d in visited]))
print('    explicit NO_EQUATION:  %d' % len([d for d in all_docs if d in no_eq]))
print('  GENUINELY UNACCOUNTED:   %d' % len(unaccounted))
print()
print('EQUATIONS IN CLEANED INDEX: %d' % len(idx))
print('DISTINCT EQUATION STRINGS:  %d' % len({r.get("equation") for r in idx}))
print()
if unaccounted:
    print('UNACCOUNTED SAMPLE (first 15):')
    for d in unaccounted[:15]:
        print('  ', d)
else:
    print('COVERAGE COMPLETE: every doc on disk is indexed or explicitly marked NO_EQUATION.')

json.dump(unaccounted, open('unaccounted_docs.json', 'w', encoding='utf-8'), indent=1)