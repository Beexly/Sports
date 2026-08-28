# HERMES DISPATCH — GREEN BOARD G-1 (2026-08-28)

Mission context: `docs/strategy/GREEN-BOARD-DOCTRINE.md` (read first, 5 min).
Verified math basis: `docs/ops/calibration/2026-08-28-res-night-verified/`
(RESULTS.md + VERIFICATION.md — cross-model replicated; treat as ground truth).

Branch: `hermes/green-board-1` off LATEST main (`git fetch origin main` first —
your clone has been stale twice). One task = one commit. Verify block before
every commit (typecheck 0 · lint 0 · task's tests green). Every task ends in
**code + tests + numbers, or BLOCKED with the exact error** — a markdown file
with no code is a failed task. Two attempts, then BLOCKED, move on.

HARD RULES (unchanged): no schema.prisma/migrations, no gate/env flips, no new
data sources, no scraping, docs edits only where a task says so. Probabilities
come ONLY from the verified de-vig path — reference implementation:
`docs/ops/calibration/2026-08-28-res-night-verified/res_backtest.py` (devig
formula + orientation check). If any number you produce is worse than
coin-flip for a market-derived quantity, STOP — that is a bug alarm, not a
result.

## GB-1 — the predicate (pure, tested)

New file `packages/prediction-engine/src/green-board.ts`:

```ts
export const GREEN_P_MIN = 0.70;          // board average target ≥ 0.72
export const INDEPENDENT_DISSENT_BAND = 0.06; // independent > 6pts under p* = veto
export interface GreenGateInput { calibratedP: number; bookmakerCount: number;
  freshnessOk: boolean; independents: { elo?: number|null; poisson?: number|null;
  fpi?: number|null }; vetoFlags: readonly string[]; }
export interface GreenGateResult { green: boolean; reasons: readonly string[]; }
export function greenBoardEligible(input: GreenGateInput): GreenGateResult
```

Semantics: G1 p ≥ GREEN_P_MIN; G2 bookmakerCount ≥ 2 && freshnessOk; G3 any
present independent more than DISSENT_BAND below calibratedP → veto (absent
independents are NOT a veto and NOT a boost); G4 vetoFlags empty. reasons[]
names every gate that failed (or ["GREEN"]). Pure function, no I/O.
Tests (table-driven): boundary 0.699/0.700; dissent at exactly the band edge;
each veto flag; missing independents; 1-book veto; stale veto.

## GB-2 — SITREP v1 hard vetoes (pure extraction from existing covariates)

New file `packages/prediction-engine/src/sitrep-vetoes.ts`: pure function from
the fields the pipeline already computes (enrichGameContext / covariate bus /
odds snapshots) to `{ flags: string[], provenance: string[] }`. v1 flags only:
`REST_DEFICIT` (rest differential ≤ −2 days), `QB_OUT` (starting QB out/doubt
from injuries data when available), `HIGH_WIND_TOTAL` (wind > 20mph, totals
picks only), `REVERSE_LINE_MOVE` (line moved opposite the price-implied
direction between OPEN and latest snapshot when both exist). Absent data =
no flag (honest miss), never a guess. Tests per flag + absent-data cases.

## GB-3 — read-side GREEN lane (ZERO persistence changes)

Green is COMPUTED, never stored: wire the predicate read-side so
`/api/picks?lane=green` (and the board query layer) filters published picks
through greenBoardEligible using persisted fields (confidence/trueProb path
for calibratedP — use the SAME resolver calibration-metrics uses;
bookmakerCount; freshness; independents from PickSignalSnapshot where present).
Entitlements unchanged: FREE sees yesterday's settled greens, paid sees today's
(reuse existing tier filters — do not touch entitlement logic itself).
Tests: route-level, green filtering + tier behavior unchanged.

## GB-4 — the retro-record (THE MONEY TASK)

Read-only script `scripts/ops/green-board-retro.ts`: run greenBoardEligible
retroactively over ALL settled published picks (same read-side field mapping as
GB-3), and report — overall and per sport|market: candidates, greens fired,
realized win rate, Wilson 95% CI, average calibratedP (expected rate), and
realized-vs-expected gap. PRE-REGISTERED: report whatever it says, including
"greens underperform their p" — that result redirects G4 tuning and is
valuable. Output to
`docs/ops/calibration/2026-08-28-green-retro/RESULTS.md` with the run log.
DO NOT tune thresholds to make the retro look good — thresholds are fixed
above; the retro MEASURES them.

## GB-5 — Green Board surface v1

`apps/web/app/green/page.tsx` (server component, existing design tokens):
today's greens for entitled users (each with p*, books, reasons/SITREP flags),
yesterday's settled greens for everyone, and the record ticker: realized win
rate WITH Wilson CI + n + average expected rate, from GB-4's same computation
(shared lib function, not copy-paste). All copy must pass trust-gate —
no "guaranteed", no win-rate CLAIMS in prose; the ticker is a ledger readout
labeled "record in progress" until the check-claims floor. States: empty board
("no green today — the gates said no, that is the product working") rendered
honestly.

## Definition of done (whole dispatch)

Suites green in both touched packages + apps/web tests for new routes;
typecheck 0; GB-4 RESULTS.md with real numbers; ledger rows per rules; push
`hermes/green-board-1`. Claude then verifies GB-4 clean-room (independent
re-implementation over the same picks) before any number is believed or
displayed — same rule applied to everyone's numbers, no exceptions.
