"""Coverage audit: on-disk docs vs docs present in the cleaned wave index."""
import json, os, glob

Q = 'mind-queue'
SEP = chr(92)  # backslash, kept out of the literal to avoid quoting traps

idx = [json.loads(l) for l in open(f'{Q}/wave-index.jsonl', encoding='utf-8') if l.strip()]
covered = {r.get('file') for r in idx}

mentioned = set()
for wf in glob.glob(f'{Q}/wave-*.jsonl'):
    if 'agreement' in wf or 'index' in wf:
        continue
    for line in open(wf, encoding='utf-8'):
        if not line.strip():
            continue
        if line.startswith('corpus-roots'):
            continue
        if '\tNO_EQUATION' in line:
            p = line.split('\t')[0].strip()
            if p:
                mentioned.add(p)
            continue
        try:
            r = json.loads(line)
        except Exception:
            continue
        if r.get('file'):
            mentioned.add(r['file'])

print('index equations:                          %d' % len(idx))
print('index distinct docs:                      %d' % len(covered))
print('docs ever mentioned (eq + NO_EQUATION):   %d' % len(mentioned))

ROOTS = [
    'C:/Users/Garrett/Sports-wt-engineplan/docs',
    'C:/Users/Garrett/Sports/docs',
    'C:/Users/Garrett/Sports-field-live/docs',
    'C:/Users/Garrett/onejev/docs',
]
SKIP = ('node_modules', '.git', '.next', '.worktrees')


def walk(root, exts=('.md', '.txt')):
    out = []
    for dp, dn, fn in os.walk(root):
        dn[:] = [d for d in dn if d not in SKIP]
        for f in fn:
            if f.endswith(exts):
                out.append(os.path.normpath(os.path.join(dp, f)).replace(SEP, '/'))
    return out


grand_total = 0
missing_total = 0
per_root = {}
for r in ROOTS:
    if not os.path.isdir(r):
        print('\n%s  [MISSING ROOT]' % r)
        continue
    fs = walk(r)
    miss = [f for f in fs if f not in covered]
    per_root[r] = miss
    grand_total += len(fs)
    missing_total += len(miss)
    print('\n%s' % r)
    print('  docs on disk: %d   covered: %d   MISSING: %d' % (len(fs), len(fs) - len(miss), len(miss)))

print('\nTOTAL docs on disk across roots: %d' % grand_total)
print('TOTAL missing from index:        %d' % missing_total)

# bucket the misses so they can be banded into waves
buckets = {}
for r, miss in per_root.items():
    for f in miss:
        d = os.path.dirname(f)
        rel = d[len(r):].lstrip(SEP).replace(SEP, '/') or '(root)'
        buckets.setdefault(rel, []).append(f)
print('\nMISSING DOCS BY SUBDIR:')
for k in sorted(buckets, key=lambda k: -len(buckets[k])):
    print('  %-62s %d' % (k, len(buckets[k])))

with open('missing_docs.json', 'w', encoding='utf-8') as fh:
    json.dump({'per_root': per_root, 'buckets': buckets,
               'total_missing': missing_total}, fh, indent=1)
print('\nwrote missing_docs.json')
