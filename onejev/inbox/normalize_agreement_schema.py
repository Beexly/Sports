"""Fold legacy-schema agreement rows into the modern schema.

wave-agreement-gemini.jsonl holds two schemas:
  modern  printed_equation / source_path / status       (written by this pipeline)
  legacy  equation / file / verdict                     (earlier gemini_agy lane)

The legacy rows carry REAL model verification ('norm_gemini' vs 'src_canon'),
which is stronger evidence than the deterministic local fold. build_agree_drain.py
reads only the modern schema, so all of it was silently ignored.

This normalizes legacy rows into the modern shape, in place, without inventing
anything: the equation is carried verbatim from the legacy field.
"""
import json, os

Q = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mind-queue')
F = os.path.join(Q, 'wave-agreement-gemini.jsonl')

rows, legacy, modern = [], 0, 0
with open(F, encoding='utf-8') as fh:
    for line in fh:
        line = line.strip()
        if not line:
            continue
        r = json.loads(line)
        if r.get('status') is not None:
            modern += 1
            rows.append(r)
            continue
        legacy += 1
        verdict = r.get('verdict')
        status = {'AGREED': 'AGREE', 'UNVERIFIED': 'UNVERIFIED'}.get(verdict, 'UNVERIFIED')
        eq = r.get('equation')
        rows.append({
            'status': status,
            'compare_key': None,
            'source_path': r.get('file'),
            'printed_equation': eq,
            'schema_normalized_from': 'legacy',
            'model': r.get('model'),
            'norm_model': r.get('norm_gemini'),
            'src_canon': r.get('src_canon'),
        })

with open(F, 'w', encoding='utf-8') as fh:
    for r in rows:
        fh.write(json.dumps(r, ensure_ascii=False) + '\n')

from collections import Counter
print(json.dumps({
    'total_rows': len(rows),
    'modern_before': modern,
    'legacy_normalized': legacy,
    'verdicts_now': dict(Counter(r.get('status') for r in rows)),
}, indent=1))