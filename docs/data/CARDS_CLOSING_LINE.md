# CARDS_CLOSING_LINE — doctrine C6.2 closing-line forecaster v0 (deck CL)

Predict where a **prop line CLOSES** from opener + line path + time-to-kickoff + news
flags, using **ONLY our archived lines** (`OddsLineSnapshot`). The forecaster
manufactures CLV — the PROVEN-milestone metric — and yields the opener-attack map
(doctrine C6.1 / masterplan E-G3: per family, hit openers vs wait). Evaluation is
**walk-forward only** (`walkForwardSplits`), scored against realized closes; the CLV
referee ties to `evVsClose` (placebo.ts:54) settle-at-fair-close convention.

Card discipline is `docs/data/KERNEL_SLOT_CARDS.md`: one artifact (module + its test
counts as one card, kernel-style), self-contained spec, deterministic verify,
idempotent/restartable, commit on pass, ATTACK list cross-verified by a **different
model family** than the author — each attack checked by a computation, not by reading.

## Routing summary (lanes per `docs/ops/FREE_WINDOW_BLITZ.md` §3)

| Lane | Cards | Who may implement |
|---|---|---|
| PUBLIC | CL3 | Any free endpoint, stealth included (textbook time-series math, zero repo semantics) |
| INTERNAL | CL1, CL2, CL4, CL5, CL6, CL7 | Grok/Hermes only (no-training endpoints) — cards embed repo architecture |
| CROWN | CL8, CL9 | Grok/Hermes only; **outputs (attack-map verdicts, CLV grids, fold scores on real data) are CROWN results: paid/contractual surfaces only, never a free endpoint, never a public claim** |

## Dependency order within the deck

```
CL1 (census, research)      ─┐
CL2 (news-flag survey)      ─┼─ independent, start all three immediately
CL3 (path-stats, PUBLIC)    ─┘
CL4 (close-truth)           — no deck deps (uses existing devig.ts / game-row.ts)
CL5 (decision features)     — needs CL3
CL6 (archive reader)        — no deck deps
CL7 (forecaster harness)    — needs CL4 + CL5
CL8 (opener-attack map)     — needs CL4 (shapes)
CL9 (offline runner)        — needs CL6 + CL7 + CL8; real-data runs gated on CL1 READY
```

## Deck-wide invariants (every implementation card states and obeys ALL of these)

- **I1 · priced:false.** Every emitted report/edge carries `priced: false`. Nothing in
  this deck is a claimable performance number; per FREE_WINDOW_BLITZ §3b, real-data
  CLV/calibration results are CROWN.
- **I2 · Fail-closed on missing data.** Empty/disabled archive, one-sided quote, sub-vig
  market, missing decision snapshot ⇒ a typed refuse shape (`{ok:false, refuse:...}`),
  matching the KaunitzDenied/KalshiBookDenied convention. **Never fabricate a price,
  a probability, or a close.** All archive flags (`LINE_ARCHIVE_ENABLED`,
  `EVENT_ODDS_INGEST_ENABLED`, `LINE_ARCHIVE_EU_PINNACLE`) default OFF — an empty
  archive is the normal case today and must produce clean refusals, not crashes.
- **I3 · MARKET_PROP firewall (q-side only).** The forecaster's outputs are
  **TIMING/EXECUTION signals**. They are market-derived, layer `MARKET_PROP` (or
  `MARKET_GAME`), and **must never enter independent p**: never registered in
  `P_SIDE_COVARIATE_REGISTRY` (covariate-bus.ts, PR #555 — CI walks it and any
  `MARKET_PROP` provenance on the p-side **fails the build**). State `layer` in every
  output shape.
- **I4 · Nothing enters live p / the live board without masterplan §6 validation**
  (`docs/data/EDGE_FACTORY_MASTERPLAN.md` §6: as-of discipline, temporal CV only,
  CRPS/Brier + economic referee, CANDIDATE→VALIDATED gates, q-contamination test).
  This deck ships glass-box research modules only.
- **I5 · No MODEL_VERSION.** No card touches pick versioning, stamps a model_version,
  or writes anything into the Pick lifecycle.
- **I6 · Forbidden zones** (do not edit, do not import-for-writes):
  `packages/db/prisma/schema.prisma` (sealed by fiat — encode within existing string
  columns), `packages/ingestion-pipeline/src/event-odds-ingest.ts` (NO-TOUCH),
  secrets/`.env*`, `vercel.json`, **`packages/prediction-engine/src/index.ts`** (the
  PR #555/#556/#557 merge hotspot — consumers import deep paths; export wiring is a
  later paid-tier integration act). Also consume-only, never edit: `devig.ts`,
  `asof-store.ts`, `close-distillation.ts`, `walk-forward.ts`, `line-archive.ts`.
- **I7 · Leak tripwires are load-bearing.** Feature keys must never match
  `CLOSING_KEY_PATTERN = /clos|final_line|settle/i` (asof-store.ts:67,
  close-distillation.ts:39 — both **throw**). The close is the TARGET, never a
  feature. Name time-to-kickoff `ttk_hours`, never `hours_to_close`.
- **I8 · Style.** Strict TS, no `any`, no `Math.random`, no I/O in pure modules, ESM
  imports with `.js` extensions. Pure modules are deterministic given their inputs.
- **I9 · Commit on pass.** After the verify command passes:
  `git add <the card's files> && git commit -m "CLn: <artifact>"`. Re-running a card
  from scratch must be correct and cheap (overwrite-in-place, no accumulated state).

## Shared embedded contracts (so no implementer explores the repo)

**Archive row** (mirror of `OddsLineSnapshot`, schema.prisma:453-471; pure modules
define this LOCAL readonly interface — no import from `apps/web` or `packages/db`):

```ts
interface ArchiveRow {
  readonly gameId: string;
  readonly capturedAt: string;   // ISO UTC — OUR poll time, refresh-cycle granularity
  readonly phase: "OPEN" | "INTERIM" | "CLOSE";
  readonly book: string;         // "draftkings" | "fanduel" | "betmgm" | "pinnacle" | ...
  readonly market: string;       // props: "<oddsApiKey>|<playerSlug>" e.g. "player_receptions|justin_jefferson"
  readonly side: string;         // "over" | "under" | "home" | "away" | "draw"
  readonly price: number;        // AMERICAN odds
  readonly line: number | null;  // prop/spread/total point; null for ML
  readonly source: string;       // "the-odds-api" | "the-odds-api-eu"
}
```

Phase semantics (line-archive.ts): `OPEN` is stamped on the **first-ever snapshot per
(gameId, market)** — NOT per book. `CLOSE` is re-tagged at settle onto the last
pre-kickoff row per `(market, book, side)` (markClosingSnapshots, wired at
settle-sport.ts:625) — an unsettled/missed game leaves its last row `INTERIM`, so
close extraction must tolerate a latest-pre-kickoff fallback.

