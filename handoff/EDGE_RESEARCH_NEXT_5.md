# EDGE RESEARCH — Next H1/H2 NFL Player-Prop Opportunities
**Research only — no models or binds built in this session.**
Repo: `C:\Users\Garrett\Sports` · Package: `packages/prediction-engine/src/edge-lab` · Data: `packages/data-ingestion/src/`
Date: 2026-08-23

---

## 0. What's already built (authoritative registry = `MEMORY.md`)
Per `MEMORY.md` (lines 6-10, 31) and the file registry in `edge-lab/`:

| Edge | Tier | Model | Bind | Framework |
|---|---|---|---|---|
| #1 QB Pressures (hurries+hits+sacks) | H1 | `props-hb-pressures.ts` | `props-hb-pressure-rate-bind.ts` | Beta-Binomial (pressures\|dropbacks) |
| #2 TFL (tackles for loss) | H1 | `props-hb-tfl.ts` | `props-hb-tfl-bind.ts` | Beta-Binomial (TFL\|snaps) |
| #3 Pass Deflections (PD) | H1 | `props-hb-pd.ts` | `props-hb-pd-bind.ts` | Gamma-Poisson (PD\|games) |
| #4 Defensive snap share % | H1 | `props-hb-def-snap-share.ts` | `props-hb-def-snap-share-bind.ts` | Gamma-Poisson (snaps\|game) |
| #5 Kickoff return yards | H1 | `kickoff-return-yards.ts` | `kickoff-return-yards-bind.ts` | Two-part ZIP Gamma-Poisson |
| INTs \| attempts | H2 | `props-hb-int.ts` | `props-hb-int-bind.ts` | Beta-Binomial |
| Fumbles \| touches | H2 | `props-hb-fumble.ts` | `props-hb-fumble-bind.ts` | Beta-Binomial |
| **Air-yards differential** (intended − completed) | H2 | `props-hb-pass-yards.ts` | `props-hb-pass-ayd-bind.ts` | **BIND ONLY — built** |

**Critical exclusion:** The H2 "air yards" edge is *already built* as the `avgAirYardsDifferential` covariate bind (`props-hb-pass-ayd-bind.ts`, 40/40 tests green per test header). The covariate-bus field `airYardsPerAttempt` (CovariateField `airYardsPerAttempt`, `covariate-bus.ts:85`) is **declared but has no model and no assignment found in the codebase** — it is a dangling placeholder, not a buildable edge. I therefore **do not** count air-yards as unexploited (avoiding a double-count of a reserved/claimed H2 edge).

**Framework primitives in use** (`edge-lab/props-hb.ts` / `props-hb-catch.ts`):
- *Beta-Binomial* (bounded rate, successes ≤ exposure): `fitCatchPrior → posteriorCatch → betaBinomialProbOver`; sample shape `{targets, receptions}` (CatchSample). Used by sacks/pressures/TFL/INTs/fumbles.
- *Gamma-Poisson* (unbounded count/rate per game): `fitGroupPrior → posteriorRate → probOver`; sample shape `RateSample={games, total}`. Used by PD/snap-share/rush-attempts/rush-yards/pass-yards.
- *Two-part ZIP* (zero-inflated count × per-opportunity distribution): NB mixture over the exposure, `probOver` per unit. Used by kickoff-return-yards, rush-yards, rec-td, ATD.

---

## 1. Methodology — how "unexploited" was determined
An edge qualifies only if **all three** hold:
1. **No model + bind pair exists** in `edge-lab/` for the prop's y-axis (verified by full directory listing + targeted grep for `tackle|pass.?attempt|completions.?allowed|yards.?allowed|timesHitQb|missed.?tackle|receiving.?td|airYard`).
2. **The y-axis data is ingested & typed** in `packages/data-ingestion/src/` (verified in `nflverse-pfr-def.ts` PfrDefRow / `nflverse-ngs.ts` NgsPassingRow / covariate-bus `CovariateRow`), with the source column parsed via `readInt`/`readNum` and **asserted by a test**.
3. **It fits Beta-Binomial or Gamma-Poisson** (bounded rate OR unbounded count/rate per game), with a directly-reusable primitive.

