# Scanner Cards — C3.1 ladder coherence · C3.5 boosts · E-G1 dispersion (Wave SC)

**Deck file handling: INTERNAL.** This file contains INTERNAL and CROWN-class cards.
Never paste this deck wholesale to any free endpoint. Extraction rule per
`docs/ops/FREE_WINDOW_BLITZ.md` §3c.1 (send the task, never the thesis):

- **PUBLIC cards (SC1, SC2)** are written standalone. Send the single card's text only —
  never the SHARED CONTEXT block, never any other card, never this header.
- **INTERNAL cards** go to Grok/Hermes with the SHARED CONTEXT block attached.
- **CROWN cards (SC6, SC7)** go to Grok/Hermes only, exactly as written — they already
  carry the minimum crown surface. Never attach doctrine/masterplan text to them.

**Scope:** standing, zero-marginal-token scanners over OUR OWN stored line data only.
No scraping, no new sources, no clearance-engine edits. Doctrine anchors: C3.1
(alt-ladder coherence), C3.5 (boost scanner), masterplan E-G1 (dispersion mining) +
E-G2 (latency). Where recon found no data source, the card is a RESEARCH card that
resolves the gap — never a hand-waved implementation.

## Routing summary

| Lane | Cards | Class |
|---|---|---|
| Free fleet (stealth OK) | SC1, SC2 | PUBLIC — card text only |
| Grok/Hermes | SC3, SC4, SC5, SC8, SC10 | INTERNAL |
| Grok/Hermes | SC6, SC7 | CROWN (trimmed; results of real runs are crown, see cards) |
| Opus judgment tier only | SC9 | INTERNAL content, judgment lane per FREE_WINDOW_BLITZ §3c.5 (clearance/rights) |
| Integration | Opus merges every PR | — |

## Dependency order (within this deck)

```
parallel at t0:  SC1  SC2  SC3  SC8  SC9  SC10
SC4  after SC1 merged   (imports LadderRung from ladder-coherence)
SC5  after SC4 merged   (imports PropQuoteSet from prop-quote-assembly)
SC6  after SC1 merged   (imports LadderScan from ladder-coherence)
SC7  after SC5 merged   (imports PropDispersionScan from prop-dispersion)
```

Production data flow (not a build dependency — shapes are embedded per card):
`OddsLineSnapshot → SC3 reader → SC4 assembly → { SC1 → SC6 } and { SC5 → SC7 }`.

## Invariants — every implementation card in this deck

- **priced:false** on every scanner output. Log-only glass box. No product surface, no
  CLV claim, no public number, until the archive settles CLV (house convention shared
  with kaunitz-outlier / kalshi-book-divergence / props-priced-edge).
- **Fail-closed:** deny-shape (`ok:false` + `refuse` enum), never throw, never fabricate,
  on missing/disabled/dirty data. All archive flags default OFF — an empty archive is the
  normal case and must produce refusals, not numbers.
- **Nothing enters live p** without masterplan §6 validation (walk-forward, placebo, FDR).
  These modules emit standalone scan results, NOT covariates. If an output is ever
  promoted to a covariate it must carry layer `MARKET_GAME`/`MARKET_PROP` and must never
  appear in `P_SIDE_COVARIATE_REGISTRY` — PR #555's CI walks that registry and fails the
  build on contamination.
- **No MODEL_VERSION change.** Scanners do not touch pick generation.
- **Forbidden zones:** `packages/db/prisma/schema.prisma` (sealed by fiat),
  `packages/ingestion-pipeline/src/event-odds-ingest.ts` (no-touch), secrets/`.env`,
  `vercel.json`, and `packages/prediction-engine/src/index.ts` (merge hotspot — PRs
  #555/#556/#557 all append exports there; the integrator wires exports at merge, cards
  add none).
- **Idempotent/restartable:** each card creates exactly one module + one test file; a
  re-run from scratch is a clean rewrite of that pair; no external state, no I/O in
  tests (fixtures only).
- **Commit-on-pass:** commit only after the gate is green —
  `git add <module> <test> && git commit -m "SCn: <key>"` — one branch/PR per card.