Prop market decode rule (prop-line-rows.ts:87 read-side key; re-implement locally,
5 lines): a market string is a prop iff it contains exactly one `"|"` with non-empty
halves; `family = oddsApiKey` (left half), `playerSlug` (right half). Featured markets
(`"SPREAD" | "MONEYLINE" | "TOTAL"`) are **out of scope for this deck** — their
open/close already live in `OpeningLine` and the `Odds` table's CLV loop.

**Existing functions to USE, never re-derive** (all in
`packages/prediction-engine/src/edge-lab/`, import with `.js` extensions):

```ts
// game-row.ts
americanToDecimal(american: number): number | null
//  null on 0, |a| < 100, non-finite; +150→2.5, −110→≈1.9091, ±100→2.0

// devig.ts
shinDevig(decimalOdds: readonly number[]): { probs: number[]; z: number } | null
//  null on any price ≤ 1 / non-finite, or overround < 1 (sub-vig ⇒ refuse).
//  probs is index-aligned with the input. Shin, not proportional: proportional
//  split is explicitly rejected for props (favourite-longshot bias).

// close-distillation.ts
interface CloseRow { readonly features: ReadonlyMap<string, number>; readonly qClose: number } // qClose ∈ (0,1)
interface CloseDistiller { readonly predict: (f: ReadonlyMap<string, number>) => number;
                           readonly coefficients: ReadonlyMap<string, number>; readonly intercept: number }
trainCloseDistiller(rows: readonly CloseRow[], opts: { featureKeys: readonly string[]; lambda?: number }): CloseDistiller | null
//  THROWS on any featureKey matching /clos|final_line|settle/i; returns null when
//  n < 10·k + 10 (under-determined). Ridge on logit(qClose), mean-imputes missing keys.
interface DistillationFoldScore { fold: number; n: number; maeModel: number; maeBaseline: number; r2VsBaseline: number }
scoreDistillation(d: CloseDistiller, trainRows: readonly CloseRow[], testRows: readonly CloseRow[], fold: number): DistillationFoldScore
predictedMoveEdge(args: { predictedClose: number; decisionPrice: number | null }): number
//  = predictedClose − 1/decisionPrice; THROWS on null/non-finite/≤1 decisionPrice —
//  it must only ever see a REAL decision-time decimal price from the archive.

// walk-forward.ts
interface TimedRow { readonly id: string; readonly decisionAt: string; readonly eventEndAt: string } // ISO UTC
interface WalkForwardOptions { readonly folds: number; readonly minTrainFraction: number; readonly embargoMs: number }
walkForwardSplits<R extends TimedRow>(rows: readonly R[], opts: WalkForwardOptions): WalkForwardFold<R>[]
//  purged + embargoed expanding-window folds; the ONLY sanctioned evaluation splitter.

// placebo.ts — the CLV referee's settle convention (formula, for CL7):
// evVsClose(p, qClose, y): fire side s, settle at fair close: ret = (y_s − q_s)/q_s,
// where q_s is the de-vigged close of the fired side; expectation 0 under the null
// that the close already prices everything. NOT a claimable number (I1).
```

