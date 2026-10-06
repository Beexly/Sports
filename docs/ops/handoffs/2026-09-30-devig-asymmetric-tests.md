# Handoff: asymmetric-input devig tests (Session 1)

Date: 2026-09-30. Family: MARKET / devig adapters. Branch `test/devig-asymmetric-inputs-2026-09-30`.
Parent: `docs/ops/total-signal-wiring-program.md` Session 1. Predecessor handoff:
`docs/ops/handoffs/2026-09-30-signal-inventory.md` (Session 0, PR #967).

## 1. Mission
Test-only. Pin the #965 devig fix with asymmetric-input tests that FAIL on the old code.
The existing tests used `-110/-110` and the invalid method string `"proportional"`, and
neither could tell a correct de-vig from a wrong one.

## 2. What changed
Two test files, no production code:

| File | Change |
|---|---|
| `packages/prediction-engine/src/engine/extended-signal-adapters.test.ts` | +5 tests in a `devigAdapter: asymmetric American inputs` block |
| `packages/prediction-engine/src/engine/market-odds-adapters.test.ts` | +6 tests in a `devigOracleAdapter: method selection on asymmetric books` block; the existing `"proportional"` case changed to `"multiplicative"` |

## 3. Proof
- **Full engine suite, this branch:** 858 files passed / 1 skipped (859), 6306 tests passed /
  2 skipped (6308), 0 failed. Duration 136.76s.
- **Targeted files:** 27 passed / 27 (11 + 16), up from 16.
- **Non-vacuity, proved by me:** reverted both source files to `3e074c584^` (pre-#965) with the
  new tests in place: **9 of the new tests fail**, then restoring HEAD returns 27/27. The nine
  failures include `expected 0.5319 to not be close to 0.5319` (the old decimal-price reading)
  and `expected -3 to be greater than 0` (the old adapter's `awayFair` was a NEGATIVE
  probability at `-150/+200`).
- **Typecheck:** `tsc --noEmit` in `packages/prediction-engine`, exit 0.
- **Guardrails:** `node scripts/guardrails/run-all.mjs` 25/26. The one failure is
  `dependency-audit` on the unwaived `brace-expansion` HIGH, identical on `main` (PR #967 run
  36761527245 fails the same job). Not caused by this branch and not fixable here: the fix means
  `package-lock.json` or a dated waiver, both forbidden to agents (`AGENTS.md:1210-1212`).
- Individual gates run directly, all exit 0: trust-gate (3479 files), secret-scan --all (11722
  files), em-dash-scan (9 files).

## 4. What the tests pin
Values below are the multiplicative/additive de-vig of the decimal prices, verified by running
`devig/oracle.ts` directly (probe script deleted after use; not in the commit).

`devigAdapter` (American -> decimal -> `devig(..., "multiplicative")`):
- `-110/-125` -> `homeFair 0.4853`, `awayFair 0.5147`, `overround 0.0794`. Old code: `0.5319`.
- `-150/+200` -> `0.6429 / 0.3571`, sum 1. Old code: `4.0 / -3.0`, a probability outside [0,1].
- `-105/+105` -> `0.5122`. Old code divided by exactly zero (`1/-105 + 1/105 === 0`), so it
  returned a non-finite number. This pair is the cheapest possible regression guard.
- zero American price -> fail-closed with a reason naming American odds.

`devigOracleAdapter` (method genuinely selectable):
- `[-110,150]` additive -> `[0.5619, 0.4381]`; multiplicative -> `[0.567, 0.433]`. The old body
  returned the multiplicative vector under every method name while labelling it additive.
- `[-110,-110,200]` shin -> `[0.3909, 0.3909, 0.2182]` vs multiplicative `[0.3793, 0.3793, 0.2414]`.
- Six methods on the three-way book: sums to 1, every leg in (0,1), `raw.method` equals the
  method requested.
- `"proportional"`, `"bogus-method"`, `null`, `undefined` -> `raw.method === "multiplicative"`.
  The old adapter echoed the caller's string verbatim into `raw.method`, which is the same
  claim-versus-computation gap #965 closed elsewhere.
- zero American price -> fail-closed.

## 5. Calibration state
None of this touches calibration. No gate, weight, schema, `MODEL_VERSION`, env or DB touched.
No production caller of either adapter was changed; the adapters themselves are unmodified, so
no published number moves.

## 6. Resume point (next agent, in order)
1. Session 2 (per the program doc and the Session 0 handoff): populate injuries, then ratings,
   weather and snaps into the production bundle at
   `apps/web/lib/picks/intelligence-enrichment.ts:116-145`, field names per
   `apps/web/lib/intelligence-core/engine.ts:63-75`. Shadow only.
2. Session 3 (`composeLedger`, `signal-ledger.ts:76`): get a current `signals` row count from
   `apps/web/app/api/ops/signal-ledger-state/route.ts:40` first. The ledger's 84,500 is a doc
   figure from `AGENT_LEDGER.md:563`, not a fresh count.
3. Blocked on Garrett, do not decide: every item in the inventory's "Decisions that belong to
   Garrett", plus the `brace-expansion` waiver vs `package-lock.json` call.