# Muse — zip-only review — GSE 10.2.26 dump
Source: `G:\.shortcut-targets-by-id\1nCDoFQ9mZ7OPnVSqBl-OeFze3kfqdamG\GSE. 10.2.26`
Method: read-only listing of archive central directory (`zipfile.namelist`). No extraction. No file contents opened. No secrets recorded.
Standing brief for name comparison (filename only, not opened): `gse-reasoning-engine-brief-2026-10-02.md` observed in dump root. No zip entry exactly matches that filename.

8 zip archives found. All 8 readable.

---

## 1. `agent-bus-main (1).zip`
- Readable: yes
- Total entries: 556
- Top-level entries:
  - `agent-bus-main/`
- Second level (`agent-bus-main/*`):
  - `agent-bus-main/bin`
  - `agent-bus-main/bootstrap`
  - `agent-bus-main/inbox`
  - `agent-bus-main/lab`
  - `agent-bus-main/outbox`
  - `agent-bus-main/sports`
- Classification: something else — agent-bus / ops-messaging snapshot, not a Sports repo snapshot, not a paper package.
- Flagged names (filename suggests reasoning / calibration / injury gate; contents not verified):
  - `agent-bus-main/outbox/from-grok/orb/risk_gate.py`
  - `agent-bus-main/inbox/from-hermes/RESCUE-2026-09-26-6-trust-gate-and-host-blocker.md`
  - `agent-bus-main/inbox/from-motif/repo-intel/models/p-lambda-verified_calibration.md`
  - `agent-bus-main/inbox/from-motif/repo-intel/models/saurabhgarg1996-calibration.md`
  - `agent-bus-main/inbox/from-motif/repo-intel/models/tobiasbiegert-idr-calibration.md`
  - `agent-bus-main/inbox/from-motif/repo-intel/models/zygmuntz-classifier-calibration.md`
  - `agent-bus-main/sports/msg/*` — multiple `*crps-gate*`, `*calibration*`, `*gate-decision*` message filenames (e.g. `20260918T192819082Z-519b-blueprint-verdict-flash-inverted-crps-gate-shin-.json`, `20260919T111641503Z-5031-new-areas-milled-market-self-calibration-measure.json`)
  - None matches the standing brief filename.

## 2. `agent-bus-main (2).zip`
- Readable: yes
- Total entries: 676
- Top-level entries:
  - `agent-bus-main/`
- Second level:
  - `agent-bus-main/bin`
  - `agent-bus-main/bootstrap`
  - `agent-bus-main/inbox`
  - `agent-bus-main/lab`
  - `agent-bus-main/outbox`
  - `agent-bus-main/research`
  - `agent-bus-main/sports`
- Classification: something else — agent-bus snapshot with embedded `research/corpus-intelligence/briefs/` tree. Not a Sports repo snapshot, not a paper package.
- Flagged names:
  - Same `risk_gate.py`, `trust-gate-and-host-blocker.md`, `*_calibration.md` model notes, and `*crps-gate*` / `*calibration*` sports-msg filenames as in (1).
  - Plus `agent-bus-main/research/corpus-intelligence/briefs/**.brief.md` tree (paper-brief filenames embedded inside a bus snapshot).
  - None matches the standing brief filename.

## 3. `arxiv-sweep-2026-10-02 (1).zip`
- Readable: yes
- Total entries: 1380
- Top-level entries:
  - `arxiv-sweep/`
- Second level:
  - `arxiv-sweep/fulltext`
  - `arxiv-sweep/phase2-assignments`
  - `arxiv-sweep/reader18-fullreads`
  - `arxiv-sweep/wave-assignments`
  - `arxiv-sweep/waves`
- Representative root files: `arxiv-sweep/fetch_arxiv.py`, `arxiv-sweep/raw_sports_prediction.json`, `raw_sports_betting_ml.json`, `raw_sports_forecasting.json`, `raw_expected_goals.json`, `raw_player_tracking.json`, `raw_elo_rating.json`, `raw_win_probability.json`, `raw_point_spread.json`
- Classification: paper package — arXiv sweep raw JSON + triage / wave assignments.
- Flagged names:
  - `arxiv-sweep/raw_calibration_sports.json`
  - `arxiv-sweep/triage-calibration-QC.md`
  - `arxiv-sweep/phase2-candidates-calibration.jsonl`
  - `arxiv-sweep/phase2-search-notes-calibration.md`
  - `arxiv-sweep/waves/worker-brief.md`
  - These indicate a calibration triage track by filename; no `reasoning-engine`, `injury-gate`, or `calibration-gate` new-gate filename observed in this archive. None matches the standing brief filename.