All five below were cross-checked against `MEMORY.md`, `docs/ops/edge/EDGE_AUDIT_H1.md`, and `docs/ops/edge/H1_RESEARCH_CONSOLIDATED.md`.

---

## 2. The top 5 unexploited edges

### Edge 1 — Total Tackles | game  (DEFENSE · market tier: very liquid)
- **Framework:** Gamma-Poisson — unbounded per-game count (a defender can tackle any number of times; tackles are not capped by a per-play ceiling the way sacks are capped by dropbacks). Primitives: `fitGroupPrior → posteriorRate → probOver` on `RateSample={games, total: tackles}`.
- **Data source (verified):**
  - `PfrDefRow.tacklesCombined` ← NFLVerse `player_stats_def` column `def_tackles_combined`
    (`packages/data-ingestion/src/nflverse-pfr-def.ts:135` type + `:233` column resolve `defTacklesCombinedCol` + `:279` parse via `readInt`).
  - Exposure `games` (defensive games played) + `snapShare` covariate from `CovariateRow.snapShare` (`covariate-bus.ts:75`, CovariateField `snapShare`, statType `defense`, provenance `weekly_pfr_def_mean`).
  - **Tested:** `nflverse-pfr-def.test.ts:132` asserts `tacklesCombined === 7`; `:134-135` asserts `missedTackles=2`, `missedTacklePct=0.222`.