Verify-command shells (deterministic; a model's opinion is not a gate):

```
cd packages/prediction-engine  && npx vitest run src/edge-lab/__tests__/<name>.test.ts && npx tsc --noEmit
cd packages/ingestion-pipeline && npx vitest run src/__tests__/<name>.test.ts        && npx tsc --noEmit
```

---

## CL1 · RESEARCH — line-archive census (how much training data actually exists)

**DATA CLASS: INTERNAL** (repo architecture + prod-DB shape; Grok/Hermes only).
**Artifact:** `scripts/edge-lab/line-archive-census.ts` (invoked `npx tsx …`, precedent:
`scripts/edge-lab/phase3-acceptance.ts`).
**Gap resolved:** the forecaster is **data-blocked, not code-blocked** — all archive
flags default OFF and no committed artifact records how many rows/closes exist. Nothing
in CL7/CL9 may claim real-data results until this census says READY.

**Spec (self-contained):**
- Two modes. `--selftest`: run the aggregation over an **embedded** in-file fixture
  (≥ 12 `ArchiveRow`s covering: 2 games, 2 prop markets, 3 books, OPEN/INTERIM/CLOSE
  phases, one one-sided book, one market with no CLOSE) and assert the expected census
  JSON exactly; exit 0/2. `--db`: `new PrismaClient()` from `@sports/db`
  (`packages/db`), read-only via the `oddsLineSnapshot` delegate; if the delegate is
  missing (pre-codegen) or the query throws, print a one-line reason and **exit 3** —
  never fabricate counts (I2).
- Core is one exported pure function `censusOf(rows: readonly ArchiveRow[]): Census`
  (both modes call it; DB mode feeds `findMany({ select: { gameId, capturedAt, phase,
  book, market, side, price, line, source } })` mapped to ISO strings).
- `Census` JSON (stdout): `{ totalRows, byPhase: {OPEN, INTERIM, CLOSE}, byBook,
  propRows, featuredRows, distinctPropMarkets, distinctGames,
  trajectoriesGe3 /* (gameId,market,book,side) groups with ≥3 rows */,
  propMarketsWithCloseBothSides /* per (gameId,market,book): a CLOSE-phase or
  latest row per side on BOTH over+under */, capturedAtMin, capturedAtMax,
  readiness: "READY" | "ACCUMULATING", readinessRule:
  "READY iff propMarketsWithCloseBothSides >= 200 AND trajectoriesGe3 >= 400" }`.
  (200 mirrors CL7's `trainCloseDistiller` floor of 10·k+10 at k≈12, with headroom
  across folds.)
- Idempotent: no writes anywhere, ever. Prints, exits.

**Invariants:** I1–I9 apply (notably I2 fail-closed exit 3, I6 forbidden zones — the
script reads the DB, it never migrates or writes).

**Verify:** `npx tsx scripts/edge-lab/line-archive-census.ts --selftest && cd packages/prediction-engine && npx tsc --noEmit`

**ATTACK LIST (cross-family verifier computes, does not read):**
1. Feed `censusOf` an empty array — every count 0, readiness "ACCUMULATING", no NaN.
2. A game whose last row is INTERIM (settlement missed) must still count toward
   `propMarketsWithCloseBothSides` via the latest-row fallback — plant one and check.
3. A one-sided book (over row only) must NOT count as close-both-sides.
4. Duplicate rows (same capturedAt, book, side) must not double-count trajectories.
5. Run `--selftest` twice; byte-identical stdout (determinism/idempotence).
6. Confirm `--db` mode contains zero `create`/`update`/`upsert`/`$execute` calls
   (grep the artifact: `grep -nE 'create|update|upsert|\$execute' <file>` → no hits).

---

## CL2 · RESEARCH — news-flag source survey (the missing forecaster input)

**DATA CLASS: INTERNAL** (source/licensing posture; Grok/Hermes only — and per
FREE_WINDOW_BLITZ §3c.5, any actual clearance/license CALL is judgment-tier: this card
**inventories and proposes only**, it decides nothing).
**Artifact:** `docs/data/_gen/news-flag-source-survey.json`.
**Gap resolved:** doctrine C6.2 wants "news flags" as a feature; the market-data domain
map shows **no news/injury flag source anywhere** — no ingestion module, no table, no
cleared source. v0 (CL5) proceeds with a path-jump PROXY regardless; this survey
decides what v1 uses.

**Spec (self-contained):** produce a JSON object:
```json
{ "generatedAt": "<ISO>", "deckCard": "CL2",
  "candidates": [ { "name": "...", "kind": "in_repo | licensed_api | open_dataset | derived_proxy",
      "pathOrUrl": "...", "licenseStatus": "known:<license> | UNKNOWN",
      "clearanceStatus": "not_assessed | approved_* | permission_required | excluded",
      "observedAtAvailable": true, "decision": "adopt_v1 | defer | reject", "notes": "..." } ],
  "v0Decision": "path-jump proxy only (CL5 max_step_line / jump_flag)",
  "escalations": ["<every license/clearance question, for the judgment tier>"] }
```
Mandatory candidates to assess (add any found, never invent): (a) nflverse injury
reports (stats side of the repo — check `packages/data-ingestion/src/` for an existing
loader and its license tag; if a field's license is not provably CC-BY, mark UNKNOWN
and exclude — never guess); (b) The Odds API's per-bookmaker `last_update` field —
today **dropped** by the ingest (capturedAt is our poll time), so flag it as the
cheapest latency upgrade and name the wiring point (`process-sport.ts` args, NEVER
`event-odds-ingest.ts` — I6); (c) the derived path-jump proxy (adopted for v0);
(d) any source already in `apps/web/lib/scraping/source-rights-registry.ts` with an
`approved_*` status that carries injury/news facts. **No new scraping is proposed
anywhere in this file**; anything not already cleared goes under `escalations`.
Idempotent: regenerate = overwrite the one file.

**Invariants:** I1–I9 apply; this card produces no code and touches no p-side anything.

**Verify:**
`node -e "const s=require('/home/user/Sports/docs/data/_gen/news-flag-source-survey.json'); const ok=Array.isArray(s.candidates)&&s.candidates.length>=4&&s.candidates.every(c=>['in_repo','licensed_api','open_dataset','derived_proxy'].includes(c.kind)&&c.licenseStatus&&c.clearanceStatus&&['adopt_v1','defer','reject'].includes(c.decision))&&typeof s.v0Decision==='string'&&Array.isArray(s.escalations); process.exit(ok?0:1)"`

**ATTACK LIST:**
1. Every `pathOrUrl` with kind `in_repo` must exist: script-check each with `test -e`.
2. No candidate may carry `decision: "adopt_v1"` while `clearanceStatus` is
   `not_assessed` or `permission_required` — assert with a jq/node one-liner.
3. `licenseStatus` "known:*" claims must cite where the license is recorded (notes);
   spot-check one citation by opening the cited file at the cited line.
4. Grep the survey for scraping verbs ("scrape", "crawl", "bypass") — zero hits.

---

## CL3 · path-stats — pure line-path summaries (PUBLIC lane)

**DATA CLASS: PUBLIC** (textbook time-series summaries; zero repo semantics — safe for
any free model per FREE_WINDOW_BLITZ §3b).
**Artifact:** `packages/prediction-engine/src/edge-lab/path-stats.ts` +
`packages/prediction-engine/src/edge-lab/__tests__/path-stats.test.ts`.

**Spec (fully self-contained — the implementer needs NOTHING else):**
```ts
export interface PathPoint { readonly t: number; readonly v: number } // t = epoch ms

export function latestAtOrBefore(points: readonly PathPoint[], t: number): PathPoint | null;
// latest point with point.t <= t; ties on t → the LAST one in ascending-(t, input-index) order; null when none.

export function slopePerHour(points: readonly PathPoint[]): number | null;
// OLS slope of v regressed on t expressed in HOURS (v-units per hour);
// null when < 2 points or all t identical (zero variance — refuse, never divide by 0).

export function maxAbsStep(points: readonly PathPoint[]): number | null;
// max |v[i+1] − v[i]| over consecutive points in ascending-t order; null when < 2 points.

export function rangeSpread(values: readonly number[]): number | null;
// max − min; null when < 2 values.
```
Rules: never mutate inputs (sort a copy, stable, ascending t then input index); any
non-finite `t` or `v` ⇒ `throw new RangeError(...)` (fail closed); deterministic; no
I/O, no `Math.random`, no imports beyond nothing (self-contained file). Strict TS,
`noUncheckedIndexedAccess`-clean.

**Invariants:** I1–I9 apply trivially (pure math; no market data enters this file —
that is exactly what keeps it PUBLIC).

**Verify:** `cd packages/prediction-engine && npx vitest run src/edge-lab/__tests__/path-stats.test.ts && npx tsc --noEmit`

**ATTACK LIST:**
1. Mutation: pass a frozen unsorted array (`Object.freeze`) — no throw from freezing,
   output correct, input order unchanged byte-for-byte after the call.
2. `slopePerHour` cross-check: points on an exact line v = 2·hours + 1 ⇒ slope 2 to
   1e-9; verify against an INDEPENDENT closed-form computation (Σ formulas), not by
   re-calling the implementation.
3. Tie-break: two points with equal t, different v — `latestAtOrBefore` returns the
   later-input one; `maxAbsStep` treats them in input order (step counted).
4. All-identical t with ≥2 points ⇒ `slopePerHour` null, never Infinity/NaN.
5. NaN injection in t and in v ⇒ RangeError from every function.
6. Hour conversion trap: t in ms — a slope computed per-ms and mis-scaled by 3600
   (not 3.6e6) is the classic bug; assert magnitude with a hand computation.

---

## CL4 · close-truth — de-vigged prop close + per-book opener from archive rows

**DATA CLASS: INTERNAL.**
**Artifact:** `packages/prediction-engine/src/edge-lab/close-truth.ts` +
`packages/prediction-engine/src/edge-lab/__tests__/close-truth.test.ts`.
**Purpose:** the forecaster's GROUND TRUTH (q of the realized close) and the
opener-attack map's opener quotes — pure functions over `ArchiveRow[]` (local
interface, embedded above). Imports: `americanToDecimal` from `"./game-row.js"`,
`shinDevig` from `"./devig.js"`. Nothing else.

