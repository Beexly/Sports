"""Consolidate the wave-queue into one canonical equation index.

Reads every wave-*.jsonl in the mind-queue (NOT the agreement files), dedupes on
sha256(file + normalized equation), and writes:
  - wave-index.jsonl      : one row per unique printed equation, with source, arxiv id,
                            wave provenance, and eqnum/page when present
  - wave-index-summary.json: counts

Never touches brain/*. Does not delete wave files (they are the audit trail).
"""
import glob, hashlib, json, os, re

QUEUE = r'C:\Users\Garrett\onejev\inbox\mind-queue'
OUT = os.path.join(QUEUE, 'wave-index.jsonl')
SUM = os.path.join(QUEUE, 'wave-index-summary.json')

def norm(s):
    return re.sub(r'\s+', '', (s or '').lower())

def main():
    uniq, seen = [], set()
    no_eq, err, total = 0, 0, 0
    per_wave = {}
    for f in sorted(glob.glob(os.path.join(QUEUE, 'wave-*.jsonl'))):
        base = os.path.basename(f)
        if 'agreement' in base or 'index' in base:
            continue
        for line in open(f, encoding='utf-8'):
            total += 1
            try:
                row = json.loads(line)
            except Exception:
                err += 1
                continue
            if row.get('status') in ('NO_EQUATION', 'EMPTY', 'MISSING_ON_DISK', 'ERROR'):
                no_eq += 1
                continue
            eq = row.get('equation')
            if not eq:
                continue
            k = hashlib.sha256((row['file'] + '|' + norm(eq)).encode()).hexdigest()
            if k in seen:
                continue
            seen.add(k)
            row['norm'] = norm(eq)
            uniq.append(row)
            w = row.get('wave')
            per_wave[w] = per_wave.get(w, 0) + 1
    with open(OUT, 'w', encoding='utf-8') as f:
        for r in uniq:
            f.write(json.dumps(r, ensure_ascii=False) + '\n')
    summary = {'unique_equations': len(uniq), 'no_equation_rows': no_eq, 'parse_errors': err,
               'source_rows': total, 'waves_represented': len(per_wave),
               'per_wave_counts': {str(k): v for k, v in sorted(per_wave.items()) if k is not None}}
    with open(SUM, 'w') as f:
        json.dump(summary, f, indent=1)
    print(json.dumps(summary))

if __name__ == '__main__':
    main()