# Wire-In Plan — every paper wired to the engine, nothing missed

**Date:** 2026-09-22. **Coverage: 1,251 / 1,251 tracker papers indexed, each in ≥1 engine bucket.**

This is the checklist Garrett asked for: every one of the 1,251 papers is mapped from the tracker
into `corpus-index.jsonl` and from there into at least one engine capability bucket. Nothing missed, nothing forgotten.

## Verification (scripted, not eyeballed)

```
tracker rows:            1251
index records:           1251
tracker ids missing:        0
index ids not in tracker:   0
duplicate index ids:        0
records missing keys:       0
invalid doctrine tags:      0
records with no bucket:     0
```

Re-run any time:
```bash
cd ~/workspace/vendor/Sports
python3 - <<'EOF'
import json, re
rows=[json.loads(l) for l in open('docs/research/2026-09-21/arxiv-program/state/ledger-tracker-750.jsonl') if l.strip()]
recs=[json.loads(l) for l in open('docs/research/2026-09-21/arxiv-program/index/corpus-index.jsonl') if l.strip()]
n=lambda s: re.sub(r'v\d+$','',s).lower()
t={n(r['id']) for r in rows}; r={n(x['arxiv_id']) for x in recs}
assert len(rows)==1251==len(recs) and t==r, (len(rows),len(recs),len(t-r),len(r-t))
assert all(x.get('buckets') for x in recs)
print('WIRE-IN OK: 1251/1251, every paper in >=1 bucket')
EOF
```

Spot-check: 20 random index records verified against their ledger files (title present, verdict matches
the file's Verdict line, numeric-gate numbers present in the file) — 20/20 clean.

## Bucket wiring (counts + what each bucket owns)

| Bucket | Papers | Owns in the engine |
|---|---|---|
| `MODEL` | 1,083 | Prediction machinery: ratings, win/spread/total models, tracking models, ensembles, RL policies, world models, TSFM backbones |
| `INGEST` | 566 | Signal pipelines: what to collect, schemas, APIs, tracking data, news parsing, feature stores |
| `CALIBRATE` | 494 | Uncertainty honesty: Brier/ECE, isotonic/Platt/temperature, conformal/CQR, Venn-Abers, CRPS doctrine |
| `DECIDE` | 274 | Sizing (Kelly), abstention, selective prediction, pick selection, bet timing |
| `MONITOR` | 219 | Drift detection, calibration alarms, regime change, continual-learning triggers |
| `INVENT` | 185 | Metric/signal invention: symbolic regression, feature discovery, alpha mining, residual mining |

Papers carry multiple buckets where they genuinely span layers (e.g., a conformal-selection paper is
CALIBRATE + DECIDE + MONITOR). Doctrine split across the wired corpus: 881 PROPRIETARY_EDGE,
152 SITUATIONAL, 118 INFRA, 100 BASELINE (market work — the mathematical starting point, never the goal).

## Per-bucket entry points (strongest papers to start building from)

**MODEL** — start: `2602.21307v2` (distill neural win-prob head into ≤10-term equations),
`2211.04459v3` (flexBART drop-in for XGBoost), `2503.12107v1` (Chronos/Moirai TSFM backbone),
`1301.2954v1` (fused/grouped-ability team ratings).
```bash
jq -r 'select(.buckets|index("MODEL")) | [.arxiv_id,.normalized_lane,.capability] | @tsv' corpus-index.jsonl | head -50
```

**INGEST** — start: `2508.17157v1` (SportSQL NL-query over the Neon Postgres),
`2510.04516v3` (ATB retry policy for the data-fetch harness), `2111.12429v2` (tsflex time-series features).
```bash
jq -r 'select(.buckets|index("INGEST")) | [.arxiv_id,.normalized_lane,.capability] | @tsv' corpus-index.jsonl | head -50
```

**CALIBRATE** — start: `2504.01781` (CRPS + log-score doctrine), `1906.02530` (uncertainty-under-shift harness),
`2603.24704` (conformal selective prediction), `2010.00781v1` (in-play calibration evaluation).
```bash
jq -r 'select(.buckets|index("CALIBRATE")) | [.arxiv_id,.normalized_lane,.capability] | @tsv' corpus-index.jsonl | head -50
```

**DECIDE** — start: `2006.04779v2` (offline RL for the bet slate), `2105.08877v2` (bet timing as optimal stopping),
`2402.16300` (conformalized selective regression / no-bet).
```bash
jq -r 'select(.buckets|index("DECIDE")) | [.arxiv_id,.normalized_lane,.capability] | @tsv' corpus-index.jsonl | head -50
```

**MONITOR** — start: `2608.23808v2` (MinervaScore signal validation), `2603.24704` (walk-forward loss control),
`2606.19642` (coverage burn-in protocol).
```bash
jq -r 'select(.buckets|index("MONITOR")) | [.arxiv_id,.normalized_lane,.capability] | @tsv' corpus-index.jsonl | head -50
```

**INVENT** — start: `2305.01582v3` (PySR equation discovery on nflverse), `1601.00991v1` ("SportsAlpha" miner),
`2608.05207` (engine residual mining), `2503.14434` (LLM feature-discovery harness).
```bash
jq -r 'select(.buckets|index("INVENT")) | [.arxiv_id,.normalized_lane,.capability] | @tsv' corpus-index.jsonl | head -50
```

## The wire-in loop (standing process)

1. **New paper read → ledger → tracker row → index record** (same 14-key schema). The merge script rejects
   any index missing a tracker id.
2. **New build → cite the index ids** it implements in the build's design doc, so capability → paper is traceable.
3. **New signal gap → SIGNAL-GAPS.md** gets a dated entry; the next research wave targets it.
4. **Ledger QA backlog:** the 64 `experimental` + 24 `mixed` lanes are intentionally broad; `suggested_lane`
   already subdivides many — a future pass can promote the best subdivisions to first-class lanes.
