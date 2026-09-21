# arXiv Research Program — Status & Handoff (2026-09-21)

This directory is the single source of truth for the arXiv deep-research program.
Everything that lived in the local workspace (`~/workspace/arxiv-sweep/`) has been
consolidated here so any agent with repo access can see and continue the work.

## The target (Garrett's standing directive)

**750 papers with real GSE value.** Only papers with verdict **ADAPT** or **ADOPT**
count. A **REJECT** never counts toward the target — every REJECT must be replaced
with another full-paper read until the valuable count hits 750.

Current count: **365 / 750 valuable** (342 ADAPT + 23 ADOPT; 145 REJECTs on record).
Needed: **385 more ADAPT/ADOPT ledgers.**

Phase 1 (the "500") closed at 510 verified ledgers (365 valuable). Garrett rejected
the phase-1 framing: his standard was 500 papers *active and worth adapting*.
This is the penalty continuation. Do not report milestones as complete until the
verified valuable count confirms them. Never claim activity without direct evidence
(files on disk, tracker lines, git commits).

## Search territory

Garrett opened the remaining search to whatever moves GSE toward the most accurate
and calibrated fantasy/prediction sports company in the world: calibration/uncertainty,
ratings (Elo/Glicko/TrueSkill), market microstructure/CLV, Kelly sizing,
Bayesian/state-space, props/fantasy/DFS optimization, tracking, injuries/causal,
weather, ensembles, pick selection/abstention, LLM/NLP for sports.

## What's in this directory

- `PROGRAM-STATUS.md` — this file.
- `state/ledger-tracker.jsonl` — phase-1 tracker: 510 completed ledgers with
  verdicts (ADAPT/ADOPT/REJECT), lanes, and paper IDs.
- `state/ledger-tracker-750.jsonl` — phase-2 (750-program) tracker. **Currently
  empty.** New ledgers append here as JSON lines: `{"id","status":"completed",
  "verdict":"ADAPT|ADOPT|REJECT","lane":"..."}`.
- `state/master.jsonl` — the 865-paper candidate corpus already mined (waves 1–3).
- `state/manifest-500.jsonl` — the lane-balanced 500-paper phase-1 manifest.
- `state/reserve-100.jsonl` — 100-paper reserve pool.
- `state/fetch-queue.jsonl`, `state/fetch-queue2.jsonl` — full-text fetch queues.
- `state/ledger-template.md` — the required 14-section ledger template. Every
  ledger must follow it: citation, full-text read statement, research question,
  method/model, math/equations/assumptions, dataset/schema, features/target,
  validation design, exact numerical results + baselines, code/data availability,
  leakage/limitations, GSE overlap, implementation spec, reproducible test, numeric
  acceptance/rejection gate, improvement experiment, ADOPT/ADAPT/REJECT verdict.
- `state/existing-research-map.md` — map of the Sports repo corpus, Drive, and
  Gmail research (dedup against this; overlap must be recomputed as ledgers land).
- `state/RECONCILIATION-NOTES.md` — phase-1 reconciliation notes.
- `phase2/phase2-candidates-bayes.jsonl` — 582 new-candidate records from the
  expanded keyword search (deduped against master.jsonl + all 510 done IDs).
- `phase2/assignments/assign-01.jsonl` … `assign-49.jsonl` — the 582 candidates
  split into 49 reader batches (~12 papers each). **Reader waves were not yet
  launched when this was consolidated.** This is the immediate next work.
- `scripts/fetch_hybrid_fulltext.py` — the working full-text fetcher
  (ar5iv HTML → text; PDF+pdftotext fallback). Usage:
  `python3 scripts/fetch_hybrid_fulltext.py` (reads the queue; writes
  `<id>.txt` into a `fulltext/` dir).
- `scripts/fetch_fulltext.py`, `scripts/fetch_pdf_fulltext.py` — earlier
  fetchers (kept for reference).
- `scripts/bayes_search.py`, `scripts/bayes_rebuild.py` — the phase-2 candidate
  search/rebuild scripts.
- `fulltext-cache.tar.gz` — 1,112 cached full texts (phase-1 + phase-2 fetch),
  compressed. Extract into a local `fulltext/` dir to resume reading without
  refetching. Rebuildable at any time via `scripts/fetch_hybrid_fulltext.py`.

## Finished ledgers

`../arxiv-deep/` — 518 ledger files (510 verified phase-1 + 8 depth-calibration
pilots), all following `state/ledger-template.md`, all pushed to `Beexly/Sports@main`.

## How to continue (for the next agent)

1. Extract `fulltext-cache.tar.gz` locally for the reader workers.
2. Spawn reader workers over `phase2/assignments/assign-*.jsonl`, one worker per
   batch. Each paper: read the full text, write a 14-section ledger to
   `../arxiv-deep/` (next sequential number), verdict ADAPT/ADOPT/REJECT, append
   to `state/ledger-tracker-750.jsonl`.
3. Every REJECT must be replaced: run new arXiv searches in the keyword
   territory above, dedup against `state/master.jsonl` + all done IDs, and read
   replacements until the valuable count reaches 750.
4. Audit each wave: spot-check equations and load-bearing numbers against the
   cached full texts; no placeholders.
5. Commit with explicit research paths only; never stage or overwrite unrelated
   work in the tree. Never touch `gse-grok-build-sandbox`.
6. Push to `Beexly/Sports@main` and keep the Sports `AGENTS.md` inventory current.
7. Report: verified valuable count (ADAPT+ADOPT), commits, verdict breakdown,
   top 5 highest-value finds with one-line transfer notes.

## Repo safety

- Sports repo is the system of record; workspace is scratch. All sports research
  lives under `docs/research/<date>/`.
- Untracked DFS/Week-2 files exist in the tree (e.g. `docs/research/2026-09-19*`) —
  leave them alone.
- `gse-grok-build-sandbox` is isolated by design — never wire or touch it.
