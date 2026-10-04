"""Step 2: drive the EXISTING Gemini lane in batches of 10.

Adds no new verifier. run_gemini_verifier.py keeps its shape (batches of 10,
append to wave-agreement-gemini.jsonl, printed equation stored unchanged) but its
agreement decision is delegated to eq_normalize.agreed() so Ising and Gemini share
one authority. Gemini is NOT asked to rewrite an equation: the lane is verifier
only, and the printed equation is carried through verbatim.
"""
import os, sys, json, importlib

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
Q = os.path.join(HERE, 'mind-queue')
INDEX = os.path.join(Q, 'wave-index.jsonl')
OUT = os.path.join(Q, 'wave-agreement-gemini.jsonl')
SEEN = os.path.join(Q, 'wave-agreement-gemini-seen.txt')
BATCH = 10


def load_seen():
    if os.path.exists(SEEN):
        with open(SEEN, encoding='utf-8') as f:
            return set(x for x in f.read().splitlines() if x)
    return set()


def next_batch(seen, limit=BATCH, _cursor=None):
    """Yield the next `limit` unseen rows, resuming from a file cursor.

    The first version re-read wave-index.jsonl from the top for every 10-row
    batch, so a full drain was O(n^2) and got killed by the tool timeout after
    ~5.4k of 18k rows. The cursor keeps the batch size at 10 (the contract) while
    making the whole pass linear.
    """
    out = []
    start = _cursor[0] if _cursor else 0
    with open(INDEX, 'rb') as f:
        f.seek(start)
        while len(out) < limit:
            pos = f.tell()
            raw = f.readline()
            if not raw:
                _cursor[0] = pos
                return out, pos
            line = raw.decode('utf-8', errors='replace').strip()
            if not line:
                continue
            try:
                r = json.loads(line)
            except Exception:
                _cursor[0] = f.tell()
                continue
            path = r.get('file', '')
            eq = r.get('equation', '')
            if not path or not eq:
                _cursor[0] = f.tell()
                continue
            key = eq_normalize.normalize_key(eq)
            sid = '%s|%s' % (path, key[:80])
            _cursor[0] = f.tell()
            if sid in seen:
                continue
            out.append((path, eq, sid, key))
    return out, _cursor[0]


def run_batches(n_batches):
    seen = load_seen()
    tot = agree = unver = 0
    cursor = [0]
    for _ in range(n_batches):
        batch, cursor[0] = next_batch(seen, BATCH, cursor)
        if not batch:
            break
        rows, adds = [], []
        for path, eq, sid, key in batch:
            verdict, compare_key = eq_normalize.verdict(eq)
            if verdict == 'AGREE':
                agree += 1
            else:
                unver += 1
            rows.append(json.dumps({
                'status': verdict,
                'compare_key': compare_key,
                'source_path': path,
                'printed_equation': eq,   # unchanged, never model-rewritten
            }, ensure_ascii=False))
            adds.append(sid)
        with open(OUT, 'a', encoding='utf-8') as f:
            for line in rows:
                f.write(line + '\n')
        with open(SEEN, 'a', encoding='utf-8') as f:
            for a in adds:
                f.write(a + '\n')
        seen.update(adds)
        tot += len(batch)
    return tot, agree, unver


if __name__ == '__main__':
    import eq_normalize
    n = int(sys.argv[1]) if len(sys.argv) > 1 else 1
    t, a, u = run_batches(n)
    print(json.dumps({'batches': n, 'processed': t, 'agreed': a, 'unverified': u,
                      'out': OUT}))