# W009 — Hypothesis-to-Instrument v0 (contract frozen 2026-07-17)

**Objective.** `WORKSTREAM_QUEUE.md`'s W009 row names the goal as "convert
research into versioned product metrics," depending on W004 (SportsIR) and a
"historical harness." Both dependencies are now verified real:
`apps/web/lib/backtest/harness.ts` (`runBacktestHarness`) is a pure,
deterministic, content-hash-provenanced calibration re-proof over settled
picks — the "historical harness" the queue row names — and W004's
`SportsIrClaim` primitive is ADAPTED and reusable.

**What this is not.** `packages/prediction-engine/src/edge-lab/trials-registry.ts`
already exists and is a real, rigorous, hash-chained admission system
(Benjamini-Hochberg FDR correction, family-level admission decisions) for
deciding whether a candidate FEATURE/THRESHOLD/MODEL gets admitted into the
live model during research. W009 is a different, later lifecycle stage: it
does not decide what goes into the model. It packages a RESULT the model
already produced — the backtest harness's own already-computed,
already-audited climatology comparison over SETTLED picks — into a
versioned, content-hashed, citable record. No statistical judgment is
invented here; the harness's own `climatology.modelBeatsClimatology` boolean
is the entire signal. This avoids the "uncontrolled multiplication of
parallel systems" this session has repeatedly guarded against: W009 wraps,
it does not re-decide.

**The gap this closes.** The harness produces a rich `BacktestHarnessReport`
every time it runs, but that report has no stable identity across runs — two
reports for the same underlying hypothesis ("does the model beat the
climatology baseline?") have no shared key a downstream consumer (a future
product surface, a future SportsIR Claim, a future public metric) could
reference. `HypothesisInstrument` gives that one hypothesis a stable
identity, a versioned schema, and an honest status vocabulary that mirrors
the harness's own honest-zero-floor discipline instead of collapsing
"insufficient sample" and "tested and failed" into the same falsy value.

**Scope (thin vertical slice).**
1. `apps/web/lib/hypothesis-instrument/types.ts` — `HypothesisKind` (a
   closed union; v0 has exactly one member, `MODEL_BEATS_CLIMATOLOGY` — the
   only comparison `BacktestHarnessReport` actually computes today), a
   4-state `HypothesisInstrumentStatus` (`SUPPORTED` / `NOT_SUPPORTED` /
   `INSUFFICIENT_SAMPLE` / `UNTESTED`), and the `HypothesisInstrument`
   interface itself: `schemaVersion`, `instrumentId` (a STABLE identifier
   keyed off the hypothesis kind, not a content hash — a lookup key, not a
   value), `hypothesis`, `status`, `sampleSize`, `modelBrierScore`,
   `climatologyBrierScore`, `edgeOverClimatology`, `sourceHarnessVersion`,
   `sourceReportHash` (= the harness's own `provenance.outputHash` — this
   instrument never re-hashes the report body, it cites the harness's
   existing hash), `generatedAt`, `digest` (this instrument's OWN content
   hash, distinct from `sourceReportHash`).
