# Gate-wiring shadow registry

Batch-wise shadow registration of landed-not-wired modules from the
Oct 13 gate sweep (`docs/ops/SWEEP-2026-10-13-GATES.jsonl`, 229 rows;
182 landed-not-wired), executed per Grok's WO-1 wiring plan: prioritize
by pipeline exposure; per module — confirm no μ contact, sign-convention
audit (μ = +spread_line), characterization test pinning current
behavior, feature-flag/record defects, register as shadow weight 0.

**What shadow registration is:** a registry entry in
`shadow-registry.json` plus characterization tests co-located with the
module. **What it is not:** no production caller is added, no production
file is modified, no behavior changes, nothing merges without the
migration-ledger runbook and two-agent review. Weight is 0 for every
entry; emission stays ZERO_OBJECT.

## Batch 1 (2026-10-15) — 5 modules

| Sweep id | Module | Tests before | Characterization added |
|---|---|---|---|
| G-21 | apps/web/lib/auth/age-gate.ts | 6 (co-located) | 7 pins |
| G-22 | apps/web/lib/auth/csrf-origin-guard.ts | **none** | 9 pins (first suite) |
| G-25 | apps/web/lib/claude-api/numeric-guard.ts | **none** | 14 pins (first suite) |
| PE-125 | packages/prediction-engine/src/markets/1910-08858v2-spread-win-probability-table.ts | 5 (co-located) | 10 pins |
| PE-048 | packages/prediction-engine/src/decision/2104-08236v1-totals-abstention-sigma.ts | 9 (co-located) | 10 pins |

Plus `shadow-registry.test.ts` (4 integrity tests). Full run at build
time: **74/74 tests pass** (54 new + 20 pre-existing in the same files'
suites), vitest, node environment, mirrored-tree harness.

## Defects recorded (pinned, not fixed — characterization first)

1. **PE-125 name/content mismatch:** no spread→win-probability table
   exists in the file; generic scoring utilities only; its own header
   records the P(Win|PS) gate as NOT EVALUATED.
2. **PE-125 spearman ties:** ties broken by position, no rank averaging —
   a constant series returns ±1.
3. **G-25 phantom magnitude claim:** a ≥2-decimal percent also yields a
   magnitude claim for its truncated prefix; fail-closed but makes
   two-decimal percents effectively unvalidatable.
4. **G-21 stale framing:** the 21+ checkout gate was removed 2026-09-14
   by founder decision; the module is retained utilities. Registration
   is documentation-grade — do not wire into checkout.
5. **PE-048 publish-shaped surface:** publish rule + gate helper sit
   behind `ENABLED = false`; the characterization pin on that flag is
   the tripwire against silent activation.

Full per-entry detail: `shadow-registry.json`.

## Batch 2 (2026-10-15)

Five more gates registered under the same doctrine, built on batch 1's
head: **G-04, G-10, G-06, G-08, G-05** (triage order from the batch-1
deliverable, highest exposure first). Ten gates are now registered; the
registry integrity test asserts exactly those ten.

| Gate | What it guards | New characterization tests |
| --- | --- | --- |
| G-04 Signal Spine | Turns game facts (weather, implied totals, spread/favourite, vacated usage, coverage losses, airwave consensus, thin samples) into signed per-player fantasy-point effects | spine.characterization.test.ts (15) — extends spine.test.ts (19) |
| G-10 Proper Scoring Gate | The publish sweep's scoring check: refuses to score non-finite or out-of-(0,1) probabilities and non-binary outcomes; emits Brier + reliability diagram | publish-guards-bridge.characterization.test.ts (14) — extends publish-guards-bridge.test.ts (14) |
| G-06 Per-Market Calibration Gate | Per-market publish floors (ECE vs a Monte-Carlo null band, Brier vs no-skill, reliability, anti-constant resolution) for moneyline/spread/total/props | per-market-gate.characterization.test.ts (14) — the module shipped with NO test file of its own |
| G-08 Model Promotion Gate | Whether a challenger model may replace the champion: paired-Brier empirical-Bernstein leg AND CLV non-inferiority leg, under walk-forward integrity | evaluate.characterization.test.ts (8) — completes the decision table of evaluate.test.ts (9) and six sibling suites |
| G-05 Contest-Shape Guard | DFS contest-shape advice (cash / gpp / leverage) from payout rate and field size | dfs-signals.characterization.test.ts (8) — extends dfs-signals.test.ts (14) |

Defects pinned in batch 2 (each with a failing-behavior characterization
test and a flag in `shadow-registry.json`; none silently fixed):

- **G-04** — `SignalEffect.severity` is documented `0..1` but reaches
  **1.3** on the usage paths (environment scalar applied after the clamp);
  a WR vacated-usage weight reaches 7.15 in a top offense. Also: the
  `spread` field's unsigned-magnitude convention is undocumented
  in-module (a negative spread silently yields no blowout effect).
- **G-10** — `evalReliability` never validates `bins`: `bins = 0` returns
  `ok: true` with an **empty reliability diagram**. Also recorded: the
  gate has **no production caller** (barrel re-export only).
- **G-06** — **fails open on garbage**: all-NaN metric inputs return
  **PASS** (every check is a comparison NaN makes false; no finiteness
  validation). Also: the PROPS floor row is the pooled moneyline default,
  unmeasured for props (module header says it must be re-derived).
- **G-08** — no defect in the evaluator itself; two contract-named gaps:
  dark-by-contract posture (founder-applied promotion), and the missing
  trials registry + Leg-2 CLV evidence lane the contract requires before
  any live use.
- **G-05** — `ContestShape.singleEntry` is a required field `adviseMode`
  **never reads**: contests differing only in `singleEntry` get identical
  advice.

Caller honesty notes (batch 2 verified each gate's wiring state by code
search rather than trusting the sweep): G-04's spine has five
production-lib importers; G-06 has a production ops caller that records
its verdict report-only; G-05's `adviseMode` is called by `dfs-solve.ts`;
G-10's `evalReliability` has no caller at all; G-08's evaluator is
surfaced only through the G-10 bridge wrapper and the package barrel.

Test evidence (local vitest run at build time; the ingestion bridge was
run against a harness alias re-exporting the identical certificate /
promotion modules the real package barrel re-exports — verified symbol
for symbol): before batch 2, 179 tests green (74 batch-1 + 105
pre-existing in the batch-2 areas); after, **238 tests green**, zero
failures, zero production files modified.
