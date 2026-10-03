# Edge-Validate Cards — GRIND Tier-1 validation bench (Wave EV)

**Deck data class: INTERNAL.** Every card touches evaluation infrastructure (walk-forward
harnesses, scoring plumbing, CI guards) — repo architecture, not crown methodology. Per
`docs/ops/FREE_WINDOW_BLITZ.md` §3b, INTERNAL work goes to **no-training endpoints only —
never stealth, never any train-on-input tier**. No card in this deck is PUBLIC.

**CROWN boundary on OUTPUTS (read before running anything real):** the *code* here is
INTERNAL, but the *reports* it produces on real candidates — calibration slopes, PIT
verdicts, EV-vs-close numbers, promotion statuses, and above all WHICH candidates
survived — are CROWN per FREE_WINDOW_BLITZ §3b ("calibration/CLV results", the survivor
list). Real-candidate report files must never be pasted into any worker prompt, never
committed to a doc a free worker reads, never surfaced on any free-tier or public page.
The synthetic-fixture reports EV7 uses for CI are INTERNAL (deterministic fake data).

---

## Routing summary (which lanes)

| Class | Cards | Lane |
|---|---|---|
| INTERNAL | EV1–EV17 (all) | Grok / Hermes on no-training endpoints per FREE_WINDOW_BLITZ §3b. Never stealth/Ox Alpha, never Laguna/Inkling. |
| CROWN | (none as cards — but see the outputs note above) | — |
| PUBLIC | (none) | — the free fleet's lane for this program is Wave K (`docs/data/KERNEL_SLOT_CARDS.md`). |

**Cross-family verification rule (same as Wave K / Wave SC):** the verifier is a
different model family than the author. The verifier runs the card's Verify command,
checks type fidelity against the shapes embedded in the card, then works the ATTACK
list — each attack decided by a computation, not by reading. A test that recomputes the
implementation's own formula and compares is vacuous — reject it; known values must come
from independent derivations.

## Dependency order within the deck

```
EV1 (research: rows + market feed)
  └─► EV2 (candidate contract) ─► EV3 (fold-runner) ──┐
                    EV4 (scorers facade) ─────────────┼─► EV7 (CLI + npm run edge:validate)
                    EV5 (CLV referee) ────────────────┤     [BLOCKED until K1,K2,K3,K4,K5,K7 land]
                    EV6 (promotion report) ───────────┘

EV8  (repo-level guard:q-contamination)      — BLOCKED until PR #555 merges
EV9  (bus leak wall + assertKnownBeforeKickoff) — BLOCKED until PR #555 merges
  ├─► EV10 (sep-bind consumption guard)
  └─► EV11 (yac-bind consumption guard)

EV12 (snap-exposure fail-closed)             — independent, unblocked now
EV13 (poisoned-row partition helper) ─► EV15 (validation-script batch hygiene)
EV14 (empty-slate contract pins)             — independent, unblocked now
EV16 (est-routes input guards)               — BLOCKED until PR #556 merges (or done on its branch)
EV17 (kneel/garbage input guards)            — BLOCKED until PR #557 merges (or done on its branch)
```

**External preconditions ledger** (checked mechanically inside the card's Verify — a
blocked card is left unstarted, never improvised):

| Precondition | Needed by | Mechanical check |
|---|---|---|
| Wave-K slots landed: `kernel/slots/crps.ts`, `pit.ts`, `brier-murphy.ts`, `calibration-fit.ts`, `bh-fdr.ts`, `block-bootstrap.ts` | EV7 (runtime); EV4/EV5/EV6 code against contract TYPES only and are NOT blocked | `test -f packages/prediction-engine/src/edge-lab/kernel/slots/<name>.ts` for each |
| PR #555 merged (post-merge `covariate-bus.ts`: `CovariateCell` has `layer` + `knownAtWeek`; `P_SIDE_COVARIATE_REGISTRY` + `assertPSideHasNoMarketProp` exist) | EV8, EV9 (and EV10/EV11 via EV9) | `grep -q knownAtWeek packages/prediction-engine/src/edge-lab/covariate-bus.ts` |
| PR #556 merged (`est-routes-tprr.ts` on main) | EV16 | `test -f packages/prediction-engine/src/edge-lab/est-routes-tprr.ts` |
| PR #557 merged (`nfl-kneel-garbage.ts` on main) | EV17 | `test -f packages/prediction-engine/src/edge-lab/nfl-kneel-garbage.ts` |

**Why the hardening cards (EV9–EV17) are in a validation deck:** the test-gap audit
verdict on this stack is *fail-open on non-finite weeks* — `latestPriorRow`'s leak wall
silently admits FUTURE data when `kickoffWeek` or `row.week` is NaN, `knownAtWeek` is
stamped at emission but enforced nowhere at consumption, and one poisoned CSV row kills
an entire validation run. An `edge:validate` bench built on a fail-open leak wall
validates nothing; the wall is part of the bench.

## Common contract — applies to EVERY implementation card in this deck

- **priced:false** on every exported result record. Research/evaluation only. Live p
  admits an edge only when `rank.priced`
  (`packages/prediction-engine/src/scoring.ts` L510/L523/L580-581/L926) — nothing in
  this deck may set `priced:true`.
- **Nothing enters live p without masterplan §6 validation**
  (`docs/data/EDGE_FACTORY_MASTERPLAN.md` §6). This deck BUILDS the §6 referee; it does
  not grant promotions. Its top status is a recommendation, never a live flag.
- **No MODEL_VERSION change.** `packages/prediction-engine/src/constants.ts` L25 stays
  `v5.2.7` (the `props-fire-gate.ts` header-L10 norm).
- **Fail-closed on missing data.** Missing/NaN/contradictory input ⇒ typed refusal
  (returned, with a reason) or `KernelError` — never a default, never an imputed value,
  never a silent drop that changes semantics. Refused rows are DROPPED with a reason,
  not filled (bind-module norm: `props-hb-adot-sep-bind.ts` `bindSepSamples`,
  `props-hb-air-yac-bind.ts` `bindYacSamples`).
