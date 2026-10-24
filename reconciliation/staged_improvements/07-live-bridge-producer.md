# STAGED-IMPROVEMENT 7 — A live bridge producer (the missing PIT path)

**Changes a published number?** Not by itself. It produces a **calibrated
per-game probability** for games that have not been played, which is the
input the LIVE `historical_strength` family needs.
**Risk:** MEDIUM. It touches the reasoning path's inputs.
**Files:** a new `packages/ingestion-pipeline/src/bridge/` producer, a cron
route, and a new read-only table for the per-game output.

---

## 0. Why — the bridge has skill but no way to apply it

The previous cycle measured that the pregame bridge is a real, calibrated
model (`reconciliation/f2_duplicate_measurement.md`): Brier 0.223743 on the
2025 holdout, skill +0.025 over base rate, 95% CI excludes zero,
P(skill > 0) = 0.9992, raw binned ECE 0.051868 against a 0.06 gate.

**And that same measurement found the thing this stage fixes: the seven
non-strength features contribute nothing measurable beyond `margin_diff`.**

That is a *duplicate* finding, not a *useless* finding. `margin_diff` is a
prior-strength estimate — the same information class as the LIVE
`historical_strength` family — and the bridge measures that class
**better than the family does**: the LIVE family is a single fixed weight
(0.08) on an Elo probability, while the bridge is a fitted, calibrated
model of the same quantity.

**The bridge's per-game output is the better estimate of the strength
class, and it is thrown away.**

### The measured loss

`packages/ingestion-pipeline/src/slate-association.ts:85-115` reads all
285 bridge rows and takes the **mean**:

```ts
if (row.signal_id !== "pregame_context_logit") continue;
sum += row.probability; count += 1;
// ...
probability: association.mean,   // 0.560244
claim:
  "pregame_context_logit (logistic-irls): mean association probability across
   the stored 2025 holdout, an association summary — not a published
   probability and not an edge",
```

**A per-game calibrated probability — 285 distinct numbers, each with its
own calibration — is collapsed into one constant (0.560244) and labelled
"not a published probability and not an edge."** For a slate of 12 games
that constant is the same for every game, so it carries **zero**
game-specific information.

**This is the fix, and it is NOT publishing the bridge as a new family.**
The bridge is a duplicate *as a separate family*. It is a **better
estimator of an existing family**, and the honest wiring is to feed it
*into* `historical_strength` — not to add a second strength family, and
not to publish a probability that has not been earned against the market.

---

## 1. The missing producer, and why the bridge cannot run today

`buildFeatures` exists and is tested
(`packages/data-ingestion/src/gse-dataset/features.ts:191`), and
`fitBridge`/`predictBridge` exist and are tested
(`packages/prediction-engine/src/bridge/bridge-model.ts`). **Neither has
a producer.**

| piece | exists | producer |
|---|---|---|
| `buildFeatures` | yes | **NO** — no cron, no script calls it |
| `fitBridge` / `predictBridge` | yes | **NO** — only `scripts/run-bridge.mjs`, run by hand |
| `data/gse-dataset/features.jsonl` | yes (static) | written once, never refreshed |
| `data/gse-dataset/games.jsonl` | yes (static) | written once, never refreshed |

### 1.1 Measured: the static feature file cannot serve 2026

`data/gse-dataset/features.jsonl` has 272 rows for the 2026 NFL season.
**Only 33 of them (12.1%) carry the bridge's features.**

| 2026 week | rows with ALL bridge features |
|---|---|
| 1 | 16 / 16 |
| 2 | 16 / 16 |
| 3 | **1 / 16** |
| 4–18 | **0 / 14–16** |

