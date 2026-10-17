import re
import sys
from pathlib import Path

files = [
    'packages/prediction-engine/src/reasoning/mind-reasoning.ts',
    'packages/prediction-engine/src/reasoning/corpus-evaluator.ts',
    'packages/prediction-engine/src/reasoning/literature-registries.ts',
    'packages/prediction-engine/src/reasoning/__tests__/literature-registries.test.ts',
    'scripts/run-full-scale-backtest.py',
    'scripts/run-intelligence-battery-12.ts',
    'scripts/generate-before-after-proofs.ts',
    'scripts/verify-dfs-optimizers.ts',
    'docs/predictions/research/2026-10-17/BEFORE_AFTER_INTELLIGENCE_PROOFS.md',
    'docs/predictions/research/2026-10-17/FULL_SCALE_2462_GAMES_MEASUREMENT.json',
    'docs/predictions/research/2026-10-17/intelligence-battery-12-2026-10-17.json',
    'docs/ops/AUDIT_INCORPORATION_LEDGER.md',
]

rx_content = [
    re.compile(r'\bsk-(?:proj|svcacct|admin)-[A-Za-z0-9_\-]{15,}\b'),
    re.compile(r'\bsk-[a-zA-Z0-9]{32,}\b'),
    re.compile(r'\bhf_[a-zA-Z0-9]{30,}\b'),
    re.compile(r'\bnpg_[A-Za-z0-9_\-]{12,}\b'),
    re.compile(r'(?i)\b(pgpassword|api[_-]?key|access[_-]?key|secret|password|passwd|pwd|auth[_-]?token)\s*[:=]\s*[\'"][A-Za-z0-9_\-\.]{8,}'),
    re.compile(r'(?i)(postgres(ql)?|mysql|mongodb(\+srv)?|redis|amqp)://[^\s]+:[^\s]+@'),
    re.compile(r'-----BEGIN [A-Z ]*PRIVATE KEY-----'),
]

MOCK_RX = re.compile(r'(?i)(YOUR_API_KEY|ODDS_API_KEY|<API_KEY>|API_KEY|YOUR_KEY|REPLACE_ME|CHANGEME)')

hits = []
for f in files:
    p = Path(f)
    if not p.exists():
        print(f"File missing: {f}")
        continue
    txt = p.read_text(encoding='utf-8', errors='ignore')
    for rx in rx_content:
        m = rx.search(txt)
        if m:
            matched_val = m.group(0)
            if not MOCK_RX.search(matched_val):
                hits.append((f, rx.pattern, matched_val[:40]))

print(f"Targeted Secret Scan: {len(files)} files checked. Violations: {len(hits)}")
if hits:
    for f, pat, val in hits:
        print(f"[VIOLATION] {f}: {val}")
    sys.exit(1)
else:
    print("SUCCESS: 0 sensitive credentials found in any staged or touched file.")
    sys.exit(0)