**Spec:**
```ts
export type CloseSource = "phase_close" | "latest_pre_kickoff";
export interface PropQuoteTruth {
  readonly gameId: string; readonly market: string; readonly book: string;
  readonly family: string; readonly playerSlug: string;          // decoded from market
  readonly capturedAt: string; readonly line: number;
  readonly qOver: number; readonly shinZ: number; readonly overround: number;
  readonly source: CloseSource | "earliest_row";                 // openers use "earliest_row"
  readonly priced: false; readonly layer: "MARKET_PROP";
}
export type QuoteRefuse = "no_rows" | "not_a_prop_market" | "one_sided" | "cycle_mismatch"
  | "rung_mismatch" | "bad_price" | "subvig_or_invalid" | "after_kickoff_only";
export interface QuoteRefusal { readonly market: string; readonly book: string; readonly refuse: QuoteRefuse }

export function closeTruthForGame(args: {
  rows: readonly ArchiveRow[];          // one game's archive rows (any markets/books)
  gameId: string; commenceTime: string; // ISO
  pairToleranceMs?: number;             // default 20 * 60_000
}): { ok: true; truths: readonly PropQuoteTruth[]; refusals: readonly QuoteRefusal[] }
 | { ok: false; refuse: "no_rows" };

export function openerTruthForGame(args: /* same */): /* same shape */;
```
Algorithm (`closeTruthForGame`), per (prop market, book):
1. Prop filter: market contains exactly one `"|"` with non-empty halves; sides must be
   `"over"`/`"under"`. Non-prop markets are skipped silently (deck scope), malformed
   `"|"` markets refuse `not_a_prop_market`.
2. Candidate rows per side: `capturedAt <= commenceTime` (string ISO compare is NOT
   safe — parse with `Date.parse`, throw RangeError on invalid ISO). Rows only after
   kickoff ⇒ refuse `after_kickoff_only`.
3. Per side, prefer the row with `phase === "CLOSE"` (markClosingSnapshots stamps at
   most one per (market, book, side)); if a side lacks a CLOSE row, fall back to the
   latest pre-kickoff row for that side (`source: "latest_pre_kickoff"` for the pair
   if EITHER side fell back). Both sides present, else refuse `one_sided`.
4. The two sides' `capturedAt` must differ by ≤ `pairToleranceMs`, else refuse
   `cycle_mismatch` (pairing stale cycles fabricates an overround — I2).
5. The two sides' `line` must be equal (exact), else refuse `rung_mismatch` (the book
   moved the point between the two captures).
6. `americanToDecimal` each side's price — null ⇒ `bad_price`. `shinDevig([decOver,
   decUnder])` — null ⇒ `subvig_or_invalid`. `qOver = probs[0]` (index-aligned:
   over first). `overround = 1/decOver + 1/decUnder`.
`openerTruthForGame`: identical pairing/devig, but per side take the **earliest**
`capturedAt` row per (market, book, side). **Do NOT key openers on
`phase === "OPEN"`** — OPEN marks only the first-ever cycle per (gameId, market), so
a book that joined later has no OPEN row; per-book opener = earliest row per book
(`source: "earliest_row"`).
Pure, deterministic, no I/O; throws only on malformed arguments (bad ISO), never on
data (data problems are refusals).

**Invariants:** priced:false (I1) · fail-closed refusal enum, never fabricate (I2) ·
outputs layer `MARKET_PROP`, q-side timing/execution only, never independent p (I3) ·
no live-p entry without masterplan §6 (I4) · no MODEL_VERSION (I5) · forbidden zones
per I6 · no key/feature emission at all, so I7 trivially holds · I8/I9.

**Verify:** `cd packages/prediction-engine && npx vitest run src/edge-lab/__tests__/close-truth.test.ts && npx tsc --noEmit`

**ATTACK LIST:**
1. Shin, not proportional: build a longshot pair (over −250 / under +190) and assert
   `qOver` ≠ the proportional split (compute proportional independently: 
   (1/d₁)/(1/d₁+1/d₂)) and matches an independent Shin computation to 1e-6.
2. Fallback honesty: last row INTERIM (no CLOSE stamped) ⇒ truth produced with
   `source: "latest_pre_kickoff"`, never `"phase_close"`.
3. Cycle-mismatch trap: over at T, under at T+45min (tolerance 20min) ⇒ refuse —
   verify a naive implementation pairing "latest each side" would have paired them.
4. Rung-mismatch trap: over line 5.5, under line 6.5 ⇒ refuse `rung_mismatch`.
5. Post-kickoff rows must never be selected even when phase says CLOSE (plant a
   CLOSE-phase row after commenceTime; only pre-kickoff rows may win).
6. Opener ≠ phase OPEN: book B's earliest row is INTERIM (game's OPEN row belongs to
   book A) — `openerTruthForGame` must still yield book B's opener from its earliest
   row.
7. American sign trap: −110/−110 ⇒ qOver ≈ 0.5, overround ≈ 1.048; +100/−120 mixed
   signs handled; price 50 (invalid American) ⇒ `bad_price`.
8. Determinism/idempotence: same input twice ⇒ deep-equal output; input array not
   mutated (freeze it).

---

## CL5 · line-path-features — decision-time feature vector (opener + path + TTK + news proxy)

**DATA CLASS: INTERNAL.**
**Artifact:** `packages/prediction-engine/src/edge-lab/line-path-features.ts` +
`packages/prediction-engine/src/edge-lab/__tests__/line-path-features.test.ts`.
**Depends on:** CL3 (`"./path-stats.js"`); imports `americanToDecimal`
(`"./game-row.js"`), `shinDevig` (`"./devig.js"`). Input is `ArchiveRow[]` (local
interface). Pure, no I/O.

**Spec:**
```ts
export interface DecisionFeatures {
  readonly ok: true;
  readonly features: ReadonlyMap<string, number>; // ONLY the keys below, omit-when-incomputable
  readonly decisionCapturedAt: string;
  readonly decisionDecimalOver: number;        // REAL archive price — feeds predictedMoveEdge
  readonly decisionDecimalUnder: number | null;// null when under side absent at decision cycle
  readonly qOverDecision: number | null;       // Shin at decision; null when one-sided/sub-vig
  readonly priced: false; readonly layer: "MARKET_PROP";
}
export type FeatureRefuse = "no_decision_snapshot" | "decision_after_cutoff" | "bad_price" | "no_opener" | "not_a_prop_market";

