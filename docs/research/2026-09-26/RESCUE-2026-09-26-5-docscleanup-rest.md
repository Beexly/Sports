# Rescue 2026-09-26 (5/6): the rest of docs-cleanup (PR #918)

- From: hermes → (Garrett / Mimo)
- Created: 2026-09-26
- Status: done (with one honest gap — read "Verification")
- Repo: `Beexly/Sports` · branch: `hermes/port-docscleanup-rest`
- PR: [#918](https://github.com/Beexly/Sports/pull/918) (draft, 45 files, +10,360)

## What landed

Everything on `mimo/docs-cleanup-calib-2026-09-21` that #914 did not already take
and that is still worth landing. 42 files plus a guard.

- **News wire as a stored feed (C-416/C-417).** `wire-store` (curated roster feeds
  → `Signal` rows), `reporter-roster`, the 10-minute `refresh-wire` cron, and the
  watchlist alert hooks. The module claims "no migration" — **verified against
  `main`**: `Signal` already carries exactly
  `@@unique([entityType, entityId, key, season, week])`, which is the dedup key the
  store depends on. `dispatchWatchlistAlert` and
  `classifySignal`/`SIGNAL_MAGNITUDES` also already exist on `main`, so the hooks
  hang off real seams instead of re-deriving gate, kill switch or channels.
- **Ingestion.** `exchange-tape-capture` (Kalshi tape + book, forward-only),
  `mint-withhold` (WITHHOLD-ONLY gates), `prop-sample-reader` (first production
  caller of `decodePropMarket`).
- **Prediction engine + types.** `venn-width-harness`, `weather-game-field`,
  `ranking-candidates`, spread-consensus clause test.
- **Ops.** `checkout-price-posture` and `line-archive-freshness` — the two alarms
  this repo did not have for a checkout that had been 503-ing and a line archive
  that had silently stopped three weeks earlier.
- **L11 calibration evidence** (2 proposals + 2 evidence JSONs) **and the guard it
  never had** (below).

## The guard, and the two findings it produced

`docs/calibration-proposals/evidence/verify-evidence.test.mjs` — 15 tests:

```
node --test docs/calibration-proposals/evidence/verify-evidence.test.mjs  →  15 passed, 0 failed
```

It re-derives every recorded delta from the two scores it claims to difference,
checks each Wilson band is arithmetically possible, each P(better) a whole number
of the resamples it declares, intervals ordered, MDEs positive **and commensurate
with their own interval**, the 13/20 split accounting for all 33 holdout rows,
and `MODEL_VERSION` still frozen at v5.2.7. It cannot tell you a measurement was
right — only that the recorded pieces still add up, so one side cannot be edited
alone.

**Finding 1 — the A8 evidence was an orphan.**
`2026-09-15-a8-boltzmann-vs-isotonic.json` was cited by nothing. It predates the
factor-spec convention and shipped beside a v530 proposal that never mentions
Boltzmann or isotonic. Fixed by writing down what it supports: factor **A8**,
whose pre-registered MDE of 0.05573 is the number the artifact records, and whose
BLOCKED status follows from its own kill line ("validate-era Brier ≥ isotonic
Brier"; Boltzmann 0.2558 vs isotonic 0.2148). The test now fails if that mapping
is deleted without re-pointing the citation.

**Finding 2 — A8 ran on the synthetic fixture.** The artifact's `source` is
`packages/verifier/fixtures/picks-h1.json` with `fromFixture: true`; there is no
real `verifier/picks-h1.json` export on `main`. Now pinned by a test, so a later
edit cannot imply a real holdout was measured. **A8 should stay BLOCKED on that
basis** — a re-run against a real export is what would change its status, not a
re-reading of the file.

## Verification — the honest gap

- All 38 TypeScript files transpile clean (esbuild, **syntax level only**).
- Every relative import in the ported tree resolves; nothing imports
  `@sports/verifier`, so this branch does not depend on #914.
- The evidence guard: 15/15.
- **The 31 product files have NOT been executed.** `vitest` cannot run on the
  authoring host and `tsc` there is a phantom pass (a `const s: string = 42`
  control exits 0 with no output). They are reviewed-and-transpiled, not tested.
  **CI on `ubuntu-latest` is the first real execution of them**, and this PR must
  not be merged on a green transpile.

## Deliberately not ported

- `docs/ops/SESSION_LOG.md`, `2026-09-14-SONNET-HANDOFF.md` — session transcripts.
- `docs/ops/CALIBRATION_STATUS.md` — a status board computed from production SQL on
  2026-09-21. A stale board is worse than none.
- `docs/research/2026-09-21/GOOGLE_DEEP_RESEARCH_BRIEF.md` — a paste-into-Deep-Research
  prompt embedding a stale commit sha and the public URL.
- `docs/data/receipts-snapshot-2026-09-08.json` — a dated production data dump.
- `docs/INDEX.md` — a hand-maintained index `main` has deliberately not had.
- `docs/ops/LAST_PLAN_2026-09-15.md`, `archive/STALE_BRANCH_TRIAGE_2026-09-21.md`
  — point-in-time planning and a triage snapshot of now-resolved branches.

## The most valuable un-ported document

**`docs/research/2026-09-21/RESEARCH_TO_PRODUCT_PLAYBOOK.md`** — a synthesis layer
over the **1,511 `arxiv-deep/` ledgers already on `main`**, mapping papers to GSE
techniques with numeric acceptance gates ("750/750 valuable"). It is deliberately
not in this PR: its transfer claims deserve their own review rather than riding
along with a code port. **Recommend it as the next piece of work** — it is the
highest-leverage un-ported asset on either branch, and the one most likely to
inform which factors are worth building next.