**The reason is structural, not a bug in the builder.** The builder's
trailing window needs each team's prior games to be **settled**
(`features.ts:183-189`: *"An unsettled game has no outcome, so it
contributes no history for anyone"*). And:

```
games.jsonl 2026: 272 rows, 33 with a margin
  week 1: 16/16 with margin
  week 2: 16/16 with margin
  week 3+:  0 with margin
```

**`games.jsonl` is a static snapshot taken around week 2 of the 2026
season.** Every game after that has `settled: false` and no margin, so
the trailing window is empty and the features are null — correctly, since
a null is honest about missing history.

**So the bridge is not broken. It is un-fed.** The 2026 season exists in
the live database; the static file simply predates it.

### 1.2 Measured: the live database HAS the history the builder needs

| source | 2026 | scored | prior history |
|---|---|---|---|
| live `games` (NFL `sportId`) | 368 | 129 | **2026 only** — no NFL history before Aug 2026 |
| `historical_games` | 272 | 92 | **1999–2026**, nflverse-sourced, with `rightsSnapshot` |

`historical_games` carries `season`, `week`, `awayTeam`, `homeTeam`,
`awayScore`, `homeScore`, `result` — everything the trailing window needs.

**Measured: for all 272 of the 2026 games, each team has ≥ 8 prior scored
games in `historical_games` (272/272).** The trailing window is fully
available live.

**The one thing neither table carries is the venue context the bridge
needs** — `dome` and `neutral` are features of the bridge
(`BRIDGE_FEATURES`), and:

- `teams` has only `id, leagueId, name, abbreviation, city, logoUrl` — no
  venue;
- there is **no venue, stadium, or arena table** in the schema;
- `games.jsonl` has `roof` and `neutral_site`, but it is the same stale
  snapshot.

**And this is the same missing 32-row table that STAGED-IMPROVEMENT 3
needs** for the weather DARK evaluators (elevation, dome flag, surface
enum). **One table unblocks both.**

### 1.3 Measured: the field-level gap between `NormalizedGame` and the database

`buildFeatures` takes `NormalizedGame[]`
(`packages/data-ingestion/src/gse-dataset/normalize.ts:41-100`). Here is
every field it needs and where it can come from, checked against the live
schema:

| `NormalizedGame` field | source | available? | note |
|---|---|---|---|
| `game_id` | historical_games.gameKey | **YES** | same format 2025_02_CLE_BAL |
| `season` | historical_games.season | **YES** |  |
| `week` | historical_games.week | **YES** |  |
| `game_type` | historical_games.gameType | **YES** | REG/POST |
| `season_phase` | DERIVED from gameType | **YES** |  |
| `gameday` | DERIVED (no gameday col in hist; live games.commenceTime) | **YES** | historical_games has no date column -- needs one |
| `away_team` | historical_games.awayTeam | **YES** |  |
| `home_team` | historical_games.homeTeam | **YES** |  |
| `away_score` | historical_games.awayScore | **YES** |  |
| `home_score` | historical_games.homeScore | **YES** |  |
| `margin` | DERIVED homeScore - awayScore | **YES** |  |
| `total_points` | DERIVED | **YES** |  |
| `home_win` | DERIVED | **YES** |  |
| `settled` | DERIVED both scores present | **YES** |  |
| `overtime` | DERIVED (margin != score diff) | **YES** |  |
| `rest_home` | live games.restDaysHome | **PARTIAL** | live games has it for 2026 only; historical_games has NO rest column |
| `rest_away` | live games.restDaysAway | **PARTIAL** | same |
| `rest_diff` | DERIVED | **PARTIAL** | needs rest for historical games |
| `spread_line` | historical_games.spreadLine | **YES** |  |
| `total_line` | historical_games.totalLine | **YES** |  |
| `away_moneyline` | historical_games.awayMoneyline | **YES** |  |
| `home_moneyline` | historical_games.homeMoneyline | **YES** |  |
| `is_divisional` | NEITHER (32-team static fact) | **NO** | derivable from a static division map |
| `roof` | NEITHER | **NO** | venue table |
| `is_dome` | NEITHER | **NO** | venue table |
| `surface` | NEITHER | **NO** | venue table |
| `neutral_site` | NEITHER | **NO** | venue table |
| `referee` | NEITHER | **NO** | not a bridge feature -- informational |

**Summary of the gap:**

| bucket | count | fields |
|---|---:|---|
| available from the DB | 19 | game_id, season, week, game_type, scores, margin, total, home_win, settled, overtime, gameday, teams, the four market lines |
| partial | 3 | `rest_home`, `rest_away`, `rest_diff` — the live `games` table has `restDaysHome`/`restDaysAway` for 2026, but `historical_games` has no rest column, and the bridge's window reaches back into 1999-2024 |
| **missing** | **6** | `roof`, `is_dome`, `surface`, `neutral_site` (4 venue facts), `is_divisional` (a 32-team static fact), `referee` (not a bridge feature — informational only) |

**`referee` is not a bridge feature**, so the load-bearing gap is **5
fields: 4 venue facts plus the division map.**

**And only 3 of the 8 bridge features are affected by the missing fields** —
`dome`, `neutral`, and (via `rest_diff`) `rest_diff` itself. The other
five (`margin_diff`, `scored_diff`, `allowed_diff`, `opp_scored_diff`,
`opp_allowed_diff`) come entirely from scores, which the DB has in full.

**So the 32-row venue table is the whole remaining gap for three of the
eight features** (`dome`, `neutral`, and `surface` which feeds `rest`
context in the wider feature set), **and a 32-row division map covers
`is_divisional`.** That is the same venue table STAGED-IMPROVEMENT 3
needs for the three weather DARK evaluators. **One table, two stages,
four signals.**

**The `dome` and `neutral` features are the only bridge features the
venue table blocks.** The other five come entirely from scores, which the
DB has in full — and since the f2 measurement showed the seven
non-strength features carry **no** measurable skill, `dome` and `neutral`
being unavailable costs the bridge **nothing** that was ever there. The
venue table is still worth building — for the weather DARK evaluators —
but **it is not on the bridge's critical path.**

**And the `rest_diff` gap has a clean answer:** `games.jsonl` carries
`rest_away`/`rest_home` for every historical game, and the live `games`
table carries `restDaysHome`/`restDaysAway` for 2026. The gap is only
1999-2024, and that is a **static, backfillable** column — 26 seasons of
"days since the previous game" is a date arithmetic over a schedule that
does not change. It does not need a feed; it needs one backfill.

---

## 2. What changes

### 2.1 A 32-row venue table

`model Entity` already has `entity_type: EntityType` (enumerating
`venue`, `coach`, `coordinator` — `schema.prisma:3875-3878`) plus
`attributes Json?` (`:3917`), so **no migration is needed**; the graph is
"additive, not yet read by any surface" (`:3870`), so the work is a
reader plus the seed.

Per team: `dome` (bool), `neutral_capable` (bool), `elevation_ft` (number),
`surface` (enum: grass|turf|astro), `capacity`. **32 rows, hand-written
from the most stable public facts, no feed, no key, no licence.**

This one table serves:
- the bridge's `dome` and `neutral` features;
- `nfl_high_altitude_fatigue` (elevation);
- `nfl_linear_wind_pass_impact` (dome flag);
- `nfl_turf_surface_fatigue` (surface enum).

### 2.2 A feature producer that reads the live DB

New: `packages/ingestion-pipeline/src/bridge/build-bridge-features.ts`.

```
For each NFL game g in `games` (or `historical_games`) that is NOT yet
settled and starts in the next N days:
  For each side, take that team's LAST 8 prior SETTLED games
    (from historical_games, joined with the live `games` table),
    compute the trailing means the builder already defines:
      scored, allowed, margin  (own)
      opp-scored, opp-allowed  (adjusted, vs the opponents' own baselines)
    plus rest_diff (games.restDaysHome / restDaysAway)
    plus dome / neutral (from the venue table)
  Emit one feature row per game.
```

**The trailing-window semantics must match `buildFeatures` exactly** —
strictly-earlier gameday, window 8, mean over the trailing slice, null
when there is no history. **The safest implementation reuses
`buildFeatures` itself** by feeding it a `NormalizedGame[]` assembled from
the DB rather than from `games.jsonl`. **That is the design:** do not
re-implement the window; call the tested builder on DB-sourced games.

> **LESSON FROM THIS CYCLE, APPLIED.** A Python re-implementation of the
> bridge's IRLS fit diverged from the published fit (Brier 0.645 vs
> 0.2237) because it was a *different estimator*. It measured the wrong
> thing and would have produced a wrong verdict. **Reuse the tested
> implementation; do not re-derive it.**