export function buildDecisionFeatures(args: {
  rows: readonly ArchiveRow[];   // one game, one prop market, ALL books (cross-book keys need them)
  gameId: string; market: string; book: string;   // execution book
  commenceTime: string; decisionAt: string;       // ISO
  minLeadMs?: number;                             // default 3 * 3600_000
}): DecisionFeatures | { ok: false; refuse: FeatureRefuse };
```
Hard rule (as-of discipline, masterplan §6): **every feature is computed exclusively
from rows with `capturedAt <= decisionAt`**, and `decisionAt <= commenceTime −
minLeadMs` else refuse `decision_after_cutoff`. The exact feature keys — chosen to
never match `/clos|final_line|settle/i` (I7; the test must assert this with the regex
over every emitted key):

| key | definition (execution book unless noted) |
|---|---|
| `open_line` | earliest over-side row's `line` (per-book earliest, NOT phase OPEN — see CL4) |
| `open_dec_over` | `americanToDecimal` of that earliest over-side price |
| `line_now` | over-side `line` at decision (`latestAtOrBefore` on capturedAt-ms) |
| `dec_over_now` | decimal of over-side price at decision (also returned as `decisionDecimalOver`) |
| `drift_line` | `line_now − open_line` |
| `vel_line_per_hr` | `slopePerHour` over the over-side (t=capturedAt ms, v=line) path up to decisionAt; omit when <2 points |
| `max_step_line` | `maxAbsStep` over the same path; omit when <2 points |
| `jump_flag` | 1 if `max_step_line ≥ 1.0` else 0 — **v0 NEWS-FLAG PROXY** (constant threshold, documented in the header as pending CL2's survey); omit when `max_step_line` omitted |
| `steps_n` | count of over-side snapshots ≤ decisionAt |
| `ttk_hours` | `(commenceTime − decisionAt) / 3_600_000` (never name it *_to_close — I7) |
| `book_disp_line_now` | `rangeSpread` of `line_now` across ALL books with a snapshot ≤ decisionAt; omit when <2 books (mirrors book-dispersion.ts's null-under-2-books rule) |
| `consensus_qover_now` | median Shin `qOver` across books two-sided within the CL4 cycle tolerance at decisionAt; omit when none |
| `qover_now` | execution book's Shin qOver at decision; omit when one-sided/sub-vig (also returned as `qOverDecision`) |

Refusals: no over-side row ≤ decisionAt ⇒ `no_decision_snapshot`; unconvertible
decision price ⇒ `bad_price` (the decision price is mandatory — `predictedMoveEdge`
throws on fabricated prices, so we refuse rather than hand it garbage); no opener row
⇒ `no_opener`. Omitted keys are simply absent from the Map —
`trainCloseDistiller` mean-imputes missing keys by design.

**Invariants:** priced:false (I1) · fail-closed refuse enum (I2) · every output is a
`MARKET_PROP` q-side timing/execution signal — none of these keys may EVER be
registered p-side; `assertPSideHasNoMarketProp` CI (PR #555) exists to catch exactly
this (I3) · no live p without masterplan §6 (I4) · no MODEL_VERSION (I5) · I6 zones ·
I7 key hygiene asserted in test · I8/I9.

**Verify:** `cd packages/prediction-engine && npx vitest run src/edge-lab/__tests__/line-path-features.test.ts && npx tsc --noEmit`

**ATTACK LIST:**
1. **Lookahead plant:** add a post-decisionAt row that would change `line_now`,
   `max_step_line`, and `book_disp_line_now` — assert the entire output is
   byte-identical with and without the plant (the deck's fatal bug class).
2. Key hygiene by computation: `[...features.keys()].every(k => !/clos|final_line|settle/i.test(k))`
   AND ingest every key into a real `AsOfFeatureStore` (asof-store.ts) — zero throws.
3. `decisionAt` exactly at `commenceTime − minLeadMs` passes; 1ms later refuses.
4. `dec_over_now` cross-check: −110 ⇒ 1.9091 (3dp), computed independently.
5. One-sided decision cycle: under missing ⇒ `qover_now` omitted, `qOverDecision`
   null, but `ok: true` with a real `decisionDecimalOver` (over side alone suffices
   for timing).
6. `jump_flag` boundary: max step exactly 1.0 ⇒ 1; 0.99 ⇒ 0.
7. `consensus_qover_now` is the MEDIAN (3 books: 0.4/0.5/0.9 ⇒ 0.5, not 0.6 mean).
8. Input frozen; determinism across two calls.

---

## CL6 · line-archive-reader — the FIRST production reader over OddsLineSnapshot

**DATA CLASS: INTERNAL.**
**Artifact:** `packages/ingestion-pipeline/src/line-archive-reader.ts` +
`packages/ingestion-pipeline/src/__tests__/line-archive-reader.test.ts`.
**Purpose:** nothing reads the archive today outside its writers and tests. This
module is the read side: trajectories + as-of lookups off index
`[gameId, market, capturedAt]`. **Read-only, never throws** (mirrors line-archive.ts's
never-throw posture); db boundary is `unknown` (pre-codegen delegate, same pattern as
line-archive.ts:17-30).

**Spec:**
```ts
// Local minimal delegate — cast from `unknown`, exactly the line-archive.ts pattern:
interface SnapshotReadDelegate { oddsLineSnapshot: { findMany(args: {
  where: { gameId: string; market?: string; capturedAt?: { lte: Date } };
  orderBy: { capturedAt: "asc" };
  select: { book: true; market: true; side: true; price: true; line: true;
            phase: true; capturedAt: true; source: true };
}): Promise<Array<{ book: string; market: string; side: string; price: number;
  line: number | null; phase: string; capturedAt: Date; source: string }>> } }

export interface StoredSnapshot { /* ArchiveRow with gameId added; capturedAt as ISO string */ }
export type TrajectoryKey = string; // `${market}::${book}::${side}` — EXACTLY the
                                    // markClosingSnapshots grouping key (line-archive.ts:227)
export type LoadTrajectoriesResult =
  | { ok: true; rows: readonly StoredSnapshot[]; byTrajectory: ReadonlyMap<TrajectoryKey, readonly StoredSnapshot[]> }
  | { ok: false; reason: "query_failed" };

export async function loadGameTrajectories(args: {
  db: unknown; gameId: string; market?: string; asOf?: Date; // asOf ⇒ where capturedAt lte
}): Promise<LoadTrajectoriesResult>;

