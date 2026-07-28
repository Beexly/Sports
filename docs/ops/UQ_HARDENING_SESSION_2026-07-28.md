# UQ Honesty Stack — Hardening Session, 2026-07-28

**Companion**: `docs/ops/UQ_HANDOFF_2026-07-24.md` (the design handoff this
session executed against). This document reports what was actually done —
verification, testing, one dedup fix, and one new module — not a re-synthesis
of the design.

## 0. Headline finding: the handoff's premise was mostly already true

The 2026-07-24 handoff assumed the listed modules existed but were untested
and unwired. On inspection (this session), that was true for "untested" but
**not** for "unwired": `selective-gate.ts` already consumed IVAP/CVAP
multiprobability as its primary interval source (`MultiprobSource` option),
already used interval width as a first-class No-Bet veto
(`maxWidthForFire` / `widthNoBets` / `widthVetoedRowIds`), and already
attached the Mondrian taxonomy category to every fired decision. That
integration work is not new; commit `#211` (`feat(edge-lab): Phase C
measurement + normalizer owns placeability`) shipped it. This session's job
was narrower than the handoff assumed: **verify, test, and close two real
gaps** — zero test coverage, and no concrete multi-agent orchestrator.

## 1. What was verified as already solid (read, not modified beyond dedup)

All nine core modules the handoff lists exist, are internally consistent,
and match their own doc comments:

- `calibration/pav.ts`, `calibration/ivap.ts`, `calibration/cvap.ts`,
  `calibration/aggregation.ts` — Venn-Abers family, log-space Neumaier
  geometric-mean fold aggregation.
- `calibration/local-isotonic-patch.ts`, `calibration/multicalib-audit-patch.ts`
  — binary/group-indicator multicalibration audit-and-patch loop, correctly
  scoped as the "special case" its own header says it is (no claim of full
  Venn multicalibration).
- `conformal/mondrian.ts`, `conformal/sports-taxonomy.ts` — hierarchical
  residual store with parent/global fallback; Tier-1/Tier-2 taxonomy.
- `conformal/levene-welch.ts`, `conformal/lwt-mcps-sketch.ts` — Brown-Forsythe
  split scoring (every function total: no throws, no NaN/Infinity, verified
  by property test) and a greedy bounded-depth partition sketch, explicit
  about its own exchangeability caveat (fit on a fold disjoint from the
  calibration data, or the (n+1) coverage guarantee is void).
- `edge-lab/selective-gate.ts` — already the sole FIRE/NO_BET authority, with
  `tuneTau` using fixed-sequence Learn-then-Test (not an uncorrected grid
  scan) and `assertDisjointRowSets` enforcing calibration/tuning/eval
  disjointness at every entry point.

**None of these were rewritten.** The one exception (item 2 below) is a
duplicate-code removal, not an algorithm change.

## 2. What was fixed

`calibration/ivap.ts` carried its own private, byte-identical copy of the
unweighted PAV block-merge loop instead of importing the shared,
now-tested `pavIsotonic` from `pav.ts`. Two implementations of the same
algorithm is a drift risk with no offsetting benefit — a future edit to one
copy silently stops applying to the other. Replaced the private copy with an
import. Full `prediction-engine` suite (165 files / 1797 tests) and `tsc`
stayed green before and after.

## 3. What was added

### 3.1 Tests (zero coverage before this session)

11 new test files (10 for the modules in §1, 1 for the new orchestrator in
§3.2) — verified via `git diff --stat origin/main...HEAD -- packages/
prediction-engine/src/__tests__ packages/prediction-engine/src/edge-lab/
__tests__`, which shows exactly 11 files added, 1790 lines. Property-style invariants
used throughout: `p0 <= p1`, `width >= 0`, every output finite, empty/tiny
inputs never throw, min-sample guards actually gate on sample size and not
gap magnitude, and (for `levene-welch.ts`) the documented "mean leg cannot
outrank a real variance split" saturation bound. All passed on first run
after two arithmetic corrections during authoring (a Neumaier-precision test
expectation and nothing else) — no defect found in the modules under test.

### 3.2 `edge-lab/edge-lab-council.ts` — the missing orchestrator

`agent-roles.ts` had typed interfaces (`EdgeLabAgent`, `EdgeLabCouncil`,
`DebateSummary`) but grepping the entire repo found **zero** implementations
or callers. `SequentialEdgeLabCouncil` is a pure, deterministic, single-round
reference implementation:

- `calibrationAnalyst` reads the multiprobability **lower** endpoint against
  the market-implied probability — the same quantity `applySelectiveGate`
  uses for `lcbEdge` — so its opinion tracks the production gate's own
  reasoning without duplicating or bypassing it.
- `riskHonestyGuardian` is a **hard veto**: interval too wide, calibration
  sample below `MIN_STRATUM_CALIBRATION` (imported from `selective-gate.ts`,
  not re-declared), or a failed placebo check all force `finalDecision:
  "no_bet"` regardless of every other agent's stance. This is enforced
  structurally by the orchestrator, not by trusting the guardian's opinion
  to be honored downstream.
- `placeboAnalyst` treats "no placebo result supplied" as **untested**, never
  as "passed" — this was a deliberate design point worth stating because the
  natural bug here is defaulting an absent field to an optimistic reading.
- `glassLedgerRecorder` **always abstains** and states in its own rationale
  that no production ledger writer exists for this output. See §4.

