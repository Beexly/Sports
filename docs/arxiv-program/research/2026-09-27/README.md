# arXiv Second Pass — 2026-09-27

**Owed deliverable:** full second pass over the seven-paper batch from commit `17ae261` (2026-09-26), committed to `Beexly/Sports` on branch `motif/arxiv-second-pass-2026-09-27`, under `docs/arxiv-program/research/2026-09-27/`.

**Batch:** six ADAPT + one REJECT (`2609.23158`, skin radar — REJECT stands, replaced by `2606.09409` below).

## Contents

| File | What it is |
|---|---|
| `seven-paper-second-pass-synthesis.md` | Per-paper second pass: method, math, datasets, GSE application, implementation spec, reproducible test, improvement path — with corrections to the first-pass ledgers |
| `corrected-cross-paper-architecture.md` | The corrected architecture: one pipeline (ingest → strength → aggregate → calibrate → live) replacing seven standalone module specs; build order sequenced by dependency |
| `what-we-missed.md` | Six classes of first-pass gaps found on second pass (stale-checkout error, source-reliability stub, missing integration story, calibration theme, unexecuted spikes, filing error) |
| `replacement-full-paper-read-2606.09409.md` | Full ledger for the replacement paper (Remeli & Hardt, pairwise BT rankings) — ADAPT, counted |

## Key results

- **Program count: 586/750** (585 verified 2026-09-26 + replacement ADAPT; the REJECT never counts).
- **Two "new modules" became deltas:** the rate audit is an upgrade to the existing `calibration-ladder.ts`; LEAP is an upgrade to the existing `multi-market-ensemble.ts`. (The first pass worked from a stale checkout that claimed these modules don't exist — they do.)
- **`source-reliability.ts` is a stub** (blocked on the SignalLedgerEvent/feat-ledger merge). The expert-dominance detector and BT source ranking are interfaced now, implemented after the ledger lands.
- **One aggregation path, not three:** deliberative protocol (outer loop) + LEAP math (revision rule) over the existing precision-weighted ensemble.
- **Two unexecuted spikes recorded:** the WST featurizer test and the physiological-load historical study — research tasks, not engineering.

## First-pass ledgers (this batch)

Misfiled by the 9/27 reorg under `docs/dfs/research/2026-09-25/arxiv-deep/`; linked here for the program index:
`2601.14727-bradley-terry-model-advances.md`, `2605.23597-structure-guided-entity-resolution.md`, `2607.00164-verifiable-rewards.md`, `2609.01337-leap-likelihood-elicitation.md`, `2609.07617-live-tennis-forecasting.md`, `2609.22497-wisdom-artificial-deliberative-crowds.md`. The radar second-pass reassessment is correctly filed at `docs/arxiv-program/research/2026-09-26/arxiv-deep/2609.23158-radar-second-pass.md`.

## Tracker

Replacement entry appended to `docs/arxiv-program/research/2026-09-21/arxiv-program/state/ledger-tracker-750.jsonl` (manifest_index 501, file_index 511).