export function latestPerTrajectoryAtOrBefore(
  byTrajectory: ReadonlyMap<TrajectoryKey, readonly StoredSnapshot[]>, asOfIso: string,
): ReadonlyMap<TrajectoryKey, StoredSnapshot>; // pure helper over the loaded map
```
Implementation notes: ONE `findMany` per call (the per-game+market archive is small —
bounded by cycles × books × sides); group in memory preserving ascending `capturedAt`;
`Date` → ISO via `.toISOString()`. Any delegate/query error ⇒ `{ ok:false, reason:
"query_failed" }` — never a throw, never a partial result. An empty table (flags OFF —
the normal state today) ⇒ `ok: true` with empty rows; **consumers fail closed on
empty** (their job, stated in CL7/CL9). Test with a stub delegate object (no DB, no
Prisma import) — resolve canned rows, and a rejecting stub for the error path.

**Invariants:** priced:false n/a but stated: this module prices nothing (I1) ·
fail-closed deny-shape (I2) · read side of q-data only; no p contact (I3) · §6 gate
untouched (I4) · no MODEL_VERSION (I5) · **read-only: zero write/`create`/`update`
calls; `event-odds-ingest.ts` and the prisma schema untouched** (I6) · I7 n/a (no
feature keys) · I8/I9.

**Verify:** `cd packages/ingestion-pipeline && npx vitest run src/__tests__/line-archive-reader.test.ts && npx tsc --noEmit`

**ATTACK LIST:**
1. Rejecting stub delegate ⇒ `{ok:false, reason:"query_failed"}`, promise resolves
   (never rejects).
2. Trajectory key collision check: two books sharing a market must land in distinct
   groups; a market string containing `"::"`... cannot occur (market =
   `key|slug`, book/side from fixed vocabularies) — assert the key format
   round-trips by splitting on `"::"` into exactly 3 parts for every fixture key.
3. `latestPerTrajectoryAtOrBefore` with asOf before every row ⇒ empty map (not
   first-row fallback).
4. Ordering: feed the stub rows deliberately shuffled (a stub ignores orderBy) —
   the module must re-sort ascending capturedAt itself, not trust the delegate.
5. Grep the artifact for `create|update|upsert|delete|\$execute` ⇒ zero hits.
6. `asOf` filter honored: stub records the `where` it received; assert
   `capturedAt.lte` equals the passed Date.

---

## CL7 · prop-close-forecast — the forecaster harness (walk-forward + CLV referee)

**DATA CLASS: INTERNAL** (the harness; its REAL-DATA outputs are CROWN — see CL9).
**Artifact:** `packages/prediction-engine/src/edge-lab/prop-close-forecast.ts` +
`packages/prediction-engine/src/edge-lab/__tests__/prop-close-forecast.test.ts`.
**Depends on:** CL4 + CL5 shapes; imports `trainCloseDistiller`, `scoreDistillation`,
`predictedMoveEdge`, `CloseRow`, `DistillationFoldScore` from
`"./close-distillation.js"`; `walkForwardSplits`, `TimedRow`, `WalkForwardOptions`
from `"./walk-forward.js"`. Pure, no I/O.

**Spec:**
```ts
export interface ForecastInputRow extends TimedRow {
  // id = `${gameId}|${market}|${book}`; decisionAt from CL5; eventEndAt = commenceTime
  // (the close RESOLVES at kickoff — that is the purge window, not final whistle)
  readonly gameId: string; readonly market: string; readonly book: string;
  readonly features: ReadonlyMap<string, number>;     // CL5 output
  readonly decisionDecimalOver: number;               // CL5 — real archive price
  readonly decisionDecimalUnder: number | null;       // CL5
  readonly qOverClose: number;                        // CL4 truth ∈ (0,1)
}
export interface FiredTiming {
  readonly rowId: string; readonly side: "over" | "under";
  readonly predictedEdge: number;   // predictedMoveEdge at decision (side-adjusted)
  readonly realizedClv: number;     // side "over": qOverClose − 1/decisionDecimalOver
                                    // side "under": (1 − qOverClose) − 1/decisionDecimalUnder
  readonly retVsClose: number | null; // only when outcomes supplied — evVsClose settle:
                                    // (ySide − qSide)/qSide with qSide from the REALIZED close
}
export type CloseForecastReport = {
  readonly ok: true; readonly methodTag: "close_forecast_v0";
  readonly eligible: number; readonly foldCount: number;
  readonly folds: readonly DistillationFoldScore[];
  readonly foldsBeatingBaseline: number;              // maeModel < maeBaseline
  readonly clvReferee: { readonly tau: number; readonly fired: number;
    readonly meanPredictedEdge: number | null; readonly meanRealizedClv: number | null;
    readonly seRealizedClv: number | null; readonly meanRetVsClose: number | null };
  readonly plays: readonly FiredTiming[];
  readonly priced: false; readonly layer: "MARKET_PROP";
} | { readonly ok: false; readonly refuse: "insufficient_rows" | "underdetermined" | "bad_row" };

