"""Offline integrity check of the saved research audit; no network or writes.

This verifies saved provenance, not scientific validity or empirical success.
Run from any cwd: python scripts/research-audit-verify.py
"""
import collections
import hashlib
import json
from pathlib import Path
import re
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
AUDIT = ROOT / 'docs/ops/research-audit-2026-09-17'
NS = {'a': 'http://www.w3.org/2005/Atom'}


def records(sheet):
    headers = {re.sub(r'\d+$', '', k): v for k, v in sheet['rows'][0]['cells'].items()}
    return [dict(source_row=row['row'], **{
        headers.get(re.sub(r'\d+$', '', k), k): v
        for k, v in row['cells'].items()
    }) for row in sheet['rows'][1:]]


def verify(audit=AUDIT):
    def load(name):
        return json.loads((audit / name).read_text(encoding='utf-8'))

    snapshot = load('live-export.json')
    summary = load('summary.json')
    coverage = load('coverage.json')
    sheets = {sheet['name']: sheet for sheet in snapshot['sheets']}
    ranked = records(sheets['Ranked by Relevance'])
    triage = records(sheets['GSE Research Triage'])
    ids = [row['arxiv_id'] for row in ranked]
    errors = []

    def check(condition, message):
        if not condition:
            errors.append(message)

    check(len(ids) == len(set(ids)), 'duplicate ranked IDs')
    check(set(ids) == {r['arxiv_id'] for r in triage}, 'triage/ranked ID mismatch')
    check(len(coverage) == len(ids), 'coverage row count mismatch')
    check({r['id'] for r in coverage} == set(ids), 'coverage ID mismatch')
    check(summary['snapshot_sha256'] == snapshot['sha256'], 'snapshot hash claim mismatch')
    # This is hash-claim agreement, NOT verification of the original XLSX bytes.
    raw_cache = {}
    for row in coverage:
        metadata = row['retrieved_metadata']
        if not metadata:
            errors.append(f"missing metadata: {row['id']}")
            continue
        relative = metadata['raw_file'].replace('\\', '/')
        path = (audit / relative).resolve()
        if not path.is_relative_to(audit.resolve()):
            errors.append(f"raw path outside audit: {row['id']}")
            continue
        if path not in raw_cache:
            raw = path.read_bytes()
            xml = ET.fromstring(raw)
            raw_cache[path] = (hashlib.sha256(raw).hexdigest(), {
                e.findtext('a:id', '', NS): e for e in xml.findall('a:entry', NS)
            })
        digest, entries = raw_cache[path]
        check(digest == metadata['raw_sha256'], f"raw hash mismatch: {row['id']}")
        entry = entries.get(metadata['source_url'])
        if entry is None:
            errors.append(f"version URL absent from XML: {row['id']}")
            continue
        actual_id = metadata['source_url'].split('/abs/')[-1]
        check(row['id'] in (actual_id, re.sub(r'v\d+$', '', actual_id)),
              f"literal ID mismatch: {row['id']}")
        for field in ('title', 'summary', 'published', 'updated'):
            check(' '.join(entry.findtext('a:' + field, '', NS).split()) == metadata[field],
                  f"XML {field} mismatch: {row['id']}")

    tiers = dict(collections.Counter(r['relevance_tier'] for r in ranked))
    flags = dict(collections.Counter(f for r in coverage for f in r['flags']))
    check(tiers == summary['tiers_input_only'], 'summary tier mismatch')
    check(flags == summary['flags'], 'summary flags mismatch')
    check(summary['source_rows'] == len(ids), 'summary row count mismatch')
    check(summary['unique_ids'] == len(set(ids)), 'summary unique count mismatch')
    check(summary['metadata_resolved'] == sum(bool(r['retrieved_metadata']) for r in coverage),
          'summary resolved count mismatch')
    report_ids = sorted(p.stem for p in (audit / 'deep').glob('*.md'))
    check(set(report_ids) <= set(ids), 'report outside inventoried corpus')
    report_tiers = dict(collections.Counter(r['relevance_tier'] for r in ranked
                                           if r['arxiv_id'] in report_ids))
    return {
        'scope': 'saved artifact integrity only; not fresh retrieval or scientific approval',
        'original_xlsx_bytes_verified': False,
        'source_rows': len(ids), 'unique_ids': len(set(ids)),
        'input_tiers': tiers, 'raw_xml_files_verified': len(raw_cache),
        'metadata_records_verified': len(coverage), 'flags': flags,
        'deep_report_ids': report_ids, 'deep_report_input_tiers': report_tiers,
        'ids_without_deep_report': len(set(ids) - set(report_ids)),
        'without_report_input_tiers': dict(collections.Counter(
            r['relevance_tier'] for r in ranked if r['arxiv_id'] not in report_ids)),
        'registry_full_text_statuses': dict(collections.Counter(r['full_text_review'] for r in coverage)),
        'errors': errors,
    }


if __name__ == '__main__':
    result = verify()
    print(json.dumps(result, indent=2))
    raise SystemExit(bool(result['errors']))
