"""Run arxiv_extract over the full corpus into waves 9300+, with receipts.

Measured on a 60-paper sample before this ran: 1,372 equations, 22.9/paper,
0 non-verbatim, 1,335 clean / 32 unbalanced / 4 no-relation / 1 macro-only.
Extrapolates to ~25,450 equations from 1,113 papers.

Wave band 9300+ is free (9100-9153 and 9200-9205 are taken). Writes the same
row shape the markdown waves use, so build_wave_index.py can consume them.
"""
import glob, json, os, sys, time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import arxiv_extract as A

OUTDIR = os.path.join(HERE, 'mind-queue')
WAVE0 = 9300
CHUNK = 40
MARKER = 'corpus-roots:'


def main():
    files = sorted(glob.glob(os.path.join(A.FT, '*.txt')))
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else 0
    if limit:
        files = files[:limit]

    chunks = [(WAVE0 + i // CHUNK, i, min(i + CHUNK, len(files)))
              for i in range(0, len(files), CHUNK)]

    tot_eq = tot_no = tot_err = 0
    summary = []
    for wave, s, e in chunks:
        rows = []
        neq = nno = nerr = 0
        for f in files[s:e]:
            path = f.replace(chr(92), '/')
            try:
                raw = open(f, encoding='utf-8', errors='replace').read()
            except Exception as ex:
                nerr += 1
                rows.append({'file': path, 'status': 'ERROR',
                             'error': str(ex)[:80], 'wave': wave})
                continue
            got = A.extract(raw)
            if not got:
                nno += 1
                rows.append({'file': path, 'status': 'NO_EQUATION', 'wave': wave})
                continue
            neq += len(got)
            for r in got:
                rows.append({'file': path, 'equation': r['equation'],
                             'page_or_eqnum': r['page_or_eqnum'],
                             'wave': wave})
        dest = os.path.join(OUTDIR, 'wave-%d.jsonl' % wave)
        with open(dest, 'w', encoding='utf-8') as fh:
            fh.write('%s %s\n' % (MARKER, A.FT))
            for r in rows:
                fh.write(json.dumps(r, ensure_ascii=False) + '\n')
        tot_eq += neq
        tot_no += nno
        tot_err += nerr
        summary.append({'wave': wave, 'docs': e - s, 'eq': neq,
                        'no': nno, 'err': nerr})
        print(json.dumps(summary[-1]), flush=True)

    receipt = {
        'papers': len(files),
        'equations': tot_eq,
        'no_equation': tot_no,
        'errors': tot_err,
        'waves': len(chunks),
        'band': [WAVE0, WAVE0 + len(chunks) - 1],
        'elapsed_s': round(time.time() - START, 1),
    }
    with open(os.path.join(OUTDIR, 'wave-arxiv-receipt.json'), 'w',
              encoding='utf-8') as fh:
        json.dump(receipt, fh, indent=1)
    print('TOTAL ' + json.dumps(receipt))


START = time.time()

if __name__ == '__main__':
    main()