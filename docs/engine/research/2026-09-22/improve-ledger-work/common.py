#!/usr/bin/env python3
"""Shared validator/appender for improve-ledger records."""
import json, unicodedata, sys

OUT = '/home/hatch/workspace/improve-ledger-work/part-1.jsonl'
IDX_PATH = '/home/hatch/workspace/vendor/Sports/docs/research/2026-09-21/arxiv-program/index/corpus-index.jsonl'
KEYS = ["arxiv_id","title","normalized_lane","verdict","doctrine_tag","improvement","gate","owner","bucket","effort","depends_on"]
N = lambda s: unicodedata.normalize('NFKC', s)

def load_idx(lo, hi):
    idx = {}
    with open(IDX_PATH) as f:
        for i, ln in enumerate(f, 1):
            if lo <= i <= hi:
                idx[i] = json.loads(ln)
    return idx

def val(rec, i, idx, vw):
    r = idx[i]
    bad = [k for k in ('arxiv_id','title','normalized_lane','verdict','doctrine_tag') if N(str(rec[k])) != N(str(r[k]))]
    assert not bad, (i, bad)
    assert rec['bucket'] == r['buckets'][0], (i, rec['bucket'], r['buckets'])
    assert list(rec.keys()) == KEYS, (i, list(rec.keys()))
    imp = N(rec['improvement']).lower()
    found = [w for w in vw[rec['arxiv_id']] if N(w).lower() in imp]
    assert len(found) >= 2, (i, 'shift-check failed', found)
    assert rec['owner'] in ('Hermes','Mimo','Motif-lab'), (i, rec['owner'])
    assert rec['effort'] in ('small','medium','large'), (i, rec['effort'])
    print(i, rec['arxiv_id'], 'distinctive:', found, '| owner:', rec['owner'], '| bucket:', rec['bucket'])

def append(recs):
    with open(OUT, 'a') as f:
        for rec in recs:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print('total now', sum(1 for _ in open(OUT)))