- **No market-prop inputs on the p-side, ever.** The evaluator may READ `qClose` as the
  y-axis referee; no market-prop value may reach features/priors
  (`props-hb-rush-attempts.ts` L27: "Do not ingest the book's attempt line into the
  prior"). `layer === "MARKET_PROP"` in a p-side input is a refusal, and EV8 makes it a
  build failure.
- **No `Math.random` anywhere.** Injected rng only: `makeRng`
  (`kernel/contract.ts` L152); `boxMuller` (`kernel/numeric.ts` L189) is the only
  normal sampler allowed.
- **Sealed holdout untouched.** Evaluate inner walk-forward folds only. Never call
  `openHoldout(` — `scripts/guardrails/sealed-holdout-open-scan.mjs` fails the build on
  any call site; the runtime gate is `walk-forward.ts` L149-210
  (`FOUNDER_HOLDOUT_TOKEN`, `GSE_ALLOW_HOLDOUT_OPEN`, `SealedHoldoutError`).
- **Forbidden zones:** `packages/db/` prisma schema, any event-odds-ingest write path,
  secrets/`.env`, `vercel.json`, `apps/web/lib/scraping/*`. Also do NOT edit
  `kernel/contract.ts`, `kernel/numeric.ts`, `kernel/conformance.ts`, and do NOT touch
  the `packages/prediction-engine/src/index.ts` barrel (three open PRs collide there;
  barrel exports are an integrator follow-up — the CLI imports by deep path).
- **Strict TS**, `noUncheckedIndexedAccess` on, no `any`, ESM `.js` import extensions
  (`"../walk-forward.js"`, `"../kernel/contract.js"`, tests import
  `"../edge-validate/<key>.js"`).
- **One artifact per card** = the named module + its test file. Exceptions are stated
  explicitly per card (EV7 and EV8 each add ONE npm-script line to the root
  `package.json`; EV14 is a test-only artifact; EV15 edits one script). If a card seems
  to need more, it is two cards — stop and split.
- **Idempotent/restartable:** cards create new files (or edit exactly the files named);
  re-running from scratch after a dead session is correct and cheap; nothing lives only
  in a session buffer.
- **Commit-on-pass:** one commit per card, only after Verify passes, message given per
  card.

**New-module home:** `packages/prediction-engine/src/edge-lab/edge-validate/` (new
directory), tests in `edge-validate/__tests__/`.

**Verify pattern** (deterministic — a model's opinion is not a gate):

```
cd packages/prediction-engine && npx vitest run src/edge-lab/edge-validate/__tests__/<key>.test.ts && npx tsc --noEmit
```

**Shared shapes every implementer needs (embedded so nobody explores the repo):**

From `packages/prediction-engine/src/edge-lab/walk-forward.ts`:

```ts
export interface TimedRow {                    // L31
  readonly id: string;
  readonly decisionAt: string;                 // ISO UTC; features frozen as-of this
  readonly eventEndAt: string;                 // ISO UTC; defines purge overlap window
}
export interface WalkForwardOptions {          // L52
  readonly folds: number;                      // >= 1
  readonly minTrainFraction: number;           // (0,1)
  readonly embargoMs: number;                  // >= 0
}
export interface WalkForwardFold<R extends TimedRow> {  // L40
  readonly fold: number;
  readonly train: readonly R[]; readonly test: readonly R[];
  readonly purged: readonly R[]; readonly embargoed: readonly R[];
  readonly testStart: string; readonly testEnd: string;
}
export function walkForwardSplits<R extends TimedRow>(  // L80 — expanding window,
  rows: readonly R[], opts: WalkForwardOptions): WalkForwardFold<R>[];
```

From `packages/prediction-engine/src/edge-lab/placebo.ts`:

```ts
export interface EvalRow extends TimedRow {    // L43
  readonly entityKey?: string;
  readonly features: ReadonlyMap<string, number>;
  readonly y: 0 | 1;                           // pushes excluded upstream
  readonly qClose: number;                     // de-vigged close of modeled side, (0,1)
}
export function evVsClose(p: number, qClose: number, y: 0 | 1): number;  // L54
// fires side sign(p − qClose); return (ySide − qSide) / qSide; throws RangeError
// unless the fired side's q is in (0,1).
export interface FiredPlay { rowId: string; homeSide: boolean; ret: number; q: number; y: 0 | 1 }
export interface OofScore  { rowId: string; p: number; q: number; y: 0 | 1 }
export interface EvalReport { eligible; fired; coverage; meanReturn: number | null;
  seReturn: number | null; foldCount; plays: readonly FiredPlay[]; oof: readonly OofScore[] }
```

From `packages/prediction-engine/src/edge-lab/logistic.ts`:

```ts
export interface LabeledExample { readonly features: ReadonlyMap<string, number>; readonly y: 0 | 1 }  // L15
export type Predictor = (features: ReadonlyMap<string, number>) => number;                             // L22
export interface Trainer { (train: readonly LabeledExample[]): Predictor }                             // L24
export function logisticTrainer(opts: { featureKeys: readonly string[]; lambda?; learningRate?; iterations? }): Trainer;  // L45
```

From `packages/prediction-engine/src/edge-lab/kernel/contract.ts` (frozen; PR #554 —
types only, implementations land as Wave-K slots; **code against these NOW, wire real
slots only in EV7**):

```ts
export function makeRng(seed: number): Rng;                                   // L152
export interface DiscreteDistribution {                                       // L178
  readonly kind: "discrete";
  pmf(k: number): Probability; cdf(k: number): Probability;
  quantile(p: Probability): number; sample(rng: Rng): number;
  mean(): number; variance(): number; support(): { min: number; max: number };
}
export type CrpsDiscreteFn = (dist: DiscreteDistribution, observed: number) => number;      // L217
export type PitDiscreteFn  = (dist: DiscreteDistribution, observed: number, rng: Rng) => Probability;  // L240
export interface PitHistogram { counts: readonly number[]; bins: number; uniformityPValue: PValue }    // L246
export type PitHistogramFn = (pitValues: readonly Probability[], bins?: number) => PitHistogram;       // L258
export interface BrierDecomposition { brier; reliability; resolution; uncertainty }                    // L268
export type BrierMurphyFn = (predicted: readonly Probability[], outcomes: readonly (0|1)[], bins?: number) => BrierDecomposition;  // L284
export interface CalibrationFit { slope: number; intercept: number }                                   // L290
export type CalibrationFitFn = (predicted: readonly Probability[], outcomes: readonly (0|1)[]) => CalibrationFit;  // L302 — throws NO_CONVERGENCE
export interface FdrResult { qValues: readonly number[]; rejected: readonly boolean[]; threshold: number }  // L311
export type BenjaminiHochbergFn = (pValues: readonly PValue[], alpha: number) => FdrResult;             // L326
export interface Interval { point: number; lower: number; upper: number; level: Probability }           // L350
export interface BlockBootstrapOptions { blockLength: number; resamples: number; level: Probability; rng: Rng }  // L357
export type BlockBootstrapFn = (values: readonly number[], statistic: (s: readonly number[]) => number,
  options: BlockBootstrapOptions) => Interval;                                                          // L373
```

Post-#555 `covariate-bus.ts` shapes (branch `grok/h0-validation-harness`; build against
THIS shape, not main's 3-field cell — line numbers in EV9–EV11 are pre-merge and shift,
so key on symbol names after merge):

```ts
export type CovariateLayer = "L0" | "L1" | "L2" | "L3" | "MARKET_GAME" | "MARKET_PROP";
export interface CovariateCell {
  readonly value: number;
  readonly grain: "week_t_for_tplus1";
  readonly provenance: "weekly_ngs_mean";
  readonly layer: CovariateLayer;        // MARKET_PROP forbidden on p
  readonly knownAtWeek: number;          // must be < kickoffWeek
}
export type CovariateField = "avgSeparation" | "avgCushion" | "airYardsShare"
  | "avgTimeToThrow" | "aggressiveness" | "avgIntendedAirYards"
  | "pctAttemptsGte8Defenders" | "avgTimeToLos" | "avgYac";      // exactly 9 literals
export const P_SIDE_COVARIATE_REGISTRY: readonly { field: CovariateField; layer: CovariateLayer; honesty: "weekly_ngs_mean" }[];
export function assertPSideHasNoMarketProp(registry?): void;      // throws on MARKET_PROP
```

---

## EV1 · RESEARCH — eval-row + market-feed source map

**DATA CLASS: INTERNAL** (loader inventory + feed availability; no edge content, no
survivor lists).

**Artifact:** `docs/data/_gen/edge-validate-row-sources.md` (generated doc — downstream
cards read one file instead of exploring).

**Why research, not implementation:** the recon confirms the harness seams
(`walk-forward.ts`, `placebo.ts`) but NOT where real `EvalRow`-shaped datasets come from
per candidate family. Known starting facts (verify, don't re-discover):

- `EvalRow` (embedded above) requires a de-vigged `qClose` — the game-market placebo
  harness (`placebo.ts`) already consumes it, so a game-market close feed exists
  somewhere upstream of `scripts/edge-lab/phase0-acceptance.ts`.
- The recon's gap list is explicit: **no prop-line close archive exists** —
  `EvalRow.qClose` has no props feed, so the economic referee cannot run for prop
  families yet (`props-priced-edge.ts` header says the same: "priced stays false until a
  prop-line archive can settle CLV").
- Loader candidates: `packages/prediction-engine/src/edge-lab/loaders/` contains
  `nfl-games.ts`, `mlb-games.ts`, `mlb-feature-ingest.ts`, `statcast-features.ts`, plus
  the nflverse weekly assets used by `scripts/edge-lab/props-hb-validation.ts`
  (fetch entrypoint `fetchNflverse`, needs `NODE_OPTIONS=--use-system-ca` live).

**Questions the doc MUST answer, each with a repo path + line citation:**

1. For GAME-market binary candidates: which module produces rows with
   `{id, decisionAt, eventEndAt, features, y, qClose}` today, what its de-vig method is
   (must be named — Shin vs proportional), and what "decision time" it stamps (T-x hours
   before kickoff; the exact x).
2. For each PROP family (receptions, rec_yards, rush_att, rush_yards, pass_yards,
   pass_td, int, comp, sacks, atd, rec_td, rush_td): what exists to build
   `{id, decisionAt, eventEndAt, observed}` count rows from CC-BY weekly stats (name the
   asset + columns), and confirm explicitly that NO qClose feed exists — the CLV referee
   for these families must refuse `no_market_feed`, never proxy a close.
3. Season labeling for the sign-stability gate: the exact rule mapping a row to a season
   label (calendar boundaries per sport).
4. Row-count reality check: approximate rows per family per season available offline
   (fixture) vs live (fetch), so EV7's defaults (`folds`, `minTrainFraction`) are set
   against real magnitudes, not guesses.
5. Kickoff-week availability: for prop rows, where `kickoffWeek` comes from (needed by
   the as-of attest in EV3), and the refusal rule when absent.

**Doc structure (fixed headings, machine-checked):** `## Game-market rows`,
`## Prop-family rows`, `## Market feeds`, `## Season labeling`, `## Row counts`,
`## Kickoff weeks`, `## Gaps`.

**Discipline:** research only — no code; priced:false n/a; fail-closed reporting (a
missing feed is written down as missing, never bridged); nothing enters live p without
masterplan §6; no MODEL_VERSION; forbidden zones per common contract.

**Verify (deterministic):**

```
bash -c 'f=docs/data/_gen/edge-validate-row-sources.md; for h in "## Game-market rows" "## Prop-family rows" "## Market feeds" "## Season labeling" "## Row counts" "## Kickoff weeks" "## Gaps"; do grep -qF "$h" "$f" || { echo "MISSING: $h"; exit 1; }; done; grep -oE "packages/[A-Za-z0-9_/.-]+\.ts|scripts/[A-Za-z0-9_/.-]+\.ts" "$f" | sort -u | { ok=0; while read p; do [ -f "$p" ] || { echo "DEAD PATH: $p"; ok=1; }; done; exit $ok; } && echo PASS'
```

**Idempotent:** regenerating from scratch is correct; no state.

**Commit on pass:** `docs(edge-validate): EV1 eval-row + market-feed source map (research)`

**ATTACK LIST (verifier):**
- Every claimed loader export spot-checked against the actual file (open it, confirm the
  symbol + fields), not folklore.
- The "no prop close feed" claim tested by grep: any repo module that stores or reads
  historical prop prices contradicts the doc — search for it before accepting.
- The de-vig method claim checked against code (a proportional split claimed as Shin is
  a finding).
- Decision-time claim cross-checked against `placebo.ts`'s header ("decision-time price"
  discussion) — if the doc's x-hours differs from what the corpus actually stamps,
  reject.

---

## EV2 · candidate — the CandidateSpec contract

**DATA CLASS: INTERNAL.**

**Artifact:** `packages/prediction-engine/src/edge-lab/edge-validate/candidate.ts`
+ `edge-validate/__tests__/candidate.test.ts`

**Depends:** nothing (pure types + validators; imports only `../walk-forward.js`,
`../placebo.js`, `../logistic.js`, `../kernel/contract.js` — all landed).

**Spec.** One contract every covariate/model candidate implements so ONE command can
evaluate any of them. Define exactly:

```ts
export const EDGE_VALIDATE_METHOD_TAG = "edge_validate_v1" as const;

/** Structural cell stamp — deliberately NOT imported from covariate-bus.ts
 *  (PR #555 collision risk); compatible with the post-#555 CovariateCell. */
export interface ProvenancedCell {
  readonly value: number;
  readonly layer: string;          // "MARKET_PROP" is refused wherever checked
  readonly knownAtWeek: number;    // integer; must be < kickoffWeek
}

export interface BinaryRow extends EvalRow {
  readonly family: string;                  // /^[a-z0-9_]+$/, e.g. "game_h2h"
  readonly kickoffWeek?: number;            // required iff cells present
  readonly cells?: readonly { readonly field: string; readonly cell: ProvenancedCell }[];
}

export interface CountRow extends TimedRow {
  readonly family: string;                  // e.g. "receptions"
  readonly features: ReadonlyMap<string, number>;
  readonly observed: number;                // integer >= 0 (the realized count)
  readonly line?: number;                   // prop line; required iff qClose present
  readonly qClose?: number;                 // devigged P(over line) in (0,1); ABSENT today (EV1)
  readonly kickoffWeek?: number;
  readonly cells?: readonly { readonly field: string; readonly cell: ProvenancedCell }[];
}

export type CountPredictor = (features: ReadonlyMap<string, number>) => DiscreteDistribution;
export interface CountTrainer { (train: readonly CountRow[]): CountPredictor }

export type CandidateSpec =
  | { readonly kind: "binary"; readonly id: string; readonly rows: readonly BinaryRow[];
      readonly trainer: Trainer; readonly baseline: Trainer;
      readonly seasonOf: (row: BinaryRow) => string; readonly priced: false }
  | { readonly kind: "count";  readonly id: string; readonly rows: readonly CountRow[];
      readonly trainer: CountTrainer; readonly baseline: CountTrainer;
      readonly seasonOf: (row: CountRow) => string; readonly priced: false };

export type SpecRefusalReason =
  | "bad_id" | "empty_rows" | "duplicate_row_id" | "bad_family"
  | "bad_decision_time" | "event_before_decision"
  | "non_integer_observed" | "negative_observed"
  | "bad_qclose" | "qclose_without_line"
  | "cells_without_kickoff_week" | "bad_kickoff_week" | "bad_cell";

export type SpecCheck =
  | { readonly ok: true; readonly rowCount: number; readonly priced: false }
  | { readonly ok: false; readonly refuse: SpecRefusalReason;
      readonly rowIds: readonly string[]; readonly priced: false };

export function validateCandidateSpec(spec: CandidateSpec): SpecCheck;
```

Rules (all mandatory):

- `validateCandidateSpec` is TOTAL — it returns refusals, never throws, and it reports
  ALL offending rowIds for the first refusal reason hit (deterministic order: input
  order). One bad row refuses the spec; the caller decides whether to repair upstream.
  Silent row-dropping here is forbidden — that is the fold-runner's explicitly-reported
  job, not the validator's.
- `bad_decision_time`: `Date.parse` non-finite on `decisionAt`/`eventEndAt`.
  `event_before_decision`: `eventEndAt < decisionAt` (the `walk-forward.ts` L118 error,
  caught here BEFORE a mid-loop throw can kill a run).
- `bad_qclose`: present but not in the open interval (0,1) or non-finite.
- `bad_kickoff_week`: present but not an integer >= 1 (the EV9 leak-wall domain).
- `bad_cell`: any cell with non-finite value, non-integer `knownAtWeek`, or
  `knownAtWeek >= kickoffWeek` — refused HERE as well as in EV3 (belt and suspenders).
- `baseline` is REQUIRED: for binaries the canonical baseline is market-only
  (`predict = () => row.qClose` is materialized by the caller as a trainer closing over
  nothing — spec it as "a Trainer that ignores features"); for counts the canonical
  baseline is climatology (train-fold empirical count distribution). EV7's synthetic
  candidate demonstrates both.
- No I/O, no fetch, pure. `priced: false` is a literal field on the spec AND on every
  result record.

**Discipline:** priced:false; fail-closed on missing data; nothing enters live p without
masterplan §6 validation; no MODEL_VERSION; forbidden zones (prisma schema,
event-odds-ingest writes, secrets, vercel.json) per common contract.

**Verify:**
```
cd packages/prediction-engine && npx vitest run src/edge-lab/edge-validate/__tests__/candidate.test.ts && npx tsc --noEmit
```

**Idempotent:** new files only; safe to redo from scratch.

**Commit on pass:** `feat(edge-validate): EV2 candidate contract (priced:false, fail-closed validator)`

**ATTACK LIST (verifier):**
- Feed a spec whose rows are valid except ONE with `observed: 2.5` — refusal must name
  exactly that rowId, and the check must not stop scanning before collecting all rows
  with the same reason.
- `qClose: 0` and `qClose: 1` (closed endpoints) must refuse `bad_qclose` — `evVsClose`
  divides by `qSide`, so an endpoint close is a downstream crash being prevented here.
- A cell with `knownAtWeek === kickoffWeek` (same-week) must refuse — strictly-prior is
  the covariate-bus law (`latestPriorRow`: "strictly prior"), not `<=`.
- Duplicate row ids across rows must refuse (fold accounting and report joins key on id).
- Property test: a generated valid spec of 200 rows passes; flipping any single guarded
  field to a bad value flips the result to the matching refusal.

---

## EV3 · fold-runner — walk-forward execution + as-of attest

**DATA CLASS: INTERNAL.**

**Artifact:** `packages/prediction-engine/src/edge-lab/edge-validate/fold-runner.ts`
+ `edge-validate/__tests__/fold-runner.test.ts`

**Depends:** EV2 merged. Imports `walkForwardSplits` (embedded shape above),
`validateCandidateSpec`. NOT blocked on Wave K (no scoring here — it only produces
out-of-fold predictions).

**Spec.**

```ts
export interface FoldRunOptions {
  readonly walkForward: WalkForwardOptions;   // defaults: folds 5, minTrainFraction 0.5, embargoMs 0
}
export interface BinaryOof { readonly rowId: string; readonly season: string;
  readonly family: string; readonly p: number; readonly q: number; readonly y: 0 | 1 }
export interface CountOof  { readonly rowId: string; readonly season: string;
  readonly family: string; readonly dist: DiscreteDistribution; readonly observed: number;
  readonly line?: number; readonly qClose?: number }

export type FoldRunResult =
  | { readonly ok: true;  readonly kind: "binary"; readonly foldCount: number;
      readonly purged: number; readonly embargoed: number;
      readonly oof: readonly BinaryOof[]; readonly baselineOof: readonly BinaryOof[];
      readonly asOfChecked: number; readonly priced: false }
  | { readonly ok: true;  readonly kind: "count";  readonly foldCount: number;
      readonly purged: number; readonly embargoed: number;
      readonly oof: readonly CountOof[];  readonly baselineOof: readonly CountOof[];
      readonly asOfChecked: number; readonly priced: false }
  | { readonly ok: false; readonly refuse:
        "spec_refused" | "as_of_violation" | "market_prop_in_p" | "too_few_rows";
      readonly detail: string; readonly rowIds: readonly string[]; readonly priced: false };

export function runFolds(spec: CandidateSpec, opts: FoldRunOptions): FoldRunResult;
```

Rules (all mandatory):

- First call `validateCandidateSpec`; any refusal ⇒ `spec_refused` with the inner detail.
- **As-of attest (masterplan §6 "as-of discipline"):** before any fold is cut, walk every
  row's `cells`: any cell with `!(Number.isInteger(cell.knownAtWeek) && cell.knownAtWeek < row.kickoffWeek!)`
  ⇒ `as_of_violation` (all offending rowIds). Any cell with `layer === "MARKET_PROP"`
  ⇒ `market_prop_in_p` (all offending rowIds). Rows without `cells` contribute nothing
  to `asOfChecked` — the count is reported so EV6 can distinguish "attested clean" from
  "nothing to attest" (see Open Question 6).
- Folds come ONLY from `walkForwardSplits` — expanding-window temporal CV. There is no
  code path that shuffles rows or cuts random folds (§6: "Random K-fold is banned").
- `too_few_rows` when `walkForwardSplits` returns `[]` or fewer than 2 folds — a 1-fold
  "walk-forward" is not evidence.
- Per fold: `trainer(fold.train)` and `baseline(fold.train)` are each fit ON THE TRAIN
  SET ONLY, then applied to `fold.test`; OOF rows carry `seasonOf(row)`. Purged/embargoed
  counts are summed across folds and surfaced (a purge count of 0 on overlapping rows is
  the EV-attack signal that purging broke).
- **Sealed holdout:** this module never imports `sealHoldout`/`openHoldout`; callers
  hand it the working set only. State this in the header.
- Deterministic: same spec + opts ⇒ identical result (trainers must be deterministic —
  the contract inherits `logisticTrainer`'s determinism norm; document it).
- Pure, no I/O, never mutates input rows.

**Discipline:** priced:false; fail-closed on missing data; nothing enters live p without
masterplan §6 validation; no MODEL_VERSION; forbidden zones (prisma schema,
event-odds-ingest writes, secrets, vercel.json) per common contract.

**Verify:**
```
cd packages/prediction-engine && npx vitest run src/edge-lab/edge-validate/__tests__/fold-runner.test.ts && npx tsc --noEmit
```

**Idempotent:** new files only.

**Commit on pass:** `feat(edge-validate): EV3 fold-runner with as-of attest (temporal CV only)`

**ATTACK LIST (verifier):**
- Leak attack: hand-build 60 rows where one feature EQUALS the outcome y; run with a
  logistic trainer; OOF p must be near-perfect — then stamp one row's cell
  `knownAtWeek = kickoffWeek` and assert the ENTIRE run refuses `as_of_violation`
  (not one row silently dropped).
- Purge attack: construct rows whose `eventEndAt` overlaps the next fold's test window;
  assert `purged > 0` and that no purged row's id appears in any later `train` fit (probe
  via a trainer that records the ids it saw).
- MARKET_PROP attack: one cell `layer: "MARKET_PROP"` ⇒ `market_prop_in_p` naming that
  row — and the refusal must fire even when `knownAtWeek` is valid.
- Determinism: two runs, deep-equal results.
- Grep the module for `sort(() =>`, `Math.random`, `openHoldout` — all must be absent.

---

## EV4 · scorers — kernel-slot scoring facade (Brier/Murphy, calibration, CRPS, PIT-by-family)

**DATA CLASS: INTERNAL.**

**Artifact:** `packages/prediction-engine/src/edge-lab/edge-validate/scorers.ts`
+ `edge-validate/__tests__/scorers.test.ts`

**Depends:** EV3 (consumes its OOF shapes). Codes against the frozen contract TYPES
(`CrpsDiscreteFn`, `PitDiscreteFn`, `PitHistogramFn`, `BrierMurphyFn`,
`CalibrationFitFn` — embedded above) via INJECTION, so this card is **not blocked** on
Wave K landing; real slot wiring happens in EV7. Tests inject small test-local reference
implementations typed as the contract types and verify the FACADE (plumbing, refusal,
grouping) — scorer math itself is Wave K's conformance job, cross-checked there.

**Spec.**

```ts
export interface ScorerSlots {
  readonly crpsDiscrete?: CrpsDiscreteFn;
  readonly pitDiscrete?: PitDiscreteFn;
  readonly pitHistogram?: PitHistogramFn;
  readonly brierMurphy?: BrierMurphyFn;
  readonly calibrationFit?: CalibrationFitFn;
}
export interface BinaryScoreSet { readonly n: number;
  readonly brier: number;                     // unbinned mean (p − y)² computed locally
  readonly logLoss: number;                   // clamp p to [1e-12, 1−1e-12]; document
  readonly murphy: BrierDecomposition;
  readonly calibration: CalibrationFit | { readonly refused: "no_convergence" };
  readonly hitRate: number;                   // REPORTED, NEVER DECISIVE (§6) — say so in the field doc
  readonly priced: false }
export interface CountScoreSet { readonly n: number;
  readonly meanCrps: number;
  readonly pitByFamily: ReadonlyMap<string, PitHistogram | { readonly refused: "insufficient_n"; readonly n: number }>;
  readonly priced: false }
export type ScoreRefusal = { readonly ok: false;
  readonly refuse: "missing_slot" | "empty_oof"; readonly detail: string; readonly priced: false };

export function scoreBinary(oof: readonly BinaryOof[], slots: ScorerSlots, bins?: number)
  : ({ ok: true } & BinaryScoreSet) | ScoreRefusal;
export function scoreCount(oof: readonly CountOof[], slots: ScorerSlots, rng: Rng,
  opts?: { bins?: number; minPitN?: number })   // defaults: bins 10, minPitN 50
  : ({ ok: true } & CountScoreSet) | ScoreRefusal;
```

Rules (all mandatory):

- A needed-but-absent slot fn ⇒ `missing_slot` naming it. NEVER a local reimplementation
  of CRPS/PIT/Murphy/IRLS — the fail-closed refusal exists precisely so nobody
  "helpfully" inlines statistics that Wave K owns (`KERNEL_SLOT_CARDS.md` gate:
  conformance-tested slots or nothing).
- `scoreBinary`: `brier` and `logLoss` are the only locally computed numbers (trivial
  means; clamp documented in a comment with the constant). `murphy` = `brierMurphy(p, y, bins)`.
  `calibration` = `calibrationFit(p, y)` with `NO_CONVERGENCE` (a thrown `KernelError`)
  caught and converted to the typed refusal — perfect separation must not kill a slate.
- `scoreCount`: `meanCrps` = mean of `crpsDiscrete(dist, observed)`. **PIT per prop
  family (§6 "PIT histograms ... per prop family"):** group OOF rows by `family`;
  `u = pitDiscrete(dist, observed, rng)` per row IN INPUT ORDER (determinism under a
  seeded rng); families with `n < minPitN` refuse `insufficient_n` with the n rather
  than rendering an untrustworthy histogram.
- Pure; the ONLY randomness is the injected rng consumed by `pitDiscrete`.

**Discipline:** priced:false; fail-closed on missing data (missing slot = refusal, not
fallback); nothing enters live p without masterplan §6 validation; no MODEL_VERSION;
forbidden zones (prisma schema, event-odds-ingest writes, secrets, vercel.json) per
common contract.

**Verify:**
```
cd packages/prediction-engine && npx vitest run src/edge-lab/edge-validate/__tests__/scorers.test.ts && npx tsc --noEmit
```

**Idempotent:** new files only.

**Commit on pass:** `feat(edge-validate): EV4 scoring facade over kernel slots (injected, fail-closed)`

**ATTACK LIST (verifier):**
- Inject a reference `brierMurphy` that RECORDS its arguments; verify the facade passes
  p and y in row order, unfiltered — any silent NaN-filtering in the facade is a bug
  (NaN must have been refused upstream by EV2/EV3).
- Brier cross-check by independent derivation: 4 hand-rows (p=.8/y=1, p=.2/y=0,
  p=.5/y=1, p=.9/y=0) ⇒ brier = (0.04+0.04+0.25+0.81)/4 = 0.285 exactly.
- Omit `crpsDiscrete` from slots and call `scoreCount` ⇒ `missing_slot` naming
  "crpsDiscrete" — and grep the module: no local Σ(F(k)−1{k≥y})² anywhere.
- PIT grouping: two families 60/40 rows with minPitN 50 ⇒ one histogram + one
  `insufficient_n` refusal carrying n=40.
- Determinism: same seed ⇒ identical pitByFamily; different seed ⇒ different u's (proves
  the rng is actually threaded, not ignored).

---

## EV5 · clv-referee — the economic referee (EV-vs-close, named honestly)

**DATA CLASS: INTERNAL** (code; REAL outputs are CROWN — see deck header).

**Artifact:** `packages/prediction-engine/src/edge-lab/edge-validate/clv-referee.ts`
+ `edge-validate/__tests__/clv-referee.test.ts`

**Depends:** EV3 shapes. Reuses `evVsClose` from `../placebo.js` (embedded above — do
NOT reimplement the return formula). `BlockBootstrapFn` injected (typed from contract;
real slot wired in EV7).

**Spec.** Masterplan §6 "Economic referee: simulated flat-stake CLV vs consensus close
at decision time." The honest name, per `placebo.ts`'s header: this is **EV-vs-close**,
not CLV — true CLV needs a decision-time price the archives don't hold yet. The module
must carry that name in its method tag and report field.

```ts
export const CLV_REFEREE_METHOD_TAG = "ev_vs_close_not_clv_v1" as const;

export interface ClvOptions { readonly fireThreshold: number;   // |p − qClose| gate (walkForwardEval L109 semantics)
  readonly minPlays?: number;                                    // default 50
  readonly bootstrap?: { readonly fn: BlockBootstrapFn; readonly blockLength?: number;  // default min(8, max(1, floor(fired/10)))
    readonly resamples?: number; readonly level?: number; readonly seed: number } }     // defaults 2000, 0.95

export type ClvReport = { readonly ok: true; readonly methodTag: typeof CLV_REFEREE_METHOD_TAG;
  readonly eligible: number; readonly fired: number; readonly coverage: number;
  readonly meanReturn: number | null; readonly seReturn: number | null;
  readonly ci: Interval | null;                     // block bootstrap over fired returns in decisionAt order
  readonly verdict: "positive" | "zero" | "negative" | "too_few_plays";
  readonly priced: false };
export type ClvRefusal = { readonly ok: false; readonly methodTag: typeof CLV_REFEREE_METHOD_TAG;
  readonly refuse: "no_market_feed" | "empty_oof"; readonly detail: string; readonly priced: false };

export function refereeBinary(oof: readonly BinaryOof[], rowsById: ReadonlyMap<string, TimedRow>,
  opts: ClvOptions): ClvReport | ClvRefusal;
export function refereeCount(oof: readonly CountOof[], rowsById: ReadonlyMap<string, TimedRow>,
  opts: ClvOptions): ClvReport | ClvRefusal;
```

Rules (all mandatory):

- Fire rule: `|p − q| > fireThreshold`, return `evVsClose(p, q, y)` — for counts,
  `p = 1 − dist.cdf(floor(line))` (P(over) for a half-point line; refuse rows with an
  integer line — push handling is out of scope and must be refused, not approximated)
  and `y = observed > line ? 1 : 0`; ONLY rows carrying `qClose` (and `line`) are
  eligible. If NO row in the OOF set carries `qClose` ⇒ `no_market_feed` — the
  entire referee refuses. This is today's reality for every prop family (EV1); the
  refusal string is the honest answer, a proxied close is a firing offense.
- `verdict`: `too_few_plays` when `fired < minPlays`; else `positive` iff
  `meanReturn > 0` AND (`ci` present ⇒ `ci.lower > 0`); `negative` symmetric on the
  upper bound; else `zero`.
- Bootstrap: fired returns sorted by the play's `decisionAt` (via `rowsById`), block
  form (autocorrelated weeks — an i.i.d. bootstrap understates uncertainty, the
  contract's own words), statistic = mean, rng = `makeRng(seed)`. Absent `opts.bootstrap`
  ⇒ `ci: null` (and `positive` then requires `meanReturn − 2·seReturn > 0`; document).
- §6's cross-metric sentence ("improves log-loss but not CLV is describing the market")
  is EV6's job — this module only produces the economic numbers. Pure, deterministic,
  no I/O.

**Discipline:** priced:false (the method tag itself disclaims CLV); fail-closed on
missing data (`no_market_feed`); nothing enters live p without masterplan §6 validation;
no MODEL_VERSION; forbidden zones (prisma schema, event-odds-ingest writes, secrets,
vercel.json) per common contract.

**Verify:**
```
cd packages/prediction-engine && npx vitest run src/edge-lab/edge-validate/__tests__/clv-referee.test.ts && npx tsc --noEmit
```

**Idempotent:** new files only.

**Commit on pass:** `feat(edge-validate): EV5 economic referee — EV-vs-close, fail-closed without a market feed`

**ATTACK LIST (verifier):**
- Independent-derivation check on one fired play: p=0.60, q=0.55, y=1 ⇒ fires home side,
  return (1−0.55)/0.55 = 0.818181…; y=0 ⇒ −1. Compare against the module to 1e-12 —
  derived from the formula in `placebo.ts` L54-60, not from this module.
- Null test: generate 5000 rows with p ≡ q + seeded noise below fireThreshold on half —
  meanReturn of the fired set must be statistically ~0 (the referee must not manufacture
  edge from the null).
- Count-side eligibility: an OOF set where 3 of 100 rows carry qClose must referee ONLY
  those 3 (then hit `too_few_plays`) — never impute the other 97.
- Integer-line count row must be REFUSED, not scored (push ambiguity).
- Zero-qClose-anywhere ⇒ `no_market_feed`; grep for any default/fallback close constant
  (e.g. 0.5) — its presence is an automatic reject.

---

## EV6 · promotion — the CANDIDATE→VALIDATED report (masterplan §6 gates)

**DATA CLASS: INTERNAL** (code; REAL outputs are CROWN — see deck header).

**Artifact:** `packages/prediction-engine/src/edge-lab/edge-validate/promotion.ts`
+ `edge-validate/__tests__/promotion.test.ts`

**Depends:** EV4, EV5 shapes. `BenjaminiHochbergFn` injected (typed from contract; real
slot wired in EV7).

**Spec.** Maps §6's gate sentence — "CANDIDATE→VALIDATED: pre-registered holdout
improvement + sign stability across ≥2 seasons + survives grid-level FDR" plus the
economic-referee clause — onto a typed report. **The holdout leg is founder-gated and
sealed (walk-forward.ts L149-210), so this module's ceiling is
`VALIDATED_PENDING_HOLDOUT`. The literal string `"VALIDATED"` standing alone must not
exist anywhere in this module.**

```ts
export type PromotionStatus =
  | "REFUSED"                    // as-of violation / market-prop / spec refusal upstream
  | "HYPOTHESIS"                 // default; insufficient seasons or no aggregate improvement
  | "DESCRIBES_MARKET"           // proper score improves, economic referee not positive (§6)
  | "CANDIDATE"                  // aggregate improvement across >= 2 seasons
  | "VALIDATED_PENDING_HOLDOUT"; // sign-stable + FDR-survived + referee positive; awaits founder holdout sign-off

export interface SeasonSummary { readonly season: string; readonly n: number;
  readonly properScore: number;          // Brier (binary) | meanCrps (count); lower better
  readonly baselineProperScore: number;
  readonly delta: number;                // baseline − candidate; > 0 = improvement
  readonly clv: ClvReport | ClvRefusal }
export interface PromotionInput { readonly candidateId: string; readonly kind: "binary" | "count";
  readonly seasons: readonly SeasonSummary[];
  readonly asOfViolations: number; readonly marketPropHits: number;
  readonly grid?: { readonly pValues: readonly number[]; readonly index: number; readonly alpha: number } }
export interface GateLine { readonly gate: string; readonly passed: boolean | "not_run"; readonly detail: string }
export interface PromotionReport { readonly candidateId: string;
  readonly status: PromotionStatus; readonly gates: readonly GateLine[];
  readonly gridOfOne: boolean; readonly priced: false }

export function promotionReport(input: PromotionInput, bh?: BenjaminiHochbergFn): PromotionReport;
```

Gate ladder (evaluate ALL gates and report every line; the status is the ladder's floor):

1. `as_of` — `asOfViolations === 0 && marketPropHits === 0`; fail ⇒ status `REFUSED`,
   full stop (§6 as-of discipline + q-contamination).
2. `temporal_cv` — every season's summary exists with n > 0 (folds were EV3's job; this
   gate records the attestation chain in `detail`).
3. `improvement` — pooled (n-weighted) delta > 0; fail ⇒ cap `HYPOTHESIS`.
4. `seasons` — `seasons.length >= 2`; fail ⇒ cap `HYPOTHESIS` (one season is never
   stability evidence).
5. `sign_stability` — delta > 0 in EVERY season; fail (while gate 3+4 pass) ⇒ cap
   `CANDIDATE`.
6. `fdr` — requires `grid`: `bh(grid.pValues, grid.alpha).rejected[grid.index] === true`.
   `grid` absent or `bh` absent ⇒ `"not_run"` and cap `CANDIDATE` (an unregistered
   hypothesis can never reach the top status — this is what stops p-hacking-by-omission).
   `gridOfOne = grid.pValues.length === 1` is surfaced honestly (see Open Question 4).
7. `economic_referee` — pooled-view rule: EVERY season's `clv` is `ok:true` with verdict
   `positive` ⇒ pass. Any season `no_market_feed` ⇒ `"not_run"` and cap `CANDIDATE`
   with detail naming the missing feed (today: all prop families). Any verdict
   `zero`/`negative`/`too_few_plays` while gate 3 passes ⇒ status `DESCRIBES_MARKET` —
   §6 verbatim: "A covariate that improves log-loss but not CLV is describing the
   market, not beating it."
8. Top status `VALIDATED_PENDING_HOLDOUT` requires gates 1–7 all `passed: true`.

Also: `LIVE→RETIRED` (rolling 8-week demotion) is OUT OF SCOPE — nothing this deck
touches is live; state that in the header. Pure, deterministic, no I/O.

**Discipline:** priced:false; fail-closed on missing data (absent grid/feed can only cap
downward, never upward); nothing enters live p without masterplan §6 validation — this
report RECOMMENDS, the catalog + founder decide; no MODEL_VERSION; forbidden zones
(prisma schema, event-odds-ingest writes, secrets, vercel.json) per common contract.

**Verify:**
```
cd packages/prediction-engine && npx vitest run src/edge-lab/edge-validate/__tests__/promotion.test.ts && npx tsc --noEmit && ! grep -n '"VALIDATED"' src/edge-lab/edge-validate/promotion.ts
```

**Idempotent:** new files only.

**Commit on pass:** `feat(edge-validate): EV6 promotion report — §6 gates, ceiling VALIDATED_PENDING_HOLDOUT`

**ATTACK LIST (verifier):**
- Monotonicity property: starting from an input that reaches
  `VALIDATED_PENDING_HOLDOUT`, degrade any single gate input and assert the status only
  moves DOWN the ladder — enumerate all 7 degradations.
- The DESCRIBES_MARKET trap: improvement in both seasons, sign-stable, FDR-rejected,
  referee verdict `zero` ⇒ status must be `DESCRIBES_MARKET`, not `CANDIDATE`.
- FDR-input attack: pass a grid where the candidate's p is significant RAW but not after
  BH (e.g. p=0.04, m=20, all others 0.5, alpha=0.05) with a reference BH implementation
  derived independently — status must cap at `CANDIDATE`.
- `asOfViolations: 1` with everything else perfect ⇒ `REFUSED` — no gate may be
  evaluated in a way that lets a later pass override it.
- Grep test: the string `"VALIDATED"` (with closing quote) absent; `priced: false` on
  the report literal; no `Math.random`.

---

## EV7 · edge-validate CLI — `npm run edge:validate`

**DATA CLASS: INTERNAL** (code + synthetic fixture; REAL-candidate reports are CROWN —
never commit them, never paste them).

**Artifact:** `scripts/edge-lab/edge-validate.ts` — plus EXACTLY ONE wiring line added
to root `package.json` `"scripts"` (beside `"gate:phase-c"`, which is the tsx
precedent at its L42):

```json
"edge:validate": "tsx scripts/edge-lab/edge-validate.ts",
```

**Depends:** EV2–EV6 merged, AND Wave-K slots landed (preconditions ledger): this is
the ONE place the real slot implementations are imported —
`kernel/slots/crps.js` (K1), `pit.js` (K2), `brier-murphy.js` (K3),
`calibration-fit.js` (K4), `bh-fdr.js` (K5), `block-bootstrap.js` (K7) — and injected
into EV4/EV5/EV6. A missing slot file at runtime ⇒ exit 3 naming it (fail-closed, never
a stub).

**Spec.** GRIND Tier-1 T1.1 + T1.2 in one command:

```
npm run edge:validate -- --candidate synthetic [--seed 7] [--out reports/edge-lab/edge-validate] [--strict]
npm run edge:validate -- --candidate ./path/to/candidate-module.ts [...]
npm run edge:validate -- --list
```

- `--candidate synthetic` is BUILT IN (defined inside this script — keeps the card at
  one artifact): a deterministic fixture from `makeRng(seed)`; 3 pseudo-seasons
  ("2021","2022","2023") × 20 weeks × 10 rows; `decisionAt` = fixed epoch
  2021-09-01T00:00:00Z + weekIndex·7d, `eventEndAt` = +4h. Binary leg: two features
  f1,f2 ~ uniform(−1,1); trueP = sigmoid(0.8·f1 − 0.5·f2);
  y ~ Bernoulli(trueP); qClose = clamp(trueP + 0.05·(rng()−0.5), 0.02, 0.98);
  candidate trainer = `logisticTrainer({featureKeys:["f1","f2"]})`, baseline = the
  market-only trainer (predicts qClose — carried as a feature the baseline alone reads).
  Count leg (family "receptions"): observed ~ Poisson(exp(0.5 + 0.3·f1)) drawn by cdf
  inversion on one rng() uniform; candidate CountTrainer fits a train-fold Poisson rate
  per f1-sign bucket and returns an inline Poisson `DiscreteDistribution` built with
  `logGamma` from `kernel/numeric.js` (no new distribution slot needed); baseline =
  climatology (one pooled rate). Count rows carry NO qClose — exercising the
  `no_market_feed` path is deliberate, because that is production reality for props.
- `--candidate <path>` dynamic-imports a module whose default export is a
  `CandidateSpec` (EV2). Anything else ⇒ exit 3.
- Pipeline per candidate: `runFolds` (EV3) → per-season split by `seasonOf` →
  `scoreBinary`/`scoreCount` (EV4, rng = `makeRng(seed)`) → `refereeBinary/Count`
  (EV5, bootstrap seed = seed) → `promotionReport` (EV6, bh injected). Grid input:
  `--grid <json-path>` optional (pre-registered p-values + index); absent ⇒ EV6's
  `fdr: not_run` capping applies, honestly.
- Output: `<out>/<candidateId>.report.json` (the full typed report: fold counts,
  purged/embargoed, score sets, PIT histograms per family, referee lines, gate lines,
  status) + `<candidateId>.report.md` (human rendering). Every record inside carries
  `priced: false`. Default `--out` is `reports/edge-lab/edge-validate/` (untracked
  output directory; REAL-candidate reports are CROWN — never commit).
- Exit codes (props-hb-validation.ts precedent): `0` = report computed and written;
  `2` = `--strict` and status is `REFUSED` (as-of violation / market-prop / spec
  refusal); `3` = environment error (missing slot file, bad candidate path, unwritable
  out dir). The synthetic candidate must exit 0 without `--strict`.
- No network, ever, in this script (candidate modules own their data; synthetic is
  generated). No `Math.random` — every random draw through `makeRng(seed)`.

**Discipline:** priced:false throughout the report; fail-closed on missing data
(missing slot/feed = named refusal, never a fallback); nothing enters live p without
masterplan §6 validation — this CLI emits recommendations, it flips nothing; no
MODEL_VERSION; forbidden zones (prisma schema, event-odds-ingest writes, secrets,
vercel.json — the package.json edit is the ONE named script line, nothing else) per
common contract.

**Verify (deterministic; run from repo root):**
```
bash -c 'set -e; for f in crps pit brier-murphy calibration-fit bh-fdr block-bootstrap; do test -f packages/prediction-engine/src/edge-lab/kernel/slots/$f.ts || { echo "BLOCKED: K-slot $f not landed"; exit 1; }; done; d=$(mktemp -d); npm run edge:validate -- --candidate synthetic --seed 7 --out "$d/a"; npm run edge:validate -- --candidate synthetic --seed 7 --out "$d/b"; diff "$d/a/synthetic.report.json" "$d/b/synthetic.report.json"; npm run edge:validate -- --candidate synthetic --seed 8 --out "$d/c"; cd packages/prediction-engine && npx tsc --noEmit; echo PASS'
```

**Idempotent:** re-running overwrites the report files; the package.json line is
idempotent (re-adding the identical line is a no-op merge).

**Commit on pass:** `feat(edge-lab): EV7 edge:validate CLI — walk-forward + PIT-by-family + EV-vs-close referee + §6 promotion report`

**ATTACK LIST (verifier):**
- Determinism is the headline attack: byte-identical JSON across two seed-7 runs; a
  seed-8 run differs (proves the seed is live, not decorative).
- Sanity of the synthetic verdicts, checked by independent reasoning: the binary
  candidate sees the same signal the market prices (qClose = trueP + small noise), so
  the referee should NOT be strongly positive — a `positive` verdict with a fat mean is
  evidence of a leak in the harness itself, investigate before accepting.
- Count leg must produce `no_market_feed` in its referee line and a promotion status
  capped at/below `CANDIDATE` — if the count leg reaches `VALIDATED_PENDING_HOLDOUT`
  with no market feed, EV6's capping is broken.
- Delete `kernel/slots/pit.ts` in a scratch worktree ⇒ exit 3 naming pit — never a
  silent skip of PIT.
- Grep the script for `Math.random`, `fetch(`, `openHoldout(` — all absent.
- Confirm the ONLY package.json change is the single `edge:validate` line (`git diff`
  on package.json shows one added line).

---

## EV8 · guard — repo-level `npm run guard:q-contamination`

**DATA CLASS: INTERNAL.**

**Artifact:** `scripts/guardrails/q-contamination-scan.mjs` — plus EXACTLY ONE wiring
line added to root `package.json` `"scripts"`:

```json
"guard:q-contamination": "node scripts/guardrails/q-contamination-scan.mjs",
```

(Appending it to the aggregate `"guardrails"` chain is an integrator follow-up — that
line is merge-conflict-prone and is NOT part of this card.)

**Blocked until PR #555 merges** (mechanical check inside Verify). Why this card exists:
the recon shows #555's q-contamination walk is PACKAGE-LOCAL — `assertPSideHasNoMarketProp`
lives in `covariate-bus.ts` and only its own vitest file
(`__tests__/covariate-bus.test.ts`) calls it, and the walk covers ONLY the static
default registry. The audit adds: nothing ties the registry to the `CovariateField`
union, so a field added to the union but omitted from the registry silently escapes.
This card makes the invariant a repo-level BUILD failure in the `guard:*` convention
(GRIND T0.5), with no TS toolchain needed.

**Spec.** The scan is a static text walk over
`packages/prediction-engine/src/edge-lab/covariate-bus.ts` (post-#555 shape, embedded
in the deck header). Checks, each with its own failure message and non-zero exit:

1. **market_prop_in_registry** — every `layer: "…"` inside the
   `P_SIDE_COVARIATE_REGISTRY` literal (from `export const P_SIDE_COVARIATE_REGISTRY`
   to the closing `] as const`? accept `];` too) must not be `"MARKET_PROP"`.
2. **registry_union_mismatch** — the set of `"…"` literals in the
   `export type CovariateField =` union must EQUAL the set of `field: "…"` literals in
   the registry. Either direction of mismatch fails, naming the missing fields.
3. **cell_shape_regression** — the `CovariateCell` interface block must contain both
   `knownAtWeek` and `layer` members (tripwire against a revert of #555's stamps).
4. **market_prop_call_site** — `MARKET_PROP` as a literal may appear ONLY in an
   allowlist: `covariate-bus.ts` itself, `edge-lab/__tests__/**`,
   `edge-lab/edge-validate/**` (which REFUSES it — EV3), and post-EV10/EV11 the two
   bind modules. Scan `packages/prediction-engine/src/**/*.ts`; any other file
   containing the literal fails, printing the path. Growing the allowlist is an
   integrator decision recorded in the script's header comment.
5. **assert_still_exported** — `export function assertPSideHasNoMarketProp` still
   exists (the package-local belt stays on; this scan is the repo-level suspenders).

`--self-test` mode: the script embeds poisoned fixture STRINGS (a registry with a
MARKET_PROP entry; a union with a 10th field missing from the registry; a cell block
without knownAtWeek) and asserts each rule fires on its fixture and stays quiet on a
clean fixture; exits 0 iff all self-checks behave. No fixture files on disk — the card
stays one-artifact.

**Discipline:** priced:false n/a (no result records); fail-closed (any parse failure of
the expected blocks — e.g. the registry block not found — is itself a FAILURE, never a
skip: a guard that can't find its target must scream, not pass); nothing enters live p
without masterplan §6; no MODEL_VERSION; forbidden zones (prisma schema,
event-odds-ingest writes, secrets, vercel.json — package.json gets the ONE named line)
per common contract.

**Verify (deterministic; run from repo root):**
```
bash -c 'set -e; grep -q knownAtWeek packages/prediction-engine/src/edge-lab/covariate-bus.ts || { echo "BLOCKED: PR #555 not merged"; exit 1; }; node scripts/guardrails/q-contamination-scan.mjs --self-test; node scripts/guardrails/q-contamination-scan.mjs; echo PASS'
```

**Idempotent:** pure read-only scan; new file + one script line; safe to redo.

**Commit on pass:** `feat(guardrails): EV8 repo-level q-contamination scan (registry exhaustiveness + MARKET_PROP walk)`

**ATTACK LIST (verifier):**
- Mutate a scratch copy of covariate-bus.ts: flip one registry entry to
  `layer: "MARKET_PROP"` ⇒ scan fails with rule 1; add `"newField"` to the union only ⇒
  fails with rule 2 naming `newField`; delete `knownAtWeek` from the cell ⇒ rule 3.
  (Run the script pointed at the scratch copy via its `--file` override, which the
  script must support for exactly this testability; default remains the real path.)
- Comment-evasion attack: put `layer: "MARKET_PROP"` inside a block comment in the
  registry region — decide and pin the behavior (recommended: still fail; a guard
  should be paranoid about its own parser).
- Rename `P_SIDE_COVARIATE_REGISTRY` in the scratch copy ⇒ the scan must FAIL
  ("target block not found"), not pass vacuously — this is the fail-closed attack.
- Verify rule 4 catches a planted `const x = { layer: "MARKET_PROP" }` in a scratch
  file under `edge-lab/features/`.

---

## EV9 · bus leak wall — non-finite weeks fail CLOSED + `assertKnownBeforeKickoff`

**DATA CLASS: INTERNAL.**

**Artifact (edits, one module + its test):**
`packages/prediction-engine/src/edge-lab/covariate-bus.ts`
+ `packages/prediction-engine/src/edge-lab/__tests__/covariate-bus.test.ts`

**Blocked until PR #555 merges** (this card edits the post-merge file; doing it on
main's 3-field cell guarantees a collision — recon risk list, item 1).

**Spec.** Fixes BOTH critical audit findings and the cross-season gap, and adds the
consumption-side guard the audit shows is missing.

Current fail-open behavior (symbol `latestPriorRow`; pre-#555 tree L119-136 — key on
symbols after merge):

```ts
for (const r of rows) {
  ...
  if (r.week === 0) continue;                          // NaN === 0 is false → passes
  if (r.week <= 0 || r.week >= kickoffWeek) continue;  // NaN comparisons false → passes
  if (best === null || r.week > best.week) best = r;   // NaN row can become best
}
```

With `kickoffWeek = NaN` every comparison is false, so ALL weeks qualify — including
FUTURE ones — and the LATEST wins: silent future-into-prior leakage across all 9
registry covariates and every bind. Changes (all mandatory):

1. Top of `latestPriorRow`: `if (!Number.isInteger(kickoffWeek) || kickoffWeek < 1) return null;`
2. Per-row filter gains: `if (!Number.isInteger(r.week)) continue;` (a NaN/1.5-week row
   can never be selected or beat a valid row).
3. New export (the consumption guard EV10/EV11 wire; audit fix_hint):

```ts
export type CellGuardResult =
  | { readonly ok: true }
  | { readonly ok: false; readonly refuse: "known_at_not_prior" | "market_prop_layer" | "bad_kickoff_week" };
export function assertKnownBeforeKickoff(cell: CovariateCell, kickoffWeek: number): CellGuardResult;
// ok iff Number.isInteger(kickoffWeek) && kickoffWeek >= 1
//     && Number.isInteger(cell.knownAtWeek) && cell.knownAtWeek < kickoffWeek
//     && cell.layer !== "MARKET_PROP"
```

(Returns a refusal record rather than throwing — the bind loops must skip, not crash;
same total-function norm as `snapShare`.)

4. `nextGameCovariate` / `sepForKickoff` inherit safety through `latestPriorRow` — no
   separate patch, but the tests below pin all three entry points.

New tests (the audit's exact prescriptions):

- "leak wall fails closed on bad kickoffWeek": fixture rows weeks 1..5 (week 5 the leak
  bait, distinct value); `latestPriorRow` / `nextGameCovariate` / `sepForKickoff` with
  kickoffWeek ∈ {NaN, Infinity, −1, 0, 1.5} each return `null`.
- Poisoned row: a single `week: NaN` row ⇒ all three return `null`; with
  `[rx({week: NaN, avgSeparation: 99}), rx({week: 2, avgSeparation: 2.0})]` and
  kickoffWeek 3, the week-2 row wins (value 2.0).
- Cross-season isolation: `[rx({season: 2023, week: 18, avgSeparation: 9.9}),
  rx({season: 2024, week: 2, avgSeparation: 2.0})]` ⇒ `sepForKickoff(..., 2024, 1)`
  is `null` (prior season never leaks); `(..., 2024, 3)` picks 2.0.
- `assertKnownBeforeKickoff`: `{knownAtWeek: kickoffWeek}` and `{kickoffWeek+1}` refuse
  `known_at_not_prior`; `layer: "MARKET_PROP"` refuses `market_prop_layer`;
  `kickoffWeek: NaN` refuses `bad_kickoff_week`; a clean prior-week cell passes.
- Regression guard: existing happy-path tests untouched and green.

**Discipline:** priced:false (the bus emits cells, not picks — unchanged); fail-closed
on missing data (that is this card); nothing enters live p without masterplan §6; no
MODEL_VERSION; forbidden zones (prisma schema, event-odds-ingest writes, secrets,
vercel.json) per common contract.

**Verify:**
```
cd packages/prediction-engine && npx vitest run src/edge-lab/__tests__/covariate-bus.test.ts && npx tsc --noEmit
```

**Idempotent:** re-applying the same edits from scratch is correct; the new tests fail
on the pre-card file (prove it once: stash the source edit, run, watch NaN/Infinity
cases fail — that is the evidence the tests bite).

**Commit on pass:** `fix(edge-lab): EV9 covariate-bus leak wall fails closed on non-finite weeks; add assertKnownBeforeKickoff`

**ATTACK LIST (verifier):**
- THE bite test: revert source change 1 only (keep tests) ⇒ the NaN/Infinity kickoffWeek
  tests MUST fail by selecting the week-5 bait. A test that passes against the fail-open
  code is vacuous — reject.
- 1.5-week attack both sides: `kickoffWeek: 1.5` AND `r.week: 1.5` — both must be
  refused (Number.isInteger, not isFinite).
- `kickoffWeek: 1` (legitimate week-1) returns null on any fixture — not an error, not
  a season-aggregate fallback.
- Guard-return attack: confirm `assertKnownBeforeKickoff` returns refusals (never
  throws) for every bad input in the table, and that `knownAtWeek: NaN` refuses
  `known_at_not_prior` (NaN < k is false — verify the implementation checks
  Number.isInteger explicitly, not just the comparison).
- Confirm no behavior change for valid integer weeks: property test comparing old/new
  selection on 500 random VALID fixtures (integers only) — identical picks.

---

## EV10 · sep-bind consumption guard

**DATA CLASS: INTERNAL.**

**Artifact (edits, one module + its test):**
`packages/prediction-engine/src/edge-lab/props-hb-adot-sep-bind.ts`
+ `packages/prediction-engine/src/edge-lab/__tests__/props-hb-adot-sep-bind.test.ts`

**Depends:** EV9 merged (uses `assertKnownBeforeKickoff`). Note: PR #555 threads the
full cell through the YAC bind but NOT this sep bind (audit: 02f4ecd) — this card
closes that asymmetry.

**Spec.** The audit finding: `bindSepSamples` flattens the cell to a bare
`avgSeparation: v` number, stripping `layer`/`knownAtWeek` at exactly the seam the
doctrine says must respect known_at; and the refuse-label bug at the defensive guard —
`Number.isNaN(v) ? "non_finite_separation" : "null_separation"` — mislabels
`Infinity` as `null_separation`. Changes (all mandatory):

1. After `sepForKickoff` returns a non-null cell, call
   `assertKnownBeforeKickoff(cell, req.kickoffWeek)`; on refusal push a new refuse
   variant — extend the union in `SepBindResult` (embedded current shape:
   `"no_prior_row" | "null_separation" | "non_finite_separation"`) with
   `"known_at_not_prior" | "market_prop_layer" | "bad_kickoff_week"`.
2. Fix the label: `!Number.isFinite(v)` ⇒ `"non_finite_separation"` (Infinity and NaN
   both); `"null_separation"` only for an actual null.
3. Carry the stamp: the `ok: true` branch adds `readonly cell: CovariateCell` (the full
   post-#555 cell) alongside the existing `sample` — downstream (EV3's as-of attest)
   can then re-verify instead of trusting. `AdotSepCatchSample` itself is UNCHANGED
   (its consumers are fit functions that must not grow market-adjacent fields).

New tests:

- Direct guard behavior via the bind: post-EV9 the bus cannot emit a violating cell, so
  the test hand-builds the refusal path through the exported guard AND pins the bind's
  wiring by type: the ok-result now carries `cell` with `knownAtWeek < kickoffWeek`
  asserted on every bound sample in a realistic fixture.
- Infinity mislabel pinned: a rows fixture whose selected week has
  `avgSeparation: Infinity` — the bus's `nextGameCovariate` already nulls non-finite
  values, so drive the defensive branch directly if unreachable through the public API;
  if it IS unreachable, the test documents that and pins the label at the unit level.
- Week-1 slate: every request `kickoffWeek: 1` ⇒ every result `ok:false`
  (`no_prior_row`), `boundSepSamples === []`, and `fitAdotSepCatchPriors([])` (or the
  module's fit entry) returns null — the empty-slate chain end to end.

**Discipline:** priced:false (already on every result — keep it); fail-closed on
missing data; nothing enters live p without masterplan §6; no MODEL_VERSION; forbidden
zones (prisma schema, event-odds-ingest writes, secrets, vercel.json) per common
contract.

**Verify:**
```
cd packages/prediction-engine && npx vitest run src/edge-lab/__tests__/props-hb-adot-sep-bind.test.ts && npx tsc --noEmit
```

**Idempotent:** re-applying from scratch is correct.

**Commit on pass:** `fix(edge-lab): EV10 sep bind enforces knownAtWeek at consumption; carry cell stamp; fix Infinity refuse label`

**ATTACK LIST (verifier):**
- Vacuity check FIRST: confirm the new known_at test would fail if the
  `assertKnownBeforeKickoff` call were deleted from the bind (delete it in a scratch
  tree and run) — if the suite still passes, the wiring test is decorative; reject.
- Type-fidelity: `SepBindResult` ok-branch carries `cell: CovariateCell` (full type,
  not `{value}`); refuse union has exactly the 6 variants; `priced: false` on both
  branches.
- The Infinity case yields `non_finite_separation`, NaN yields `non_finite_separation`,
  and null yields `null_separation` — three distinct pins.
- No behavior change on the happy path: existing bound-sample fixtures produce
  identical samples (plus the new cell field).

---

## EV11 · yac-bind consumption guard

**DATA CLASS: INTERNAL.**

**Artifact (edits, one module + its test):**
`packages/prediction-engine/src/edge-lab/props-hb-air-yac-bind.ts`
+ `packages/prediction-engine/src/edge-lab/__tests__/props-hb-air-yac-bind.test.ts`

**Depends:** EV9 merged. Mirror of EV10 with these module-specific facts: #555 already
threads the full `CovariateCell` into `BoundAirYacSample.avgYac` (its L157 edit replaces
the hand-built `{value, grain, provenance}` literal), so the stamp-carrying half is done
by the merge — this card adds the ENFORCEMENT half.

Changes (all mandatory):

1. After `nextGameCovariate(rows, gsisId, season, kickoffWeek, "receiving", "avgYac")`
   returns non-null, call `assertKnownBeforeKickoff(cell, req.kickoffWeek)`; extend the
   `YacBindResult` refuse union (current:
   `"no_prior_row" | "null_yac" | "non_finite_yac"`) with
   `"known_at_not_prior" | "market_prop_layer" | "bad_kickoff_week"`.
2. Fix the label bug at the defensive guard (current:
   `Number.isNaN(v) ? "non_finite_yac" : "null_yac"` — Infinity falls to `null_yac`):
   `!Number.isFinite(v)` ⇒ `"non_finite_yac"`.
3. A `BoundAirYacSample` whose `avgYac.layer === "MARKET_PROP"` must be unreachable
   through `bindYacSamples` — pinned by test.

New tests: mirror EV10's list (guard wiring bite test, Infinity/NaN/null three-way pin,
all-week-1 batch ⇒ `boundYacSamples === []` ⇒ `fitAirYacPriors([])` returns null —
chaining into the EV14 pin).

**Discipline:** priced:false; fail-closed on missing data; nothing enters live p
without masterplan §6; no MODEL_VERSION; forbidden zones (prisma schema,
event-odds-ingest writes, secrets, vercel.json) per common contract.

**Verify:**
```
cd packages/prediction-engine && npx vitest run src/edge-lab/__tests__/props-hb-air-yac-bind.test.ts && npx tsc --noEmit
```

**Idempotent:** re-applying from scratch is correct.

**Commit on pass:** `fix(edge-lab): EV11 yac bind enforces knownAtWeek at consumption; fix Infinity refuse label`

**ATTACK LIST (verifier):**
- Same vacuity-first check as EV10 (delete the guard call in a scratch tree; the new
  test must fail).
- Confirm the #555 cell-threading is intact after this edit (ok-sample's `avgYac` is
  the full cell, not re-flattened) — a regression here undoes the merge.
- Cross-check the two binds AGREE: same refuse-variant names for the same violations
  (a verifier diff of the two unions; naming drift between twins is a maintenance bug).

---

## EV12 · snap-exposure fail-closed — no throw on the week-1/rookie path

**DATA CLASS: INTERNAL.**

**Artifact (edits, one module + its test):**
`packages/prediction-engine/src/edge-lab/props-hb-snap-exposure.ts`
+ `packages/prediction-engine/src/edge-lab/__tests__/props-hb-snap-exposure.test.ts`

**Depends:** nothing — unblocked now. Audit finding (high): `expectedSnapsNext(null,
teamSnaps, false)` THROWS `RangeError` (current L83-85) despite the header's "does not
invent a snap share when the pooled sample is empty" — the week-1/rookie/healthy-scratch
path crashes any batch loop instead of refusing like every sibling module. The 33-line
test file exercises none of: null share, NaN inputs, `playerSnaps > teamOffSnaps`,
empty/all-refused pooling.

**Spec.** Current shapes (embedded; the whole module is 92 lines):

```ts
export type SnapSample = { readonly playerSnaps: number; readonly teamOffSnaps: number };
export type SnapShare  = { ok: true;  methodTag; share: number; priced: false };
export type SnapDenied = { ok: false; methodTag; share: null;  priced: false; refuse: "zero_team" | "zero_player" | "bad" };
export function snapShare(s: SnapSample): SnapShare | SnapDenied;          // keep as-is
export function pooledSnapShare(samples: readonly SnapSample[]): number | null;  // keep as-is
export function expectedSnapsNext(share: number | null, teamOffSnapsNext: number, injuryOut: boolean): number;  // REPLACE
```

Changes (all mandatory):

1. Replace `expectedSnapsNext`'s throw contract with a total refuse-union, keeping the
   name (in-package callers updated; see STOP rule):

```ts
export type SnapsNext =
  | { readonly ok: true;  readonly methodTag: typeof SNAP_EXPOSURE_METHOD_TAG;
      readonly expected: number; readonly priced: false }
  | { readonly ok: false; readonly methodTag: typeof SNAP_EXPOSURE_METHOD_TAG;
      readonly expected: null; readonly priced: false;
      readonly refuse: "no_pooled_share" | "bad_share" | "bad_team_snaps" };
export function expectedSnapsNext(share: number | null, teamOffSnapsNext: number, injuryOut: boolean): SnapsNext;
```

   - `injuryOut === true` ⇒ ok with `expected: 0` (the ZIP hurdle) EVEN when share is
     null — an out player's exposure is 0 regardless of history.
   - `share === null` (and not injuryOut) ⇒ refuse `no_pooled_share` — the honest
     week-1 answer, and a batch loop SKIPS instead of dying.
   - `!Number.isFinite(share) || share < 0 || share > 1` ⇒ refuse `bad_share` (the
     audit's ">1 currently accepted" hole closes here).
   - `!Number.isFinite(teamOffSnapsNext) || teamOffSnapsNext < 0` ⇒ refuse
     `bad_team_snaps`; `teamOffSnapsNext === 0` ⇒ ok `expected: 0`.
2. `snapShare` / `pooledSnapShare` semantics UNCHANGED — but newly pinned by tests:
   `pooledSnapShare([]) === null`; all-refused rows (all zero-player) ⇒ null;
   `snapShare({playerSnaps: 80, teamOffSnaps: 70})` refuses `"bad"`; NaN inputs refuse
   `"bad"`.
3. **STOP rule:** before editing, run
   `grep -rn "expectedSnapsNext" packages/ apps/ workers/ scripts/ --include='*.ts'`.
   If any call site exists beyond this module, its test, and the
   `packages/prediction-engine/src/index.ts` barrel — STOP; the card splits (contract
   change + caller migration are then two cards). Recon expects none.

**Discipline:** priced:false (already on every record); fail-closed on missing data
(that is this card); nothing enters live p without masterplan §6; no MODEL_VERSION;
forbidden zones (prisma schema, event-odds-ingest writes, secrets, vercel.json) per
common contract.

**Verify:**
```
cd packages/prediction-engine && npx vitest run src/edge-lab/__tests__/props-hb-snap-exposure.test.ts && npx tsc --noEmit
```

**Idempotent:** re-applying from scratch is correct.

**Commit on pass:** `fix(edge-lab): EV12 expectedSnapsNext fails closed (refuse union) instead of throwing on null share`

**ATTACK LIST (verifier):**
- Batch-survival attack: map `expectedSnapsNext` over a 100-player slate containing 3
  null-share rookies — the loop completes with 3 refusals and 97 numbers; under the old
  contract this dies at the first rookie (verify by reasoning on the old signature, then
  by the new test).
- `injuryOut: true, share: null` ⇒ ok 0 — NOT a refusal (an out player is a known 0,
  not missing data; the distinction is the card).
- `share: 1.03` refuses `bad_share` (was silently accepted — the audit's hole; test
  must fail against the pre-card module).
- `priced: false` present on both branches of the new union; no throw remains in the
  function body (grep for `throw` — zero hits in `expectedSnapsNext`).

---

## EV13 · partition helper — poisoned rows drop with reasons, never kill the batch

**DATA CLASS: INTERNAL.**

**Artifact (edits, one module + its test):**
`packages/prediction-engine/src/edge-lab/props-hb.ts`
+ `packages/prediction-engine/src/edge-lab/__tests__/props-hb.test.ts`

**Depends:** nothing — unblocked now. Audit finding (medium): family fit functions
throw `RangeError` mid-loop on one NaN row (`fitGroupPrior` validates per-row and
throws), and the only batch caller catches at top level (`props-hb-validation.ts`
`.catch` → `process.exit(3)`) — one malformed nflverse CSV row aborts an entire
validation run.

**Spec.** Embedded current shape: `RateSample { games: number; total: number }`
(props-hb.ts L61-64); `fitGroupPrior(playerRates: readonly RateSample[]): GammaPrior | null`
(L160) — `[]` ⇒ null (pinned); per-row throws on non-finite games/total, `games <= 0`,
`total < 0`.

Add (do NOT change `fitGroupPrior`'s throw contract — throwing on bad data handed
directly to a fit stays correct; the helper is the batch-side sieve):

```ts
export type RateSampleRefusalReason = "non_finite" | "non_positive_games" | "negative_total";
export function partitionRateSamples(samples: readonly (RateSample & { readonly id?: string })[]):
  { readonly kept: readonly (RateSample & { readonly id?: string })[];
    readonly refused: readonly { readonly index: number; readonly id?: string;
      readonly reason: RateSampleRefusalReason }[] };
```

- Total function, never throws, preserves input order in `kept`, refuses with the FIRST
  matching reason per row (precedence: non_finite, then non_positive_games, then
  negative_total — deterministic).
- Guarantee, stated in the doc comment and pinned by test:
  `fitGroupPrior(partitionRateSamples(xs).kept)` never throws, for ANY input array.

New tests:

- `[good, {games: NaN, total: 3}, good]` ⇒ 2 kept + 1 refused `non_finite` at index 1.
- Pin the existing contract: `fitGroupPrior([good, {games: NaN, total: 3}])` still
  throws `RangeError` naming the bad value (current behavior is correct at the fit
  seam — the test documents WHERE the sieve belongs).
- Property: for 300 seeded random arrays mixing valid/poisoned rows, the guarantee
  above holds and `kept.length + refused.length === input.length`.

**Discipline:** priced:false n/a (no result records — a data sieve); fail-closed on
missing data (drop WITH reason, never impute); nothing enters live p without masterplan
§6; no MODEL_VERSION; forbidden zones (prisma schema, event-odds-ingest writes,
secrets, vercel.json) per common contract.

**Verify:**
```
cd packages/prediction-engine && npx vitest run src/edge-lab/__tests__/props-hb.test.ts && npx tsc --noEmit
```

**Idempotent:** re-applying from scratch is correct.

**Commit on pass:** `feat(edge-lab): EV13 partitionRateSamples — poisoned rows refuse with reasons, batches survive`

**ATTACK LIST (verifier):**
- The never-throws guarantee attacked with adversarial inputs: `games: Infinity`,
  `games: -0` (JS: `-0 <= 0` is true ⇒ `non_positive_games`), `total: -1e-300`,
  `games: "3" as unknown as number` — helper must refuse, not throw, on all.
- Order preservation: shuffled input ⇒ kept preserves relative order (indexes in
  refused are input indexes, not kept indexes).
- Reason precedence pinned: `{games: NaN, total: -1}` refuses `non_finite` (first
  match), deterministically.
- Confirm `fitGroupPrior` itself is byte-identical (git diff shows additions only
  below it) — the card must not soften the fit's own guards.

---

## EV14 · empty-slate contract pins — one test file, five families

**DATA CLASS: INTERNAL.**

**Artifact (ONE new test file — test-only card):**
`packages/prediction-engine/src/edge-lab/__tests__/props-hb-empty-slate.test.ts`

**Depends:** nothing — unblocked now. Audit finding (medium): no family test contains
an empty-array or degenerate-variance case; a bye-week/preseason empty slate reaching a
fit is an unpinned contract.

**Spec.** Pin "empty slate ⇒ null prior, never a fabricated prior" for every recently
shipped family. Exact entry points and sample shapes (embedded; do not explore):

| Module | Fit | Empty call | Sample shape (for degenerate fixtures) |
|---|---|---|---|
| `props-hb-air-yac.ts` | `fitAirYacPriors` (L73) | `fitAirYacPriors([])` ⇒ `null` | `AirYacSample { receptions; airYards; yac }` |
| `props-hb-comp.ts` | `fitCompletionPrior` (L40) | `fitCompletionPrior([])` ⇒ `null` | `CompSample { attempts; completions }` |
| `props-hb-int.ts` | `fitIntPerAttemptPrior` (L50) | `fitIntPerAttemptPrior([])` ⇒ `null` | `IntSample { attempts; ints }` |
| `props-hb-pass-td.ts` | `fitPassTdPerAttemptPrior` (L41) | `fitPassTdPerAttemptPrior([])` ⇒ `null` | `PassTdSample { attempts; passTds }` |
| `props-hb-sacks.ts` | `fitSackPrior` (L36) | `fitSackPrior([])` ⇒ `null` | `SackSample { dropbacks; sacks }` |
| `props-hb.ts` | `fitGroupPrior` (L160) | `fitGroupPrior([])` ⇒ `null` | `RateSample { games; total }` |

Plus the degenerate-dispersion pins:

- `fitGroupPrior` with 8 players at an IDENTICAL rate (e.g. all `{games: 10, total: 20}`)
  ⇒ `null` (the "no fake dispersion" path — v_between degenerates; the module doc says
  callers must fall back to the raw mean with no shrinkage).
- One analogous identical-rate case per Beta-family fit (all players identical
  completion rate) pinning whatever the current behavior IS (null or a prior) — if it
  is NOT null, the test documents the actual contract with a comment rather than
  wishing; changing that behavior would be a separate decision card.

If any `fit*([])` call does NOT return null today, this card's tests will fail — that
is a FINDING, not a test bug: stop, report it, and the fix becomes its own card (this
card never edits module code — test-only).

**Discipline:** priced:false n/a (test-only); fail-closed pins are the content; nothing
enters live p without masterplan §6; no MODEL_VERSION; forbidden zones (prisma schema,
event-odds-ingest writes, secrets, vercel.json) per common contract; touches ZERO
source modules.

**Verify:**
```
cd packages/prediction-engine && npx vitest run src/edge-lab/__tests__/props-hb-empty-slate.test.ts && npx tsc --noEmit
```

**Idempotent:** one new test file; safe to redo.

**Commit on pass:** `test(edge-lab): EV14 empty-slate + degenerate-dispersion contract pins across five prop families`

**ATTACK LIST (verifier):**
- Confirm each pinned `null` by reading NOTHING and running a one-off node/tsx REPL
  against the built package — the pin must reflect execution, not the card's table.
- Degenerate-case honesty: for any family where identical rates do NOT yield null,
  confirm the test pins the TRUE behavior (execute it) and carries the explanatory
  comment — a test asserting the aspirational value is a reject.
- Mutation check: change one `[]` to `[validSample]` in a scratch copy of the test —
  it must then fail (proves the assertions are live, not `toBeDefined` fluff).

---

## EV15 · validation-script batch hygiene — exit 3 means environment, never one bad row

**DATA CLASS: INTERNAL.**

**Artifact (edits ONE script):** `scripts/edge-lab/props-hb-validation.ts`

**Depends:** EV13 merged (`partitionRateSamples`).

**Spec.** Audit finding: the script's only protection is a top-level `.catch` →
`process.exit(3)`, so a single NaN stat row from a malformed nflverse CSV aborts the
entire run. Changes (all mandatory):

1. Route every array destined for `fitGroupPrior` / posterior accumulation through
   `partitionRateSamples`; log refused rows (count + first 5 ids/indexes + reasons) to
   stderr; continue the run.
2. Exit-code contract, restated in the header and enforced: `0` = acceptance passed;
   `2` = acceptance failed; `3` = fetch/environment error ONLY (unreachable asset, too
   few predictions). Poisoned rows can no longer produce exit 3.
3. Add a `--self-test` flag: runs the full scoring pipeline on an EMBEDDED ~30-row
   deterministic fixture (numbers generated inline from `makeRng(20260822)` — no
   network, no fs reads) that includes exactly 2 poisoned rows (`{games: NaN}`-shaped
   at the weekly-row level); must print `refused=2`, complete, and exit 0. This makes
   the card's change executable in CI without `NODE_OPTIONS=--use-system-ca` or a live
   fetch.

**Discipline:** priced:false (the script's report language already disclaims — keep its
"NOT a prop-line CLV claim" header intact, do not touch those paragraphs); fail-closed
on missing data (refuse + log, never impute); nothing enters live p without masterplan
§6; no MODEL_VERSION; forbidden zones (prisma schema, event-odds-ingest writes,
secrets, vercel.json) per common contract.

**Verify (deterministic; run from repo root):**
```
bash -c 'set -e; grep -q partitionRateSamples scripts/edge-lab/props-hb-validation.ts; npx tsx scripts/edge-lab/props-hb-validation.ts --self-test | grep -q "refused=2"; echo PASS'
```

**Idempotent:** re-applying from scratch is correct; `--self-test` writes nothing.

**Commit on pass:** `fix(edge-lab): EV15 props-hb-validation survives poisoned rows; exit 3 reserved for environment`

**ATTACK LIST (verifier):**
- Poison-the-fixture attack: bump the embedded fixture to 3 poisoned rows in a scratch
  copy ⇒ `refused=3` and still exit 0 (the count is live).
- Confirm the live-fetch path is UNCHANGED apart from the sieve (diff review: no
  change to acceptance thresholds, decile logic, or the Wilson-bound reporting — this
  card is hygiene, not results).
- Exit-code attack: in the scratch copy, make the fetch throw ⇒ exit 3; make acceptance
  fail on the self-test fixture (tighten a threshold) ⇒ exit 2 — the codes must not
  bleed into each other.

---

## EV16 · est-routes input guards (#556 hardening)

**DATA CLASS: INTERNAL.**

**Artifact (edits, one module + its test — on branch `grok/h0-est-routes` pre-merge,
or on main post-merge; see Open Question 5):**
`packages/prediction-engine/src/edge-lab/est-routes-tprr.ts`
+ `packages/prediction-engine/src/edge-lab/__tests__/est-routes-tprr.test.ts`

**Blocked until PR #556 merges** unless executed on its branch by that branch's owner.

**Spec.** Audit finding: `estRoutesTprr` accepts negative `targets` (guard is only
`Number.isFinite`, not `>= 0`) and emits ok with a NEGATIVE tprr; `targets: NaN`
silently degrades to `tprr: null` instead of refusing; and
`playerOffenseSnaps > teamOffenseSnaps` is accepted, producing est_routes >
team_dropbacks (share > 1). The module is the L1 exposure denominator the masterplan's
alpha construction consumes — a nonsense denominator poisons every downstream alpha.
Changes (all mandatory):

1. `targets !== undefined && !(Number.isFinite(targets) && targets >= 0)` ⇒ refuse
   `"bad_input"` (covers negative AND NaN — the silent `tprr: null` degradation is
   replaced by an explicit refusal; pinned).
2. `playerOffenseSnaps > teamOffenseSnaps` ⇒ refuse `"bad_input"` (mirror of
   `snapShare`'s player>team guard at `props-hb-snap-exposure.ts` L53).
3. Existing 5 tests stay green; result stays `layer: "L1"`, `priced: false`.

New tests: `targets: -3` ⇒ refuse; `targets: NaN` ⇒ refuse (NOT ok-with-null);
`playerOffenseSnaps: 80, teamOffenseSnaps: 70` ⇒ refuse; a valid row still returns
`estRoutes > 0`, `tprr` finite and >= 0.

**Discipline:** priced:false; fail-closed on missing data; nothing enters live p
without masterplan §6; no MODEL_VERSION; forbidden zones (prisma schema,
event-odds-ingest writes, secrets, vercel.json) per common contract.

**Verify:**
```
cd packages/prediction-engine && npx vitest run src/edge-lab/__tests__/est-routes-tprr.test.ts && npx tsc --noEmit
```

**Idempotent:** re-applying from scratch is correct.

**Commit on pass:** `fix(edge-lab): EV16 est-routes-tprr refuses negative/NaN targets and player>team snaps`

**ATTACK LIST (verifier):**
- Bite test: run the three new tests against the pre-card module — `targets: -3` must
  currently produce a NEGATIVE tprr (reproduce the audit's claim before trusting the
  fix).
- Share>1 arithmetic check by independent derivation: snaps 80/70 with
  dropbacks 40 ⇒ est_routes = 80·40/70 ≈ 45.7 > 40 — impossible routes; the refusal is
  the only honest output.
- Confirm `tprr >= 0` is now an invariant: property test over 500 seeded valid inputs.

---

## EV17 · kneel/garbage input guards (#557 hardening)

**DATA CLASS: INTERNAL.**

**Artifact (edits, one module + its test — on branch `grok/h0-kneel-garbage` pre-merge,
or on main post-merge; see Open Question 5):**
`packages/prediction-engine/src/edge-lab/nfl-kneel-garbage.ts`
+ `packages/prediction-engine/src/edge-lab/__tests__/nfl-kneel-garbage.test.ts`

**Blocked until PR #557 merges** unless executed on its branch by that branch's owner.

**Spec.** Audit finding: NaN `spreadLine` and NaN `scoreDifferential` refuse
`bad_input` in code (~L104-106 on the branch) but only the NaN clock is tested; empty
`playType` refuse untested; and `posteamType: "unknown"` while trailing-large in short
clock still returns regime `garbage_hurry` WITH a positive pass-attempt inflation — an
unidentified possession team receives a volume adjustment, contradicting the module
header's "fail-closed, no imputation". Changes (all mandatory):

1. DECISION (made here so the implementer doesn't improvise):
   `posteamType === "unknown"` ⇒ refuse `"bad_input"` for the whole call. A regime
   model that doesn't know who has the ball has no business adjusting anyone's volume —
   refusal over silent normal-with-zeros, consistent with the module's own header
   claim. (If the branch owner shows "unknown" is frequent in real PBP on kneel rows,
   the fallback decision is `regime: "normal"` with BOTH adjustments exactly 0 — but
   that reversal must be recorded in the module header, and the test pins whichever is
   shipped.)
2. Pin by test (behavior already in code): `spreadLine: NaN` ⇒ `bad_input`;
   `scoreDifferential: NaN` ⇒ `bad_input`; `playType: ""` ⇒ `bad_input`.
3. Pin the clock domain: `gameSecondsRemaining: 3600` (and 3600+, OT-shaped inputs)
   ⇒ regime `"normal"` with zero adjustments — the regime machinery must not fire at
   kickoff.
4. Result records keep `priced: false`; the module stays trials-side HYPOTHESIS until
   masterplan §6 gates (its own header's claim — verify intact).

New tests: the four pins above, plus the decision case:
`{posteamType: "unknown", scoreDifferential: -14, gameSecondsRemaining: 90, ...valid}`
⇒ refuse `bad_input` (or the recorded fallback — exactly one of the two, pinned).

**Discipline:** priced:false; fail-closed on missing data (that is this card); nothing
enters live p without masterplan §6 validation (regime outputs are trials-side
adjusters, HYPOTHESIS class); no MODEL_VERSION; forbidden zones (prisma schema,
event-odds-ingest writes, secrets, vercel.json) per common contract.

**Verify:**
```
cd packages/prediction-engine && npx vitest run src/edge-lab/__tests__/nfl-kneel-garbage.test.ts && npx tsc --noEmit
```

**Idempotent:** re-applying from scratch is correct.

**Commit on pass:** `fix(edge-lab): EV17 kneel/garbage refuses unknown posteam; pin NaN spread/score-diff and OT-clock guards`

**ATTACK LIST (verifier):**
- Bite test: run the unknown-posteam case against the pre-card module — it must
  currently return `garbage_hurry` with positive inflation (reproduce the audit before
  trusting the fix).
- Boundary sweep on the trailing branch: scoreDifferential at exactly the trailing
  threshold ± 1 with known posteam — regimes flip where documented, and NEVER for
  unknown posteam.
- Confirm the header's fail-closed claim and the code now agree (read header, run the
  refusal matrix — every documented refusal reproduced by execution).

---

## Open questions (tracked; none blocks an unblocked card)

1. **Prop-line close archive.** The economic referee refuses `no_market_feed` for every
   prop family until a prop close archive exists (EV1 will confirm; recon gap list is
   explicit). Which deck/owner lands the archive (`CARDS_CLOSING_LINE.md` scope?), and
   what de-vig method its qClose uses (must be Shin, per `props-priced-edge.ts`)?
2. **Guard chain wiring.** EV8 deliberately does not touch the aggregate `"guardrails"`
   npm chain or CI workflows (merge-conflict-prone). Integrator decision: when does
   `guard:q-contamination` enter the chain and the CI matrix?
3. **`expectedSnapsNext` contract change (EV12).** The STOP rule covers unseen callers
   in the current tree, but the three open PRs may add call sites before EV12 lands —
   re-run the grep at implementation time; if #556 wired it, EV12 and EV16 must be
   sequenced by the integrator.
4. **Grid-of-one FDR.** Until the pre-registered mining grid (GRIND T1.3, separate
   deck) exists, EV6's FDR gate mostly sees m=1 grids (`gridOfOne: true`), where BH is
   vacuous. Should the top status additionally require `gridOfOne === false`, or is the
   surfaced flag plus founder judgment enough for the first candidates?
5. **Branch-card execution (EV16/EV17).** Do these run pre-merge on the Grok branches
   (cheapest moment, per the audit) or post-merge on main? Owner call — both cards are
   written to work either way, but the commit lands in different histories.
6. **As-of attest coverage.** EV3's attest only covers rows that carry `cells` with
   provenance stamps; features passed as bare `ReadonlyMap<string, number>` (the
   `EvalRow` shape) carry no `knownAtWeek` and cannot be attested row-by-row. Full §6
   as-of coverage needs a provenanced-features row variant across the loaders — a
   follow-up deck once EV1 maps the loaders.
7. **Report retention.** Real-candidate reports are CROWN and land in an untracked
   `reports/` path. Is there a retention/encryption rule for these files on shared
   machines (they contain the survivor evidence FREE_WINDOW_BLITZ §3b calls "the
   company"), or is untracked-plus-local acceptable for now?
