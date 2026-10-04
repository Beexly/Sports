"""Is the arxiv-sweep fulltext corpus genuinely unextracted?

1,113 .txt papers / 85MB live at _research/agent-bus/research/arxiv-sweep/fulltext,
outside both swept roots. Only a handful of index rows mention arxiv-sweep, so
this measures the real gap and samples the math density waiting there.
"""
import glob, json, os, random

HERE = os.path.dirname(os.path.abspath(__file__))
FT = 'C:/Users/Garrett/_research/agent-bus/research/arxiv-sweep/fulltext'
SEP = chr(92)

files = sorted(glob.glob(os.path.join(FT, '*.txt')))
print('arxiv fulltext .txt files :', len(files))

idx = set()
with open(os.path.join(HERE, 'mind-queue', 'wave-index.jsonl'), encoding='utf-8') as fh:
    for line in fh:
        line = line.strip()
        if not line:
            continue
        try:
            r = json.loads(line)
        except Exception:
            continue
        if r.get('file'):
            idx.add(r['file'].replace(SEP, '/'))

seen = [f for f in files if f.replace(SEP, '/') in idx]
print('already in wave index    :', len(seen))
print('NEVER extracted         :', len(files) - len(seen))

total_bytes = 0
for f in files:
    try:
        total_bytes += os.path.getsize(f)
    except Exception:
        pass
print('total bytes              : %.1f MB' % (total_bytes / 1048576.0))

rng = random.Random(2)
smp = rng.sample(files, min(12, len(files)))
print("\n'=' density in a 12-paper sample:")
tot = 0
ok = 0
for f in smp:
    try:
        t = open(f, encoding='utf-8', errors='replace').read()
    except Exception:
        continue
    n = t.count('=')
    tot += n
    ok += 1
    print('   %6d  %s' % (n, os.path.basename(f)[:46]))
print('   mean equals-signs per paper: %d' % (tot // max(1, ok)))

# rough extrapolation of the prize
mean_eq = tot / max(1, ok)
print('\nextrapolated equations waiting: ~%d' % int(mean_eq * len(files)))