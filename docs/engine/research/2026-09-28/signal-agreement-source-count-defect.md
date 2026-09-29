# Signal-path `agreement` was a source COUNT, not an agreement

**Measured 2026-09-28, production Neon (read-only), branch `motif/orchestration-v4-2026-09-28`.**
Every number below traces to a query in this session. `NOT RUN` is written where
a check did not run.

## The claim that was false

`generate-signal-slate.ts` and `backfill-independent-trueprob.ts` both hand-build
the `independentEdge` summary rather than calling `assessEdge`, and both set:

```ts
agreement: sources.length >= 2 ? "CONFIRMS" : "SOLO",
```

That is a count of estimators. It is not a comparison of what they said. Two
estimators reading the same matchup in **opposite** directions are recorded as
`"CONFIRMS"` — corroborated — and `apps/web/lib/pick-explainer/grounding.ts:141`
prints that word to customers:

```
★ Independent edge (poisson, mlb_standings): decision LEAN, agreement CONFIRMS, …
```

The engine has a referee for exactly this. `edge-engine.ts` exists so that "if
the exchange sides with the sportsbook, our model is the outlier and we stand
down," and it computes `CONFIRMS` / `SPLIT` / `CONTRADICTS` by **direction**.
The signal path never calls it because there is no book price to referee
against — so the referee silently did not run on one of the two generation
paths, and the field it computes was replaced with a count.

## Blast radius, checked not assumed

| Consumer | Reads `agreement`? | Effect of the fix |
|---|---|---|
| `signal-staleness.ts:100` | yes — `agreement !== "SOLO"` | none. `SPLIT` and `CONFIRMS` take the same branch. |
| `pick-explainer/grounding.ts:141` | yes — display string | **this is the fix**: stops printing an unearned claim |
| `adverse-edge-suppression.ts` | no — keys on `expectedClv` | none |
| `ranking/sort-key.ts:129` | no — numeric fields | none |
| `/api/v1/signals`, `/api/v1/probabilities` | no | none |

No probability, no confidence, no `decision`, no `conviction`, and no published
row is affected. This is a correction to a descriptive field that was wrong.

## Production count

```
agreement=CONFIRMS   rows 990   published 990   2026-06-15 .. 2026-09-27
```

All 990 published rows carry a value produced by counting sources.

**How many of the 990 are actually false: NOT DETERMINABLE from stored data.**
The row keeps the blend and the source NAMES; it does not keep each source's
own `homeFairProb`, so the direction comparison that `sourceAgreement` now
performs cannot be replayed retroactively. Stating a false-positive count here
would be a guess. What is measured is the number of rows that were never checked.

## The fix

`packages/prediction-engine/src/independent-agreement.ts` — `sourceAgreement()`,
the same question `assessEdge` answers, asked without a market:

- a source votes only on a finite probability in `[0, 1]`; out-of-domain is
  **dropped, not clamped** (clamping a corrupt `1.4` to `1.0` would manufacture
  a maximally confident vote)
- a read within `SOURCE_DIRECTION_EPSILON` (0.005 — the same band
  `edge-engine.ts` uses) of 0.5 **abstains**
- votes on both sides → `SPLIT`; nobody votes → `SPLIT`; exactly one opinion →
  `SOLO`; otherwise → `CONFIRMS`

Fail-closed direction: "nobody agreed" can never be recorded as "everybody
agreed". 14 tests, including a non-vacuity check that reproduces the old
`sources.length >= 2` rule as a local oracle and asserts the two disagree on
opposed sources.

Verified: `npx tsc --noEmit` = 0 errors in `prediction-engine` and
`ingestion-pipeline`; `npx vitest run` on the new test file 14/14; the four slate
and backfill suites 43/43.

## What this does NOT do

Whether a `SPLIT` should **withhold** a pick is a separate policy question and
is deliberately untouched. AGENTS.md has carried "require `agreement>=2` or
shrink solo-source edges harder" since 2026-09-13; it is a founder-gated
calibration decision, not a fact to be discovered in a diff. This commit makes
the field honest so that decision can be made on real numbers.

## Adjacent finding, measured, NOT changed: NFL is structurally SOLO

The signal path's real problem is that it usually has one source. Production
`independentEdge.sources` over the last 10 days:

```
["elo"]                             124
["poisson", "mlb_standings", "elo"]  79   (baseball)
["skellam_cover"]                    47
["poisson", "elo"]                    5
["mlb_standings"]                     2
```

Zero NFL rows with more than one source. Root cause, by arithmetic on measured
data with no join ambiguity:

- `team_game_efficiency`, season 2026: **94 rows, 32 teams, weeks 1–3 only**,
  `fetchedAt` 2026-09-28 07:15. Games per team: **min 2, max 3, avg 2.94**.
- `packages/prediction-engine/src/nfl-epa-fair-value.ts:29` sets
  `NFL_EPA_MIN_GAMES = 4`.
- So `nflEpaToIndependentFairValue` returns null for every 2026 team, source 9 in
  `buildIndependentFairValues` can never emit, and the NFL signal path is solo
  **by construction, not by accident**.

The data is current — weeks 1–3 are the last completed weeks, fetched this
morning. It is the constant that is out of step with the season.

**Ruled out by measurement, do not re-investigate:** `NFL_NAME_TO_ABBR` in
`build-independent-fair-values.ts` is CORRECT. The 32 codes in nflverse
production data are `ARI ATL BAL BUF CAR CHI CIN CLE DAL DEN DET GB HOU IND JAX
KC LA LAC LV MIA MIN NE NO NYG NYJ PHI PIT SEA SF TB TEN WAS` and the map matches
all 32, including `LA` for the Rams (not `LAR`).

**The decision this forces, and it is the founder's:** lower
`NFL_EPA_MIN_GAMES` from 4 to 3, or accept solo NFL until week 5. It is a
model-input eligibility change, so it lands in `MODEL_VERSION` territory.

**The warning against doing it blind.** Elo and EPA are both team-strength
estimators. If they correlate highly, adding EPA converts two near-duplicate
opinions into `CONFIRMS` and full credit — fake corroboration, which is WORSE
than the honestly-labelled `SOLO` at its 0.6 discount. **That correlation is
UNMEASURED.** A first attempt to measure EPA's own discrimination returned a
degenerate result (`avg_home_margin` exactly 0.0000 over 17 of 68 matched
games — the self-join matched a row against itself), so the query is a draft and
the number is not reported. Measure the Elo/EPA correlation before touching the
constant, not after.

## An injury-based second source cannot be validated on current data

`injuries` is populated and current: 734 rows for 2026 weeks 1–3, all 32 teams,
`fetchedAt` 2026-09-28 10:00 (Out 144, Questionable 122, Doubtful 19, blank
449). But **`fetchedAt` is the bulk-ingest clock, not a game-time snapshot** —
it is identical for weeks 1, 2 and 3, including games already played. There is
no `computedAt <= decisionAt` ordering clock for the field, so any backtest of
an injury coefficient on this data is the lookahead artifact that retracted the
line-movement finding. Recorded here so it is not proposed a third time.