## 4. `arxiv-sweep-2026-10-02.zip`
- Readable: yes
- Total entries: 1380
- Top-level entries:
  - `arxiv-sweep/`
- Second level: identical to (1): `fulltext`, `phase2-assignments`, `reader18-fullreads`, `wave-assignments`, `waves`
- Classification: paper package — appears to be the same arXiv sweep as `arxiv-sweep-2026-10-02 (1).zip` (same entry count, same sampled names).
- Flagged names: same as (1) — `raw_calibration_sports.json`, `triage-calibration-QC.md`, `phase2-candidates-calibration.jsonl`, `phase2-search-notes-calibration.md`. None matches the standing brief filename.

## 5. `corpus-intelligence-2026-10-02.zip`
- Readable: yes
- Total entries: 4414
- Top-level entries:
  - `corpus-intelligence/`
- Second level:
  - `corpus-intelligence/briefs`
  - `corpus-intelligence/chunks`
  - `corpus-intelligence/deep`
  - `corpus-intelligence/handoff`
  - `corpus-intelligence/intake`
  - `corpus-intelligence/maps`
- Classification: paper package — briefs corpus (`briefs/c01/reader-**/*.brief.md` plus chunks/deep/handoff/intake/maps).
- Flagged names (filename-only; contents not checked):
  - `corpus-intelligence/briefs/c03/r48/docs__ops__CALIBRATION_GATE_SCALE_2026-09-06.brief.md`
  - `corpus-intelligence/briefs/c09/c09-d30/ops__edge__2026-08-19-calibration-gate-split-map.md.brief.md`
  - These are briefs *about* existing calibration-gate docs by filename. No standalone new `reasoning-engine` or `injury-gate` filename observed in the sampled hits; full-text scan was filename-regex only (`reason|calibr|injur|gate|brief` = 4119 hits, dominated by `*.brief.md`).
  - None matches the standing brief filename.

## 6. `EYI Package_10-02-2026_1790971043.zip`
- Readable: yes
- Total entries: 384
- Top-level entries:
  - `Conversation with Muse AI_10-02-2026_1790971043.txt`
  - `files/`
  - `manifest.json`
  - `workspace/`
- Second level (`workspace/*`): `workspace/goals`, `workspace/user`, `workspace/your_files`
- Classification: something else — exported assistant workspace / conversation package (goals + files + iOS-audit assets), not a Sports repo snapshot, not a paper package.
- Flagged names:
  - `workspace/goals/gse-engine-v5-3-0-calibration-rebuild/files/gse-v5.3.0-build-spec.md` — name suggests a calibration rebuild spec; not the standing brief by filename.
  - `workspace/your_files/gse-ios-audit/frame-calibration.png`
  - `workspace/your_files/gse-ios-audit/frame-gate.png`
  - No `reasoning-engine` or `injury-gate` filename observed in the focused regex scan.
  - Did not open personal / legal / credential files; only filenames listed.

## 7. `gse-competitive-intel-main (1).zip`
- Readable: yes
- Total entries: 3222
- Top-level entries:
  - `gse-competitive-intel-main/`
- Second level:
  - `gse-competitive-intel-main/.firecrawl`
  - `gse-competitive-intel-main/LAUNCH`
  - `gse-competitive-intel-main/codes`
  - `gse-competitive-intel-main/codex-work`
  - `gse-competitive-intel-main/dossiers`
  - `gse-competitive-intel-main/gse-competitive-intel`
  - `gse-competitive-intel-main/nfl`
  - `gse-competitive-intel-main/raw`