### 2.3 A per-game output table

New: `bridge.game_probability` (or a `lit.`-namespace analogue):

| column | meaning |
|---|---|
| `game_key` | `2026_06_SEA_DEN` |
| `model` | `pregame_context_logit` |
| `probability` | the fitted sigmoid for that game |
| `home_sign` | the coefficient signs (constant for the model version) |
| `model_version` | a hash of the fit (so a refit invalidates old rows) |
| `fitted_at` | when the fit was made |
| `feature_row_count` | how many games the fit used |

**A per-game probability is only meaningful with the model version that
produced it**, so `model_version` is not optional.

### 2.4 Fold it INTO `historical_strength` — do not add a family

The `historical_strength` family is LIVE at weight 0.08 with grain
*"elo probability on game_id"* (`live-edge-registry.ts:62`). The honest
change is to make that family's `signed` value **the bridge's calibrated
per-game probability for that game**, where the bridge's model version is
current, falling back to the Elo probability when it is not.

**Not a new family. A better estimator of an existing one.** That is the
whole point of the f2 measurement: the bridge is not new information, it
is *better measurement* of information already in the table.

### 2.5 The gates this must clear before it moves anything

**A probability that has not been earned against the market must not
move a number.** The bridge's Brier is measured against the **base
rate**, not against the **market**. The kill line the repo already uses
(`signal-registry-extensions.ts:41-46`) is `maxBrierScoreVsMarket 0.250`,
and the published holdout's own caution applies:

> *"A clean Brier score on the probability does not make the surrounding
> confidence number clean."* — `docs/reasoning/calibration-holdout-2025.md`

**So the order is:**

1. produce the per-game probability (this stage);
2. **measure it against the market** — Brier vs the de-vigged market
   price, on the 2026 games it was produced for;
3. only then let it inform `historical_strength`'s `signed` value.

**Until step 2 is done, the per-game probability is a calibration
artifact and nothing else.** It must not touch `trueProb`.

---

## 3. Acceptance

- [ ] `bridge.game_probability` holds one row per unplayed NFL game in the
      next 14 days, with `model_version` and `fitted_at`.
- [ ] The feature row for a game is produced by calling the TESTED
      `buildFeatures` on DB-sourced games — not by a re-implementation.
      **A test asserts the DB path and the `games.jsonl` path agree on
      games both can produce.**
- [ ] A game with no venue row is refused, not defaulted. A missing dome
      flag is a missing feature, not a false one.
- [ ] A refit bumps `model_version`; stale rows are not served.
- [ ] `historical_strength`'s `signed` value prefers the bridge's
      per-game probability **and only after** the market-comparison gate
      has passed for that model version.
- [ ] Until the market gate passes, the per-game probability changes
      **nothing** in any published number. Asserted by a test.
- [ ] The 32-row venue table exists and serves the bridge's `dome` and
      `neutral` features AND the three weather DARK evaluators from
      STAGED-IMPROVEMENT 3.
- [ ] The feature producer runs on a cron and the run is logged with the
      number of games produced and the number refused.
