"""Extract the residual 220 docs that no wave ever visited.

The 9100 sweep skipped docs listed in wave-seen-docs.txt, but that file was seeded
from wave-file rows only. A doc whose earlier wave row was lost (rewrite race, or a
wave file deleted mid-session) looked unseen and should have been extracted -- yet
also carries no NO_EQUATION status row, so it is invisible downstream. This closes
that class: read the explicit unaccounted list, run the SAME proven gate, write a
fresh free band.
"""
import json, os, sys, importlib.util

HERE = os.path.dirname(os.path.abspath(__file__))
QUEUE = os.path.join(HERE, 'mind-queue')
WAVE0 = 9200  # free band, past 9153
CHUNK = 40

spec = importlib.util.spec_from_file_location('w9100', os.path.join(HERE, 'wave_extract_9100.py'))
mod = importlib.util.module_from_spec(spec)
sys.modules['w9100'] = mod
spec.loader.exec_module(mod)

docs = [d for d in json.load(open(os.path.join(HERE, 'unaccounted_docs.json'), encoding='utf-8'))
        if os.path.isfile(d)]
print('residual docs on disk: %d' % len(docs))

chunks = [(WAVE0 + i // CHUNK, i, min(i + CHUNK, len(docs)))
          for i in range(0, len(docs), CHUNK)]

bad = mod.preflight([w for w, _s, _e in chunks])
if bad:
    print('ABORT: band holds foreign rows: %r' % (bad[:5],), file=sys.stderr)
    raise SystemExit(2)

tot_eq = tot_no = tot_err = 0
for wave, s, e in chunks:
    out_rows, n_eq, n_no, n_err = [], 0, 0, 0
    for p in docs[s:e]:
        rows, err = mod.extract(p, wave)
        if err:
            n_err += 1
            out_rows.append({'file': p, 'status': 'ERROR', 'error': err, 'wave': wave})
        elif rows:
            n_eq += len(rows)
            out_rows.extend(rows)
        else:
            n_no += 1
            out_rows.append({'file': p, 'status': 'NO_EQUATION', 'wave': wave})
    with open('%s/wave-%d.jsonl' % (QUEUE, wave), 'w', encoding='utf-8') as fh:
        fh.write('%s %s\n' % (mod.MARKER, ','.join(mod.ROOTS)))
        for r in out_rows:
            fh.write(json.dumps(r, ensure_ascii=False) + '\n')
    tot_eq += n_eq
    tot_no += n_no
    tot_err += n_err
    print('  wave-%d docs=%d eq=%d no=%d err=%d' % (wave, e - s, n_eq, n_no, n_err))

print('TOTAL %s' % json.dumps({'docs': len(docs), 'equations': tot_eq,
                               'no_equation': tot_no, 'errors': tot_err}))