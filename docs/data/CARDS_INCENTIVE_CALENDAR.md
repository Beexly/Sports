# CARDS_INCENTIVE_CALENDAR — doctrine C5 incentive calendar (deck IC)

Teams don't maximize props; they maximize their season (doctrine Class 5). This deck
ships **C5.1** (per-team incentive state machine: eliminated / seeding-locked /
auditioning / rest — re-projects usage wholesale), **C5.3** (the 2026-offseason NFL
rule-change sprint: enumerate → pre-registered re-estimation per affected prior),
**C5.2** (coach PROE/pace fingerprints from our CC-BY PBP), and it FINISHES the
`features/` context covariates: body-clock, rest, and weather exist as game-market
EvalRow builders (`features/nfl-body-clock.ts`, `sched:rest_diff` in
`schedule-features.ts`, `features/nfl-weather.ts`) but feed **nothing in the props
stack** and only `nfl-team-form` has ever been run through trials-registry admission.
The deck closes both gaps: a fail-closed props bind (IC8) and an admission runner (IC9).

Card discipline is `docs/data/KERNEL_SLOT_CARDS.md`: one artifact per card (module +
its test counts as one, kernel-style), fully self-contained spec, deterministic verify,
idempotent/restartable, commit on pass, ATTACK list cross-verified by a **different
model family** than the author — each attack checked by a computation, not by reading.

## Routing summary (lanes per `docs/ops/FREE_WINDOW_BLITZ.md` §3)

| Lane | Cards | Who may implement |
|---|---|---|
| PUBLIC | IC2 | Any free endpoint, stealth included (textbook standings combinatorics, zero repo semantics) |
| INTERNAL | IC3, IC4, IC5, IC6, IC7, IC8 | Grok/Hermes only (no-training endpoints) — cards embed repo architecture |
| CROWN | IC1, IC9 | Grok/Hermes only. IC1's rule-change→affected-prior map is mining-grid class; IC9's real-data outputs (admission verdicts, fingerprint tables, incentive flags on real seasons) are calibration-results class — **paid/contractual surfaces only, never a free endpoint, never a public claim** |

## Dependency order within the deck

```
IC1 (2026 rule-change census, RESEARCH)  ─┐
IC2 (standings-math, PUBLIC)             ─┼─ independent, start all three immediately
IC5 (coordinator survey, RESEARCH)       ─┘
IC3 (incentive-state machine)            — needs IC2
IC4 (usage re-projection into props)     — needs IC3 (state enum)
IC6 (coach fingerprints)                 — no deck deps (v0 = head-coach labels; IC5 decides v1)
IC7 (rule-change re-estimation harness)  — needs only IC1's RECORD SHAPE (fixture-driven;
                                           implementable before IC1's research completes)
IC8 (props context bind)                 — no deck deps
IC9 (context-admission runner)           — needs IC3 + IC6 (body-clock family has no deck deps)
```

## Deck-wide invariants (every implementation card states and obeys ALL of these)

- **I1 · priced:false.** Every emitted record/report/cell carries `priced: false`.
  Nothing in this deck is a claimable performance number or a live probability.
- **I2 · Fail-closed on missing data.** Missing prior game, missing/late forecast,
  unlabeled coach, unknown team code, thin schedule, unquantified sit-risk ⇒ a typed
  refuse shape (`{ok:false, refuse:...}`) or a skip counter — matching the
  `bindSepSamples` convention (props-hb-adot-sep-bind.ts: samples are **DROPPED, not
  imputed**). Never impute rest=7 days, never invent a sit probability, never
  substitute observed weather for a forecast, never guess a coach.