No LLM calls. `EdgeLabAgent` is the seam a future LLM-backed agent would
implement; nothing here assumes deterministic agents forever.

Not exported from `packages/prediction-engine/src/index.ts` — consistent with
the existing precedent at `apps/web/lib/board/gate-consumer.ts`'s deep-import
of `selective-gate.js` (edge-lab is server-only; widening the client-facing
barrel to include it risks a repeat of the `node:crypto` Vercel build break
that precedent already documents).

## 4. Where this session deliberately did NOT do what the handoff asked

The handoff (and the master prompt that started this session) both ask to
"record full multiprobability + taxonomy category + conformal set into Glass
Ledger / Pedersen commitments." **This was not done, on purpose.**

`docs/ops/PRODUCT_CASCADE_MAP.md` §4 already investigated this exact question
and reached a documented, deliberate conclusion:

> Ledger multiprob persistence is BLOCKED — on a missing writer, not on
> commitment risk. `FiredDecision` has exactly one consumer in the entire
> repo (`scripts/edge-lab/phase1-acceptance.ts`, a research script).
> `appendPick`/`appendSettlement` have zero production callers. The domains
> do not align — `LedgerPickEntry` describes a *published pick*, `FiredDecision`
> describes a *backtest row*. No bridge exists, and building one means
> inventing pick identity, a book, and a price for a row that has none.

`apps/web/lib/board/gate-consumer.ts` — the only production consumer of
`applySelectiveGate` in the whole repo — says the same thing in its own
header: *"It does not write to the ledger. `FiredDecision` has no production
persistence path... inventing one here would be the bridge that map
explicitly blocks."*

Building that bridge this session, just because an external handoff document
asked for it without visibility into this later and more specific
architectural decision, would have been exactly the kind of scope creep
`PRODUCT_CASCADE_MAP.md` exists to prevent. The more specific, more recently
investigated, already-in-repo decision wins over the generic instruction.
`edge-lab-council.ts`'s `glassLedgerRecorder` documents this rather than
silently doing nothing — a future reader should not have to re-derive why
the ledger field is a hint string and not a write call.

**Prerequisite for unblocking, per that same section**: a production
consumer of `applySelectiveGate` that emits published picks. Additive
optional fields on `LedgerPickEntry` are hash-safe once that consumer exists
(`canonicalJson` sorts present keys; the only trap is passing `undefined`
instead of omitting the field). Nothing in this session changed that
prerequisite.

## 5. What was explicitly NOT started (per standing instruction, still true)

The `packages/prediction-engine/src/certificate/` math modules
(`decision-certificate.ts`, `stratum-coverage.ts`, `selective-abstention.ts`,
`proper-scoring.ts`, `kelly-lower-endpoint.ts`) referenced by an earlier
handoff's "full bodies in founder gse-closeout/math/ artifact pack" remain
un-started. That artifact pack has never been found anywhere in the repo or
in any session upload, across multiple search attempts in prior sessions.
Fabricating statistical formulas for a product whose entire thesis is "never
invent numbers" is the wrong failure mode to pick under uncertainty here.
Still blocked on founder input; still flagged, not silently dropped.

## 6. Per-category coverage/width diagnostics — primitive exists, wiring does not

The handoff's item 5 ("walk-forward diagnostics for per-category coverage
and interval width") has its aggregation primitive already: `sports-taxonomy.ts`'s
`summarizeCategoryDiagnostics` takes `{category, covered, width, residual}`
rows and returns per-category sample size, coverage, mean width, and mean
residual — tested this session (`sports-taxonomy.test.ts`).

What does **not** exist is a batch call site that runs it over real
walk-forward output. `applySelectiveGate` currently accepts at most one
`taxonomyCtx` per call and stamps every decision in that call with the same
category — correct for its actual call site (one game context per gate
invocation) but not shaped for "replay a season and get one taxonomy
category per row." Building that batch wiring means either changing
`GateDecisionRow` to carry a per-row context (a `selective-gate.ts` API
change) or building a separate walk-forward harness that calls
`assignMondrianCategory` per row itself and feeds `summarizeCategoryDiagnostics`
directly. Both are real, scoped follow-ups; neither was done this session,
to avoid touching `selective-gate.ts`'s public shape without a specific
need driving the change (the standing "do not rewrite pav.ts/ivap.ts" caution
generalizes here to "do not reshape the gate's API on spec").

## 7. Session verification summary

- `packages/prediction-engine`: `tsc --noEmit` clean; full vitest suite 165
  files / 1797 tests passing at HEAD, of which 11 files (1790 lines) are new
  this session — no pre-existing test was modified.
- No flags touched. `LIVE_BOARD_GATE_SLATE` untouched and still absent from
  deployable config.
- No production code path changed except the `ivap.ts` dedup (behavior-
  preserving, verified by the full suite passing unchanged).
- Branch: `feat/uq-honesty-stack-hardening`, five commits, each independently
  buildable and green.

## 8. Next one action

Land `feat/uq-honesty-stack-hardening` as a PR against `main`, run the full
CI gate (tsc/lint/vitest/guardrails/flag-policy), and merge once green — the
same standing-authority pattern used for #215/#216/#217 this session
(bug-fixes and pure test/tooling additions on top of already-designed,
already-integrated modules, not a flag flip). After that: pick up §6
(walk-forward per-category diagnostics wiring) as the next real gap, or wait
for founder input on the missing math/certificate artifact pack (§5) before
touching that track.