- **Edge thesis (what the market misses):** Books price defensive tackles as a raw per-game line from season averages with a static distribution. They ignore (a) **snap-share exposure** — tackle volume is opportunity-driven; an 88%-snap LB accrues ~45% more tackle *opportunities* than a 60%-snap LB at the same per-snap rate (H1 #4 proved snap share is the role signal) — and (b) the **Negative-Binomial overdispersion** of tackle counts (game-script, opponent run-rate, personnel). The market conflates role/volume with talent. A Gamma-Poisson posterior-predictive (position-group shrinkage + `snapShare` opportunity covariate, week-t-for-t+1) separates them. Tackles is the #1 defensive prop market and is entirely unmodeled — grep confirms "tackle" appears only inside the TFL / snap-share comments.
- **Copy pattern verbatim:** `props-hb-pd` (model): `PdSample={games,pd}` → `TacklesSample={games, tackles}`; `fitGroupPrior → posteriorRate → probOver`. Bind: mirror `props-hb-pd-bind.ts` / `props-hb-def-snap-share-bind.ts` — `latestPriorRow(rows, gsisId, season, "defense", kickoffWeek)` → attach `row.snapShare` as a `CovariateCell` (`grain: "week_t_for_tplus1"`, `provenance: "weekly_pfr_def_mean"`), fail-closed on null/missing.

### Edge 2 — Passing Attempts | game  (QB/OFFENSE · market tier: very liquid)
- **Framework:** Gamma-Poisson — unbounded per-game count of attempts. Primitives: `fitGroupPrior → posteriorRate → probOver` on `RateSample={games, total: attempts}`.
- **Data source (verified):**
  - `NgsPassingRow.attempts` (`packages/data-ingestion/src/nflverse-ngs.ts:112`; NGS `ngs_passing` asset, nflverse-source.ts:87-95). Also `player_stats_week` `pass_att`.
  - Covariates: `CovariateRow.avgTimeToThrow` (`:60`) + `aggressiveness` (`:61`) — game-script / release-speed proxies for attempt volume (already bound to passing rows by `props-hb-cpoe-comp-bind.ts`).
  - **Tested:** `ngs_passing` is covered by `nflverse-ngs.test.ts` (passing-row parser exercised).
- **Edge thesis (what the market misses):** Books set QB passing-attempts lines on raw season averages with no dispersion model and no game-script adjustment. Attempt volume is highly regime-dependent (blowout script, early lead, weather, OC tempo) and over-dispersed; a static line misprices tail probability. The Gamma-Poisson posterior-predictive shrinks each QB toward the position-group mean attempt-rate and marginalizes per-game NB variance — exactly the exposure-bug #519/#530 fix, but for passing. **Dependency gap:** the pass-yards model (`props-hb-pass-yards.ts:14`, "Next-game attempts T ~ NB from the Gamma-Poisson posterior") expects a passing-attempts posterior from upstream, but only `props-hb-rush-attempts.ts` exists — there is **no passing-attempts producer**, so the pass-yards two-part model is currently under-served.
- **Copy pattern verbatim:** `props-hb-rush-attempts` (model): `RushAttemptsSample={games,attempts}` → `PassAttemptsSample={games, attempts}`; `fitGroupPrior → posteriorRate → probOver` (note: zero-attempt games are VALID here — volume *is* the rate, unlike yards/attempt). Bind: mirror `props-hb-cpoe-comp-bind.ts` leak-safe bind with statType `"passing"` attaching `avgTimeToThrow` (and optionally `aggressiveness`).

### Edge 3 — QB Hits | game  (DEFENSE · market tier: niche but real — pass-rush props)
- **Framework:** Gamma-Poisson — unbounded per-game count. Primitives: `fitGroupPrior → posteriorRate → probOver` on `RateSample={games, total: hits}`.
- **Data source (verified):**
  - `PfrDefRow.timesHitQb` ← NFLVerse column `def_times_hitqb`
    (`nflverse-pfr-def.ts:129` type + `:229` column resolve `defHitQbCol` + `:270` parse). `sacks` is a separate H1 field already consumed by pressures.
  - Covariate: `snapShare` (same as Edge 1).
  - **Tested:** `nflverse-pfr-def.test.ts:127` asserts `timesHitQb === 0`; `:243` asserts `rows[0].timesHitQb === 1`.
- **Edge thesis (what the market misses):** The pressures model (H1 #1) bundles hurries + hits + sacks into one line because books price sacks only. But **QB hits are the high-leverage sub-population** — a hit (vs a hurry) is pressure that *arrived* at the QB, a stronger predictor of hurried throws / broken plays, and a different, more-skewed and lower-frequency distribution than hurries. The market's sack/pressure proxy misprices the hit component's over/under; hits are a distinct event class even though the pressures model already consumes the `timesHitQb` sub-count (it never prices it as a standalone prop).
- **Copy pattern verbatim:** `props-hb-pd` (model): `PdSample={games,pd}` → `HitsSample={games, qbHits}`; bind `snapShare` via `props-hb-pd-bind.ts` pattern (statType `"defense"`).

### Edge 4 — Completions Allowed | targets  (DEFENSE · Beta-Binomial — the rare bounded-rate coverage edge)
- **Framework:** **Beta-Binomial** (bounded rate: completionsAllowed ≤ targets). Primitives: `fitCatchPrior → posteriorCatch → betaBinomialProbOver` on `CatchSample={targets, receptions: completionsAllowed}`.
- **Data source (verified):**
  - `PfrDefRow.completionsAllowed` ← `def_completions_allowed` (`nflverse-pfr-def.ts:144` + `:238` `defCompAllowCol` + `:316` parse).
  - `PfrDefRow.targets` ← `def_targets` (`nflverse-pfr-def.ts:143` + `:237` `defTargetsCol` + `:287` parse) — the exposure/denominator.
  - **Tested:** `nflverse-pfr-def.test.ts:139` asserts `completionsAllowed === 5`.
- **Edge thesis (what the market misses):** Markets price coverage via PD (breakups) and INTs (takes) — both rare and luck-driven. **Completion-% allowed is the honest, high-frequency measure of coverage quality:** a CB allowing 6 of 8 targets (75%) is being cooked underneath yet may post 0 PD and 0 INT, so the market reads "quiet" as "good." The bounded Beta-Binomial on (completionsAllowed, targets) with position-group shrinkage isolates coverage talent from turnover luck, and is leak-safe (week-t-for-t+1). It is the coverage analogue to the INTs model (`props-hb-int`).
- **Copy pattern verbatim:** `props-hb-int` (model): `IntSample={attempts, ints}` → `CompAllowedSample={targets, completions}`; `fitCatchPrior → posteriorCatch → betaBinomialProbOver`/`probOverInt`. Bind `snapShare` via `props-hb-int-bind.ts` pattern (statType `"defense"`).

### Edge 5 — Missed Tackles | game  (DEFENSE · prop-building / process edge)
- **Framework:** Gamma-Poisson — unbounded per-game count (mirrors tackles; a missed-tackle count has no ceiling). Primitives: `fitGroupPrior → posteriorRate → probOver` on `RateSample={games, total: missedTackles}`.
- **Data source (verified):**
  - `PfrDefRow.missedTackles` ← `def_missed_tackles` (`nflverse-pfr-def.ts:136` + `:234` `defMissedTklCol` + `:280` parse) and `missedTacklePct` (`nflverse-pfr-def.ts:137`, `:235` `defMissedTklPctCol`, `:281` parse).
  - Covariate: `snapShare`; secondary `missedTacklePct` as the rate companion once a defensive-tackle count exists.
  - **Tested:** `nflverse-pfr-def.test.ts:134` asserts `missedTackles === 2`; `:135` asserts `missedTacklePct ≈ 0.222`.
- **Edge thesis (what the market misses):** Tackles-made stats (tackles, TFL, PD) credit finished plays; **missed tackles are the un-credited signal of run/stretch-zone breaks, agility loss, and angle failure** that drives extra yards and blown coverages. Books price tackles *made* but miss the breakdown count — a LB missing 3 tackles against a ground-heavy team is a different over/under risk for rushing-yards / opponent-TD props than one with 8 clean tackles. Gamma-Poisson on missed-tackles-per-game (copy PD) with `snapShare` opportunity separates talent from role. Per the H1 #5 kickoff precedent, this is a **prop-building edge** priced for internal run-defense / opponent-passing refinement, not necessarily a direct book line. *Note: the newer 2024 NGS "tackle success rate / missed-tackle cost" (user item #5) is the natural covariate companion, but is NOT in the current NGS ingest — see §4.*
- **Copy pattern verbatim:** `props-hb-pd` (model): `PdSample={games,pd}` → `MissedTacklesSample={games, missed}`; `fitGroupPrior → posteriorRate → probOver`. Bind `snapShare` via `props-hb-pd-bind.ts` pattern (statType `"defense"`).

---

## 3. Summary table

| # | Prop (y-axis) | Side | Framework | Data source (file:line → column) | Test | Copy this model | Copy this bind |
|---|---|---|---|---|---|---|---|
| 1 | Total Tackles \| game | DEF | Gamma-Poisson | `nflverse-pfr-def.ts:135,279` → `def_tackles_combined` | `.test.ts:132` (=7) | `props-hb-pd` (count/game) | `props-hb-pd-bind` + `snapShare` |
| 2 | Passing Attempts \| game | OFF (QB) | Gamma-Poisson | `nflverse-ngs.ts:112` → `ngs_passing.attempts` | `nflverse-ngs.test.ts` | `props-hb-rush-attempts` | `props-hb-cpoe-comp-bind` (passing) |
| 3 | QB Hits \| game | DEF | Gamma-Poisson | `nflverse-pfr-def.ts:129,270` → `def_times_hitqb` | `.test.ts:127` (=0), `:243` (=1) | `props-hb-pd` | `props-hb-pd-bind` + `snapShare` |
| 4 | Completions Allowed \| targets | DEF | **Beta-Binomial** | `nflverse-pfr-def.ts:144,316` → `def_completions_allowed` + `def_targets` (`:143,287`) | `.test.ts:139` (=5) | `props-hb-int` (rate) | `props-hb-int-bind` + `snapShare` |
| 5 | Missed Tackles \| game | DEF | Gamma-Poisson | `nflverse-pfr-def.ts:136,280` → `def_missed_tackles` | `.test.ts:134` (=2) | `props-hb-pd` | `props-hb-pd-bind` + `snapShare` |

---

## 4. Evaluation of the 8 NGS/covariate candidates (user addendum)

| # | Metric | Existing data in `data-ingestion/src/`? | Needed dataset | Modelable with Beta-Binomial / Gamma-Poisson? | Already partially built? | Verdict |
|---|---|---|---|---|---|---|
| 1 | **PROE** (pass-rate over expected) | `pbp` IS cataloged & ingestible (`nflverse-source.ts:63`) | needs an expected-pass-rate regression (down/distance/score) — not built | No — team-game play-calling *tendency* (a signed deviation from expectation), not a count/rate Y-axis | No (expected-pass-rate model absent) | Covariate enhancer for Edge 2 (pass attempts); not a standalone prop Y-axis |
| 2 | **WOPR** (1.5·target_share + 0.7·air_yards_share) | **Both components already ingested**: `player_stats.csv.gz` has `target_share`, `air_yards_share`, `wopr` (`nflverse-cache.test.ts:23`); `airYardsShare` is already a CovariateField (`covariate-bus.ts:58`) | none for the raw data; just compute the composite | No — composite opportunity *index*, not a count/rate | Partly — `airYardsShare` bus field exists; WOPR composite not computed | Add `wopr` to the covariate-bus field set to enrich catch/rec-td models; not a prop Y-axis |
| 3 | **Age cliff** (RB 28-30, WR 30-32, QB 30s) | `rosters` has `birth_date` (`nflverse-source.ts:123`) + `weekly_rosters` bio | none — age = season − birth_date | No — per-player *shrinkage* lever, not a count/rate | No | Add `age` / `ageCliffScale` CovariateCell to shrink Gamma priors sharper for 28-32 RBs/WRs; prior-shaping enhancer for Edges 1-3 |
| 4 | **Coverage classification** (Cover 1/3/6) | `pbp_participation` unlocks "coverage proxies" (box counts, formation) (`nflverse-source.ts:69-73`) | true coverage scheme labels (nflfastR `coverage` merge / NGS coverage asset) | No — team-game scheme context | No (only proxies) | Covariate enhancer (opponent pass-defense scheme) for Edges 1/3/4; true labels need a new ingest |
| 5 | **Tackle probability / missed-tackle cost** (2024 NGS) | NO — `ngs` ingest is only passing/receiving/rushing (`nflverse-ngs.ts:3-4`) | new `ngs_defense` / tackle-plays NGS asset (2024+) | **Yes — Beta-Binomial** (tackles-made / tackle-attempts) once ingested | No | Blocked on ingest; natural companion to Edge 5 (missed tackles) once available |
| 6 | **Coordinator continuity** | NO coaching/coordinator dataset in the catalog | coaching staff roster (HC/OC/DC hire dates) | No — team-game continuity effect | No | Needs ingest; team-level covariate, not a player-prop Y-axis |
| 7 | **Contract incentives** (Weeks 17-18 usage bumps) | Only DFS salaries available (no NFL contract-incentive feed in catalog) | NFL contract/incentive data feed | No — player-game usage covariate | No | Needs ingest; a Weeks-17-18 `games` multiplier, not a prop Y-axis |
| 8 | **Regression to the mean** (fade hot streaks) | N/A — it's an *estimation principle* | none | No as a Y-axis | **YES** | The existing Gamma-Poisson/Beta-Binomial posterior (`posteriorRate` shrinks toward the position-group mean; `probOver` marginalizes NB variance) **already is** this edge |

---

## 5. Rejected / considered (and why not in the top 5)
- **Air yards per attempt (as a stand-alone Y-axis):** excluded — the H2 "air yards" edge is the `avgAirYardsDifferential` covariate bind, which is **already built** (`props-hb-pass-ayd-bind.ts`, tested). The `CovariateField.airYardsPerAttempt` bus slot is declared but never assigned anywhere — it is a placeholder, not a usable signal. (Re-deriving intended air yards as a new Y-axis would duplicate the air-yards bind that feeds pass-yards.)
- **Hurries | game** (`def_times_hurried`): data exists, but it is the *least* distinctive pressure component and most redundant with Edge 3 (QB hits). Dropped in favour of the higher-leverage hit.
- **Yards Allowed per Target | targets** (`def_yards_allowed_per_tgt`): data exists (`nflverse-pfr-def.ts:148,242`); a continuous-rate Gamma model (copy `props-hb-rush`/`props-hb-pass-yards`). Kept out of the top 5 because a yardage-rate Y-axis is less of a discrete bookable prop than the count/rate edges above; strong candidate #6.
- **Receiving TDs Allowed | targets** (`def_receiving_td_allowed`, `nflverse-pfr-def.ts:150,243`): rare-event Beta-Binomial (copy `props-hb-int`), real red-zone signal. Strong candidate #7.
- **Sacks (defensive | dropbacks) as a *counting* prop:** already covered by `props-hb-sacks` (sacks|dropbacks, Beta-Binomial); the per-game QB-hit/sack volume is the gap, not sacks themselves.
- **Forced fumbles | game:** the `props-hb-fumble` model already pools forced + recovered fumbles over touches — no clean separate column is parsed (PFR `def_fumbles_forced` is not surfaced as a distinct tested field), so claiming it would overstate available data.

---

## 6. Honesty / wiring caveats (must verify before building)
1. **`def_tackles_for_loss` is absent from the current NFLVerse release** (`nflverse-pfr-def.ts:275-277` comment): `tacklesForLoss` resolves to `null` and the TFL bind **fails closed today**. This does NOT affect Edges 1/3/5 — `tacklesCombined`, `timesHitQb`, `missedTackles` are parsed independently and tested.
2. **`CovariateField.airYardsPerAttempt` is declared in the `CovariateRow` type + `CovariateField` union (`covariate-bus.ts:85-86,117`) but no assignment was located anywhere in the repo** — it is a dangling H2 slot, not populated. Treat the air-yards *model* as the `avgAirYardsDifferential` bind (built), not as a new Y-axis.
3. **NGS ingest is restricted to the passing/receiving/rushing variants** (`nflverse-ngs.ts:3-4`); the 2024 NGS tackle-probability / tackle-success-rate asset is therefore **not available** without a new ingest (see §4, row 5).
4. **The y-axis realization (PfrDefRow → `*Sample`)** is assembled by an upstream scorer not in `edge-lab/`; Edges 1/3/4/5 follow the same caller-supplies-Sample contract as the TFL/PD/INT binds, so the wiring is low-risk, but the scorer must be extended to emit `TacklesSample`/`HitsSample`/`CompAllowedSample`/`MissedTacklesSample`.
5. **All binds must preserve the integrity rules** already enforced elsewhere: `latestPriorRow` strict-prior scan (week=0 excluded, `week >= kickoffWeek` excluded), fail-closed on null/non-finite, `priced:false`, grain `week_t_for_tplus1`, provenance per statType (`weekly_pfr_def_mean` for defense, `weekly_ngs_mean` for passing/rushing).

---

### Research provenance (commands run, output seen)
- Full `edge-lab/` listing (89 entries) + grep for `tackle|pass.?attempt|air.?yard|completions.?allowed|yards.?allowed|timesHitQb|missed.?tackle|receiving.?td` → confirmed zero model files for tackles/pass-attempts/air-yards-Y-axis; `tackle` only in TFL/snap-share comments.
- `nflverse-pfr-def.ts` read in full (interface `:114-163`, column-resolves `:225-248`, row-build `:255-333`); test grep → `tacklesCombined=7 (:132)`, `missedTackles=2 (:134)`, `missedTacklePct=0.222 (:135)`, `completionsAllowed=5 (:139)`, `timesHitQb=0 (:127)` / `=1 (:243)`.
- `nflverse-ngs.ts` `NgsPassingRow.attempts` (`:112`); `nflverse-source.ts` dataset catalog (`pbp:63`, `player_stats_week:75`, `ngs:87`, `rosters:121`, `weekly_rosters:178`, `pbp_participation:69`).
- `MEMORY.md` (edge registry), `docs/ops/edge/H1_RESEARCH_CONSOLIDATED.md` (data-gap + tiering), `docs/ops/edge/EDGE_AUDIT_H1.md` (build status), `covariate-bus.ts` (CovariateField/CovariateRow), `props-hb.ts`/`props-hb-catch.ts` (primitives), and representative models (`props-hb-pd`, `props-hb-rush-attempts`, `props-hb-int`, `props-hb-pass-yards`, `props-hb-pressures`, `props-hb-tfl`, `props-hb-fumble`, `props-hb-sack-ttt-bind`, `props-hb-cpoe-comp-bind`, `props-hb-rush-yards-bind`, `props-hb-def-snap-share*`) for copy-pattern fidelity.
