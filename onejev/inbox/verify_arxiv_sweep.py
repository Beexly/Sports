"""Independent verification of the arXiv sweep output.

Trusts nothing arxiv_sweep_all.py reported. Re-reads the waves from disk and
checks, per row: valid JSON, equation present, VERBATIM substring of the source
paper on disk, balanced, has a relation operator, and no secrets. Also confirms
paper coverage (1,113 files, every one accounted for).
"""
import glob, json, os, re, sys

HERE = os.path.dirname(os.path.abspath(__file__))
Q = os.path.join(HERE, 'mind-queue')
FT = 'C:/Users/Garrett/_research/agent-bus/research/arxiv-sweep/fulltext'
SEP = chr(92)
sys.path.insert(0, HERE)
import arxiv_extract as A

waves = sorted(glob.glob(os.path.join(Q, 'wave-93*.jsonl')))
print('wave files:', len(waves))

paper_cache = {}


def norm_source(path):
    if path not in paper_cache:
        try:
            raw = open(path, encoding='utf-8', errors='replace').read()
        except Exception:
            paper_cache[path] = None
        else:
            paper_cache[path] = raw.replace(A.FN_APP, '').replace('\u200b', '')
    return paper_cache[path]


n_rows = n_eq = n_noeq = n_bad_json = 0
n_verbatim = 0
n_unbalanced = 0
n_no_relation = 0
n_nonverbatim = 0
n_secret = 0
papers_seen = set()
bad_samples = []
nv_samples = []

for wf in waves:
    for line in open(wf, encoding='utf-8'):
        line = line.strip()
        if not line or line.startswith('corpus-roots:'):
            continue
        n_rows += 1
        try:
            r = json.loads(line)
        except Exception:
            n_bad_json += 1
            continue
        f = r.get('file')
        if f:
            papers_seen.add(f)
        eq = r.get('equation')
        if not eq:
            n_noeq += 1
            continue
        n_eq += 1
        src = norm_source(f)
        if src is not None and eq in src:
            n_verbatim += 1
        else:
            n_nonverbatim += 1
            if len(nv_samples) < 5:
                nv_samples.append((os.path.basename(f or '?'), eq[:110]))
        if A._balanced(eq):
            pass
        else:
            n_unbalanced += 1
        if not (A.REL.search(eq) or any(o in eq for o in ('≤', '≥', '≈', ':='))):
            n_no_relation += 1
        if A.SECRET.search(eq):
            n_secret += 1
            bad_samples.append(('SECRET', eq[:80]))

print(json.dumps({
    'total_rows': n_rows,
    'equation_rows': n_eq,
    'no_equation_or_status_rows': n_noeq,
    'invalid_json': n_bad_json,
    'VERBATIM': n_verbatim,
    'NOT_verbatim': n_nonverbatim,
    'unbalanced': n_unbalanced,
    'no_relation_operator': n_no_relation,
    'secrets': n_secret,
    'distinct_papers': len(papers_seen),
}, indent=1))

on_disk = {p.replace(SEP, '/') for p in glob.glob(os.path.join(FT, '*.txt'))}
print('\npapers on disk:', len(on_disk))
print('papers covered by waves:', len(papers_seen))
print('papers with NO row:', len(on_disk - papers_seen))
missing = sorted(os.path.basename(p) for p in (on_disk - papers_seen))
if missing:
    print('  first 10 missing:', missing[:10])

if nv_samples:
    print('\n--- non-verbatim samples ---')
    for b, s in nv_samples:
        print('  %-24s %r' % (b, s))