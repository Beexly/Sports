# Week 10 Sunday Dual-Lock Issue Tracker (Archived Log — 2026-11-15)

Archived from `docs/agents/issue-tracker.md` during `/setup-matt-pocock-skills` alignment so `docs/agents/issue-tracker.md` holds canonical issue tracker operations.

- Canonical task ledger: [AGENT_LEDGER.md](file:///C:/Users/Garrett/Sports-wt-triage/docs/ops/AGENT_LEDGER.md) (`AUTON-WEEK10-DUAL-LOCK-25`)
- Canonical vocabulary: [GLOSSARY.md](file:///C:/Users/Garrett/Sports-wt-triage/GLOSSARY.md)
- Standing cadence rule (Week 11+): Full 14-game 10,000-world workflows, DFS packets, storefront sync, and Owner's Master Call-Sheet MUST be completed and locked by Friday at the latest; Sunday morning is strictly a rapid delta-only swap on newly ruled-out starters.

## Workstreams
1. `ISSUE-W10-00` (DONE): Reclaim disposable disk caches (`C:` free space `3.52 GiB >= 3.5 GiB`) without removing worktrees, tracked files, `data/`, or `foundry/artifacts/`.
2. `ISSUE-W10-01` (DONE): Integrate 6 unmerged 48h branches & refresh corpus compilation (`07_corpus_wired_calibration_and_hold_gate_receipt.json`).
3. `ISSUE-W10-02` (DONE): Wire Stage-2 `corpus_conditioner` into `gse_connected_game_workflow.py` (TDD) & serialize real two-sided `over_american`/`under_american` in `build_week10_game_boards.py` (never fabricate `-110/-110`).
4. `ISSUE-W10-03` (DONE): Purge `Malik Davis` / stale `DAL @ IND` from `coach-writeup-engine.ts`, repoint hardcoded record strings to `@/lib/ledger/public-record`, publish pick-free SEO/social pack & owner cutover wizard.
5. `ISSUE-W10-04` (DONE): Lock 1 (`ee96a5b4c` pushed to `origin/main` -- `12` unstarted Week 10 games through 6-stage workflow at `n_sims=10000`, `4` remaining live DK DFS slates with `NE @ DET` Munich sealed, guardrails, production Next.js build verified).
6. `ISSUE-W10-05` (DONE): Lock 2 after official NFL Noon 90-minute inactives (`353` total excluded / `49` newly ruled-out Noon players incl. Jordan Addison, Ja'Tavion Sanders, Wyatt Teller, Kevin Zeitler + `177` Bovada line/juice moves; re-ran 7 Noon games at `n_sims=10000` + refreshed aggregates, rebuilt `156416` & `156418`, synced storefront, and generated Owner's Master Call-Sheet).
