"""Inventory every source row and independently fetch arXiv metadata.
Metadata verification is NOT full-text review or empirical validation.
"""
import collections
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import time
import unicodedata
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1] / 'docs/ops/research-audit-2026-09-17'
NS = {'a': 'http://www.w3.org/2005/Atom', 'ar': 'http://arxiv.org/schemas/atom'}
ID = re.compile(r'(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?/\d{7})(?:v\d+)?')

def records(sheet):
    headers = {re.sub(r'\d+$', '', k): v for k, v in sheet['rows'][0]['cells'].items()}
    return [dict(source_row=r['row'], **{headers.get(re.sub(r'\d+$', '', k), k): v for k, v in r['cells'].items()}) for r in sheet['rows'][1:]]

def normalize(text):
    return ''.join(c.lower() for c in unicodedata.normalize('NFKC', text) if c.isalnum())

def main():
    snapshot = json.loads((ROOT / 'live-export.json').read_text(encoding='utf-8'))
    sheets = {s['name']: s for s in snapshot['sheets']}
    rows = records(sheets['Ranked by Relevance'])
    ids = [r['arxiv_id'] for r in rows]
    assert len(ids) == len(set(ids)), 'Duplicate IDs must be reconciled, not dropped'
    malformed = [x for x in ids if ID.fullmatch(x) is None]
    if malformed:
        raise ValueError(f'Invalid literal IDs: {malformed}')
    cache = ROOT / 'arxiv-metadata'
    cache.mkdir(exist_ok=True)
    entries, failures = {}, []
    for start in range(0, len(ids), 40):
        batch = ids[start:start+40]
        raw_path = cache / f'{start:04d}.xml'
        url = 'https://export.arxiv.org/api/query?' + urllib.parse.urlencode({'id_list': ','.join(batch), 'max_results': len(batch)})
        try:
            if raw_path.exists():
                raw = raw_path.read_bytes()
            else:
                request = urllib.request.Request(url, headers={'User-Agent': 'GSE-Research-Audit/1.0 (read-only academic metadata verification)'})
                with urllib.request.urlopen(request, timeout=45) as response:
                    raw = response.read()
                ET.fromstring(raw)
                raw_path.write_bytes(raw)
                time.sleep(3.2)
            root = ET.fromstring(raw)
            for entry in root.findall('a:entry', NS):
                version_url = entry.findtext('a:id', '', NS)
                version_id = version_url.split('/abs/')[-1]
                bare = re.sub(r'v\d+$', '', version_id)
                # Match a requested literal ID or its explicit version only.
                requested = next((i for i in batch if i == version_id or i == bare), None)
                if requested is None:
                    continue
                fields = {k: ' '.join(entry.findtext('a:' + k, '', NS).split()) for k in ['title', 'summary', 'published', 'updated']}
                fields.update(source_url=version_url, comment=' '.join(entry.findtext('ar:comment', '', NS).split()), raw_file=str(raw_path.relative_to(ROOT)), raw_sha256=hashlib.sha256(raw).hexdigest())
                entries[requested] = fields
            print(f'Batch {start}: {len(batch)} requested; {len(entries)} total resolved', flush=True)
        except Exception as exc:
            failures.append({'start': start, 'ids': batch, 'url': url, 'error': str(exc)})
            print(f'Batch {start} failed: {exc}', flush=True)
        (ROOT / 'metadata-progress.json').write_text(json.dumps({'entries': entries, 'failures': failures}, ensure_ascii=False, indent=2), encoding='utf-8')
    ledger = []
    for row in rows:
        actual = entries.get(row['arxiv_id'])
        flags = []
        if not actual:
            flags.append('METADATA_UNRESOLVED')
        else:
            input_title = row.get('title', '')
            if not input_title:
                # Sheet row 1344 claims "404 on two attempts"; arXiv resolves it.
                flags.append('SHEET_CLAIMED_UNRESOLVED_BUT_RESOLVED')
            elif normalize(actual['title']) != normalize(input_title):
                flags.append('TITLE_MISMATCH')
            if re.search(r'withdraw|retract', actual['comment'] + ' ' + actual['summary'], re.I):
                flags.append('WITHDRAWAL_OR_RETRACTION_REVIEW')
        ledger.append({'id': row['arxiv_id'], 'source_row': row['source_row'], 'input': row, 'retrieved_metadata': actual, 'flags': flags, 'full_text_review': 'NOT_REVIEWED', 'repo_mapping': 'NOT_REVIEWED', 'empirical_test': 'NOT_RUN', 'disposition': 'OPEN'})
    summary = {'snapshot_sha256': snapshot['sha256'], 'retrieved_at': datetime.now(timezone.utc).isoformat(), 'source_rows': len(rows), 'unique_ids': len(set(ids)), 'metadata_resolved': len(entries), 'tiers_input_only': dict(collections.Counter(r['relevance_tier'] for r in rows)), 'flags': dict(collections.Counter(f for r in ledger for f in r['flags'])), 'deep_reviews_completed': 0, 'batch_failures': failures}
    (ROOT / 'coverage.json').write_text(json.dumps(ledger, indent=2, ensure_ascii=False), encoding='utf-8')
    (ROOT / 'summary.json').write_text(json.dumps(summary, indent=2), encoding='utf-8')
    print(json.dumps(summary, indent=2), flush=True)

if __name__ == '__main__':
    main()