- **I3 · p-side context only; MARKET firewall.** Every output of this deck is
  p-side CONTEXT (target layer `"L3"` under PR #555's `CovariateLayer` union). **No
  book price, line, or market-derived quantity enters any module in this deck** —
  grep-able: no card imports `devig.ts` sides beyond the sanctioned qClose recipe for
  EvalRows, and no `MARKET_PROP`/`MARKET_GAME` value is ever an input. Registration in
  `P_SIDE_COVARIATE_REGISTRY` is a **post-#555-merge integrator act**, not a card act
  (see I6). The CI q-contamination walk (`assertPSideHasNoMarketProp`) must stay clean.
- **I4 · Nothing enters live p without masterplan §6 validation**
  (`docs/data/EDGE_FACTORY_MASTERPLAN.md` §6: as-of discipline, temporal CV only,
  CRPS/PIT + economic referee, CANDIDATE→VALIDATED gates, q-contamination test).
  Everything here is CANDIDATE; admission is decided ONLY by the trials registry
  (conditional-MI + family-level BH-FDR, `trials-registry.ts`), never inside a module.
- **I5 · No MODEL_VERSION.** No card touches pick versioning, stamps
  `MODEL_VERSION` (constants.ts:25, `v5.2.7`), flips `rank.priced`, or writes into
  the Pick lifecycle.
- **I6 · Forbidden zones** (do not edit, do not import-for-writes):
  `packages/db/prisma/schema.prisma`, `packages/ingestion-pipeline/src/event-odds-ingest.ts`,
  secrets/`.env*`, `vercel.json`, **`packages/prediction-engine/src/index.ts`** (the
  PR #555/#556/#557 merge hotspot — deep imports only; export wiring is one later
  integration commit), **`packages/prediction-engine/src/edge-lab/covariate-bus.ts`**
  (PR #555 adds two REQUIRED fields to `CovariateCell` — any edit or cell-building
  against main's 3-field shape breaks on merge; this deck defines LOCAL cell types
  only). Consume-only, never edit: every `props-hb*.ts`, `asof-store.ts`,
  `walk-forward.ts`, `placebo.ts`, `trials-registry.ts`, `provenance.ts`,
  `features/nfl-team-form.ts`, `features/nfl-body-clock.ts`, `features/nfl-weather.ts`,
  `apps/web/lib/scraping/clearance-engine.ts`, `source-rights-registry.ts`,
  `packages/data-ingestion/src/*`.
- **I7 · Leak tripwires are load-bearing.** As-of discipline everywhere: standings
  from ENDED games only; forecasts must be issued before the decision cutoff
  (`skipped.leakyForecast` convention); coach/fingerprint windows are strictly-prior
  with self-exclusion (append-after-evaluate, the `nfl-team-form.ts` pattern);
  season 2025 stays SEALED (`sealHoldout`, walk-forward.ts — the static belt
  `scripts/guardrails/sealed-holdout-open-scan.mjs` fails builds on `openHoldout(`
  call sites). No feature key may match `/clos|final_line|settle/i` (asof-store.ts:67
  throws).
- **I8 · Style.** Strict TS, no `any`, no `Math.random` (seeded LCG in tests/fixtures),
  no I/O in pure modules (fetching lives in runners), ESM imports with `.js`
  extensions. Pure modules are deterministic given their inputs and never mutate them.
- **I9 · Commit on pass.** After the verify command passes:
  `git add <the card's files> && git commit -m "ICn: <artifact>"`. Re-running any card
  from scratch must be correct and cheap (overwrite-in-place, no accumulated state).

## Shared embedded contracts (so no implementer explores the repo)

**GameRow** (`packages/prediction-engine/src/edge-lab/game-row.ts:13` — import the
type with `import type { GameRow } from "./game-row.js"` from edge-lab, or
`"../game-row.js"` from `features/`):

```ts
interface GameRow {
  readonly sport: "nfl" | "mlb";
  readonly gameId: string;
  readonly season: number;
  readonly week: number | null;        // null = postseason/unknown
  readonly startTime: string;          // ISO UTC kickoff
  readonly homeTeam: string;           // nfldata era code (see aliases below)
  readonly awayTeam: string;
  readonly homeScore: number | null;   // null = not completed
  readonly awayScore: number | null;
  readonly closing: {
    readonly spreadHome: number | null;
    readonly total: number | null;
    readonly moneylineHomeDecimal: number | null;
    readonly moneylineAwayDecimal: number | null;
  };
}
```

**EvalRow / TimedRow** (`placebo.ts:43` / `walk-forward.ts:31`):
`TimedRow {id, decisionAt, eventEndAt}` (ISO UTC); `EvalRow` adds
`{features: ReadonlyMap<string, number>, y: 0 | 1, qClose: number}` (qClose ∈ (0,1),
devigged).

**AsOfFeatureStore** (`asof-store.ts`, consume-only):
`store.ingest({entityId, featureKey, value, observedAt, source})` and
`store.vector(entityId, keys, decisionAt): ReadonlyMap<string, number>` — the store
re-checks `observedAt <= decisionAt` at serve time and **throws** on any key matching
`/clos|final_line|settle/i`.

**Feature-module house conventions** (mirror `features/nfl-team-form.ts` /
`nfl-body-clock.ts` / `nfl-weather.ts` exactly):
`DECISION_LEAD_MS = 60 * 60_000`; `GAME_DURATION_MS = 4 * 3_600_000`
(endMs = startMs + 4h is "result now knowable"); qClose recipe =
`proportionalDevig([moneylineHomeDecimal, moneylineAwayDecimal])` (from
`"./devig.js"` / `"../devig.js"`; returns index-aligned `number[] | null`), take
`[0]`, require `q > 0.01 && q < 0.99`, else `skipped.noOdds`; y = home win; skip
counters for every unfeatured game; observedAt = the honest knowable-at instant.
Team-code aliases (nfldata era code → current pbp code):
`{ OAK: "LV", SD: "LAC", STL: "LA", LAR: "LA" }` — canonicalize before ANY keying.

**Props conjugate spine** (`props-hb.ts`, consume-only):
`RateSample {games: number, total: number}`; `GammaPrior {alpha, beta}`;
`GammaPosterior {mean, alpha, beta}`; `posteriorRate(prior, total, games):
GammaPosterior` (alpha+total, beta+games); `probOver(post, line, games = 1): number`
(NB posterior-predictive survival). **The NB k-loop volume seams belong to the
Dirichlet share-core deck — nothing in THIS deck touches them; incentive states
re-shape a posterior's INPUT sample or refuse, never the mixing loop.**

**Recency / regime tools** (`props-hb-obs.ts`, consume-only):
`aggregateGameLog(gamesOldestFirst: readonly {total: number}[], {cap?, decay?}):
RateSample` (cap then exponential recency; decay ∈ (0,1], 1 = equal weight; throws on
empty); `regimeShift(career: GammaPosterior, recent: RateSample, tail = 0.01):
{direction: "high" | "low" | "none", pHigh, pLow, tail}`.

**Body-clock / weather primitives** (consume-only):
`NFL_TEAM_UTC_OFFSET: Readonly<Record<string, number>>` and
`bodyClockShiftHours(teamOffset, venueOffset): number` (= venueOffset − teamOffset;
SEA at an ET venue ⇒ +3, "kicking off three body-clock hours early") from
`"./features/nfl-body-clock.js"`; `totalSuppressionIndex({isDome, windMph,
precipProbPct, tempF}): number` ([0,1]; dome ⇒ 0) and
`interface GameWeatherForecast {forecastIssuedAt: string; isDome: boolean;
windMph: number | null; precipProbPct: number | null; tempF: number | null}` from
`"./features/nfl-weather.js"`.

**Runner wiring literals** (for IC9; exactly the `scripts/edge-lab/feature-admission.ts`
precedent):

```ts
checkClearance({ source_id: "nflverse", mode: "open_dataset_ingest",
  tool_id: "fetch-native", intents: ["derived_analytics", "model_training"] })
// !clearance.allowed || clearance.rightsSnapshot === null ⇒ print blocks, exit 2
assertIngestible("nflverse"); const attribution = attributionFor("nflverse") ?? "";
const sealed = sealHoldout(games.map((g) => ({ ...g, id: g.gameId,
  decisionAt: g.startTime, eventEndAt: g.startTime })), (r) => r.season === 2025);
recordThresholdGrid({ registry, family, recordedAt, grid: {...}, notes });
recordFeatureAdmissionTrial({ registry, family, featureKey, recordedAt,
  values, outcomes, qClose, permutations: 1000, seed });   // runs conditionalMiProbe
const admissions = decideFamilyAdmissions(registry, family, 0.10); // BH-FDR q=0.10
```
Imports: `checkClearance` from `"../../apps/web/lib/scraping/clearance-engine"`;
`assertIngestible`/`attributionFor` from
`"../../packages/data-ingestion/src/source-registry.js"`; `parseCsv`,
`decodeDatasetText`, `nflverseUrl` from
`"../../packages/data-ingestion/src/nflverse-source.js"` (`parseCsv(text,
{columns})` projects — never materialize the ~372-column pbp matrix);
`fetchWithFailover`/`withMirrors` from
`"../../packages/data-ingestion/src/fetch-failover.js"`; registry/store/loader
imports exactly as feature-admission.ts lines 36–63. Working seasons
`[2019..2024]`; HOLDOUT 2025 sealed, its pbp never downloaded. pbp cached under
`.cache/edge-lab/`. Attribution string must propagate into every emitted report
("Data via nflverse, licensed CC BY 4.0").

Verify-command shells (deterministic; a model's opinion is not a gate):

```
cd packages/prediction-engine && npx vitest run src/edge-lab/__tests__/<name>.test.ts && npx tsc --noEmit
npx tsx scripts/edge-lab/<name>.ts --selftest && cd packages/prediction-engine && npx tsc --noEmit
```

---

## IC1 · RESEARCH — 2026-offseason NFL rule-change census (C5.3, the gold-rush input)

**DATA CLASS: CROWN** (the enumeration of league-official rule changes is public
fact, but the change→affected-prior mapping with priorities is mining-grid class —
which priors we re-estimate first IS the edge. Grok/Hermes only; the filled artifact
lives in the private repo and must never be pasted to any free endpoint or public
surface. The card itself embeds mechanics only.)
**Artifact:** `docs/data/_gen/nfl-rule-changes-2026.json`.
**Gap resolved:** doctrine C5.3 ("whoever re-estimates fastest owns the window") has
no standing watchlist for the 2026 season. The 2026 league-meeting changes postdate
every model's training data — nobody may enumerate them from memory. This census is
the sole input to IC7's re-estimation plans.

**Spec (self-contained):**
- **Sources: league-official/public only** — NFL Football Operations
  (operations.nfl.com rule-change pages), NFL.com press releases, and the published
  2026 NFL Rulebook. This is **MANUAL RESEARCH** (an agent/human reading public
  announcements and typing facts in our own words). **No extraction job is built**:
  no scraper, no crawler, no automation — so no `checkClearance()` call is required
  (the clearance engine gates extraction JOBS per CLAUDE.md). Neither nfl.com nor
  operations.nfl.com is in `apps/web/lib/scraping/source-rights-registry.ts`; if
  future AUTOMATED monitoring of them is wanted, that is a registry-entry proposal
  for the judgment tier — record it under `escalations`, decide nothing here.
  **Never copy announcement/article prose** — facts only, summaries in our own words
  (≤ 60 words each), per `apps/web/lib/scraping/data-rules.ts`.
- JSON shape (exactly this; IC7 embeds the same record type):
```json
{ "generatedAt": "<ISO>", "deckCard": "IC1", "league": "nfl",
  "effectiveSeason": 2026, "priced": false,
  "changes": [ {
      "id": "<kebab-slug, e.g. 2026-<topic>>",
      "summary": "<own words, <=60 words, facts only>",
      "sourceUrl": "<league-official URL>",
      "announcedAt": "<ISO date of the official announcement>",
      "status": "adopted | trial_one_year | proposed_failed",
      "affectedFamilies": [ {
          "family": "<one of: pass_attempts | pass_yards | pass_td | int | completions |
                     sacks | targets | receptions | rec_yards | rec_td | rush_attempts |
                     rush_yards | rush_td | anytime_td | kick_return_yards |
                     punt_return_yards | fg_made | team_total | game_total | none>",
          "direction": "up | down | unknown",
          "rationale": "<own words, mechanism not vibes>",
          "priority": 1 } ] } ],
  "watchlist": ["<changes proposed but tabled — next year's census seeds>"],
  "escalations": ["<every automation/licensing question, for the judgment tier>"] }
```
- Rules: every adopted 2026 change gets an entry even when `affectedFamilies` is
  `[{family: "none", ...}]` (a complete census is the asset; "no prop impact" is a
  recorded judgment, not an omission). `direction` is a **pre-registered hypothesis
  label only** — IC7 is forbidden from using it numerically (widening is symmetric).
  `priority` ranks the re-estimation sprint (1 = first). `proposed_failed` entries
  are included with `affectedFamilies: [{"family":"none",...}]` — knowing what did
  NOT change is part of the census.
- Idempotent: regenerate = overwrite the one file.

**Invariants:** I1–I9 apply; this card produces no code, proposes no scraping,
touches no p-side module.

**Verify:**
`node -e "const s=require('/home/user/Sports/docs/data/_gen/nfl-rule-changes-2026.json'); const fams=['pass_attempts','pass_yards','pass_td','int','completions','sacks','targets','receptions','rec_yards','rec_td','rush_attempts','rush_yards','rush_td','anytime_td','kick_return_yards','punt_return_yards','fg_made','team_total','game_total','none']; const ok=s.priced===false&&s.effectiveSeason===2026&&Array.isArray(s.changes)&&s.changes.length>=1&&s.changes.every(c=>/^2026-[a-z0-9-]+$/.test(c.id)&&c.summary.split(/\\s+/).length<=60&&/^https:\\/\\/(www\\.nfl\\.com|operations\\.nfl\\.com)\\//.test(c.sourceUrl)&&['adopted','trial_one_year','proposed_failed'].includes(c.status)&&c.affectedFamilies.length>=1&&c.affectedFamilies.every(a=>fams.includes(a.family)&&['up','down','unknown'].includes(a.direction)&&Number.isInteger(a.priority)))&&Array.isArray(s.escalations); process.exit(ok?0:1)"`

**ATTACK LIST (cross-family verifier computes, does not read):**
1. Spot-check ≥ 2 `sourceUrl`s resolve to league-official pages describing the named
   change (fetch the URL, confirm the topic — not the summary text — matches).
2. Grep the artifact for scraping verbs (`scrape|crawl|bypass|selenium|puppeteer`)
   and for any sentence longer than 60 words (verbatim-prose tripwire) — zero hits.
3. Every `affectedFamilies` entry with `direction != "unknown"` must have a
   `rationale` naming a mechanism (assert non-empty and ≥ 8 words by script).
4. No entry may cite a non-league domain (regex in the verify already enforces;
   re-run it independently).
5. Completeness probe: search the official 2026 rule-change summary page and count
   adopted changes; artifact `changes` with `status:"adopted"` must match that count
   (a census that missed one is FAILED, not "mostly done").

---

## IC2 · standings-math — conservative clinch/elimination bounds (PUBLIC lane)

**DATA CLASS: PUBLIC** (textbook order-statistics/monotonicity arguments over an
abstract standings table; zero repo semantics, zero market data — safe for any free
model per FREE_WINDOW_BLITZ §3b).
**Artifact:** `packages/prediction-engine/src/edge-lab/standings-math.ts` +
`packages/prediction-engine/src/edge-lab/__tests__/standings-math.test.ts`.

**Spec (fully self-contained — the implementer needs NOTHING else):**
```ts
export interface TeamStandingRow {
  readonly team: string;        // unique key
  readonly conference: string;  // opaque label
  readonly division: string;    // opaque label; a division never spans conferences
  readonly wins: number;        // completed-game wins
  readonly losses: number;
  readonly ties: number;        // ties are worth half a win
  readonly remaining: number;   // scheduled games not yet completed
}

export function points(row: TeamStandingRow): number;      // wins + 0.5 * ties
export function maxPoints(row: TeamStandingRow): number;   // points + remaining

export interface StandingsFacts {
  readonly team: string;
  /** CERTAIN the team cannot reach the playoffs (7 spots per conference:
   *  division winners + wildcards), regardless of tiebreakers. */
  readonly eliminatedSafe: boolean;
  /** CERTAIN the team has a playoff berth, regardless of tiebreakers. */
  readonly clinchedBerthSafe: boolean;
  /** CERTAIN the team holds the conference #1 seed, regardless of tiebreakers. */
  readonly clinchedTopSeedSafe: boolean;
}

export function standingsFacts(rows: readonly TeamStandingRow[]): StandingsFacts[];
// Output index-aligned with input. Throws RangeError (fail closed) on: duplicate
// team keys; negative/non-integer wins/losses/ties/remaining; a division label
// appearing under two conference labels; non-finite anything.
```
Definitions (all comparisons within the row's own conference; "rivals" excludes the
team itself; document each monotonicity argument in comments):
- `eliminatedSafe` ⟺ BOTH of:
  (a) `maxPoints(t) < max over division rivals of points(r)` — the current division
  leader's points only grow, so t can never win the division; AND
  (b) `maxPoints(t) < P7`, where `P7` = the 7th-largest `points(r)` over the 15
  conference rivals — each rival's points only grow, so at season end ≥ 7 conference
  rivals finish strictly above t: t cannot finish top-7 and ties never arise.
  **Both are required**: a team that fails (b) can still win a weak division (the
  7–9 division-winner case) — condition (a) alone decides that path.
- `clinchedBerthSafe` ⟺ `#(conference rivals with maxPoints(r) ≥ points(t)) ≤ 6`
  — at most 6 rivals can even TIE t's already-banked points, so ≥ 9 rivals finish
  strictly below and t is at worst 7th by record: in, regardless of tiebreakers.
  (Uses t's CURRENT points, never maxPoints — t's remaining games may all be losses.)
- `clinchedTopSeedSafe` ⟺ `points(t) > max over conference rivals of maxPoints(r)`
  — strictly more banked points than any rival can ever reach.
- Fewer than 8 rivals in a conference (thin table) ⇒ every `*Safe` flag is `false`
  for that conference's rows (a partial table can prove nothing — refuse-by-false,
  documented; never throw for thinness).
Rules: pure, deterministic, never mutate input, no imports at all (self-contained
file), no I/O, no `Math.random`. Strict TS, `noUncheckedIndexedAccess`-clean.

**Invariants:** I1–I9 apply trivially (pure math; no market data, no repo types —
that is exactly what keeps it PUBLIC).

**Verify:** `cd packages/prediction-engine && npx vitest run src/edge-lab/__tests__/standings-math.test.ts && npx tsc --noEmit`

**ATTACK LIST:**
1. **The weak-division trap (the card's reason to exist):** construct a conference
   where team X has `maxPoints < P7` but its division leader sits at
   `points = maxPoints(X) − 0.5` catchable... i.e. `maxPoints(X) ≥` leader's points ⇒
   `eliminatedSafe` MUST be false; a wildcard-only implementation flags it true —
   compute both conditions independently by hand and compare.
2. Monte-Carlo soundness property (seeded LCG, no Math.random): random 16-team
   conference, random records; for every row flagged `eliminatedSafe`, simulate 500
   random completions of ALL teams' remaining games; assert the flagged team NEVER
   finishes (points-wise) top-7 in conference nor strictly above its whole division.
   Symmetrically: a `clinchedBerthSafe` team never finishes with ≥ 7 rivals strictly
   above it; a `clinchedTopSeedSafe` team never finishes below any rival.
3. Tie arithmetic: 8-8-1 vs 8-9 — points 8.5 vs 8.0; a hand-built boundary case
   where the half-point flips `eliminatedSafe`.
4. Boundary exactness: exactly 6 rivals with `maxPoints ≥ points(t)` ⇒ clinched;
   exactly 7 ⇒ not. `maxPoints(t) == P7` (tie possible) ⇒ NOT eliminated (strict).
5. Duplicate team key / division-spanning-conferences ⇒ RangeError, never silent.
6. Determinism + input frozen (`Object.freeze` the rows array and every row).
7. Index alignment: shuffle input, assert `out[i].team === rows[i].team` for all i.

---

## IC3 · nfl-incentive-state — the C5.1 per-team state machine

**DATA CLASS: INTERNAL.**
**Artifact:** `packages/prediction-engine/src/edge-lab/features/nfl-incentive-state.ts`
+ `packages/prediction-engine/src/edge-lab/__tests__/nfl-incentive-state.test.ts`.
**Depends on:** IC2 (`import { standingsFacts, type TeamStandingRow } from
"../standings-math.js"`). Also `import type { GameRow } from "../game-row.js"`.
Pure, no I/O.

**Spec:**
Embed this static table (public facts; nflverse current codes; maintained like
`NFL_TEAM_UTC_OFFSET`):
```ts
export const NFL_DIVISION: Readonly<Record<string, { conference: "AFC" | "NFC"; division: string }>> = {
  BUF/MIA/NE/NYJ → AFC "AFC East";   BAL/CIN/CLE/PIT → AFC "AFC North";
  HOU/IND/JAX/TEN → AFC "AFC South"; DEN/KC/LV/LAC   → AFC "AFC West";
  DAL/NYG/PHI/WAS → NFC "NFC East";  CHI/DET/GB/MIN  → NFC "NFC North";
  ATL/CAR/NO/TB   → NFC "NFC South"; ARI/LA/SEA/SF   → NFC "NFC West",
}; // written out one key per entry, 32 entries
const TEAM_CODE_ALIASES = { OAK: "LV", SD: "LAC", STL: "LA", LAR: "LA" } as const;
```
```ts
export type IncentiveState =
  | "seeding_locked"   // clinchedTopSeedSafe
  | "rest_window"      // clinchedBerthSafe AND remaining <= 1 (the Week-18 rest case)
  | "auditioning"      // eliminatedSafe AND remaining >= 2 (youth-audition window)
  | "eliminated"       // eliminatedSafe AND remaining <= 1
  | "contested";       // everything else — the honest default
export interface TeamIncentiveRecord {
  readonly team: string; readonly season: number;
  readonly state: IncentiveState;
  readonly facts: { readonly eliminatedSafe: boolean; readonly clinchedBerthSafe: boolean;
    readonly clinchedTopSeedSafe: boolean; readonly wins: number; readonly losses: number;
    readonly ties: number; readonly remaining: number };
  /** Earliest instant (backward weekly scan, see below) at which the SAME state
   *  already held contiguously. Equals asOf when the state is new this week. */
  readonly stateEnteredAsOf: string;
  readonly asOf: string;
  readonly priced: false;
}
export function incentiveStatesAsOf(args: {
  games: readonly GameRow[];   // one NFL season's schedule incl. future games (week !== null = REG)
  season: number; asOfIso: string;
}): { ok: true; records: ReadonlyMap<string, TeamIncentiveRecord>;
      skipped: { readonly unknownTeam: number; readonly nonRegOrOtherSeason: number } }
 | { ok: false; refuse: "no_games" | "bad_asof" | "thin_schedule" };
```
Mechanics:
1. Filter to `season` + `week !== null` (REG; postseason games never enter standings).
   `Date.parse(asOfIso)` invalid ⇒ refuse `bad_asof`.
2. Per game: **completed** ⟺ scores non-null AND `startMs + GAME_DURATION_MS <=
   asOfMs` (4h convention). Everything else in the filtered schedule — including a
   game in progress, and an ended game with missing scores — counts as **remaining**
   for both teams (a result we cannot see is a win still obtainable; shrinking
   `remaining` would fabricate eliminations — I2's direction of safety).
   Ties: `homeScore === awayScore` ⇒ +1 tie both sides. Canonicalize team codes via
   the aliases before keying; a code absent from `NFL_DIVISION` after aliasing ⇒
   that game is counted in `skipped.unknownTeam` and excluded entirely (both sides).
3. Per team present: `completed + remaining < 16` ⇒ refuse `thin_schedule` for the
   whole call (a partial corpus can prove nothing about elimination — fail closed;
   16 accepts both 16- and 17-game eras).
4. Build `TeamStandingRow[]` (conference/division from the table) →
   `standingsFacts` → derive `state` with **exactly this precedence**:
   `seeding_locked` → `rest_window` → `auditioning` → `eliminated` → `contested`.
5. `stateEnteredAsOf`: recompute the state at `asOf − 7d`, `asOf − 14d`, … (step
   7 days, max 26 steps, stopping when the state differs or games run out);
   `stateEnteredAsOf` = the earliest scanned instant whose state (and every step
   between) equals the asOf state. Deterministic, bounded.
Leak-safety: every input is an ended game's final score or a schedule fact —
knowable at `asOf` by construction. Pure, deterministic, input never mutated;
throws only on malformed arguments (that is what the refuse shapes are for — data
problems refuse, they never throw).

**Invariants:** priced:false on every record (I1) · refuse enum + skip counters,
in-progress games conservatively "remaining", never fabricated results (I2) ·
p-side context, target layer L3; no market input exists in this file (I3) · states
are CANDIDATE context — nothing here enters live p without masterplan §6; admission
of any derived feature is IC9's trials-registry job (I4) · no MODEL_VERSION (I5) ·
I6 zones (notably: `covariate-bus.ts` untouched; local types only) · as-of
discipline per mechanics 2 (I7) · I8/I9.

**Verify:** `cd packages/prediction-engine && npx vitest run src/edge-lab/__tests__/nfl-incentive-state.test.ts && npx tsc --noEmit`

**ATTACK LIST:**
1. Hand-built 2-division mini-conference is NOT possible (table is fixed 32 teams) —
   so fixtures must synthesize full seasons: seeded LCG schedule, 17 games/team.
   Cross-check one team's wins/losses/ties/remaining against an independent tally.
2. Weak-division honesty end-to-end: force a division where the leader has 5 wins
   while the conference's 7th seed has 9; a 4-win team with 5 remaining in that
   division must be `contested` (can still catch 5), NOT eliminated.
3. Precedence: construct a team that is simultaneously `clinchedBerthSafe` with
   `remaining = 1` AND `clinchedTopSeedSafe` ⇒ state `seeding_locked`, not
   `rest_window`.
4. Week-18 boundary: `clinchedBerthSafe` with `remaining = 2` ⇒ `contested` (rest
   decisions are a final-week phenomenon here); `remaining = 1` ⇒ `rest_window`.
   `eliminatedSafe` with `remaining = 2` ⇒ `auditioning`; `remaining = 1` ⇒
   `eliminated`.
5. In-progress game: kickoff at `asOf − 1h` with scores already present (data ahead
   of clock) must count as REMAINING, not completed — plant and assert the flip
   changes `remaining`, and that this can flip `eliminatedSafe` only from true to
   false (safety direction), never false to true.
6. `stateEnteredAsOf` contiguity: a team eliminated at week 15, still eliminated
   week 17 ⇒ scan lands on the week-15 boundary instant; a team whose state
   flapped (contested at −7d) ⇒ `stateEnteredAsOf === asOf`.
7. `thin_schedule`: drop one team's schedule to 12 games ⇒ whole call refuses.
8. Alias: feed `homeTeam: "OAK"` ⇒ counted under LV, `skipped.unknownTeam` = 0;
   `"XYZ"` ⇒ skipped. Determinism + frozen inputs.

---

## IC4 · props-hb-incentive — usage re-projection (the props seam for C5.1)

**DATA CLASS: INTERNAL.**
**Artifact:** `packages/prediction-engine/src/edge-lab/props-hb-incentive.ts` +
`packages/prediction-engine/src/edge-lab/__tests__/props-hb-incentive.test.ts`.
**Depends on:** IC3 (`import type { IncentiveState } from
"./features/nfl-incentive-state.js"`). Imports `posteriorRate`, types `RateSample`,
`GammaPrior`, `GammaPosterior` from `"./props-hb.js"`; `aggregateGameLog`,
`regimeShift` from `"./props-hb-obs.js"`. Pure, no I/O.

**Purpose:** "re-projects usage wholesale" — HONESTLY. The state machine never
invents a multiplier or a sit probability. It does exactly one of three things:
pass the baseline through, re-fit on post-state-entry games only (a real regime
split over REAL games), or **refuse to price** (rest risk is a report-driven
quantity we do not possess — fabricating it violates non-negotiable rule 1).

**Spec:**
```ts
export const INCENTIVE_REPROJECTION_METHOD_TAG = "incentive_reprojection_v1" as const;
export interface IncentiveReprojectionRequest {
  readonly state: IncentiveState;
  readonly stateEnteredAsOf: string;                 // ISO, from IC3
  readonly gameLogOldestFirst: readonly { readonly total: number; readonly endedAt: string }[];
  readonly career: GammaPosterior;                   // the family's existing posterior
}
export type IncentiveReprojection =
  | { readonly ok: true;  readonly action: "pass_through";
      readonly priced: false; readonly methodTag: typeof INCENTIVE_REPROJECTION_METHOD_TAG }
  | { readonly ok: true;  readonly action: "reweight_recent";
      readonly sample: RateSample;                   // post-state games ONLY, equal weight
      readonly postStateGames: number;
      readonly regime: "high" | "low" | "none";      // regimeShift(career, sample).direction
      readonly priced: false; readonly methodTag: typeof INCENTIVE_REPROJECTION_METHOD_TAG }
  | { readonly ok: false; readonly action: "refuse_to_price";
      readonly refuse: "rest_risk_unquantified" | "insufficient_post_state_games";
      readonly priced: false; readonly methodTag: typeof INCENTIVE_REPROJECTION_METHOD_TAG };

export function reprojectUsage(req: IncentiveReprojectionRequest): IncentiveReprojection;

/** k-loop-preserving composition: states re-shape the posterior INPUT; the NB
 *  volume seam (probOver and every family's k-loop) is untouched — that seam
 *  belongs to the Dirichlet share-core deck. Returns null on refuse. */
export function posteriorAfterReprojection(
  prior: GammaPrior, r: IncentiveReprojection, baseline: RateSample,
): GammaPosterior | null;
```
Decision table (`reprojectUsage`, deterministic, total over the enum):
- `"contested"` ⇒ `pass_through`.
- `"seeding_locked" | "rest_window"` ⇒ refuse `rest_risk_unquantified` — for EVERY
  player on the team. Starters may sit, backups may surge; without a cleared
  play-probability source both directions are fabrication. The board simply does
  not price these props (a fail-closed no-bet is a valid, honest output).
- `"eliminated" | "auditioning"` ⇒ regime split: `post` = log entries with
  `Date.parse(endedAt) >= Date.parse(stateEnteredAsOf)`. `post.length >= 2` ⇒
  `reweight_recent` with `sample = aggregateGameLog(post.map(g => ({total:
  g.total})), { decay: 1 })` and `regime = regimeShift(req.career, sample).direction`
  (the radiation band is a REPORTED diagnostic, never a numeric adjustment here).
  `post.length < 2` ⇒ refuse `insufficient_post_state_games` (one game of
  post-elimination usage is noise; pre-state games are the broken regime).
`posteriorAfterReprojection`: `pass_through` ⇒ `posteriorRate(prior, baseline.total,
baseline.games)`; `reweight_recent` ⇒ `posteriorRate(prior, sample.total,
sample.games)`; refuse ⇒ `null`.
Throws `RangeError` only on malformed arguments: non-finite/negative `total`,
unparsable ISO, `gameLogOldestFirst` not non-decreasing in `endedAt` (a shuffled log
is a programming error, not data). Pure; never mutates; deterministic.

**Invariants:** priced:false in every arm (I1) · the refuse arms ARE the card —
no sit-probability, no audition multiplier, no invented boost, ever (I2) · p-side
only; no market quantity exists in this file; never ingest a book's line into any
prior (props-hb-rush-attempts.ts:27 norm) (I3) · outputs are CANDIDATE inputs;
nothing enters live p / confidence / ranking — `scoring.ts` admits only
`rank.priced` edges and this module never flips that (I4) · no MODEL_VERSION (I5) ·
I6 zones (all `props-hb*.ts` consume-only) · as-of: callers must pass a
`stateEnteredAsOf` computed at decision time by IC3; this module adds no clock (I7)
· I8/I9.

**Verify:** `cd packages/prediction-engine && npx vitest run src/edge-lab/__tests__/props-hb-incentive.test.ts && npx tsc --noEmit`

**ATTACK LIST:**
1. Boundary of the era split: a game with `endedAt === stateEnteredAsOf` exactly
   must count as POST (`>=`, not `>`) — plant and assert `postStateGames` flips.
2. Regime-split honesty: log = 10 pre-state games at total 20 + 2 post-state at
   total 4 ⇒ `sample` must equal `{games: 2, total: 8}` (hand-compute; equal-weight
   decay 1); the career-heavy pre-state games contribute NOTHING to the sample.
3. `posteriorAfterReprojection` cross-check: for `reweight_recent`, posterior alpha
   = prior.alpha + 8, beta = prior.beta + 2 (independent conjugate arithmetic, not
   a re-call of the implementation).
4. Rest refusal is role-free and total: every state in
   {seeding_locked, rest_window} refuses for logs of length 0, 1, and 20 alike.
5. `regime` diagnostic: build a career posterior with mean 10/game and a post-state
   sample of {games: 2, total: 1} ⇒ `regime === "low"` (verify against an
   independent `probOver`-based tail computation); assert the returned `sample` is
   IDENTICAL with and without the regime direction (diagnostic never adjusts).
6. Shuffled log (endedAt decreasing) ⇒ RangeError; negative total ⇒ RangeError;
   refuse shapes never thrown as exceptions.
7. Exhaustiveness: TypeScript `never` check over the state union in the decision
   table (compile-time), plus a runtime table test over all 5 states.
8. Determinism + frozen inputs.

---

## IC5 · RESEARCH — coordinator crosswalk source survey (C5.2's missing key)

**DATA CLASS: INTERNAL** (source/licensing posture; Grok/Hermes only — and per
FREE_WINDOW_BLITZ §3c.5 any actual clearance/license CALL is judgment-tier: this
card **inventories and proposes only**, it decides nothing).
**Artifact:** `docs/data/_gen/coordinator-source-survey.json`.
**Gap resolved:** doctrine C5.2 wants fingerprints "by coordinator", but NO
coordinator dataset exists anywhere in the repo: nflverse pbp has no coordinator
column, and nfldata games.csv carries HEAD coaches only (`home_coach`/`away_coach`).
IC6 proceeds v0 on head-coach regime labels regardless; this survey decides what v1
uses for offensive/defensive coordinators.

**Spec (self-contained):** produce a JSON object:
```json
{ "generatedAt": "<ISO>", "deckCard": "IC5", "priced": false,
  "candidates": [ { "name": "...",
      "kind": "in_repo | open_dataset | licensed_api | manual_enumeration | derived_proxy",
      "pathOrUrl": "...", "licenseStatus": "known:<license> | UNKNOWN",
      "clearanceStatus": "not_assessed | approved_* | permission_required | excluded",
      "coversSeasons": "...", "grain": "season | mid-season-changes",
      "decision": "adopt_v1 | defer | reject", "notes": "..." } ],
  "v0Decision": "head-coach regime labels from nfldata games.csv home_coach/away_coach (CC-BY-4.0, already in-house) — IC6",
  "escalations": ["<every license/clearance question, for the judgment tier>"] }
```
Mandatory candidates to assess (add any found, never invent):
(a) **in_repo**: nfldata games.csv `home_coach`/`away_coach` — head coach only;
verify the columns against the live CSV header (the loader
`packages/prediction-engine/src/edge-lab/loaders/nfl-games.ts` does not project
them; cite the URL constant `NFLDATA_GAMES_CSV_URL` at its line ~96);
(b) the nflverse catalog (`packages/data-ingestion/src/nflverse-source.ts`,
`NFLVERSE_CATALOG`) — record whether ANY coordinator asset exists (expected: none —
record the negative result explicitly);
(c) Wikipedia team-season coordinator lists — text is CC-BY-SA (share-alike:
derived-data implications are a legal question ⇒ `escalations`), automated access
`not_assessed` ⇒ no automation proposed;
(d) Pro-Football-Reference / Sports Reference — expected `permission_required`
(their ToS restricts automated access) ⇒ candidate only via written permission or
their data partner; **no scraping proposed**;
(e) **manual_enumeration**: 32 teams × ~2 coordinators × season, typed from public
announcements — small enough for manual research (allowed under the legal posture),
`grain: "season"` (mid-season firings are the known blind spot — note it).
**No new scraping is proposed anywhere in this file**; anything not already cleared
in `apps/web/lib/scraping/source-rights-registry.ts` goes under `escalations`.
Idempotent: regenerate = overwrite the one file.

**Invariants:** I1–I9 apply; no code, no p-side contact, decisions escalated.

**Verify:**
`node -e "const s=require('/home/user/Sports/docs/data/_gen/coordinator-source-survey.json'); const ok=s.priced===false&&Array.isArray(s.candidates)&&s.candidates.length>=5&&s.candidates.every(c=>['in_repo','open_dataset','licensed_api','manual_enumeration','derived_proxy'].includes(c.kind)&&c.licenseStatus&&c.clearanceStatus&&['adopt_v1','defer','reject'].includes(c.decision))&&typeof s.v0Decision==='string'&&Array.isArray(s.escalations); process.exit(ok?0:1)"`

**ATTACK LIST:**
1. Every `pathOrUrl` with kind `in_repo` must exist (`test -e` each).
2. No candidate may carry `decision: "adopt_v1"` while `clearanceStatus` is
   `not_assessed`/`permission_required` — assert with a node one-liner.
3. The games.csv claim is checked by COMPUTATION: fetch the live CSV's first line
   and assert it contains `home_coach` and `away_coach` (curl + grep).
4. Grep the survey for scraping verbs — zero hits.
5. The nflverse-catalog negative result must cite the file and state the catalog
   keys inspected — spot-check by opening the cited file.

---

## IC6 · nfl-coach-fingerprint — PROE/pace priors by coaching regime (C5.2 v0)

**DATA CLASS: INTERNAL.**
**Artifact:** `packages/prediction-engine/src/edge-lab/features/nfl-coach-fingerprint.ts`
+ `packages/prediction-engine/src/edge-lab/__tests__/nfl-coach-fingerprint.test.ts`.
**Depends on:** nothing in-deck (v0 uses head-coach labels; IC5 decides the
coordinator upgrade). Imports: `AsOfFeatureStore` from `"../asof-store.js"`,
`proportionalDevig` from `"../devig.js"`, types `GameRow` from `"../game-row.js"`,
`EvalRow` from `"../placebo.js"`. Pure, no I/O — fetching lives in IC9, exactly the
`nfl-team-form.ts` convention.

**Spec:**
```ts
export const COACH_FINGERPRINT_PBP_COLUMNS = [
  "game_id", "season_type", "posteam", "play_type", "xpass",
  "qtr", "game_seconds_remaining", "score_differential",
] as const;                                    // parseCsv projection — never the full matrix
export type CoachPbpRow = Readonly<Record<string, string>>;

export const COACH_SCHEDULE_COLUMNS = [
  "game_id", "game_type", "home_team", "away_team", "home_coach", "away_coach",
] as const;                                    // nfldata games.csv projection
export type CoachScheduleRow = Readonly<Record<string, string>>;

export interface CoachTeamGameUsage {
  readonly gameId: string; readonly team: string;
  readonly proePlays: number; readonly proeSum: number;   // Σ (isPass − xpass), eligible plays
  readonly paceSnaps: number; readonly paceSecsSum: number;
}
export function aggregateCoachUsage(records: readonly CoachPbpRow[]): {
  readonly byGame: ReadonlyMap<string, ReadonlyMap<string, CoachTeamGameUsage>>;
  readonly counts: { readonly sourceRows: number; readonly droppedNonReg: number;
    readonly droppedNotScrimmage: number; readonly droppedNoXpass: number;
    readonly droppedNonNeutral: number; readonly usableProePlays: number;
    readonly usablePaceGaps: number };
};

export function buildCoachLabels(rows: readonly CoachScheduleRow[]): {
  /** key `${gameId}|${canonicalTeam}` → coach name; REG (`game_type === "REG"`) only. */
  readonly byGameTeam: ReadonlyMap<string, string>;
  readonly counts: { readonly rows: number; readonly regRows: number; readonly missingCoach: number };
};

export interface CoachFingerprint {
  readonly coach: string; readonly teams: readonly string[]; readonly games: number;
  readonly proePlays: number; readonly proeRaw: number; readonly proeShrunk: number;
  readonly paceSnaps: number; readonly paceRawSecs: number; readonly paceShrunkSecs: number;
  readonly priced: false;
}
export function fitCoachFingerprints(
  usage: ReturnType<typeof aggregateCoachUsage>["byGame"],
  labels: ReadonlyMap<string, string>,
  opts?: { readonly pseudoPlays?: number /* default 300 */;
           readonly pseudoSnaps?: number /* default 300 */ },
): { readonly fingerprints: readonly CoachFingerprint[];   // sorted by coach, lexicographic
     readonly league: { readonly proe: number; readonly paceSecs: number };
     readonly counts: { readonly unlabeledTeamGames: number } };

export const COACH_FINGERPRINT_FEATURE_KEYS = [
  "coach:proe_diff", "coach:pace_secs_diff",
] as const;
export function buildCoachFingerprintFeatureRows(
  games: readonly GameRow[],
  usage: ReturnType<typeof aggregateCoachUsage>["byGame"],
  labels: ReadonlyMap<string, string>,
  store: AsOfFeatureStore,
  opts?: { readonly window?: number /* default 32 games */; readonly minGames?: number /* default 8 */ },
): { readonly rows: EvalRow[];
     readonly skipped: { readonly noScores: number; readonly tie: number; readonly noOdds: number;
       readonly unlabeledCoach: number; readonly thinHistory: number } };
```
Aggregation rules (`aggregateCoachUsage`):
- REG only (`season_type === "REG"`); scrimmage = `play_type` ∈ {"pass","run"} with
  non-empty `game_id`/`posteam`; else `droppedNotScrimmage`.
- **PROE play**: scrimmage + finite `xpass` ∈ [0,1] (else `droppedNoXpass`) +
  NEUTRAL script: `qtr` ∈ {1,2,3} AND `|score_differential| <= 8` AND finite
  `game_seconds_remaining` (else `droppedNonNeutral`). Contribution:
  `(play_type === "pass" ? 1 : 0) − xpass`. **Documented judgment call** (mirror the
  `nfl-team-form.ts` EPA-caveat header): `xpass` is nflverse's published
  situational pass-probability model (CC-BY-4.0, attribution required); using it as
  a public baseline for PROE is the same referee-only posture as the `epa` column —
  it is a fact about prior plays, it cannot encode the featured game's outcome.
  Also document: `play_type`-based pass indication excludes scramble dropbacks —
  consistent with `form:pass_rate_diff`'s convention, stated, not hidden.
- **Pace gap**: sort each game's rows by `game_seconds_remaining` DESC (regulation
  is monotone 3600→0; `qtr <= 3` filter already excludes OT). A gap is counted when
  two CONSECUTIVE rows in that order share the same `posteam` (adjacent same-drive
  snaps by construction — a possession change interposes the other team's row),
  both are PROE-eligible-neutral, and `elapsed = gsr[i] − gsr[i+1]` ∈ [4, 45]
  seconds (bounds drop clock stoppages, timeouts, quarter breaks, and cross-drive
  artifacts — a documented heuristic PRIOR, not a fitted quantity).
`buildCoachLabels`: canonicalize team codes (aliases from the shared contracts);
empty coach string ⇒ `missingCoach`, no entry.
`fitCoachFingerprints`: group labeled team-games by coach; `proeRaw =
Σ proeSum / Σ proePlays`; `paceRawSecs = Σ paceSecsSum / Σ paceSnaps`; league
values pooled over ALL labeled usage (play-weighted, NOT mean-of-coaches);
`proeShrunk = (n·proeRaw + n0·leagueProe)/(n + n0)` with `n = proePlays`,
`n0 = pseudoPlays` (same form for pace with snaps). Coaches with 0 eligible plays
(or 0 pace snaps) are emitted with the raw field `NaN`-free by REFUSING that side:
omit the coach entirely when both sides are empty; when one side is empty emit the
league value as the shrunk value and `0` counts — document.
`buildCoachFingerprintFeatureRows`: mirror `buildTeamFormFeatureRows` exactly —
sort games by startTime; per featured game resolve each side's coach from `labels`
(missing ⇒ `unlabeledCoach` skip); window = that COACH's last `window` labeled
team-games with `endMs (start+4h) < decision cutoff (kickoff − 1h)` pooled
play-weighted (self-exclusion by append-after-evaluate); fewer than `minGames` ⇒
`thinHistory`; ingest `coach:proe_diff` (home − away, raw pooled window values, NOT
shrunk — shrinkage is for standalone priors; diffs difference it out) and
`coach:pace_secs_diff` at `observedAt` = end of the LAST constituent game; serve
via `store.vector`; y/qClose per the shared recipe.

**Invariants:** priced:false on every fingerprint (I1) · unlabeled/thin ⇒ skip
counters, empty-side refusal — no fabricated fingerprint (I2) · p-side context
(L3-target); the only market contact is the sanctioned qClose EvalRow recipe (I3) ·
CANDIDATE features; admission ONLY via IC9's trials registry (I4) · no
MODEL_VERSION (I5) · I6 zones · strictly-prior windows + self-exclusion + honest
observedAt; keys pass the `/clos|final_line|settle/i` tripwire (I7) · I8/I9.

**Verify:** `cd packages/prediction-engine && npx vitest run src/edge-lab/__tests__/nfl-coach-fingerprint.test.ts && npx tsc --noEmit`

**ATTACK LIST:**
1. PROE sign audit: fixture coach who passes EVERY neutral snap with xpass 0.55 on
   each ⇒ `proeRaw = 0.45` (hand-compute); an all-run coach ⇒ `−0.55`.
2. Pace pairing trap: interleave two posteams' rows (A,A,B,B,A) with gsr
   3600/3580/3560/3520/3480 ⇒ A gets exactly ONE gap (3600→3580 = 20s); the
   A-row at 3480 must NOT pair across B's possession (gap 3520→3480 belongs to B;
   A's 3560→3480 spans a possession and is never formed). Hand-count.
3. Elapsed bounds: gaps of exactly 4 and 45 count; 3 and 46 dropped.
4. Neutral boundary: `score_differential` = ±8 eligible, ±9 dropped; `qtr` 4 dropped.
5. Shrinkage recompute: n = 100 plays, raw 0.10, league 0.02, n0 = 300 ⇒ shrunk
   0.04 exactly (independent arithmetic).
6. League pooling: two coaches, 1000 plays at PROE 0 and 10 plays at PROE 0.5 ⇒
   league ≈ 0.00495, NOT 0.25 (mean-of-coaches is the planted bug).
7. Lookahead plant: append a FUTURE labeled game for the home coach after the
   featured kickoff ⇒ every emitted EvalRow byte-identical with and without it.
8. Self-exclusion: the featured game's own usage must not enter its own window —
   remove it from `usage` and assert the row's features unchanged.
9. Key hygiene: `[...features.keys()].every(k => !/clos|final_line|settle/i.test(k))`
   AND ingest through a real `AsOfFeatureStore` — zero throws.
10. Determinism + frozen inputs; `fingerprints` order invariant under input shuffle.

---

## IC7 · rule-change-reestimation — pre-registered prior surgery (C5.3's sprint tool)

**DATA CLASS: INTERNAL** (harness mechanics; the FILLED plans over IC1's real census
inherit IC1's CROWN class — never paste real plans to a free endpoint).
**Artifact:** `packages/prediction-engine/src/edge-lab/rule-change-reestimation.ts` +
`packages/prediction-engine/src/edge-lab/__tests__/rule-change-reestimation.test.ts`.
**Depends on:** IC1's record SHAPE only (embedded below — fixture-driven; this card
does not wait for the research to complete). Imports `posteriorRate`, types
`GammaPrior`, `GammaPosterior` from `"./props-hb.js"`. Pure, no I/O.

**Spec:**
```ts
// IC1's record shape, embedded (the JSON file's `changes[]` entries):
export interface RuleChangeRecord {
  readonly id: string; readonly summary: string; readonly sourceUrl: string;
  readonly status: "adopted" | "trial_one_year" | "proposed_failed";
  readonly affectedFamilies: readonly {
    readonly family: string; readonly direction: "up" | "down" | "unknown";
    readonly rationale: string; readonly priority: number }[];
}

export interface ReestimationPlan {
  readonly ruleChangeId: string; readonly family: string;
  readonly priorAdjustment: { readonly kind: "widen"; readonly varianceInflation: number };
  readonly recencyDecayOverride: number;      // for aggregateGameLog upstream
  readonly minPostGamesForRefit: number;
  readonly eraBoundaryIso: string;            // `${effectiveSeason}-08-01T00:00:00Z`
  readonly directionHypothesis: "up" | "down" | "unknown"; // metadata ONLY — see below
  readonly priced: false;
}
export function planReestimation(
  record: RuleChangeRecord, effectiveSeason: number,
  opts?: { readonly varianceInflation?: number /* default 2 */;
           readonly recencyDecayOverride?: number /* default 0.85 */;
           readonly minPostGamesForRefit?: number /* default 4 */ },
): ReestimationPlan[];   // one per affectedFamily with family !== "none";
                         // status "proposed_failed" ⇒ [] (nothing changed)

/** Mean-preserving variance inflation: {alpha/k, beta/k}. Gamma(α,β) has mean α/β
 *  (preserved exactly) and variance α/β² (multiplied by exactly k). k > 1 required. */
export function widenGammaPrior(prior: GammaPrior, varianceInflation: number): GammaPrior;

export function splitEras<T extends { readonly endedAt: string }>(
  logOldestFirst: readonly T[], eraBoundaryIso: string,
): { readonly pre: readonly T[]; readonly post: readonly T[] }; // endedAt >= boundary ⇒ post

export function reestimateRate(
  plan: ReestimationPlan, prior: GammaPrior,
  logOldestFirst: readonly { readonly total: number; readonly endedAt: string }[],
):
  | { readonly ok: true; readonly phase: "pre_data_widen"; readonly prior: GammaPrior;
      readonly postGames: number; readonly priced: false }      // widened; decay override applies upstream
  | { readonly ok: true; readonly phase: "post_refit"; readonly posterior: GammaPosterior;
      readonly postGames: number; readonly priced: false }      // posteriorRate(widened, Σpost.total, post.length)
  | { readonly ok: false; readonly refuse: "empty_log" };
```
**THE PRE-REGISTRATION RULE (the card's soul):** a rule change's KNOWN effect is
uncertainty, not direction. `directionHypothesis` is carried as metadata for the
trials registry and post-hoc scoring; **it must never enter any numeric path** —
plans for `direction: "up"` and `direction: "down"` are numerically identical.
The sanctioned response is: (1) widen the affected family's Gamma prior
(mean-preserving, variance × k), (2) shorten recency upstream via
`recencyDecayOverride`, (3) refit on post-era data ONLY once
`post.length >= minPostGamesForRefit`. Throws `RangeError` on: `varianceInflation
<= 1`, non-positive/non-finite opts, bad ISO boundary, negative totals, log not
non-decreasing in `endedAt`. Pure, deterministic, never mutates.

**Invariants:** priced:false everywhere (I1) · empty log refuses; pre-era data
never contaminates a post-era refit (I2) · p-side prior surgery only; no market
input; never ingest the book's repriced line as evidence the rule "worked" (I3) ·
plans are CANDIDATE machinery — each real re-estimation run must be recorded as a
trial (IC9-style runner, out of scope here) and pass masterplan §6 before anything
live moves (I4) · no MODEL_VERSION (I5) · I6 zones · era boundary is a
schedule-known instant; no leak surface (I7) · I8/I9.

**Verify:** `cd packages/prediction-engine && npx vitest run src/edge-lab/__tests__/rule-change-reestimation.test.ts && npx tsc --noEmit`

**ATTACK LIST:**
1. `widenGammaPrior` closed-form: α=12, β=3, k=2 ⇒ {6, 1.5}; mean 4 preserved to
   1e-12; variance 12/9 → 24/9 — recompute variance independently as α/β², assert ×k exact.
2. **Direction-blindness by computation:** two records identical except
   `direction: "up"` vs `"down"` ⇒ `planReestimation` outputs deep-equal except the
   metadata field; run both through `reestimateRate` on the same log ⇒ bit-identical
   numeric results.
3. Era boundary exactness: a game `endedAt === eraBoundaryIso` lands in `post`
   (`>=`); one second earlier lands in `pre`.
4. Post-refit purity: log = 30 pre-era games at total 50 + 4 post-era at total 10
   ⇒ posterior alpha = widened.alpha + 40, beta = widened.beta + 4 (independent
   conjugate arithmetic); mutate a PRE-era total ⇒ posterior unchanged.
5. Phase gate: 3 post games with `minPostGamesForRefit = 4` ⇒ `pre_data_widen`;
   4 ⇒ `post_refit`.
6. `proposed_failed` record ⇒ `[]`; `family: "none"` entries produce no plan.
7. `varianceInflation = 1` ⇒ RangeError (a no-op widen hides a missing response).
8. Determinism + frozen inputs.

---

## IC8 · props-context-bind — body-clock / rest / weather INTO the props stack

**DATA CLASS: INTERNAL.**
**Artifact:** `packages/prediction-engine/src/edge-lab/props-context-bind.ts` +
`packages/prediction-engine/src/edge-lab/__tests__/props-context-bind.test.ts`.
**Gap resolved:** the recon confirms body-clock/rest/weather exist ONLY as
game-market EvalRow builders — nothing feeds props. This bind is the missing seam,
copied from the `bindSepSamples` template (props-hb-adot-sep-bind.ts:87): request →
`ok | refuse`, fail-closed, samples DROPPED not imputed.
**Imports:** `NFL_TEAM_UTC_OFFSET`, `bodyClockShiftHours` from
`"./features/nfl-body-clock.js"`; `totalSuppressionIndex`, type
`GameWeatherForecast` from `"./features/nfl-weather.js"`; type `GameRow` from
`"./game-row.js"`. **NOT from `covariate-bus.ts`** (I6 — #555 collision; local cell
type below).

**Spec:**
```ts
export const CONTEXT_BIND_METHOD_TAG = "props_context_bind_v1" as const;
export type ContextField = "rest_days" | "body_clock_shift_h" | "wx_total_suppression";
export interface ContextCell {
  readonly field: ContextField; readonly value: number;
  readonly grain: "pregame_for_kickoff";
  readonly provenance: "schedule_fact" | "forecast_pre_cutoff";
  readonly knownAtIso: string;      // honest knowable-at instant (as-of joins)
  readonly layer: "L3";             // local literal; bus registration is post-#555 integration
}
export interface ContextBindRequest {
  readonly team: string; readonly gameId: string; readonly kickoffIso: string;
  readonly isHome: boolean; readonly opponentTeam: string;
  readonly fields: readonly ContextField[];   // ALL must bind or the request refuses
}
export type ContextRefuse = "unknown_team" | "no_prior_game" | "no_forecast"
  | "leaky_forecast" | "missing_outdoor_fields" | "bad_kickoff" | "no_fields";
export type ContextBindResult =
  | { readonly ok: true; readonly cells: readonly ContextCell[];   // fields order
      readonly priced: false; readonly methodTag: typeof CONTEXT_BIND_METHOD_TAG }
  | { readonly ok: false; readonly refuse: ContextRefuse; readonly field: ContextField | null;
      readonly priced: false; readonly methodTag: typeof CONTEXT_BIND_METHOD_TAG };

export function bindTeamContext(args: {
  readonly schedule: readonly GameRow[];                       // for rest computation
  readonly weatherByGame: ReadonlyMap<string, GameWeatherForecast>;
  readonly request: ContextBindRequest;
  readonly decisionLeadMs?: number;                            // default 60 * 60_000
}): ContextBindResult;

export function bindTeamContextBatch(args: { /* same minus request */
  readonly requests: readonly ContextBindRequest[];
}): ContextBindResult[];                                        // index-aligned
```
Per-field semantics (canonicalize team codes with the shared aliases first;
`Date.parse(kickoffIso)` invalid ⇒ refuse `bad_kickoff`; empty `fields` ⇒ refuse
`no_fields`):
- `rest_days` (`provenance: "schedule_fact"`): latest schedule game involving the
  team with scores present AND `endMs = startMs + 4h <= kickoffMs` and
  `endMs < kickoffMs`; `value = (kickoffMs − prevEndMs) / 86_400_000`;
  `knownAtIso = prev game end`. No such game (week 1, thin corpus) ⇒ refuse
  `no_prior_game`. **A 7-day default is never emitted** — that constant is this
  card's "3.0 yards".
- `body_clock_shift_h` (`schedule_fact`): venue zone = the HOME team's zone
  (`isHome ? team : opponentTeam` — mirror nfl-body-clock's convention and its
  documented neutral-site blind spot); `value = bodyClockShiftHours(teamOffset,
  venueOffset)`; either code missing from `NFL_TEAM_UTC_OFFSET` after aliasing ⇒
  refuse `unknown_team`. `knownAtIso = kickoff − decisionLeadMs` (the conservative
  latest bound, per the body-clock module's stamping note).
- `wx_total_suppression` (`forecast_pre_cutoff`): `weatherByGame.get(gameId)`
  missing ⇒ refuse `no_forecast`; `Date.parse(forecastIssuedAt) > kickoffMs −
  decisionLeadMs` ⇒ refuse `leaky_forecast` (the weather module's leak gate,
  strictly-after refused, equal-at-cutoff allowed); dome ⇒ `value = 0`; outdoor
  with any of windMph/precipProbPct/tempF null ⇒ refuse `missing_outdoor_fields`;
  else `value = totalSuppressionIndex({...})`. `knownAtIso = forecastIssuedAt`.
**All-or-refuse:** every requested field must bind; the first failing field (in
request order) refuses the WHOLE request with that field named. Pure,
deterministic, never mutates, throws never (data problems are refusals; malformed
kickoff is data here — a batch must survive one bad row).

**Invariants:** priced:false on every result (I1) · six-way refuse enum; nothing
imputed, ever (I2) · all three fields are p-side context, layer L3; NONE is
market-derived, so the q-contamination walk stays clean; **post-#555 integration
commit must add the three fields to `P_SIDE_COVARIATE_REGISTRY` with layer + honesty
tags — an integrator act, not this card's** (I3) · consumers treat cells as
CANDIDATE covariates; nothing enters live p without §6 (I4) · no MODEL_VERSION (I5)
· I6 zones (covariate-bus.ts untouched — the local `ContextCell` exists precisely to
dodge the #555 REQUIRED-fields collision) · knownAtIso honesty per field; forecast
leak gate mirrored exactly (I7) · I8/I9.

**Verify:** `cd packages/prediction-engine && npx vitest run src/edge-lab/__tests__/props-context-bind.test.ts && npx tsc --noEmit`

**ATTACK LIST:**
1. Rest imputation hunt: grep the artifact for the literals `7` near rest logic /
   any default-days constant; then week-1 fixture (no prior game) ⇒ refuse
   `no_prior_game` — never `{value: 7}`.
2. Rest arithmetic: prev game ends Sun 20:00Z + 4h, next kickoff following Sun
   18:00Z ⇒ value = (7·24 − 6)/24 days — hand-compute to 1e-9.
3. Body-clock venue orientation: SEA (−8) away at BUF (−5) ⇒ +3; BUF away at SEA
   ⇒ −3; SEA at home ⇒ 0. Alias: request team "OAK" binds as LV; "XYZ" refuses
   `unknown_team`.
4. Leak-gate boundary: forecast issued exactly AT `kickoff − lead` binds; 1ms later
   refuses `leaky_forecast` (computationally, two fixtures 1ms apart).
5. Dome with all-null outdoor fields ⇒ ok, value 0; outdoor with one null ⇒ refuse
   `missing_outdoor_fields` (never a fabricated neutral).
6. All-or-refuse: fields = [rest, body-clock, weather] with only weather failing ⇒
   whole request refuses naming `wx_total_suppression`; reorder fields ⇒ the named
   field follows request order.
7. Batch isolation: one malformed kickoffIso row inside a 5-request batch ⇒ that
   row refuses `bad_kickoff`, the other four bind (no throw, index-aligned).
8. Determinism + frozen inputs; `knownAtIso` per field matches the spec's source
   instant (assert all three differ in a mixed fixture).

---

## IC9 · context-admission — trials-registry runner for the context families

**DATA CLASS: CROWN** (its REAL-data outputs — admission verdicts, MI p-values,
coach-fingerprint tables, incentive flags per real team-week — are
calibration/mining-grid class per FREE_WINDOW_BLITZ §3b: paid/contractual surfaces
only, never committed, never pasted to a free endpoint. The card embeds wiring
mechanics only; Grok/Hermes implement.)
**Artifact:** `scripts/edge-lab/context-admission.ts` (invoked `npx tsx …`;
precedent: `scripts/edge-lab/feature-admission.ts` — this runner is its sibling for
the families feature-admission never ran).
**Depends on:** IC3 + IC6 (coach + incentive families); body-clock family has no
deck deps (`buildBodyClockFeatureRows` exists on main).

**Spec:**
- Modes: `--selftest` (deterministic, network-free — the verify gate) and `--real`
  (operator-run; network).
- **Families run** (each its own trials-registry family, BH-FDR q = 0.10):
  1. `nfl-body-clock-<yyyymm>` — `buildBodyClockFeatureRows` (features/nfl-body-clock.js),
     4 keys.
  2. `nfl-coach-fp-<yyyymm>` — IC6's `buildCoachFingerprintFeatureRows`, 2 keys
     (pbp per working season projected on `COACH_FINGERPRINT_PBP_COLUMNS`, cached
     under `.cache/edge-lab/`; coach labels from games.csv projected on
     `COACH_SCHEDULE_COLUMNS` — fetched from `NFLDATA_GAMES_CSV_URL`, the loader's
     own constant).
  3. `nfl-incentive-<yyyymm>` — script-local exported pure adapter
     `incentiveFlagFeatureRows(games, store)` (the CL1 `censusOf` precedent: core
     pure function exported from the script file): for each featured game (shared
     qClose recipe), run IC3's `incentiveStatesAsOf` at the decision instant over
     that season's schedule; ingest `inc:resting_diff` = (home ∈ {seeding_locked,
     rest_window} ? 1 : 0) − (away …) and `inc:deadgame_diff` = (home ∈
     {eliminated, auditioning} ? 1 : 0) − (away …); observedAt = decision instant
     (states are functions of ended games only); EvalRows via `store.vector`.
     An IC3 refuse (thin schedule) ⇒ that game skipped + counted, never defaulted.
  4. **`nfl-weather` family: SKIPPED in --real with an explicit
     `skippedFamilies: [{family: "nfl-weather", reason:
     "no_cleared_historical_forecast_archive"}]`** — no cleared archive of
     PRE-KICKOFF forecasts exists in-repo, and substituting observed weather is
     textbook lookahead + uncleared (I2/I7). The selftest exercises
     `buildWeatherFeatureRows` with synthetic forecasts so the wiring is proven;
     real weather admission unblocks when a forecast archive lands (future deck).
- `--real` sequence (mirror feature-admission.ts exactly): clearance literal from
  the shared contracts (denied ⇒ exit 2) → `assertIngestible("nflverse")` +
  attribution propagated into the report → `loadNflGames({seasons: [2019..2024,
  2025]})` (≥ 1000 rows or exit 2) → `sealHoldout(..., r => r.season === 2025)` —
  2025's pbp never downloaded, no 2025 row ever evaluated → per family: build rows,
  `recordThresholdGrid` once (config = window/minGames/decision-lead/family), then
  `recordFeatureAdmissionTrial` per key (permutations 1000, fixed seed) →
  `decideFamilyAdmissions(registry, family, 0.10)` → provenance-stamped report
  (`stampProvenance`) to `reports/edge-lab/context-admission.json` (gitignored
  path). Coach-family precondition: xpass coverage — if > 20% of scrimmage rows in
  any season lack finite `xpass`, the coach family is SKIPPED with reason
  `xpass_coverage_below_80pct` (never fit on a silently thin column).
- **The honest frame** (state it in the header, verbatim posture of
  feature-admission.ts): the closing price already encodes coaches, rest, travel
  and dead games heavily; the LIKELY outcome is few-or-zero admissions, and a
  truthful "nothing admitted" is a PASS. An admitted feature is flagged for
  adversarial leak review, not celebrated.
- `--selftest`: seeded LCG (no `Math.random`), ≥ 120 synthetic GameRows across 2
  synthetic seasons + synthetic pbp usage + synthetic forecasts. Asserts SHAPE and
  tripwires, not statistical outcomes, EXCEPT one robust planted check: a
  script-local `selftest:leak_probe` feature equal to `y` must yield
  `pValue <= 0.01` from `conditionalMiProbe`, and a pure-noise feature must not be
  admitted at q = 0.10 in ≥ 1 of the runs (deterministic under the fixed seed).
  Also asserts: every emitted feature key passes `/clos|final_line|settle/i`; the
  weather-skip path emits its reason; report JSON parses with `priced: false` at
  top level. Exit 0 pass / 2 fail.
- Exit codes: 0 = ran to completion, report written (REGARDLESS of admissions);
  2 = mechanical failure (clearance denied, fetch failure, thin corpus, join
  failure, invalid registry). Idempotent: read-only against the world; the report
  file overwritten whole; pbp cache is content-addressed by season (restartable).

**Invariants:** priced:false at every level of the report (I1) · skip counters +
family-skip reasons; zero fabricated rows, weather refused not faked (I2) ·
everything is p-side context; the only market contact is qClose as the EvalRow
referee — no output of this runner is a bettable signal (I3) · admission via the
registered trials flow IS the §6 gate's front half; nothing live moves either way
(I4) · no MODEL_VERSION (I5) · forbidden zones I6 (no schema, no
event-odds-ingest, no vercel.json, no index.ts, no covariate-bus edit) · sealed
2025 + as-of rails + key tripwire (I7) · I8/I9. **CROWN handling: never commit a
real-run report (verify `git check-ignore reports/edge-lab/context-admission.json`
passes — if not ignored the card FAILS until the path is ignored); never paste
real verdicts to any free endpoint; the selftest fixture is synthetic and safe.**

**Verify:** `npx tsx scripts/edge-lab/context-admission.ts --selftest && cd packages/prediction-engine && npx tsc --noEmit`

**ATTACK LIST:**
1. Leak-probe honesty: flip the planted `selftest:leak_probe` to pure noise in a
   scratch copy ⇒ its pValue rises above 0.01 (the probe actually probes; verifier
   recompiles and runs, not reads).
2. Sealed holdout by computation: grep the artifact for `openHoldout(` (zero hits;
   the static belt also enforces) AND assert no 2025 pbp URL is ever constructed —
   instrument the fetch wrapper in a scratch run against `--real --dry-run`-style
   argument or by stubbing fetch to record URLs in the selftest.
3. Weather-fake hunt: grep for observed-weather columns (`temp`, `wind` from any
   pbp projection) — the runner must contain NO path that feeds real observed
   weather into `buildWeatherFeatureRows`.
4. Registry integrity: run selftest twice ⇒ byte-identical report except
   `generatedAt`/`recordedAt` (assert by JSON-normalizing those fields); the
   trials-registry hash chain verifies (`verifyTrialEntries`).
5. Incentive adapter cross-check: hand-build a 4-team-relevant fixture where the
   home team is `rest_window` and away `contested` ⇒ `inc:resting_diff` = 1 for
   that row (recompute through IC3 independently).
6. Grep for writes: `grep -nE 'create\\(|update\\(|upsert|\\$execute' scripts/edge-lab/context-admission.ts` ⇒ zero hits (no DB writes anywhere; the registry is in-memory + report file).
7. Report path ignored: `git check-ignore reports/edge-lab/context-admission.json`
   exits 0.
8. Attribution propagation: report JSON contains the CC-BY attribution string in
   `--real` mode config echo (assert in selftest via the same code path with a
   stub attribution).

---

## Deck-level notes for the integrator (paid tier, post-merge)

- **Bus registration is ONE later commit:** after PR #555 merges, add
  `rest_days` / `body_clock_shift_h` / `wx_total_suppression` (IC8) and any
  admitted IC9 family keys to `P_SIDE_COVARIATE_REGISTRY` with layer `L3` +
  honesty tags, and only then migrate IC8's local `ContextCell` to the bus's
  post-merge cell shape (`layer`, `knownAtWeek` REQUIRED there). Building against
  main's 3-field cell today is the known typecheck landmine — that is why every
  card here uses local types.
- **Export wiring into `packages/prediction-engine/src/index.ts` is deliberately
  absent** from every card (I6): PRs #555/#556/#557 all append there. Deep imports
  work; wire exports in one integration commit after those merge, or not at all.
- **Seams deliberately NOT touched:** the NB k-loops (every `props-hb-*` volume
  mix) belong to the Dirichlet share-core deck; IC4 feeds posteriors INTO them and
  IC8 feeds covariates BESIDE them. The incentive calendar's alpha/trials coupling
  (e.g. auditioning-team share redistribution) is share-core work and must wait for
  that deck's `FitDirichletMultinomialFn` implementation — masterplan L465 names
  "share model merged without renormalization" as a known failure mode.
- **The rule-change sprint cadence:** IC1 re-runs every offseason (the census file
  is year-stamped); IC7 is permanent machinery. When IC1 lands, run
  `planReestimation` over every adopted change, record each plan as a trial, widen
  the named priors, and let the post-era refits earn VALIDATED through §6 — the
  window (mispriced weeks 1–6) is the payoff the doctrine promises.
- IC4's `rest_risk_unquantified` refusal is a PRODUCT stance: the board shows no
  pick rather than a fabricated one for Week-18 resting teams. If a cleared
  play-probability source ever lands (IC5-style survey first), a future card can
  replace the refusal with a real hurdle — until then the refusal is the feature.