- Classification: something else — competitive-intel snapshot (LAUNCH / dossiers / firecrawl / nfl / raw), not a Sports repo snapshot, not a paper package.
- Flagged names:
  - `gse-competitive-intel-main/LAUNCH/ENGINES-MATH-CALIBRATIONS-RESEARCH.md`
  - `gse-competitive-intel-main/LAUNCH/_AGENT-BRIEF.md`
  - `gse-competitive-intel-main/codex-work/handoff-docs/CALIBRATION_MEASUREMENT_RUNTIME.md`
  - `gse-competitive-intel-main/nfl/nfl-injury-report.md`
  - `gse-competitive-intel-main/raw/prod-launch-audit-2026-09-08/calibration_page.html`
  - None matches the standing brief filename. `nfl-injury-report.md` is an injury-report filename, not evidence of a new injury gate.

## 8. `Sports-main (8).zip`
- Readable: yes
- Total entries: 14087
- Top-level entries:
  - `Sports-main/`
- Second level (40 entries, sample): `.agents`, `.claude`, `.design-sync`, `.githooks`, `.github`, `.grok`, `.hermes`, `_dispatch3`, `_logs`, `apps`, `arxiv-deep`, `brand-kit`, `components`, `coordination`, `data`, `design-preview`, `design-system`, `docker`, `docs`, `eval`, `formal`, `formal-heartbeat`, `formal-regression`, `gse-ml-service`, `handoff`, `infra`, `infrastructure`, `intelligence`, `lib`, `packages`, `reports`, `schemas`, `scripts`, `skills`, `social`, `spaces`, `tools`, `watcher`, `waves`, `workers`
- Classification: Sports repo snapshot — full monorepo layout (`apps/`, `packages/`, `intelligence/`, `docs/`, skills, tests).
- Flagged names (filename-only; these are the only archive with `reasoning_engine` + `injury_gate` + `calibration-gates` implementation-style paths):
  - `Sports-main/intelligence/reasoning_engine/` (with `README.md`, `emit_horizons.py`, `emit_three.py`, `emit_trace.py`, `epa_backtest.py`, `facets.py`, `run_game.py`, `slate.py`, `test_run_game.py`, `test_slate.py`, `traces/*.json`)
  - `Sports-main/intelligence/reasoning/engine.py`
  - `Sports-main/docs/reasoning/engine-dashboard.md`
  - `Sports-main/intelligence/providers/injury_gate.py`
  - `Sports-main/packages/prediction-engine/src/calibration/calibration-gates.ts` (+ `.test.ts`)
  - `Sports-main/packages/prediction-engine/src/reasoning/engine-weights.ts`
  - `Sports-main/apps/web/components/calibration/gate-reading.tsx` + `apps/web/__tests__/calibration-gate-reading.test.tsx`
  - `Sports-main/docs/ops/CALIBRATION_GATE_SCALE_2026-09-06.md`
  - `Sports-main/docs/ops/edge/2026-08-19-calibration-gate-split-map.md`
  - Broader `*calibration*` / `*gate*` / `*injury*` / `*grounded-reasoning*` test + skill filenames exist (1077 filename-regex hits; e.g. `calibration-pipeline/SKILL.md`, `model-promotion-gate/SKILL.md`, `injury-report.test.ts`, `injury-trajectory-map.test.ts`, `grounded-reasoning.test.ts`).
  - None of these filenames equals the standing brief `gse-reasoning-engine-brief-2026-10-02.md`. Flagged here so a holder of the standing brief can compare; no claim made about which is newer or authoritative.

---

## Summary table
| zip | readable | top-level | looks like |
|---|---|---|---|
| `agent-bus-main (1).zip` | yes | `agent-bus-main/` | something else (agent bus) |
| `agent-bus-main (2).zip` | yes | `agent-bus-main/` | something else (agent bus + embedded research) |
| `arxiv-sweep-2026-10-02 (1).zip` | yes | `arxiv-sweep/` | paper package |
| `arxiv-sweep-2026-10-02.zip` | yes | `arxiv-sweep/` | paper package |
| `corpus-intelligence-2026-10-02.zip` | yes | `corpus-intelligence/` | paper package |
| `EYI Package_10-02-2026_1790971043.zip` | yes | txt + `files/` + `manifest.json` + `workspace/` | something else (workspace export) |
| `gse-competitive-intel-main (1).zip` | yes | `gse-competitive-intel-main/` | something else (competitive intel) |
| `Sports-main (8).zip` | yes | `Sports-main/` | Sports repo snapshot |

No unreadable archives. No extraction performed. No invented file contents. No secrets.
