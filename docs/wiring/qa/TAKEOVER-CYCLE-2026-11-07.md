# Takeover build-loop cycle — 2026-11-07 (public-surface honesty sweep)

Cycle: `takeover-build-loop` (9cbc1ee94767). Previous runs failed on provider 403s;
this run executed the owner cycle on live-verified state.

## Ledger of record (source of truth)

`data/engine/new_engine_official_ledger_2026.json` (as_of 2026-11-02):
verified_record = **36-13-1 (73.5%) · +20.14u** (MAIN + DERIVATIVE + TNF SINGLE-STAKE).
Secondary views: 38-13-1 (+22.85u), 40-15-1 (+22.50u), 47-19-1 (+24.92u, all-in with
route-gated props + MNF slip). The voided Nov 5 batch (62-23-1 · 72.9% · +26.50u) must never
appear. Legs reconcile exactly: 16-5-0 (+10.45) + 14-6-1 (+7.19) + 6-2-0 (+2.50) = 36-13-1 (+20.14).

## What changed this cycle (commit in repo history)

Public surfaces were presenting the **all-in secondary 47-19-1 as the verified record**,
and `/benchmarks` was publishing a **refuted 95.93 composite as verified**. Both are
ledger-backed falsities. Fixed across customer-facing + operator surfaces:

1. **Verified banner everywhere → 36-13-1 (73.5% · +20.14u)**, 47-19-1 kept only as
   labeled all-in secondary: packages, slug, board, picks, pricing, props, SGP,
   research, calibration, homepage RedlineWorld modal, cockpit/bot-hq, hermes suite,
   ask-jarvis panel, brain lib (typed seasonLedger), conversion-pack + bot-sdk routes,
   ai-plugin manifest, llms.txt (both copies) + llms-full.
2. **Benchmarks page**: 78-item/87.38 table → the **14 real JSONL rows (100.00, N=1)**;
   35,119/95.93 → marked **WITHDRAWN** (zero item-level records, receipt hash mismatch);
   registry inventory now carries only adjudication-verified facts (21,419 re-count,
   21,419 executions, 6,558 entities, 19/19, 114/114 reseal). Proof screenshot gallery
   removed (kills the `<img>` lint failure + false receipts); 4 proof PNGs deleted.
3. **Calibration proof room**: fabricated Brier 0.178 / CLV +284 bps / 87-100 pass /
   small-n bands / synthetic settlements (incl. pulled NYJ ML as WIN) replaced with
   measured values: Brier **0.2484 vs coin 0.25** (Sep 2026, score only, ranking monotone),
   signal-path bands 60-69→57 (n423), 70-79→66 (n247), 80-89→68 (n59), sealed-board
   counts 573/295, and the 3 verified ledger legs. Research page 87.2%/+2.84% removed,
   replaced with sealed counts (573/295/278/50).
4. **Voided-batch contamination purged**: +26.50u hybrids (llms.txt, video lib summary
   wins 62, fixture JSON wins 62, newsletter 22-8-1/+12.40u sweep) corrected to ledger
   legs; NYJ ML pulled-leg claim corrected in the Week 8 newsletter.
5. **Tests updated in lockstep** (storefront, mega-sweep, jarvis, cockpit, hermes,
   marketing) — verified-record assertions added; voided-batch negative guards kept.
6. **Executor noise reverted, not committed**: duplicate grading_feedback rows,
   charge-regression timestamp churn (still claims 10/10 vs adjudicated 8/10),
   regenerated dossiers (signal families regressed 259→223, outside the adjudicated
   259-277 range), week9 packet JSON rewrite, and an unvalidated ARI QB swap
   (Clayton Tune → Gardner Minshew II, line restored; validate before shipping).

## Verified this cycle

- Live: homepage 200 (0.41s), /packages 200, /benchmarks 200, /fantasy/dfs 200.
- Live /benchmarks carried 35,119×26, 95.93×10, 47-19×2, LiveBench×44 (pre-fix).
- Ledger legs reconcile to 36-13-1/+20.14u exactly (checked in code).
- 14 JSONL rows re-read: 8 OpenRouter + 6 LiveBench, programmatic_score 1.0 on all.
- No 62-23-1, +26.50u, 0.178, or +284 bps string remains in apps/web sources
 (only guarded negative assertions in tests).
- Disk recovered: 10-11G free (was 1.2G/100%). apps/web/node_modules is a 5KB stub —
  eslint/vitest/tsc could not run locally; CI is the gate this cycle.

## Named, NOT fixed (founder-gated / needs its own gate decision)

- **Epistemic gate 3 failures** (CI 42385253569): gate-JSON contract break
  (`pre_sim_gate_passed`/`layers` missing — producer returns without writing) and
  Stage-0 contamination in the TNF master bundle (`roster_truth_player_adjustments`
  carries off-roster Travis Etienne Jr. as canonical JAX). Needs producer/test/schema
  decision + bundle surgery; do not hand-patch sealed evidence.
- **Watchdog red (5 consecutive)**: `/api/ops/public-surface-truth` exceeds the
  30s client cap (~21 serial awaits; handler maxDuration is 120). Fix = parallelize
  the handler (code change) or raise the workflow timeout (founder-owned file).
- **api-route-boundary**: `/api/ask-edge` unguarded (baseline 64) + `<img>` lint.
  Lint fixed this cycle by deleting the gallery. The guard itself is sealed-baseline
  territory: add requireApiKey/entitlement guard or baseline with documented reason.
- **JAX @ BAL TNF (Week 9)** still ungraded in the ledger (scoreboard file stale "pre").
  Grading needs the full 5-stage + fresh PBP pass — out of scope for this cycle.
- **Truth route internal 404** (`/api/gse/v1/truth` returns internal_surface to
  unauthenticated curl) — by design; not a regression.
- Spine frontier model names remain unverified routing labels (disclaimed on-page);
  renaming the lib spine needs a product call.
- Charge-regression 10/10 (working copy) vs 8/10 (adjudicated env): treat as
  environment-dependent; left at HEAD (10/10) with this note, not re-litigated.