**Gate (deterministic — a model's opinion is not a gate):**
```
# prediction-engine cards (SC1, SC2, SC4, SC5, SC6, SC7):
cd packages/prediction-engine && npx vitest run src/edge-lab/__tests__/<key>.test.ts && npx tsc --noEmit
# ingestion-pipeline card (SC3):
cd packages/ingestion-pipeline && npx vitest run src/__tests__/<key>.test.ts && npx tsc --noEmit
# research cards (SC8, SC9, SC10): the rg-based section check printed on the card.
```

**Cross-verify (different model family than the author):** run the gate, check type
fidelity against the shapes embedded in the card, then work the card's ATTACK list —
each attack decided by a computation, not by reading. A test that recomputes the
implementation's own formula on the same inputs is vacuous — reject it; known values
must come from independent derivations (symmetric-price identities, hand-computed EV,
brute-force cross-checks).

---

## SHARED CONTEXT (attach to INTERNAL/CROWN cards only — never to SC1/SC2, never to a free endpoint)

**Archive row** — `OddsLineSnapshot` (`packages/db/prisma/schema.prisma:453-471`, table
`odds_line_snapshots`, indexes `[gameId, market, capturedAt]` and `[phase, capturedAt]`):

```
{ id: cuid, gameId: FK->games, capturedAt: DateTime (OUR poll time, refresh-cycle
  granularity — NOT the book's update time), phase: "OPEN"|"INTERIM"|"CLOSE",
  book: "draftkings"|"fanduel"|"betmgm"|"pinnacle"|..., 
  market: featured "SPREAD"|"MONEYLINE"|"TOTAL"  OR  prop "<oddsApiKey>|<playerSlug>"
          (e.g. "player_receptions|justin_jefferson"),
  side: "home"|"away"|"draw"|"over"|"under", price: Float (American, as returned),
  line: Float? (spread/total/prop point; null for ML),
  source: "the-odds-api"|"the-odds-api-eu", createdAt }
```

- `phase="OPEN"` is stamped on the first-ever row per `(gameId, market)` at write
  (`line-archive.ts:127-137`); `phase="CLOSE"` is re-tagged at settle onto the last
  pre-kickoff row per `(market, book, side)` (`line-archive.ts:227`, wired
  `settle-sport.ts:625`). **An unsettled/missed game leaves its last row INTERIM** —
  closing consumers need a latest-pre-kickoff fallback, never trust CLOSE exhaustively.
- Prop encoding (`packages/ingestion-pipeline/src/prop-line-rows.ts`): market =
  `marketKey + "|" + playerSlug`. `slugPlayer` output is `[a-z0-9_]` only (so the slug
  never contains `|`); `encodePropMarket` rejects a marketKey containing `|`. Decode =
  split at the FIRST `|`: `i = market.indexOf("|")`; `i <= 0` or `i === length-1` →
  invalid. Sides are stored lowercase `"over"|"under"`. **One-sided books are stored as
  ONE row — never invent the missing side.** Prop prices are American
  (prop-line-rows.ts:9). Captured prop books are exactly draftkings/fanduel/betmgm.
- Archive flags default OFF (`LINE_ARCHIVE_ENABLED`, `EVENT_ODDS_INGEST_ENABLED`,
  `LINE_ARCHIVE_EU_PINNACLE`). Scanners are data-blocked, not code-blocked, until the
  founder flips them — hence fail-closed everywhere.

**Devig entry** — `packages/prediction-engine/src/market-read.ts`, imported from
edge-lab modules as `"../market-read.js"` (ESM `.js` extensions everywhere):

```
noVigFromAmericanPrices(american: readonly number[])
  -> MarketRead { fairProbabilities: number[]; insiderShareZ: number } | null
```

Pass `[overAmerican, underAmerican]`; `fairProbabilities[0]` is qOver. A `null` return,
`fairProbabilities.length < 2`, or a non-finite entry means the quote is dirty —
EXCLUDE it (sub-vig/crossed markets return null by design; never fabricate).
Proportional split is banned for props (favourite–longshot bias); this entry is Shin.

**Median convention** (`kaunitz-outlier.ts:85`): copy, sort ascending; odd n → middle;
even n → mean of the two middles.

**Deny-shape convention:** every scanner returns
`{ ok:true, methodTag, ..., priced:false }` or
`{ ok:false, methodTag, flags: [], priced:false, refuse: <enum> }` — exactly the
`KaunitzScan`/`KalshiBookResult` pattern.

**As-of discipline:** any read of archive rows for a decision-time computation takes an
explicit `asOf` and excludes rows with `capturedAt > asOf` (mirrors
`asof-store.ts` — no "latest" reads, `assertNoLookahead` is a hard tripwire elsewhere).
Never name an emitted field to match `/clos|final_line|settle/i` unless it genuinely is
a closing quantity — the leak gates in asof-store/close-distillation reject those names.

---

## SC1 · ladder-coherence — **DATA CLASS: PUBLIC** *(standalone — send this card only)*

**Artifact:** `packages/prediction-engine/src/edge-lab/ladder-coherence.ts`
(+ test `packages/prediction-engine/src/edge-lab/__tests__/ladder-coherence.test.ts`)

A pure validator for a set of Over/Under quotes at multiple lines on one quantity
("a ladder"). After removing the bookmaker margin, P(X > line) must be non-increasing
in the line; this module reports violations. Pure, deterministic, no I/O, strict TS,
no `any`, ESM imports with `.js` extensions.

**The one repo import** (do not explore the repo; this is the full contract):
`import { noVigFromAmericanPrices } from "../market-read.js";` with signature
`(american: readonly number[]) => { fairProbabilities: number[]; insiderShareZ: number } | null`.
Call it as `noVigFromAmericanPrices([overAmerican, underAmerican])`;
`fairProbabilities[0]` is the margin-free P(over). `null`, fewer than 2 probabilities,
or non-finite values mean the quote is unusable — drop that rung, never substitute.

**Exports (exact):**
```ts
export const LADDER_METHOD_TAG = "ladder_coherence_v1" as const;
export const DEFAULT_LADDER_TAU = 0.01;      // probability points
export const DEFAULT_DUP_TOLERANCE = 0.005;  // probability points
export const MIN_LADDER_RUNGS = 2;           // clean, deduped rungs

export type LadderRung = {
  readonly line: number;
  readonly overAmerican: number;
  readonly underAmerican: number;
};
export type LadderRungRead = { readonly line: number; readonly qOver: number; readonly shinZ: number };
export type LadderFlagKind = "non_monotone" | "duplicate_contradiction";
export type LadderFlag = {
  readonly kind: LadderFlagKind;
  readonly lowLine: number;   // == highLine for duplicate_contradiction
  readonly highLine: number;
  readonly qLow: number;      // q at lowLine (min q in the duplicate group)
  readonly qHigh: number;     // q at highLine (max q in the duplicate group)
  readonly gap: number;       // qHigh - qLow; always > 0 when flagged
};
export type LadderRefuse = "empty_ladder" | "too_few_rungs" | "bad_tau";
export type LadderScanOk = {
  readonly ok: true; readonly methodTag: typeof LADDER_METHOD_TAG;
  readonly tau: number; readonly rungCount: number;       // raw input length
  readonly cleanRungCount: number;                        // deduped, devig-clean
  readonly rungs: readonly LadderRungRead[];              // sorted asc by line
  readonly flags: readonly LadderFlag[]; readonly priced: false;
};
export type LadderScanDenied = {
  readonly ok: false; readonly methodTag: typeof LADDER_METHOD_TAG;
  readonly flags: readonly []; readonly priced: false; readonly refuse: LadderRefuse;
};
export type LadderScan = LadderScanOk | LadderScanDenied;

export function scanLadderCoherence(
  rungs: readonly LadderRung[],
  opts?: { readonly tau?: number; readonly dupTolerance?: number },
): LadderScan;
```

**Algorithm (exact):**
1. `tau` (default 0.01) and `dupTolerance` (default 0.005) must be finite in (0, 1),
   else `refuse: "bad_tau"`. Empty input → `"empty_ladder"`.
2. Per rung: `line` finite, devig via `noVigFromAmericanPrices([over, under])`; dirty →
   drop. Keep `{ line, qOver: fairProbabilities[0], shinZ: insiderShareZ }`.
3. Copy-sort clean rungs ascending by line (never mutate the input array).
4. Exact-equal lines form a duplicate group: if `maxQ - minQ > dupTolerance`, emit
   `duplicate_contradiction` (lowLine = highLine = line, qLow = minQ, qHigh = maxQ,
   gap = maxQ - minQ). Either way merge the group to ONE rung with qOver = arithmetic
   mean of the group (shinZ = mean; document the merge).
5. `cleanRungCount` = deduped count; `< MIN_LADDER_RUNGS` → `"too_few_rungs"`.
6. Each adjacent pair (line_i < line_j): if `qOver_j - qOver_i >= tau`, emit
   `non_monotone` (lowLine = line_i, highLine = line_j, qLow = qOver_i, qHigh = qOver_j,
   gap = difference). `>=` matches the house tau convention.
7. Return `ok:true` with flags in ascending lowLine order, `priced:false`.

**Verify:** `cd packages/prediction-engine && npx vitest run src/edge-lab/__tests__/ladder-coherence.test.ts && npx tsc --noEmit`
**Invariants:** priced:false · fail-closed via refuse enums · no I/O · no MODEL_VERSION ·
no edits outside the two named files (in particular not `src/index.ts`) · idempotent ·
commit on green gate.

**ATTACK LIST:**
- Healthy ladder must produce ZERO flags: build q from a genuine survival function
  (e.g. P(Poisson(5) > k+0.5) at lines 2.5…7.5), convert each rung to American prices
  with symmetric margin (both sides shaded equally). If the implementation compares raw
  implied probabilities instead of devigged ones, varying the margin per rung makes a
  coherent ladder flag — construct that fixture and assert no flags.
- Symmetric-price identity: over = under = -110 at any line gives qOver = 0.5 EXACTLY
  under any correct devig — an independent known value; assert to 1e-9.
- Index-order attack: over -200 / under +170 must give qOver > 0.5 (grabbing
  `fairProbabilities[1]` gives the under).
- Direction: inject one inversion of +0.05 → exactly one non_monotone with gap ≈ 0.05
  (independent expected q from the symmetric-price identity, not from re-calling the
  module's own path).
- Boundary: gap exactly == tau MUST flag (`>=`).
- Sub-vig rung (+105/+105, implied sum < 1) is dropped, not fabricated; a 2-rung ladder
  with one sub-vig rung → `too_few_rungs`.
- Duplicate lines within dupTolerance merge silently; beyond it flag AND merge.
- Input mutation: pass a frozen array; assert original order untouched.

---

## SC2 · boost-ev — **DATA CLASS: PUBLIC** *(standalone — send this card only)*

**Artifact:** `packages/prediction-engine/src/edge-lab/boost-ev.ts`
(+ test `packages/prediction-engine/src/edge-lab/__tests__/boost-ev.test.ts`)

Pure expected-value arithmetic for a promotional price ("boost") on a single outcome.
**Inert by construction:** no data source for boosts exists in this codebase and this
module performs no I/O and reads no store — it prices caller-supplied numbers only
(same posture as an existing module whose consumer contract deliberately precedes its
data). Pure, deterministic, strict TS, no `any`, ESM `.js` imports.

**The one repo import** (full contract, do not explore):
`import { noVigFromAmericanPrices } from "../market-read.js";` —
`(american: readonly number[]) => { fairProbabilities: number[]; insiderShareZ: number } | null`.
For a two-way reference market pass `[sideAmerican, oppositeAmerican]`;
`fairProbabilities[0]` is the margin-free probability of the boosted side. `null` or a
short/non-finite result means the reference is unusable.

**Exports (exact):**
```ts
export const BOOST_EV_METHOD_TAG = "boost_ev_v1" as const;

export type BoostReference = { readonly sideAmerican: number; readonly oppositeAmerican: number };
export type BoostRefuse = "bad_price" | "bad_p" | "bad_reference" | "no_basis";
export type BoostEvOk = {
  readonly ok: true; readonly methodTag: typeof BOOST_EV_METHOD_TAG;
  readonly boostedDecimal: number;         // from boostedAmerican
  readonly breakEvenP: number;             // 1 / boostedDecimal
  readonly qReference: number | null;      // devigged P(side) from reference, else null
  readonly evMarket: number | null;        // boostedDecimal * qReference - 1, else null
  readonly evModel: number | null;         // pWin*(boostedDecimal-1) - (1-pWin), else null
  readonly priced: false;
};
export type BoostEvDenied = {
  readonly ok: false; readonly methodTag: typeof BOOST_EV_METHOD_TAG;
  readonly priced: false; readonly refuse: BoostRefuse;
};
export type BoostEv = BoostEvOk | BoostEvDenied;

export function americanToDecimal(a: number): number | null; // null unless finite && |a| >= 100
export function priceBoost(input: {
  readonly boostedAmerican: number;
  readonly pWin?: number;                  // our independent P(win), optional
  readonly reference?: BoostReference;     // the unboosted two-way market, optional
}): BoostEv;
```

**Rules (exact):**
- `americanToDecimal`: a > 0 → `1 + a/100`; a < 0 → `1 + 100/(-a)`; non-finite or
  `|a| < 100` → null (not a real American price).
- `boostedAmerican` invalid → `"bad_price"`. `pWin` present but not finite in [0, 1] →
  `"bad_p"`. `reference` present but devig unusable → `"bad_reference"` (strict — never
  degrade silently). Neither `pWin` nor `reference` supplied → `"no_basis"`.
- `evModel` null when `pWin` absent; `evMarket`/`qReference` null when `reference`
  absent. All EVs are per 1 unit staked.

**Verify:** `cd packages/prediction-engine && npx vitest run src/edge-lab/__tests__/boost-ev.test.ts && npx tsc --noEmit`
**Invariants:** priced:false · fail-closed via refuse enums · no I/O, no store, no
fetch · no MODEL_VERSION · no edits outside the two named files (not `src/index.ts`) ·
idempotent · commit on green gate.

**ATTACK LIST:**
- Conversion: -110 → 1.909090…, +125 → 2.25, -100 → 2.0, +100 → 2.0; assert 1e-9.
  +99 and -99 and 0 all refuse `"bad_price"`.
- Hand-computed EV (independent derivation, not the module's formula): boosted +125,
  pWin 0.5 → evModel = 0.5·1.25 − 0.5 = 0.125 exactly.
- Algebraic identity check derived independently: pWin·(d−1) − (1−pWin) == d·pWin − 1;
  test both forms agree to 1e-12 on random valid inputs.
- A boost priced below fair (boostedDecimal < 1/qReference) must give strictly negative
  evMarket — no clamping to zero.
- Symmetric reference (-110/-110) → qReference = 0.5 exactly (independent known value).
- Sub-vig/crossed reference (+105/+105) → `"bad_reference"`, never `qReference: null`
  inside an `ok:true`.
- pWin = 0 and pWin = 1 are legal (evModel = −1 and d−1 respectively).

---

## SC3 · line-archive-reader — **DATA CLASS: INTERNAL**

**Artifact:** `packages/ingestion-pipeline/src/line-archive-reader.ts`
(+ test `packages/ingestion-pipeline/src/__tests__/line-archive-reader.test.ts`)

The FIRST reader over `OddsLineSnapshot` (today only writers and tests touch it).
Read-only, never writes, never throws. Same pre-codegen posture as the writer
(`line-archive.ts:17-30`): the db handle is `unknown`, reached through a structural
cast; any missing member, thrown error, or non-array result → return the empty/null
result. This also completes the decision-time-price precondition that
`close-distillation.ts:181 predictedMoveEdge` was deliberately built inert against —
NOTE: this reader returns price AS STORED (American for prop rows per
prop-line-rows.ts:9); `predictedMoveEdge` wants decimal — conversion is the CALLER's
job, document it on `readDecisionPrice`.

**Db access pattern (exact):**
```ts
type Delegate = { findMany?: (args: unknown) => Promise<unknown> };
const delegate = (db as { oddsLineSnapshot?: Delegate } | null | undefined)?.oddsLineSnapshot;
// missing delegate / missing findMany / throw / non-array → [] (or null), NEVER throw
```

**Row shape read back** (validate each element, skip invalid ones): see SHARED CONTEXT
archive row. Emit the pure shape:
```ts
export type ArchivedLine = {
  readonly book: string; readonly market: string; readonly side: string;
  readonly price: number;            // AMERICAN as stored — no conversion here
  readonly line: number | null;
  readonly phase: "OPEN" | "INTERIM" | "CLOSE";
  readonly capturedAt: string;       // ISO-8601 UTC (normalize Date -> toISOString())
  readonly source: string;
};
```

**Exports (exact):**
```ts
export async function readLinesAsOf(args: {
  db: unknown; gameId: string; market: string; asOf: Date;
}): Promise<ArchivedLine[]>;
// findMany({ where: { gameId, market, capturedAt: { lte: asOf } },
//            orderBy: [{ capturedAt: "desc" }, { id: "desc" }], take: 1000 })
// then keep the FIRST row seen per (book, side) — i.e. the latest at-or-before asOf.
// Rows with capturedAt > asOf must be impossible in the result (lookahead guard).

export async function readTrajectory(args: {
  db: unknown; gameId: string; market: string; book: string; side: string;
}): Promise<ArchivedLine[]>;
// findMany({ where: {...all four...}, orderBy: [{ capturedAt: "asc" }, { id: "asc" }] })

export async function readDecisionPrice(args: {
  db: unknown; gameId: string; market: string; book: string; side: string; decisionAt: Date;
}): Promise<number | null>;
// latest price at-or-before decisionAt via the readLinesAsOf logic; null when absent.
// DOC COMMENT REQUIRED: American as stored; convert to decimal before predictedMoveEdge.

export async function readClosingLines(args: {
  db: unknown; gameId: string; market: string; kickoffAt?: Date;
}): Promise<ArchivedLine[]>;
// Prefer phase="CLOSE" rows (one per (book, side), latest by capturedAt then id).
// If none AND kickoffAt provided: fall back to readLinesAsOf(asOf = kickoffAt) —
// an unsettled game leaves its last row INTERIM (line-archive.ts:227 caveat).
// If none and no kickoffAt: [].
```

Determinism: all ties on `capturedAt` break by `id` (embedded in the orderBy).
Prop market strings pass through UNDECODED — decoding is SC4's job.

**Verify:** `cd packages/ingestion-pipeline && npx vitest run src/__tests__/line-archive-reader.test.ts && npx tsc --noEmit`
**Invariants:** priced:false (n/a — emits raw rows, claims nothing) · fail-closed
([]/null, never throw) · read-only (no create/update/delete anywhere in the file) ·
nothing enters live p without masterplan §6 validation · no MODEL_VERSION · forbidden
zones: schema.prisma, event-odds-ingest.ts, line-archive.ts (do not edit the writer),
secrets, vercel.json · idempotent · commit on green gate. Tests use a stubbed db object
with canned row arrays — no real database.

**ATTACK LIST:**
- Lookahead: fixture with a row 1ms after `asOf` — must never appear in any result
  (the where-clause could be dropped by a buggy stub-based implementation; the stub must
  actually apply `lte`, so implement the stub as a filtering fake, not a canned return).
- Stale-side: two books × two sides with interleaved capture times — per (book, side)
  the LATEST at-or-before must win, not the globally latest row.
- CLOSE fallback: no CLOSE rows + kickoffAt → returns latest pre-kickoff rows and never
  a post-kickoff row; with CLOSE rows present the fallback must NOT run.
- Hostile db: `db = null`, `db = {}`, delegate throwing, delegate returning
  `{ not: "array" }` — all yield []/null, no throw (wrap in try/catch and assert).
- Malformed row in the result array (price `"NaN"`, phase `"closed"`) is skipped, not
  emitted and not fatal to the valid rows around it.
- Tie determinism: two rows equal capturedAt, ids "a"/"b" — result stable across runs.
- Read-only: grep the artifact for `create|update|delete|upsert` — must be absent
  (verify-by-computation: `! rg -q 'create|update|upsert|delete' packages/ingestion-pipeline/src/line-archive-reader.ts`).

---

## SC4 · prop-quote-assembly — **DATA CLASS: INTERNAL** *(after SC1)*

**Artifact:** `packages/prediction-engine/src/edge-lab/prop-quote-assembly.ts`
(+ test `packages/prediction-engine/src/edge-lab/__tests__/prop-quote-assembly.test.ts`)

Pure, no I/O. Turns archive prop rows (the pure shape below — production hydration comes
from SC3, tests use fixtures) into per-prop cross-book two-way quote sets, and those
into per-book ladders in SC1's exact input shape. This is the read-side join the prop
encoding was designed for: decode `market = "<marketKey>|<playerSlug>"` by splitting at
the FIRST `|` (mirror of `decodePropMarket`, prop-line-rows.ts:87 — `i = indexOf("|")`,
`i <= 0 || i === length-1` → invalid; the slug alphabet `[a-z0-9_]` guarantees at most
one meaningful split point). **This module must match that decode exactly; it does not
import across packages** — the separator is the literal `"|"`, declare it as a local
`const PROP_MARKET_SEP = "|"` with a comment naming prop-line-rows.ts as the authority.

**Exports (exact):**
```ts
export type ArchivedPropRow = {
  readonly book: string; readonly market: string; readonly side: string;
  readonly price: number;            // American as stored
  readonly line: number | null;
  readonly capturedAt: string;       // ISO-8601 UTC
};
export type PropTwoWayQuote = {
  readonly book: string; readonly line: number;
  readonly overAmerican: number; readonly underAmerican: number;
};
export type PropQuoteSet = {
  readonly marketKey: string; readonly playerSlug: string; readonly asOf: string;
  readonly quotes: readonly PropTwoWayQuote[];   // sorted (book asc, line asc)
  readonly books: readonly string[];             // unique books in quotes, sorted asc
  readonly oneSidedCount: number;                // sides that found no partner at their line
};
export function assemblePropQuotes(
  rows: readonly ArchivedPropRow[], asOf: string,
): { readonly sets: readonly PropQuoteSet[]; readonly droppedRows: number };
// sets sorted (marketKey asc, playerSlug asc)

import type { LadderRung } from "./ladder-coherence.js";  // SC1 — do NOT re-declare
export function toBookLadders(
  set: PropQuoteSet,
): readonly { readonly book: string; readonly rungs: readonly LadderRung[] }[];
// per book present in set.quotes, rungs sorted asc by line; books sorted asc
```

**Algorithm (exact):**
1. `Date.parse(asOf)` non-finite → `{ sets: [], droppedRows: rows.length }` (fail-closed
   empty, documented).
2. Drop (and count in droppedRows): rows whose capturedAt fails to parse or parses
   `> asOf` (lookahead), side not exactly lowercase `"over"`/`"under"` (the archive
   writes lowercase; anything else is not archive data), non-finite price, null/non-
   finite line, market that fails the first-`|` decode (this also drops featured rows —
   "SPREAD"/"MONEYLINE"/"TOTAL" contain no separator).
3. Latest-wins per `(marketKey, playerSlug, book, line, side)`: stable-sort candidates
   by `Date.parse(capturedAt)` ascending (ties keep input order), last one wins.
   Determinism is guaranteed for distinct capture times; document the tie rule.
4. Pair over + under at IDENTICAL `(marketKey, playerSlug, book, line)` — exact float
   equality on line (archive lines are x.5 floats, exactly representable) →
   `PropTwoWayQuote`. An unpaired side increments `oneSidedCount` and is excluded:
   **one-sided books stay one-sided — never invent the other side** (prop-line-rows.ts
   header rule).
5. Emit sets/quotes/books in the sorted orders above.

**Verify:** `cd packages/prediction-engine && npx vitest run src/edge-lab/__tests__/prop-quote-assembly.test.ts && npx tsc --noEmit`
**Invariants:** priced:false (assembly claims nothing) · fail-closed (drop + count,
never fabricate) · nothing enters live p without masterplan §6 validation · no
MODEL_VERSION · forbidden zones: schema.prisma, event-odds-ingest.ts, secrets,
vercel.json, `src/index.ts` · idempotent · commit on green gate.

**ATTACK LIST:**
- Lookahead: a row 1s after asOf is dropped and counted.
- Latest-wins: two captures of the same (…, side), later must win; then feed the same
  rows REVERSED — identical output (capture times distinct ⇒ permutation-invariant).
- Cross-line pairing: over@2.5 + under@3.5 for one book must NOT pair — both land in
  oneSidedCount, quotes empty for that book.
- Decode edges: `"player_receptions|"` (trailing sep), `"|jefferson"` (leading),
  `"TOTAL"` (featured) — all dropped. `"player_pass_tds|patrick_mahomes"` decodes with
  marketKey `"player_pass_tds"` (split at FIRST `|`).
- Case strictness: side `"Over"` dropped (not normalized — non-archive provenance).
- Ladder handoff: `toBookLadders` output must typecheck against SC1's imported
  `LadderRung` (compile-time attack — re-declaring a structural twin instead of
  importing is a reject).
- Determinism: shuffle input rows (distinct capturedAt) → byte-identical JSON output.

---

## SC5 · prop-dispersion — **DATA CLASS: INTERNAL** *(after SC4)*

**Artifact:** `packages/prediction-engine/src/edge-lab/prop-dispersion.ts`
(+ test `packages/prediction-engine/src/edge-lab/__tests__/prop-dispersion.test.ts`)

Per-prop cross-book dispersion + the Kaunitz outlier template generalized from
moneyline two-ways to prop over/unders. Pure, no I/O. Input is SC4's `PropQuoteSet`
(import the type from `"./prop-quote-assembly.js"`; devig via
`noVigFromAmericanPrices` from `"../market-read.js"` — see SHARED CONTEXT). Captured
prop width is exactly 3 books (DK/FD/MGM) — the bare Kaunitz minimum; one dirty book
must therefore produce a refusal of the outlier scan, never a 2-book "consensus".

**Exports (exact):**
```ts
export const PROP_DISPERSION_METHOD_TAG = "prop_dispersion_v1" as const;
export const DEFAULT_PROP_TAU = 0.03;   // probability points, Kaunitz default
export const MIN_PROP_BOOKS = 3;        // hard floor — opts cannot go below

export type PropQOutlier = {
  readonly book: string; readonly side: "over" | "under";
  readonly qBook: number;        // Shin q on the flagged (too-long) side
  readonly qConsensus: number;   // median across books at the modal line, that side
  readonly gap: number;          // consensus - qBook; >= tau
};
export type PropDispersionOk = {
  readonly ok: true; readonly methodTag: typeof PROP_DISPERSION_METHOD_TAG;
  readonly marketKey: string; readonly playerSlug: string; readonly tau: number;
  readonly bookCount: number;                  // books with >=1 two-way quote
  readonly lineDispersion: number | null;      // max-min of per-book primary lines; null if <2 books
  readonly modalLine: number | null;
  readonly booksAtModal: number;
  readonly qOverByBook: readonly { readonly book: string; readonly qOver: number; readonly shinZ: number }[];
  readonly qDispersion: number | null;         // max-min qOver at modal; null if <2 books at modal
  readonly outliers: readonly PropQOutlier[];  // [] when outlierRefuse != null
  readonly outlierRefuse: "too_few_books" | null;
  readonly priced: false;
};
export type PropDispersionDenied = {
  readonly ok: false; readonly methodTag: typeof PROP_DISPERSION_METHOD_TAG;
  readonly flags: readonly []; readonly priced: false;
  readonly refuse: "no_quotes" | "bad_tau";
};
export type PropDispersionScan = PropDispersionOk | PropDispersionDenied;

export function scanPropDispersion(
  set: PropQuoteSet,
  opts?: { readonly tau?: number },
): PropDispersionScan;
```

**Algorithm (exact):**
1. tau finite in (0,1) else `"bad_tau"`; `set.quotes` empty → `"no_quotes"`.
2. Per-book primary line = median (house convention) of that book's quoted lines
   (today one line per book; ladders arrive later). `lineDispersion` = max − min of
   primary lines across books; **null when fewer than 2 books** (the exact
   `bookLineDispersion` null-under-2 convention, book-dispersion.ts:52).
3. `modalLine` = the line value with two-way quotes from the MOST books; tie → lowest
   line. Null (and qDispersion null, outlierRefuse "too_few_books") only if step 4
   yields nothing.
4. At modalLine, devig each book's quote; dirty books excluded. `qOverByBook` sorted by
   book asc. `qDispersion` = max − min qOver, null under 2 clean books at modal.
5. Outlier scan requires `>= MIN_PROP_BOOKS` clean books at modal, else
   `outlierRefuse: "too_few_books"`, `outliers: []`. Otherwise: consensus = MEDIAN of
   qOver (never the mean — one longshot book drags a 3-book mean across tau and the
   whole board flags; kaunitz-outlier.ts rationale). Since each book's two-way Shin
   probabilities sum to 1, the under-side consensus is `1 - medianQOver` — derive both
   sides from qOver alone. Per book, mutually exclusive (else-if, matching kaunitz):
   `medianQOver - qOver >= tau` → flag side "over";
   else `qOver - medianQOver >= tau` → flag side "under" (its under is too long).

**Verify:** `cd packages/prediction-engine && npx vitest run src/edge-lab/__tests__/prop-dispersion.test.ts && npx tsc --noEmit`
**Invariants:** priced:false · fail-closed (refuse enums; a dropped book shrinks the
field, never gets imputed) · nothing enters live p without masterplan §6 validation ·
no MODEL_VERSION · forbidden zones: schema.prisma, event-odds-ingest.ts, secrets,
vercel.json, `src/index.ts` · idempotent · commit on green gate.

**ATTACK LIST:**
- Mixed-line contamination: DK/FD at 2.5, MGM at 3.5 → modalLine 2.5, booksAtModal 2,
  qDispersion computed over exactly the two 2.5 books, outlierRefuse "too_few_books",
  lineDispersion = 1.0. Any q comparison that mixes the 3.5 book in is the bug this
  attack exists to catch.
- Median-vs-mean: 4 books at modal, three at qOver ≈ 0.52, one at 0.44 — only the 0.44
  book flags; verify a mean-based consensus would (incorrectly) flag others, then
  assert they are NOT flagged.
- Symmetric-price identity: all books -110/-110 → every qOver = 0.5 exactly (independent
  value), qDispersion = 0, no outliers.
- Boundary: gap exactly tau flags (`>=`); one book both-sides-flagged is impossible
  (assert mutual exclusion on a crafted near-boundary fixture).
- Null conventions: single-book set → lineDispersion null (not 0), qDispersion null.
- One dirty book at the 3-book minimum (sub-vig quote) → outlierRefuse, never a 2-book
  consensus.
- MIN_PROP_BOOKS floor: opts cannot lower it (no such opt exists — compile-time check
  that tau is the only option).

---

## SC6 · ladder-divergence — **DATA CLASS: CROWN** *(Grok/Hermes only · after SC1)*

**Artifact:** `packages/prediction-engine/src/edge-lab/ladder-divergence.ts`
(+ test `packages/prediction-engine/src/edge-lab/__tests__/ladder-divergence.test.ts`)

Ranks the rungs of a coherence-scanned ladder by absolute divergence between the
caller's predictive P(X > line) and the ladder's devigged qOver. Pure, no I/O. The
predictive arrives as an opaque function handle — this module never imports any p-side
model (that decoupling is deliberate; the card intentionally contains nothing about how
the predictive is built). Integration note for the caller only, not for this module:
the handle is bound from the props stack's posterior P(X > line) functions
(`props-hb.ts:263` `probOver`, `:379` `probOverContinuous`).

**Exports (exact):**
```ts
import type { LadderScan } from "./ladder-coherence.js";   // SC1 — do NOT re-declare

export const LADDER_DIVERGENCE_METHOD_TAG = "ladder_divergence_v1" as const;

export type PropPredictive = (line: number) => number;   // caller's P(X > line)

export type RungDivergence = {
  readonly line: number; readonly qOver: number; readonly pOver: number;
  readonly divergence: number;        // pOver - qOver (positive = model hotter on over)
  readonly inFlag: boolean;           // rung participates in >=1 coherence flag
};
export type LadderDivergenceOk = {
  readonly ok: true; readonly methodTag: typeof LADDER_DIVERGENCE_METHOD_TAG;
  readonly ranks: readonly RungDivergence[];        // sorted |divergence| desc, tie -> lower line
  readonly flaggedRanks: readonly RungDivergence[]; // the inFlag subset, same order
  readonly skippedRungs: number;                    // rungs whose predictive was invalid
  readonly priced: false;
};
export type LadderDivergenceDenied = {
  readonly ok: false; readonly methodTag: typeof LADDER_DIVERGENCE_METHOD_TAG;
  readonly priced: false;
  readonly refuse: "not_coherent_input" | "no_predictive" | "bad_predictive";
};
export type LadderDivergence = LadderDivergenceOk | LadderDivergenceDenied;

export function rankLadderDivergence(scan: LadderScan, pOverAt: PropPredictive): LadderDivergence;
```

**Algorithm (exact):**
1. `scan.ok === false` → `"not_coherent_input"` (a refused scan is never ranked).
2. Per clean rung in `scan.rungs`: `p = pOverAt(line)`; non-finite or outside [0, 1] →
   skip and count (never clamp). Zero valid rungs → `"no_predictive"`.
3. Predictive tripwire: over valid rungs sorted asc by line, any `p_j > p_i + 1e-9`
   for `line_j > line_i` → `"bad_predictive"` — the caller's own P(X > line) must be a
   valid survival function; ranking against a broken predictive is refused, not warned.
4. `inFlag`: rung.line equals (exact float) `lowLine` or `highLine` of any scan flag.
5. Rank by |divergence| descending, ties by lower line first. `flaggedRanks` preserves
   that order filtered to `inFlag`.

**Verify:** `cd packages/prediction-engine && npx vitest run src/edge-lab/__tests__/ladder-divergence.test.ts && npx tsc --noEmit`
**Invariants:** priced:false · fail-closed via refuse enums · output is NOT a covariate
and registers nothing (if ever promoted: layer MARKET_PROP, never
P_SIDE_COVARIATE_REGISTRY — PR #555 CI walks it) · nothing enters live p without
masterplan §6 validation · no MODEL_VERSION · forbidden zones: schema.prisma,
event-odds-ingest.ts, secrets, vercel.json, `src/index.ts` · idempotent · commit on
green gate. **CROWN handling:** fixture tests only; never commit a real-data run's
output anywhere in the repo; results are paid-lane only.

**ATTACK LIST:**
- Confidence-ranking regression (the domain's known fatal error): rung A with
  p = 0.90, q = 0.90 (|d| = 0) vs rung B with p = 0.55, q = 0.40 (|d| = 0.15) — B must
  rank first. An implementation ranking by max(p, 1−p) puts A first; assert it doesn't.
- Sign: p > q gives positive divergence (fixture with hand-set p and symmetric-price
  q = 0.5 exactly).
- Tripwire: a predictive increasing in line by > 1e-9 refuses `"bad_predictive"`;
  one increasing by < 1e-9 does not.
- Skip-not-clamp: pOverAt returning 1.2 → rung skipped and counted; NaN likewise;
  ranks unaffected.
- Flag join: coherence flag at lowLine 2.5 marks the 2.5 rung inFlag; 3.0 rung not.
- Refused scan in → `"not_coherent_input"` out, and pOverAt must never be called
  (spy-count it).
- Tie determinism: two rungs equal |d| → lower line first, stable across runs.

---

## SC7 · softness-map — **DATA CLASS: CROWN** *(Grok/Hermes only · after SC5)*

**Artifact:** `packages/prediction-engine/src/edge-lab/softness-map.ts`
(+ test `packages/prediction-engine/src/edge-lab/__tests__/softness-map.test.ts`)

Aggregates per-prop dispersion scans into a per-family ranking table (masterplan E-G1
deliverable). Pure, no I/O. Input is SC5's `PropDispersionScan` (import from
`"./prop-dispersion.js"`). The card carries only the aggregation spec — nothing about
what the ranking is used for.

**Exports (exact):**
```ts
import type { PropDispersionScan } from "./prop-dispersion.js";  // SC5 — do NOT re-declare

export const SOFTNESS_MAP_METHOD_TAG = "softness_map_v1" as const;
export const DEFAULT_MIN_PROPS = 5;

export type FamilySoftness = {
  readonly family: string;                       // marketKey
  readonly n: number;                            // props aggregated (deduped by playerSlug)
  readonly medianLineDispersion: number | null;  // over non-null values only
  readonly p90LineDispersion: number | null;     // nearest-rank, non-null values only
  readonly medianQDispersion: number | null;     // over non-null values only
  readonly outlierRate: number;                  // props with >=1 outlier / n
  readonly softnessRank: number;                 // 1 = softest
};
export type SoftnessMapOk = {
  readonly ok: true; readonly methodTag: typeof SOFTNESS_MAP_METHOD_TAG;
  readonly families: readonly FamilySoftness[];  // sorted by softnessRank asc
  readonly thin: readonly { readonly family: string; readonly n: number }[]; // n < minProps, family asc
  readonly priced: false;
};
export type SoftnessMapDenied = {
  readonly ok: false; readonly methodTag: typeof SOFTNESS_MAP_METHOD_TAG;
  readonly priced: false; readonly refuse: "no_input";
};
export type SoftnessMapResult = SoftnessMapOk | SoftnessMapDenied;

export function buildSoftnessMap(
  scans: readonly PropDispersionScan[],
  opts?: { readonly minProps?: number },
): SoftnessMapResult;
```

**Algorithm (exact):**
1. Keep `ok:true` scans only; none → `"no_input"`.
2. Dedupe within a family by playerSlug: stable-sort by (playerSlug asc, bookCount asc)
   and let the last per slug win (the widest-book scan survives; document).
3. Group by marketKey. Families with n < minProps (default 5, `>=` includes the
   boundary) go to `thin` and are excluded from ranking.
4. Medians per the house convention (copy, sort asc, middle / mean-of-middles),
   computed over NON-NULL values only — a null dispersion is missing data, never 0.
   All values null → that metric is null.
5. p90 by nearest rank on the sorted non-null values ascending:
   index `ceil(0.9 * m) - 1` (m = 5 → index 4; m = 10 → index 8), clamped to [0, m−1].
6. Rank: sort families descending by (medianQDispersion with nulls LAST,
   then medianLineDispersion with nulls last, then outlierRate), final tie → family
   asc. `softnessRank` = 1-based position; rank 1 = largest dispersion.

**Verify:** `cd packages/prediction-engine && npx vitest run src/edge-lab/__tests__/softness-map.test.ts && npx tsc --noEmit`
**Invariants:** priced:false · fail-closed (`"no_input"`, null metrics — never 0-filled)
· output is NOT a covariate (if ever promoted: layer MARKET_PROP, never
P_SIDE_COVARIATE_REGISTRY) · nothing enters live p without masterplan §6 validation ·
no MODEL_VERSION · forbidden zones: schema.prisma, event-odds-ingest.ts, secrets,
vercel.json, `src/index.ts` · idempotent · commit on green gate. **CROWN handling:**
the CODE ships with fixture tests; any output of this module computed over real archive
data is crown-class (a mining-prioritization grid) — it must never be committed to the
repo, pasted to any free endpoint, or surfaced publicly; paid-lane storage only.

**ATTACK LIST:**
- p90 off-by-one: m = 5 non-null values → the maximum (index 4); m = 10 → the 9th
  ascending (index 8); verify against an independently computed nearest-rank.
- Null poisoning: a family where half the qDispersions are null — median over the
  non-null half only; treating nulls as 0 shifts the median, construct the fixture
  where that shift flips a rank and assert the correct order.
- Boundary: n = 5 at default minProps is RANKED, n = 4 is thin.
- Rank direction: the family with the largest medianQDispersion gets softnessRank 1.
- Dedupe: two scans for one playerSlug (bookCount 2 and 3) → n counts 1, the
  bookCount-3 scan's values used.
- Determinism: shuffle input scans → byte-identical JSON output.
- Refused scans in the input are ignored, not counted in any n.

---

## SC8 · RESEARCH — alt-ladder capture path — **DATA CLASS: INTERNAL**

**Artifact:** `docs/data/ALT_LADDER_CAPTURE_PLAN.md` (research document — no code)

**Gap being resolved (why SC1/SC4/SC6 have no production input yet):** no `*_alternate`
market key is requested anywhere (the gated prop ingest's market lists are
NFL=`[player_pass_tds, player_receptions]`, NBA=`[player_points]` —
event-odds-ingest.ts:22-23); zero repo-wide references to alternate keys. The Odds API
client CAN reach them: `getEventOdds` (odds-api-client.ts:335) takes an open string
market list, and `getEventMarkets` (odds-api-client.ts:360) is a 1-credit discovery of
per-book market keys. Even if captured, all rungs of one ladder share one `market`
string, so OPEN/INTERIM phase (stamped per `(gameId, market)`) cannot distinguish
per-rung openers, and existing two-way consumers assume a single line per market.
Multiple rungs ARE storable — rows are disambiguated by the `line` column.

**Required sections (each an `## ` header, all mandatory):**
- `## Market key inventory` — the exact `*_alternate` keys available per book for one
  NFL and one NBA event. Preferred evidence: two `getEventMarkets` probes (2 credits
  total) — ONLY if `THE_ODDS_API_KEY` is present in the environment AND the founder has
  approved the spend in writing; otherwise desk-research from The Odds API public docs
  with every key marked `UNVERIFIED`. Either way the section must contain a literal
  line beginning `Credit spend:` stating the credits actually consumed (e.g.
  `Credit spend: 0 (docs only)`).
- `## Credit cost model` — cost per event-odds call multiplies per market×region
  requested; free tier is 500 credits/month; the prop ingest is capped at 8
  calls/sport/cycle (event-odds-ingest.ts:24). Table: marginal credits/cycle and /month
  for adding each candidate alternate market at current cadence.
- `## Phase semantics decision` — options analysis: (a) leave the writer untouched and
  derive per-rung openers at READ time (first capturedAt per `(market, book, line)` via
  the SC3 reader); (b) any writer change (line-archive.ts phase logic) — which requires
  founder sign-off and is NOT recommended by default. The document must state that
  event-odds-ingest.ts is never edited: new market keys/books are wired via
  process-sport's args (`markets?`, `bookmakers?` on `EventOddsIngestArgs`;
  process-sport.ts:346-358 is the call site).
- `## Storage impact` — rows per ladder = rungs × books × 2 sides per capture cycle;
  projected table growth at current cadence; confirmation that the sealed schema needs
  NO change (market string + line column already encode a rung).
- `## Recommendation` — go/no-go, which markets first, and the exact flag/arg changes
  the founder would make (named, not applied).

**Verify (deterministic):**
```
f=docs/data/ALT_LADDER_CAPTURE_PLAN.md; test -f "$f" \
&& rg -q '^## Market key inventory' "$f" && rg -q '^Credit spend:' "$f" \
&& rg -q '^## Credit cost model' "$f" && rg -q '^## Phase semantics decision' "$f" \
&& rg -q '^## Storage impact' "$f" && rg -q '^## Recommendation' "$f" \
&& ! rg -qi '(api[_-]?key\s*=|secret|sk-[A-Za-z0-9])' "$f"
```
**Invariants:** research only — zero code changes, zero unapproved credit spend ·
forbidden zones: schema.prisma, event-odds-ingest.ts, line-archive.ts, secrets,
vercel.json · idempotent (rewrite of the one document) · commit on green verify.

**ATTACK LIST (cross-verifier):**
- Recompute the credit table from the stated multiplier rule — arithmetic must hold.
- The `Credit spend:` line must be consistent with the inventory's UNVERIFIED marks
  (0 spend ⇒ every key UNVERIFIED; 2 spend ⇒ founder approval quoted).
- Any sentence proposing an edit to event-odds-ingest.ts or schema.prisma → reject.
- Phase section must not claim OPEN works per-rung today (it provably does not —
  per-(gameId, market) stamp).
- No secrets/keys anywhere in the doc (run the negative rg yourself).

---

## SC9 · RESEARCH — boost/promo source clearance — **DATA CLASS: INTERNAL · JUDGMENT LANE (Opus only)**

**Artifact:** `docs/data/BOOST_SOURCE_CLEARANCE_PLAN.md` (research document — no code)

**Gap being resolved (why C3.5 has no implementation card):** recon found NO boost/promo
data anywhere — no ingestion module, no table, no cleared source in the source-rights
registry. Per this repo's law, the scanner code (SC2 prices whatever a source provides)
is worthless until a LEGAL ingestion path exists, and everything touching the clearance
engine or rights classification is judgment tier (FREE_WINDOW_BLITZ §3c.5) — this card
must never be given to a free worker or to Grok/Hermes for authoring.

**Binding constraints to restate and apply (from CLAUDE.md + doctrine C3.5 rights
note):** every extraction job passes `checkClearance()`
(`apps/web/lib/scraping/clearance-engine.ts`) before running; `allowed=false` stops the
job; every record carries a `RightsSnapshot` via `wrapExtractedRecord()`; candidate
surfaces are limited to our-own-account surfaces and public promo pages; no CAPTCHA/
login/paywall bypass, no fake accounts, no proxy rotation, no scraping of disallowed
paths, stop on cease-and-desist; no evasion tools in the Tool Registry — ever.

**Required sections (each an `## ` header, all mandatory):**
- `## Candidate surfaces` — enumerate realistic sources of posted boosts (books' public
  promo pages; any licensed API coverage; our-own-account surfaces), each with URL
  class and what a "boost record" would contain (book, market, boostedAmerican,
  reference market if shown, postedAt, expiresAt, source URL).
- `## Rights classification` — for each candidate, a PROPOSED status from the registry
  enum (`approved_public_logged_off` / `approved_api` / `approved_open_license` /
  `approved_written_permission` / `vendor_candidate` / `manual_research_only` /
  `permission_required` / `blocked_technical_controls` / `excluded`) with reasoning,
  and the explicit note that no status becomes real until the founder adds the entry to
  `apps/web/lib/scraping/source-rights-registry.ts` — this document changes no code.
- `## No-evasion checklist` — the constraint list above, checked per candidate.
- `## Storage plan` — the schema is sealed by fiat and boosts are not two-way markets:
  they must NOT be shoehorned into OddsLineSnapshot. Present storage options that need
  no migration this window (e.g. a founder-approved future table, spec'd but not
  applied; a fixture corpus for SC2 tests), with a recommendation and explicit
  "decision: founder".
- `## Scanner contract` — confirm the SC2 `priceBoost` input shape
  (`{ boostedAmerican, pWin?, reference? }`) is sufficient for every candidate's record
  shape, or state the exact field it lacks.
- `## Decision` — go/no-go per candidate, and the single next action for each "go".

**Verify (deterministic):**
```
f=docs/data/BOOST_SOURCE_CLEARANCE_PLAN.md; test -f "$f" \
&& rg -q '^## Candidate surfaces' "$f" && rg -q '^## Rights classification' "$f" \
&& rg -q '^## No-evasion checklist' "$f" && rg -q '^## Storage plan' "$f" \
&& rg -q '^## Scanner contract' "$f" && rg -q '^## Decision' "$f" \
&& ! rg -qi '(api[_-]?key\s*=|secret|sk-[A-Za-z0-9])' "$f" \
&& ! rg -qi '(captcha|bypass|rotate.{0,8}prox|headless.{0,12}evad)' "$f"
```
(The second negative check is a tripwire: a plan that discusses bypass techniques even
speculatively fails verification and gets rewritten.)
**Invariants:** research only — zero code, zero extraction, zero requests to any book
surface during authoring · forbidden zones: clearance-engine.ts,
source-rights-registry.ts, data-rules.ts (read-only citations fine, edits are
founder-only), schema.prisma, event-odds-ingest.ts, secrets, vercel.json · idempotent ·
commit on green verify.

**ATTACK LIST (cross-verifier — also judgment tier):**
- Every candidate has a proposed status FROM THE ENUM — a free-text status is a reject.
- Any candidate proposing login-gated or account-scraped data without
  `approved_written_permission` reasoning is a reject.
- The storage plan must not add a Prisma model or migration file — check `git status`
  shows only the one document.
- The scanner-contract section must name SC2's actual exported input fields.

---

## SC10 · RESEARCH — latency measurement (E-G2) feasibility — **DATA CLASS: INTERNAL**

**Artifact:** `docs/data/LATENCY_MEASUREMENT_PLAN.md` (research document — no code)

**Gap being resolved (why no latency miner card exists):** the archive drops the book's
own `last_update` timestamp — `capturedAt` is OUR poll time at refresh-cycle
granularity — and no news-event timestamp store exists. "Which book moved first" at
sub-cycle resolution is therefore unobservable today; a full injury-lag-by-book miner
cannot be honestly specified, so this card scopes what IS recoverable and what upstream
change would unlock the rest.

**Required sections (each an `## ` header, all mandatory):**
- `## What the archive supports today` — spec (prose + pseudocode, no implementation)
  of a cycle-granularity lag estimator over SC3's `readTrajectory` output: a "move" =
  change in `line` or a price change ≥ threshold between consecutive captures of one
  `(gameId, market, book, side)`; cross-book lag = book A moves in cycle t, book B
  matches within cycle t+k → lag k cycles; MUST state the honest limits (within-cycle
  ordering unobservable; lag resolution = poll cadence; simultaneous-cycle moves are
  ties, not leads).
- `## last_update persistence options` — the Odds API payload carries per-bookmaker
  `last_update`, currently discarded. Options analysis: (a) founder-approved future
  migration adding a column (spec only — the schema is sealed this window); (b)
  encoding it into an existing string column — REJECTED, state why (semantic abuse of
  `source`); (c) a sidecar store — cost/benefit. Recommendation, decision: founder.
- `## News timestamp source` — what E-G2 proper needs (injury-news timestamps), the
  candidate sources with license posture, and the rule that any new source goes through
  the clearance engine and the source-rights registry (judgment tier) first.
- `## Polling cadence economics` — lag resolution vs credit burn: credits/month at
  current vs doubled cadence against the 500-credit free tier and the 8-call/sport/
  cycle prop cap.
- `## Recommendation` — ranked next actions; which parts feed the SC7 family table as
  a latency proxy and which wait on founder decisions.

**Verify (deterministic):**
```
f=docs/data/LATENCY_MEASUREMENT_PLAN.md; test -f "$f" \
&& rg -q '^## What the archive supports today' "$f" \
&& rg -q '^## last_update persistence options' "$f" \
&& rg -q '^## News timestamp source' "$f" \
&& rg -q '^## Polling cadence economics' "$f" && rg -q '^## Recommendation' "$f" \
&& ! rg -qi '(api[_-]?key\s*=|secret|sk-[A-Za-z0-9])' "$f"
```
**Invariants:** research only — zero code, zero schema proposals applied · forbidden
zones: schema.prisma, event-odds-ingest.ts, line-archive.ts, clearance-engine.ts,
secrets, vercel.json · idempotent · commit on green verify.

**ATTACK LIST (cross-verifier):**
- The estimator pseudocode must never claim sub-cycle resolution — any "minutes from
  news to move" figure computed from capturedAt alone is dishonest; reject it.
- Recompute the cadence-economics table from the stated per-call multiplier.
- The doc must not instruct edits to event-odds-ingest.ts or the writer.
- Ties (same-cycle moves at two books) must be classified as ties, not leader/follower.
