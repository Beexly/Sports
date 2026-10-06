#!/usr/bin/env python3
"""Extract GSE-relevant ledger sections (10-14) for index lines lo..hi (1-indexed)."""
import json, os, re, sys

BASE = '/home/hatch/workspace/vendor/Sports'

def norm(p):
    pre = '/home/hatch/workspace/vendor/Sports/'
    if p.startswith(pre):
        p = p[len(pre):]
    if p.startswith('~/'):
        p = p[2:]
    return os.path.join(BASE, p)

def sections(path):
    txt = open(path, encoding='utf-8', errors='replace').read()
    out = {}
    for n in (10, 11, 12, 13, 14):
        m = re.search(r'^## %d\. ' % n, txt, re.M)
        if not m:
            out[n] = '(missing)'
            continue
        start = m.start()
        m2 = re.search(r'^## %d\. ' % (n + 1), txt[start + 2:], re.M)
        end = start + 2 + m2.start() if m2 else len(txt)
        out[n] = txt[start:end].strip()
    return out

def main():
    lo, hi = int(sys.argv[1]), int(sys.argv[2])
    lines = open(os.path.join(BASE, 'docs/research/2026-09-21/arxiv-program/index/corpus-index.jsonl')).readlines()
    for i in range(lo, hi + 1):
        r = json.loads(lines[i - 1])
        p = norm(r['ledger_path'])
        sec = sections(p)
        print('=' * 100)
        print(f"LINE {i} | {r['arxiv_id']} | {r['title']}")
        print(f"lane={r['normalized_lane']} verdict={r['verdict']} tag={r['doctrine_tag']} bucket={r['buckets'][0]}")
        print('numeric_gate(index):', (r.get('numeric_gate') or '')[:400])
        for n in (10, 11, 12, 13, 14):
            t = sec[n]
            if len(t) > 1400:
                t = t[:1400] + ' [TRUNC]'
            print(f'--- sec{n} ---\n{t}')
    print('=' * 100)

main()