export function runCloseForecast(args: {
  rows: readonly ForecastInputRow[];
  featureKeys: readonly string[];       // the CL5 key list; trainer THROWS on /clos|final_line|settle/i
  wf?: WalkForwardOptions;              // default { folds: 4, minTrainFraction: 0.4, embargoMs: 6 * 3600_000 }
  tau?: number;                         // default 0.015
  lambda?: number;                      // passed through to ridge
  outcomes?: ReadonlyMap<string, 0 | 1>; // rowId → over hit (1) — OPTIONAL; props are
                                         // not graded anywhere today, so usually absent
}): CloseForecastReport;
```
Algorithm: validate every row (`qOverClose ∈ (0,1)`, `decisionDecimalOver > 1`,
`Date.parse` both instants, decisionAt < eventEndAt) — any violation ⇒ refuse
`bad_row` (fail closed; garbage rows are a pipeline bug, not trainable data).
`rows.length < 40` ⇒ `insufficient_rows`. Cut folds with `walkForwardSplits` —
**walk-forward is the ONLY evaluation; no random K-fold exists in this file**
(masterplan §6). Per fold: `trainCloseDistiller(train→CloseRow{features, qClose:
qOverClose}, {featureKeys, lambda})`; null (under-determined) ⇒ skip fold; if EVERY
fold is null ⇒ refuse `underdetermined`. Score with `scoreDistillation`. On each TEST
row: `pred = distiller.predict(features)`; over-side edge =
`predictedMoveEdge({predictedClose: pred, decisionPrice: decisionDecimalOver})`;
under-side edge = `(1 − pred) − 1/decisionDecimalUnder` when
`decisionDecimalUnder !== null` (same identity, complementary side — compute directly,
do NOT call predictedMoveEdge with a fabricated under price). Fire the side whose edge
≥ tau (both ≥ tau is impossible for tau > 0 given overround ≥ 1 — assert in test).
**Side selection uses ONLY decision-time inputs (pred vs decision price) — the
realized `qOverClose` appears exclusively in `realizedClv`/`retVsClose` AFTER the side
is chosen** (this is the evVsClose convention of placebo.ts:54 with the peek removed —
peeking at the realized close for side selection is the vacuous-referee bug).
`meanRealizedClv`/`seRealizedClv` over fired plays (se = sample sd/√n, n ≥ 2 else
null). `meanRetVsClose` only when `outcomes` covers every fired row-id, else null
(never partial).

**Invariants:** priced:false in the report literal (I1) · three-way refuse enum, an
empty/thin archive refuses, nothing is simulated to fill the gap (I2) · **output is a
TIMING/EXECUTION signal, layer MARKET_PROP; it must never enter independent p, never
appear in `P_SIDE_COVARIATE_REGISTRY`, and `qOverClose`/predictions must never be
handed to any p-side module — the MARKET_PROP firewall is the whole card** (I3) ·
nothing fires live: no board, no picks, no persistence; live entry requires masterplan
§6 CANDIDATE→VALIDATED (I4) · no MODEL_VERSION (I5) · I6 zones · the trainer's
closing-key throw is left to propagate — a `/clos/i` feature key is a programming
error, not data (I7) · I8/I9.

**Verify:** `cd packages/prediction-engine && npx vitest run src/edge-lab/__tests__/prop-close-forecast.test.ts && npx tsc --noEmit`

**ATTACK LIST (fixture = synthetic archive-shaped rows built inline, seeded LCG, no
Math.random; ≥ 160 rows across ≥ 3 synthetic weeks so folds are non-trivial):**
1. **Target-as-feature tripwire:** add `"closing_q"` to featureKeys ⇒ the call THROWS
   (RangeError from trainCloseDistiller), it does not refuse-shape.
2. **Peek test:** flip `qOverClose` on test rows AFTER computing predicted edges —
   fired set and sides must be unchanged; only realizedClv changes. (Computationally
   proves side selection never reads the realized close.)
3. Learnable synthetic: generate qClose = sigmoid(a·drift_line + b·ttk_hours + noise)
   ⇒ `foldsBeatingBaseline ≥ ceil(foldCount/2)`; pure-noise target ⇒ r2VsBaseline ≤ 0
   on most folds and the referee's meanRealizedClv within 2·se of 0.
4. Temporal integrity: assert every fired play's decisionAt < its fold's testStart is
   FALSE (fired plays are test rows) and no TRAIN row's eventEndAt ≥ testStart
   (recompute from the fold output — walkForwardSplits' purge honored, not assumed).
5. Under-side identity: hand-compute (1−pred) − 1/decUnder for one row and match.
6. `outcomes` covering only half the fired rows ⇒ `meanRetVsClose` null (no partial
   grading).
7. 39 rows ⇒ `insufficient_rows`; 40 valid rows with k=13 features ⇒
   `underdetermined` (10k+10 = 140 > any train fold) — both refuse, neither throws.
8. Report determinism: two runs, deep-equal.

---

## CL8 · opener-attack-map — C6.1 verdicts per prop family (from open/close truths)

**DATA CLASS: CROWN** (the verdicts ARE the timing edge — doctrine C6.1/E-G3; card
embeds mechanics only, no validated-edge content; Grok/Hermes implement, outputs to
paid/contractual surfaces only).
**Artifact:** `packages/prediction-engine/src/edge-lab/opener-attack-map.ts` +
`packages/prediction-engine/src/edge-lab/__tests__/opener-attack-map.test.ts`.
**Depends on:** CL4 shapes (consumes paired opener+close truths). Pure, no I/O, no
imports beyond nothing.

**Spec:**
```ts
export interface OpenCloseRow {
  readonly gameId: string; readonly market: string; readonly book: string;
  readonly family: string;              // decoded oddsApiKey, e.g. "player_receptions"
  readonly qOverOpen: number; readonly qOverClose: number;   // both ∈ (0,1), Shin (CL4)
  readonly openLine: number; readonly closeLine: number;
}
export type FamilyTiming = "HIT_OPENER_OVER" | "HIT_OPENER_UNDER" | "WAIT_OR_FORECAST" | "INSUFFICIENT";
export interface FamilyVerdict {
  readonly family: string; readonly n: number;
  readonly meanSignedQDrift: number | null;  // mean(qOverClose − qOverOpen); + ⇒ market moved toward over
  readonly seSignedQDrift: number | null; readonly meanAbsQDrift: number | null;
  readonly meanAbsLineDrift: number | null;
  readonly shareLineUp: number | null; readonly shareLineDown: number | null; readonly shareLineFlat: number | null;
  readonly timing: FamilyTiming;
  readonly priced: false; readonly layer: "MARKET_PROP";
}
export function buildOpenerAttackMap(
  rows: readonly OpenCloseRow[],
  opts?: { readonly minN?: number /* default 50 */; readonly zCrit?: number /* default 2 */ },
): { ok: true; families: readonly FamilyVerdict[] } | { ok: false; refuse: "no_rows" | "bad_row" };
```
Verdict rule (deterministic): group by `family`; `n < minN` ⇒ `INSUFFICIENT` (all
stats still reported when n ≥ 2, null-guarded below that). Else with
`z = meanSignedQDrift / seSignedQDrift` (se = sd/√n, n ≥ 2): `z ≥ zCrit` ⇒
`HIT_OPENER_OVER` (openers systematically underprice the over — hitting the opener
over manufactures CLV); `z ≤ −zCrit` ⇒ `HIT_OPENER_UNDER`; else `WAIT_OR_FORECAST`
(no exploitable signed bias — CLV must come from the CL7 forecaster, or waiting).
Any row with q outside (0,1) or non-finite lines ⇒ refuse `bad_row` (fail closed —
one poisoned row poisons a verdict). Sort output families lexicographically
(determinism).

**Invariants:** priced:false on every verdict (I1) · refuse enum, INSUFFICIENT floor —
a verdict is never issued on thin data (I2) · verdicts are TIMING/EXECUTION policy,
layer MARKET_PROP, q-side forever; they steer WHEN to bet, never WHAT p believes (I3)
· no live policy without masterplan §6 sign-stability across ≥2 seasons (I4) · no
MODEL_VERSION (I5) · I6 zones · no feature keys emitted (I7 n/a) · I8/I9. **CROWN
handling: real-data verdict tables must never be committed to the repo, pasted to a
free endpoint, or published — they live behind paid/contractual surfaces only
(FREE_WINDOW_BLITZ §3b).**

**Verify:** `cd packages/prediction-engine && npx vitest run src/edge-lab/__tests__/opener-attack-map.test.ts && npx tsc --noEmit`

**ATTACK LIST:**
1. Sign audit (the classic inversion): synthesize a family where closes are uniformly
   0.03 ABOVE opens (market moves toward over) ⇒ verdict `HIT_OPENER_OVER`, not
   `_UNDER`. Verify with an independent hand computation of z.
2. n = minN−1 with a huge bias ⇒ `INSUFFICIENT` (floor beats signal).
3. Symmetric drift (half +0.05, half −0.05) ⇒ meanSigned ≈ 0, meanAbs = 0.05,
   `WAIT_OR_FORECAST` — the case that distinguishes bias from volatility.
4. se computed with n−1 denominator (recompute independently on a 3-row family).
5. One row with qOverOpen = 1.0 ⇒ refuse `bad_row` (whole call, not silent drop).
6. shareUp+shareDown+shareFlat = 1 exactly per family (property over random fixture).
7. Determinism: shuffled input rows ⇒ identical output (lexicographic family order).

---

## CL9 · close-forecast-run — offline runner (archive → truths → features → report)

**DATA CLASS: CROWN** (its real-data output — fold scores, manufactured-CLV grid,
attack-map verdicts — is the mining-grid class of FREE_WINDOW_BLITZ §3b; the card
itself embeds only wiring mechanics; Grok/Hermes implement).
**Artifact:** `scripts/edge-lab/close-forecast-run.ts` (invoked `npx tsx …`; imports
deck modules via relative source paths with `.js` extensions, exactly like
`scripts/edge-lab/phase3-acceptance.ts` imports edge-lab sources).
**Depends on:** CL6 (reader), CL4, CL5, CL7, CL8; CL1's readiness rule.

**Spec:**
- Modes: `--selftest` (deterministic, DB-free — verify gate) and `--db` (operator-run
  against a real `DATABASE_URL`).
- `--selftest`: build an embedded synthetic archive in-code with a seeded LCG (no
  `Math.random`): ≥ 3 games × 2 prop markets × 3 books × ≥ 5 cycles each, with known
  planted structure (one family biased +0.04 open→close, one unbiased). Pipe it
  through CL4 (`closeTruthForGame` + `openerTruthForGame`) → CL5
  (`buildDecisionFeatures`, decisionAt = latest capturedAt ≤ commenceTime − 3h) → CL7
  (`runCloseForecast`) → CL8 (`buildOpenerAttackMap`). Assert: CL7 refuses
  `insufficient_rows`/`underdetermined` OR reports (either is honest at selftest
  scale — assert the SHAPE and the refusal honesty, not a performance number), CL8
  flags the planted family `HIT_OPENER_OVER` and the unbiased one not, and the
  emitted JSON parses with `priced: false` and `layer: "MARKET_PROP"` at every level.
  Exit 0 pass / 2 fail.
- `--db`: `new PrismaClient()` from `packages/db`; select games with
  `commenceTime < now` (bounded `--days` window, default 60); per game
  `loadGameTrajectories` (CL6) — `ok:false` or empty ⇒ counted and skipped, never
  fabricated (I2). Assemble `ForecastInputRow`s; **before training, apply CL1's
  readiness rule (≥ 200 close-both-sides prop markets, ≥ 400 trajectories ≥ 3) —
  below it, print `{ status: "ACCUMULATING", counts... }` and exit 0 WITHOUT running
  the forecaster** (an under-fed fit is worse than no fit). Output: one JSON to
  stdout, or `--out <path>` (default `reports/closing-line-forecast.json` — the
  gitignored-reports convention of `export-settled-picks-for-calibration.mjs`).
  Exit 3 on env/DB errors (phase3-acceptance convention).
- The report JSON's top level: `{ methodTag: "close_forecast_run_v0", priced: false,
  layer: "MARKET_PROP", generatedAt, counts: {...}, forecast: CloseForecastReport,
  attackMap: ... }`.
- Idempotent/restartable: read-only against the DB; output file overwritten whole.

**Invariants:** priced:false at every level (I1) · ACCUMULATING short-circuit + skip
counters; zero fabricated rows (I2) · everything in the report is q-side
timing/execution, MARKET_PROP; nothing feeds p (I3) · the report never flips a flag,
touches a pick, or publishes — live use requires masterplan §6 (I4) · no MODEL_VERSION
(I5) · forbidden zones I6 (read-only DB; no schema, no event-odds-ingest, no
vercel.json, no index.ts) · feature keys come from CL5 (I7 upstream) · I8/I9.
**CROWN handling: never commit a real-data output file; never paste one to any free
endpoint; results surface only via paid/contractual channels. The selftest fixture is
synthetic and safe.**

**Verify:** `npx tsx scripts/edge-lab/close-forecast-run.ts --selftest && cd packages/prediction-engine && npx tsc --noEmit`

**ATTACK LIST:**
1. Planted-bias recovery: change the planted family drift sign in a scratch copy of
   the selftest fixture ⇒ verdict flips to `HIT_OPENER_UNDER` (the wiring carries
   sign end-to-end through CL4→CL8; verifier recompiles and runs, not reads).
2. Readiness bypass hunt: run `--db` against an EMPTY database (or a stub
   DATABASE_URL pointing at a fresh schema) ⇒ `ACCUMULATING`, exit 0, no forecaster
   call (add a `console.error` probe or check output JSON has no `forecast` field).
3. Grep for writes: `grep -nE 'create|update|upsert|delete|\$execute' scripts/edge-lab/close-forecast-run.ts` ⇒ zero hits.
4. Determinism: `--selftest` twice ⇒ byte-identical stdout.
5. `predictedMoveEdge` starvation: corrupt one selftest row's decision price to null
   pre-CL7 in a scratch run ⇒ the row is refused upstream (CL5 `bad_price`), the run
   does not throw from inside predictedMoveEdge — proving no fabricated price path
   exists.
6. Confirm the default `--out` path is under `reports/` and `git check-ignore`
   accepts it; if not ignored, the card FAILS until the path is moved to an ignored
   location (CROWN outputs must not be committable by default).

---

## Deck-level notes for the integrator (paid tier, post-merge)

- Export wiring into `packages/prediction-engine/src/index.ts` is deliberately absent
  from every card (I6): PRs #555/#556/#557 all append exports there. Wire exports in
  ONE integration commit after those merge, or not at all (deep imports work).
- The forecaster becomes REAL the day the founder flips `LINE_ARCHIVE_ENABLED` +
  `EVENT_ODDS_INGEST_ENABLED` and CL1 reports READY. Until then every real-data path
  in this deck refuses honestly — that is by design, not a defect.
- Prop CLV settlement (grading prop picks against CLOSE-phase archive rows) is a
  SEPARATE future deck: `props-priced-edge.ts`'s own header makes it the precondition
  for `priced: true`. Nothing here flips `priced`.