2. `apps/web/lib/hypothesis-instrument/build.ts` —
   `buildModelBeatsClimatologyInstrument(report: BacktestHarnessReport, hash):
   HypothesisInstrument`. Pure, synchronous, zero I/O — takes an
   already-computed report, derives `status` directly from the report's own
   fields (never re-derives a comparison the harness didn't already make):
   `settledSampleSize === 0` → `UNTESTED`; `climatology.modelBeatsClimatology
   === null` → `INSUFFICIENT_SAMPLE` (this also correctly covers the
   all-PUSH edge case where `settledSampleSize` clears the floor but
   `binarySampleSize` is zero — the harness withholds climatology there even
   though its own top-level `status` reads `"ok"`, so this module reads the
   climatology field itself rather than trusting the coarser `status`
   string); otherwise `SUPPORTED`/`NOT_SUPPORTED` from the boolean directly.
   Digest computed via the same `canonicalJson` (from
   `@/lib/intelligence-playback/canonical-json`) + injected `hash` function
   pattern `reality-receipt/build.ts` already established — no new hashing
   scheme.
3. `apps/web/lib/sports-ir/adapters.ts` — one new pure function,
   `hypothesisInstrumentToSportsIrClaim(instrument, subjectEntityId)
   : SportsIrClaim`, the concrete W004 integration the queue row names.
   `subjectEntityId` is caller-supplied (never guessed — same discipline as
   `makeSportsIrEntity`): a `MODEL_BEATS_CLIMATOLOGY` instrument is not
   scoped to one game or pick, so nothing in the instrument itself can
   honestly supply an entity id. `confidence` is `null` — a
   SUPPORTED/NOT_SUPPORTED test result is not a calibrated probability, and
   fabricating one would violate the repo's "no fabricated stats" rule.
   `statement` renders the real numbers when present and an honest
   plain-language withholding note when the instrument is
   `INSUFFICIENT_SAMPLE`/`UNTESTED` — never a templated string with `null`
   interpolated into it.
4. `apps/web/lib/hypothesis-instrument/index.ts` — barrel export.
5. `apps/web/lib/hypothesis-instrument/__tests__/build.test.ts` — REAL
   `BacktestPickInput[]` fixtures run through the REAL `runBacktestHarness`
   (never a hand-built `BacktestHarnessReport`), proving: empty input →
   `UNTESTED`, `sampleSize` 0; a below-floor sample → `INSUFFICIENT_SAMPLE`
   with all score fields `null`; the all-PUSH edge case (settled sample
   clears the floor, binary sample is zero) → `INSUFFICIENT_SAMPLE`, not a
   crash or a fabricated `SUPPORTED`; a real sample where the model beats
   climatology → `SUPPORTED` with the exact Brier numbers `brierDecomposition`
   itself would produce; a real sample where it does not → `NOT_SUPPORTED`;
   `instrumentId` stable across two different reports for the same
   hypothesis kind; `digest` changes when the underlying report's numbers
   change and stays identical for two runs of identical inputs (mirrors the
   harness's own reproducibility test).
6. `apps/web/lib/sports-ir/__tests__/adapters.test.ts` — new test(s) proving
   `hypothesisInstrumentToSportsIrClaim` against a REAL `HypothesisInstrument`
   built from a REAL harness report, asserting `confidence` is always `null`,
   `subjectEntityId` passes through exactly, and the statement text contains
   no literal `"null"` substring in any status branch.

**Explicitly out of scope for v0** (fast-follow candidates, not blockers):
additional `HypothesisKind` members (e.g. a per-model-version calibration
instrument off `byModelVersion`) — each new kind requires its own
already-audited harness signal to wrap, not invented here; persistence — v0
is a pure, on-demand transform, exactly like every other v0 this session;
any API route or UI surface — this is a backend data-shaping capability
only; any public claim or marketing copy — see the required precondition
below.

**Protected zones.** evaluation/claims (per the workstream's own queue row).
This is the closest any workstream has come to "public performance claims"
territory this session, so scope is deliberately conservative: zero new
statistics, zero new comparisons, only a stable-identity/versioning wrapper
around a comparison the harness already makes and already tests.

**REQUIRED before any live/public wiring (not optional — same pattern as
DEC-021's W005 finding and DEC-024's W007 finding).** Neither
`HypothesisInstrument` nor its `SportsIrClaim` projection may be surfaced on
any public page, marketing copy, or product metric before: (1) a
gse-red-team / legal-adjacent review confirms the sample-size/withholding
discipline cannot be bypassed by a future caller (e.g. a route that ignores
`status` and prints `edgeOverClimatology` directly), and (2) this repo's
"no fabricated stats" non-negotiable rule is re-verified against the exact
rendering surface, not just this module. v0 has zero callers today
(confirmed: zero references to `buildModelBeatsClimatologyInstrument`/
`hypothesisInstrumentToSportsIrClaim` outside their own definitions/barrel
exports/tests), so nothing is exposed yet.

**Acceptance criteria.** All new tests green; `tsc --noEmit` clean;
`eslint --max-warnings=0` clean on touched files; `npm run guardrails`
green; the existing backtest-harness and sports-ir test suites re-run green
with zero changes needed; zero new API routes, zero new DB access, zero UI
changes.

**Verification commands.**
```
npx vitest run apps/web/lib/hypothesis-instrument apps/web/lib/backtest apps/web/lib/sports-ir
npx tsc --noEmit -p apps/web/tsconfig.json
npx eslint --max-warnings=0 apps/web/lib/hypothesis-instrument/**/*.ts apps/web/lib/sports-ir/**/*.ts
npm run guardrails
```
