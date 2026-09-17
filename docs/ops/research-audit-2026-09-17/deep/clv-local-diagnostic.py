"""Read-only prerequisite audit for Build Plan rows 16/27; no network or DB.
Run from any cwd: python <this-file>. Prints JSON; never fabricates observations.
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
EXTENSIONS = {'.json', '.jsonl', '.ndjson', '.csv', '.tsv', '.parquet', '.sqlite', '.db', '.xlsx', '.gz', '.zip'}
EXCLUDE = {'node_modules', '.git', 'research-audit-2026-09-17'}
inventory = []
hits = []
for base in ('docs', 'packages'):
    for p in sorted((ROOT / base).rglob('*')):
        if not p.is_file() or EXCLUDE.intersection(p.parts) or p.suffix.lower() not in EXTENSIONS:
            continue
        inventory.append({'path': p.relative_to(ROOT).as_posix(), 'bytes': p.stat().st_size})
        if p.suffix.lower() in {'.json', '.jsonl', '.ndjson', '.csv', '.tsv'}:
            text = p.read_text(encoding='utf-8', errors='replace')
            if re.search(r'clv|closing.line', text, re.I) and re.search(r'WIN|LOSS|outcome|settled|Brier', text, re.I):
                hits.append(p.relative_to(ROOT).as_posix())
required = [
    'docs/ops/calibration/2026-08-18-clv-census.csv',
    'docs/ops/ops/2026-08-18-clv-census.csv',
    'docs/calibration-proposals/2026-08-19-clv-forensics/raw.json',
    'docs/calibration-proposals/2026-08-19-clv-forensics/ml-and-books.json',
]
# This result records the manual field-level review of the matched files, not
# a claim that a regex can certify arbitrary future schemas. New hits require review.
expected_hits = {
    'docs/ops/GSE_RUNTIME_INVENTORY.json',
    'docs/ops/calibration/2026-08-19-l9-clv-slices/clv-slices.json',
    'docs/ops/edge/grouping-loss.l12.json',
}
review_current = set(hits) == expected_hits and not any((ROOT / p).exists() for p in required)
print(json.dumps({
    'diagnostic': 'Build Plan row 16/27: CLV versus per-pick realized Brier loss',
    'status': 'NOT_RUN' if review_current else 'REVIEW_REQUIRED',
    'scope': 'repository working-tree docs/ and packages/ only; exclude current audit and dependencies',
    'inventory_count': len(inventory),
    'candidate_artifacts': hits,
    'referenced_raw_export_exists': {p: (ROOT / p).exists() for p in required},
    'usable_joined_observations': 0 if review_current else None,
    'pearson_r': None,
    'spearman_rho': None,
    'reason': 'Manually reviewed L9 artifact has market/month CLV aggregates and three pick-id line spot checks, but no realized game outcome or model probability. L12 JSON is a recon summary, not row data. Raw census/forensics exports referenced in historical prose are absent. Runtime inventory and claim ledger are not settled picks. Unit-test fixtures are synthetic, not empirical evidence.',
    'required_columns': ['pick_id', 'game_id', 'sport', 'market', 'lock_time', 'clv_value', 'clv_kind', 'model_probability_at_lock', 'settled_WIN_or_LOSS'],
    'interpretation': 'If rows become available, correlate CLV with (p-y)^2 (negative is better), keep point/probability units and markets separate, and report clustered uncertainty. Do not use confidence_pct as a probability or CLV verdict as game outcome.',
    'inventory': inventory,
}, indent=2))
